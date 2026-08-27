import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const decideSchema = z.object({
  requestId: z.string().uuid(),
  approve: z.boolean(),
});

const leagueIdSchema = z.object({ leagueId: z.string().uuid() });

export type JoinRequest = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "declined";
  created_at: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
};

export type JoinStatus = {
  leagueId: string | null;
  leagueName: string | null;
  isMember: boolean;
  status: "none" | "pending" | "approved" | "declined";
};

/** Where a signed-in user stands with the default pool: member, pending, or nothing yet. */
export const myJoinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<JoinStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: league, error: lErr } = await supabaseAdmin
      .from("leagues")
      .select("id, name")
      .eq("is_global_pool", true)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!league) {
      return { leagueId: null, leagueName: null, isMember: false, status: "none" };
    }

    const [{ data: membership, error: mErr }, { data: request, error: rErr }] = await Promise.all([
      supabaseAdmin
        .from("league_memberships")
        .select("id")
        .eq("league_id", league.id)
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("league_join_requests")
        .select("status")
        .eq("league_id", league.id)
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    if (mErr) throw mErr;
    if (rErr) throw rErr;

    return {
      leagueId: league.id,
      leagueName: league.name,
      isMember: Boolean(membership),
      status: (request?.status as JoinStatus["status"]) ?? "none",
    };
  });

/** A signed-in non-member asks the commissioner for access to the default pool. */
export const requestToJoin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: league, error: lErr } = await supabaseAdmin
      .from("leagues")
      .select("id, name, owner_id")
      .eq("is_global_pool", true)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!league) throw new Error("There is no pool to join yet");

    const { data: membership } = await supabaseAdmin
      .from("league_memberships")
      .select("id")
      .eq("league_id", league.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (membership) return { ok: true, alreadyMember: true };

    const { error } = await supabaseAdmin.from("league_join_requests").upsert(
      {
        league_id: league.id,
        user_id: context.userId,
        status: "pending",
        decided_at: null,
        decided_by: null,
      },
      { onConflict: "league_id,user_id" },
    );
    if (error) throw error;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("team_name, display_name")
      .eq("id", context.userId)
      .maybeSingle();

    try {
      const { sendToUsers } = await import("@/lib/push.server");
      await sendToUsers([league.owner_id], "deadlines", {
        title: "New join request",
        body: `${profile?.team_name ?? profile?.display_name ?? "A new manager"} wants into ${league.name}.`,
        url: "/leagues",
        tag: `join-request-${league.id}`,
      });
    } catch {
      // A failed push must not block the request itself.
    }

    return { ok: true, alreadyMember: false };
  });

/** Owner-only queue of pending requests for a league. */
export const listJoinRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => leagueIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<JoinRequest[]> => {
    const { data: league, error: lErr } = await context.supabase
      .from("leagues")
      .select("id, owner_id")
      .eq("id", data.leagueId)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!league || league.owner_id !== context.userId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("league_join_requests")
      .select("id, user_id, status, created_at")
      .eq("league_id", data.leagueId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, team_name, mascot, primary_color")
      .in(
        "id",
        rows.map((r) => r.user_id),
      );
    if (pErr) throw pErr;

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((r) => {
      const p = byId.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        status: r.status as JoinRequest["status"],
        created_at: r.created_at,
        display_name: p?.display_name ?? "New manager",
        team_name: p?.team_name ?? "Unnamed team",
        mascot: p?.mascot ?? "",
        primary_color: p?.primary_color ?? "#00E676",
      };
    });
  });

/** Owner-only approve/decline. Approving adds the membership. */
export const decideJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => decideSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error: rErr } = await supabaseAdmin
      .from("league_join_requests")
      .select("id, league_id, user_id, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!req) throw new Error("That request no longer exists");

    const { data: league, error: lErr } = await supabaseAdmin
      .from("leagues")
      .select("id, name, owner_id")
      .eq("id", req.league_id)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!league || league.owner_id !== context.userId) {
      throw new Error("Only the league owner can do that");
    }

    if (data.approve) {
      const { error } = await supabaseAdmin.from("league_memberships").upsert(
        { league_id: req.league_id, user_id: req.user_id, role: "member" },
        { onConflict: "league_id,user_id" },
      );
      if (error) throw error;
    }

    const { error: uErr } = await supabaseAdmin
      .from("league_join_requests")
      .update({
        status: data.approve ? "approved" : "declined",
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", req.id);
    if (uErr) throw uErr;

    try {
      const { sendToUsers } = await import("@/lib/push.server");
      await sendToUsers([req.user_id], "deadlines", {
        title: data.approve ? "You're in!" : "Join request declined",
        body: data.approve
          ? `The commissioner approved you for ${league.name}. Time to make your picks.`
          : `Your request to join ${league.name} wasn't approved.`,
        url: data.approve ? "/picks" : "/",
        tag: `join-decision-${league.id}`,
      });
    } catch {
      // Notification failures are non-fatal.
    }

    return { ok: true, approved: data.approve };
  });
