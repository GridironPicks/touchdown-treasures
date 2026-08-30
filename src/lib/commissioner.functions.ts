import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SEASON } from "@/lib/league";

const leagueIdSchema = z.object({ leagueId: z.string().uuid() });

const renameSchema = z.object({
  leagueId: z.string().uuid(),
  name: z.string().min(1).max(60),
});

const memberSchema = z.object({
  leagueId: z.string().uuid(),
  userId: z.string().uuid(),
});

const nudgeSchema = z.object({
  leagueId: z.string().uuid(),
  seasonType: z.enum(["pre", "reg", "post"]),
  week: z.number().int().min(1).max(22),
});

export type LeagueMember = {
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  submitted: boolean;
};

async function assertOwner(
  supabase: { from: (t: string) => any },
  leagueId: string,
  userId: string,
  options: { allowGlobalPool?: boolean } = {},
) {
  const { data, error } = await supabase
    .from("leagues")
    .select("id, owner_id, name, is_global_pool")
    .eq("id", leagueId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("League not found");
  if (data.is_global_pool && !options.allowGlobalPool) {
    throw new Error("That isn't available for the 2026 Gridiron Pool");
  }
  if (data.owner_id !== userId) throw new Error("Only the league owner can do that");
  return data as { id: string; owner_id: string; name: string; is_global_pool: boolean };

}

/** Members of a league with role, join date and this week's submission state. */
export const listLeagueMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        leagueId: z.string().uuid(),
        seasonType: z.enum(["pre", "reg", "post"]),
        week: z.number().int().min(1).max(22),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<LeagueMember[]> => {
    const { data: memberships, error } = await context.supabase
      .from("league_memberships")
      .select("user_id, role, created_at")
      .eq("league_id", data.leagueId);
    if (error) throw error;

    const ids = (memberships ?? []).map((m) => m.user_id);
    if (ids.length === 0) return [];

    const [profiles, status] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, display_name, team_name, mascot, primary_color")
        .in("id", ids),
      context.supabase.rpc("week_submission_status", {
        _season: SEASON,
        _season_type: data.seasonType,
        _week: data.week,
        _league_id: data.leagueId,
      }),
    ]);
    if (profiles.error) throw profiles.error;

    const submitted = new Map(
      ((status.data ?? []) as { user_id: string; submitted: boolean }[]).map((r) => [
        r.user_id,
        r.submitted,
      ]),
    );

    return (memberships ?? []).map((m) => {
      const p = (profiles.data ?? []).find((x) => x.id === m.user_id);
      return {
        user_id: m.user_id,
        role: m.role,
        joined_at: m.created_at,
        display_name: p?.display_name ?? "Manager",
        team_name: p?.team_name ?? "Unnamed Squad",
        mascot: p?.mascot ?? "eagle",
        primary_color: p?.primary_color ?? "#00E676",
        submitted: submitted.get(m.user_id) ?? false,
      };
    });
  });

export const renameLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => renameSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase as never, data.leagueId, context.userId, { allowGlobalPool: true });
    const { error } = await context.supabase
      .from("leagues")
      .update({ name: data.name.trim(), updated_at: new Date().toISOString() })
      .eq("id", data.leagueId);
    if (error) throw error;
    return { ok: true };
  });

export const regenerateJoinCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => leagueIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: code, error } = await context.supabase.rpc("regenerate_join_code", {
      _league_id: data.leagueId,
    });
    if (error) throw error;
    return { joinCode: code as string };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => memberSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase as never, data.leagueId, context.userId, { allowGlobalPool: true });
    if (data.userId === context.userId) throw new Error("You can't remove yourself as owner");
    const { error } = await context.supabase
      .from("league_memberships")
      .delete()
      .eq("league_id", data.leagueId)
      .eq("user_id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const transferOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => memberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("transfer_league_ownership", {
      _league_id: data.leagueId,
      _new_owner: data.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

/** Owner-triggered push to league members who haven't submitted this week. */
export const nudgeUnsubmitted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => nudgeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const league = await assertOwner(context.supabase as never, data.leagueId, context.userId, { allowGlobalPool: true });

    const { data: status, error } = await context.supabase.rpc("week_submission_status", {
      _season: SEASON,
      _season_type: data.seasonType,
      _week: data.week,
      _league_id: data.leagueId,
    });
    if (error) throw error;

    const pending = ((status ?? []) as { user_id: string; submitted: boolean }[])
      .filter((r) => !r.submitted)
      .map((r) => r.user_id)
      .filter((id) => id !== context.userId);
    if (pending.length === 0) return { sent: 0, pending: 0 };

    const { sendToUsers } = await import("@/lib/push.server");
    const label = data.seasonType === "pre" ? `Preseason Week ${data.week}` : `Week ${data.week}`;
    const sent = await sendToUsers(
      pending,
      "deadlines",
      {
        title: "Commissioner nudge",
        body: `Your ${label} picks in ${league.name} are still missing.`,
        url: "/picks",
        tag: `nudge-${data.leagueId}-${data.week}`,
      },
      `nudge-${data.leagueId}-${data.seasonType}-${data.week}-${new Date().toISOString().slice(0, 10)}`,
    );
    return { sent, pending: pending.length };
  });

export type LeagueRule = {
  id: string;
  league_id: string;
  title: string;
  body: string;
  sort_order: number;
};

const ruleSchema = z.object({
  leagueId: z.string().uuid(),
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(80),
  body: z.string().max(1000).default(""),
});

/** Rules for a league, readable by any member. */
export const listLeagueRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => leagueIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<LeagueRule[]> => {
    const { data: rows, error } = await context.supabase
      .from("league_rules")
      .select("id, league_id, title, body, sort_order")
      .eq("league_id", data.leagueId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (rows ?? []) as LeagueRule[];
  });

export const upsertLeagueRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ruleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase as never, data.leagueId, context.userId, {
      allowGlobalPool: true,
    });

    if (data.id) {
      const { error } = await context.supabase
        .from("league_rules")
        .update({ title: data.title.trim(), body: data.body.trim() })
        .eq("id", data.id)
        .eq("league_id", data.leagueId);
      if (error) throw error;
      return { ok: true };
    }

    const { data: last, error: lastError } = await context.supabase
      .from("league_rules")
      .select("sort_order")
      .eq("league_id", data.leagueId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;

    const { error } = await context.supabase.from("league_rules").insert({
      league_id: data.leagueId,
      title: data.title.trim(),
      body: data.body.trim(),
      sort_order: (last?.sort_order ?? -1) + 1,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteLeagueRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ leagueId: z.string().uuid(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase as never, data.leagueId, context.userId, {
      allowGlobalPool: true,
    });
    const { error } = await context.supabase
      .from("league_rules")
      .delete()
      .eq("id", data.id)
      .eq("league_id", data.leagueId);
    if (error) throw error;
    return { ok: true };
  });

export const reorderLeagueRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ leagueId: z.string().uuid(), ids: z.array(z.string().uuid()).max(50) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase as never, data.leagueId, context.userId, {
      allowGlobalPool: true,
    });
    for (let i = 0; i < data.ids.length; i += 1) {
      const { error } = await context.supabase
        .from("league_rules")
        .update({ sort_order: i })
        .eq("id", data.ids[i]!)
        .eq("league_id", data.leagueId);
      if (error) throw error;
    }
    return { ok: true };
  });

export type Candidate = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
};

/** Managers who exist but are not currently in this league. */
export const listRejoinCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => leagueIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<Candidate[]> => {
    await assertOwner(context.supabase as never, data.leagueId, context.userId, {
      allowGlobalPool: true,
    });

    const [{ data: memberships, error: mErr }, { data: profiles, error: pErr }] =
      await Promise.all([
        context.supabase
          .from("league_memberships")
          .select("user_id")
          .eq("league_id", data.leagueId),
        context.supabase
          .from("profiles")
          .select("id, display_name, team_name, mascot, primary_color")
          .order("team_name", { ascending: true }),
      ]);
    if (mErr) throw mErr;
    if (pErr) throw pErr;

    const inLeague = new Set((memberships ?? []).map((m) => m.user_id));
    return (profiles ?? [])
      .filter((p) => !inLeague.has(p.id))
      .map((p) => ({
        user_id: p.id,
        display_name: p.display_name,
        team_name: p.team_name,
        mascot: p.mascot,
        primary_color: p.primary_color,
      }));
  });

/** Owner-only re-add of a manager who was removed earlier. */
export const addMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => memberSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase as never, data.leagueId, context.userId, {
      allowGlobalPool: true,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("league_memberships")
      .upsert(
        { league_id: data.leagueId, user_id: data.userId, role: "member" },
        { onConflict: "league_id,user_id" },
      );
    if (error) throw error;
    return { ok: true };
  });
