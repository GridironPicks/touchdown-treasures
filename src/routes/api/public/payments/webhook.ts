import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function markEntryPaid(session: any) {
  const userId = session?.metadata?.userId;
  const season = Number(session?.metadata?.season);
  const week = Number(session?.metadata?.week);
  if (!userId || !Number.isInteger(season) || !Number.isInteger(week)) {
    console.error("Checkout session missing league metadata", session?.id);
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("entries").upsert(
    {
      user_id: userId,
      season,
      week,
      amount_cents: session.amount_total ?? 500,
      paid: true,
      paid_at: new Date().toISOString(),
      method: "stripe",
      stripe_session_id: session.id,
    },
    { onConflict: "user_id,season,week" },
  );
  if (error) {
    console.error("Failed to record entry:", error.message);
    return;
  }

  const email = session?.customer_details?.email ?? session?.customer_email;
  if (!email) return;

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("team_name")
      .eq("id", userId)
      .maybeSingle();

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("entry-receipt", email, {
      templateData: {
        teamName: profile?.team_name ?? "Manager",
        week,
        season,
        amount: `$${((session.amount_total ?? 500) / 100).toFixed(2)}`,
      },
      idempotencyKey: `entry-receipt-${session.id}`,
    });
  } catch (e) {
    console.error("Failed to send entry receipt:", e);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") await markEntryPaid(session);
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await markEntryPaid(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
      console.log("Async payment failed for session", event.data.object?.id);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
