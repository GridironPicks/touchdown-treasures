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
  seasonType: z.enum(["pre", "reg"]),
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
    throw new Error("That isn't available for the Global Pool");
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
        seasonType: z.enum(["pre", "reg"]),
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
    await assertOwner(context.supabase as never, data.leagueId, context.userId);
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
    await assertOwner(context.supabase as never, data.leagueId, context.userId);
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
    const league = await assertOwner(context.supabase as never, data.leagueId, context.userId);

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
