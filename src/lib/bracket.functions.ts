import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SEASON } from "@/lib/league";

const leagueSchema = z.object({ leagueId: z.string().uuid() });

const submitSchema = z.object({
  leagueId: z.string().uuid(),
  champion: z.string().min(1).max(60),
  tiebreakTotal: z.number().int().min(0).max(200),
  picks: z
    .array(
      z.object({
        round: z.number().int().min(1).max(4),
        slot: z.number().int().min(0).max(11),
        team: z.string().min(1).max(60),
      }),
    )
    .min(1)
    .max(24),
});

export type BracketStanding = {
  user_id: string;
  team_name: string;
  display_name: string;
  mascot: string;
  primary_color: string;
  points: number;
  champion: string | null;
  tiebreak_total: number | null;
  revealed: boolean;
};

export type BracketState = {
  locked: boolean;
  lockAt: string | null;
  field: { AFC: string[]; NFC: string[] };
  myPicks: { round: number; slot: number; team: string }[];
  myChampion: string | null;
  myTiebreak: number | null;
  standings: BracketStanding[];
};

async function postseasonGames(supabase: { from: (t: string) => any }) {
  const { data, error } = await supabase
    .from("games")
    .select("week, kickoff, status, home_team, away_team, home_score, away_score")
    .eq("season", SEASON)
    .eq("season_type", "post")
    .order("kickoff");
  if (error) throw error;
  return (data ?? []) as import("@/lib/bracket.server").PostGame[];
}

/** Everything the bracket page needs: field, your entry and the standings. */
export const getBracketState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => leagueSchema.parse(input))
  .handler(async ({ data, context }): Promise<BracketState> => {
    const { fieldFromWildCard, scoreBracket } = await import("@/lib/bracket.server");
    const games = await postseasonGames(context.supabase as never);

    const wildCard = games.filter((g) => g.week === 1);
    const lockAt = wildCard.length
      ? wildCard.map((g) => g.kickoff).sort()[0]!
      : null;
    const locked = lockAt !== null && Date.now() >= new Date(lockAt).getTime();

    const { data: entries, error } = await context.supabase
      .from("bracket_entries")
      .select("id, user_id, champion, tiebreak_total")
      .eq("league_id", data.leagueId)
      .eq("season", SEASON);
    if (error) throw error;

    const rows = (entries ?? []) as {
      id: string;
      user_id: string;
      champion: string;
      tiebreak_total: number;
    }[];

    const { data: allPicks } = await context.supabase
      .from("bracket_picks")
      .select("entry_id, round, slot, team")
      .in("entry_id", rows.length ? rows.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"]);

    const picksByEntry = new Map<string, { round: number; slot: number; team: string }[]>();
    for (const p of (allPicks ?? []) as {
      entry_id: string;
      round: number;
      slot: number;
      team: string;
    }[]) {
      const list = picksByEntry.get(p.entry_id) ?? [];
      list.push({ round: p.round, slot: p.slot, team: p.team });
      picksByEntry.set(p.entry_id, list);
    }

    const { data: members } = await context.supabase
      .from("league_memberships")
      .select("user_id")
      .eq("league_id", data.leagueId);
    const memberIds = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id);

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, display_name, team_name, mascot, primary_color")
      .in("id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"]);

    const standings: BracketStanding[] = ((profiles ?? []) as any[]).map((p) => {
      const entry = rows.find((r) => r.user_id === p.id);
      const picks = entry ? (picksByEntry.get(entry.id) ?? []) : [];
      const mine = p.id === context.userId;
      const revealed = locked || mine;
      return {
        user_id: p.id,
        display_name: p.display_name,
        team_name: p.team_name,
        mascot: p.mascot,
        primary_color: p.primary_color,
        points: entry ? scoreBracket(picks, games) : 0,
        champion: entry && revealed ? entry.champion : null,
        tiebreak_total: entry && revealed ? entry.tiebreak_total : null,
        revealed: revealed && !!entry,
      };
    });
    standings.sort((a, b) => b.points - a.points || a.team_name.localeCompare(b.team_name));

    const mineEntry = rows.find((r) => r.user_id === context.userId) ?? null;

    return {
      locked,
      lockAt,
      field: fieldFromWildCard(games),
      myPicks: mineEntry ? (picksByEntry.get(mineEntry.id) ?? []) : [],
      myChampion: mineEntry?.champion ?? null,
      myTiebreak: mineEntry?.tiebreak_total ?? null,
      standings,
    };
  });

/** One-shot bracket submission — the database trigger enforces the lock. */
export const submitBracket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: entry, error } = await context.supabase
      .from("bracket_entries")
      .insert({
        league_id: data.leagueId,
        user_id: context.userId,
        season: SEASON,
        champion: data.champion,
        tiebreak_total: data.tiebreakTotal,
      })
      .select("id")
      .single();
    if (error) throw error;

    const { error: pickError } = await context.supabase
      .from("bracket_picks")
      .insert(data.picks.map((p) => ({ entry_id: (entry as { id: string }).id, ...p })));
    if (pickError) throw pickError;

    return { ok: true };
  });
