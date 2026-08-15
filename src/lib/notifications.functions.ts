import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationPrefs = {
  deadlines: boolean;
  results: boolean;
  chat: boolean;
  survivor: boolean;
  consented_at: string | null;
  consent_version: string | null;
};

export type NotificationSettings = NotificationPrefs & {
  deviceCount: number;
  endpoints: string[];
};

const DEFAULTS: NotificationPrefs = {
  deadlines: true,
  results: true,
  chat: false,
  survivor: true,
  consented_at: null,
  consent_version: null,
};

export const getNotificationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationSettings> => {
    const { supabase, userId } = context;
    const [{ data: prefs }, { data: subs }] = await Promise.all([
      supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("push_subscriptions").select("endpoint").eq("user_id", userId),
    ]);

    return {
      ...DEFAULTS,
      ...(prefs
        ? {
            deadlines: prefs.deadlines,
            results: prefs.results,
            chat: prefs.chat,
            survivor: prefs.survivor,
            consented_at: prefs.consented_at,
            consent_version: prefs.consent_version,
          }
        : {}),
      deviceCount: subs?.length ?? 0,
      endpoints: (subs ?? []).map((s) => s.endpoint),
    };
  });

const prefsSchema = z.object({
  deadlines: z.boolean(),
  results: z.boolean(),
  chat: z.boolean(),
  survivor: z.boolean(),
  consentVersion: z.string().min(1).max(40),
});

export const saveNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof prefsSchema>) => prefsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: userId,
        deadlines: data.deadlines,
        results: data.results,
        chat: data.chat,
        survivor: data.survivor,
        consented_at: new Date().toISOString(),
        consent_version: data.consentVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(300),
  auth: z.string().min(1).max(300),
  deviceLabel: z.string().max(160).optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof subscriptionSchema>) => subscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        device_label: data.deviceLabel ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint?: string; all?: boolean }) =>
    z.object({ endpoint: z.string().max(1000).optional(), all: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let query = supabase.from("push_subscriptions").delete().eq("user_id", userId);
    if (!data.all && data.endpoint) query = query.eq("endpoint", data.endpoint);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sends a test push to this player's own devices so they can confirm setup. */
export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendToUsers } = await import("@/lib/push.server");
    const sent = await sendToUsers([context.userId], "deadlines", {
      title: "Gridiron Confidence",
      body: "Alerts are on. You'll hear from us on game week.",
      url: "/notifications",
      tag: "test",
    });
    return { sent };
  });

/** Fired after a chat message is posted; alerts opted-in league mates. */
export const notifyChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leagueId: string; body: string }) =>
    z.object({ leagueId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Only members of the league may trigger its alerts.
    const { data: membership } = await supabase
      .from("league_memberships")
      .select("id")
      .eq("league_id", data.leagueId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) return { sent: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendToUsers } = await import("@/lib/push.server");

    const [{ data: members }, { data: league }, { data: me }] = await Promise.all([
      supabaseAdmin.from("league_memberships").select("user_id").eq("league_id", data.leagueId),
      supabaseAdmin.from("leagues").select("name").eq("id", data.leagueId).maybeSingle(),
      supabaseAdmin.from("profiles").select("team_name, display_name").eq("id", userId).maybeSingle(),
    ]);

    const recipients = (members ?? []).map((m) => m.user_id).filter((id) => id !== userId);
    const who = me?.team_name || me?.display_name || "A league mate";
    const preview = data.body.length > 90 ? `${data.body.slice(0, 90)}…` : data.body;

    const sent = await sendToUsers(recipients, "chat", {
      title: `${who} in ${league?.name ?? "Trash Talk"}`,
      body: preview,
      url: "/chat",
      tag: `chat-${data.leagueId}`,
    });
    return { sent };
  });
