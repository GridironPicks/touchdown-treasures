import { buildPushPayload } from "@block65/webcrypto-web-push";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotificationKind = "deadlines" | "results" | "chat" | "survivor";

export type PushMessagePayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function vapid() {
  const subject = process.env["VAPID_SUBJECT"];
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!subject || !publicKey || !privateKey) throw new Error("VAPID keys are not configured");
  return { subject, publicKey, privateKey };
}

async function deliver(sub: SubscriptionRow, payload: PushMessagePayload): Promise<boolean> {
  const request = await buildPushPayload(
    { data: JSON.stringify(payload), options: { ttl: 6 * 3600 } },
    {
      endpoint: sub.endpoint,
      expirationTime: null,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    vapid(),
  );

  const res = await fetch(sub.endpoint, request);

  if (res.status === 404 || res.status === 410) {
    // Subscription is dead — drop it so we stop trying.
    await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
    return false;
  }
  if (!res.ok) {
    console.error("[push] delivery failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  await supabaseAdmin
    .from("push_subscriptions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", sub.id);
  return true;
}

/** Users (from the given list) who have opted in to this alert kind. */
export async function optedInUsers(userIds: string[], kind: NotificationKind): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select(`user_id, ${kind}, consented_at`)
    .in("user_id", userIds);
  if (error) throw error;
  return (data ?? [])
    .filter((row) => {
      const r = row as unknown as Record<string, unknown>;
      return Boolean(r["consented_at"]) && r[kind] === true;
    })
    .map((row) => (row as unknown as { user_id: string }).user_id);
}

/**
 * Sends a push to every device of the given users who opted in to `kind`.
 * `dedupeKey` (when given) guarantees the same alert is never sent twice.
 */
export async function sendToUsers(
  userIds: string[],
  kind: NotificationKind,
  payload: PushMessagePayload,
  dedupeKey?: string,
): Promise<number> {
  const eligible = await optedInUsers(Array.from(new Set(userIds)), kind);
  if (eligible.length === 0) return 0;

  let recipients = eligible;
  if (dedupeKey) {
    const rows = eligible.map((user_id) => ({ user_id, dedupe_key: dedupeKey, kind }));
    const { data, error } = await supabaseAdmin
      .from("notification_log")
      .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
      .select("user_id");
    if (error) throw error;
    recipients = (data ?? []).map((r) => r.user_id);
  }
  if (recipients.length === 0) return 0;

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", recipients);
  if (error) throw error;

  const results = await Promise.all((subs ?? []).map((s) => deliver(s as SubscriptionRow, payload)));
  return results.filter(Boolean).length;
}
