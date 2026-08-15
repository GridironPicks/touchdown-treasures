import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SEASON } from "@/lib/league";

const schema = z.object({
  leagueId: z.string().uuid(),
  seasonType: z.enum(["pre", "reg"]),
  week: z.number().int().min(1).max(22),
});

export type RecapRow = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  points: number;
  correct_count: number;
  predicted_total: number | null;
  tiebreak_diff: number | null;
  submitted_at: string | null;
  place: number;
  decided_by: string | null;
};

export type RecapHighlight = {
  kind: string;
  user_id: string | null;
  team_name: string | null;
  mascot: string | null;
  primary_color: string | null;
  picked_team: string | null;
  matchup: string | null;
  points: number;
};

export type RecapCasualty = { user_id: string; team_name: string; team: string | null };

export type WeekRecap = {
  ready: boolean;
  rows: RecapRow[];
  highlights: RecapHighlight[];
  casualties: RecapCasualty[];
  finalGame: { matchup: string; total: number } | null;
};

/** Official results for one league + week, once every game is final. */
export const getWeekRecap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }): Promise<WeekRecap> => {
    const args = {
      _season: SEASON,
      _season_type: data.seasonType,
      _week: data.week,
      _league_id: data.leagueId,
    };

    const [recap, highlights, games] = await Promise.all([
      context.supabase.rpc("week_recap", args),
      context.supabase.rpc("week_highlights", args),
      context.supabase
        .from("games")
        .select("home_team, away_team, home_score, away_score, status, kickoff, is_tiebreaker_game")
        .eq("season", SEASON)
        .eq("season_type", data.seasonType)
        .eq("week", data.week)
        .order("kickoff"),
    ]);

    if (recap.error) throw recap.error;
    if (highlights.error) throw highlights.error;
    if (games.error) throw games.error;

    const rows = (recap.data ?? []) as RecapRow[];
    const allFinal =
      (games.data ?? []).length > 0 && (games.data ?? []).every((g) => g.status === "final");

    let casualties: RecapCasualty[] = [];
    if (allFinal && data.seasonType === "reg") {
      const board = await context.supabase.rpc("survivor_board", {
        _season: SEASON,
        _league_id: data.leagueId,
      });
      if (!board.error) {
        casualties = (board.data ?? [])
          .filter((r) => r.week === data.week && r.result === "eliminated")
          .map((r) => ({
            user_id: r.user_id as string,
            team_name: r.team_name as string,
            team: (r.team as string | null) ?? null,
          }));
      }
    }

    const sorted = [...(games.data ?? [])].sort((a, b) => {
      if (a.is_tiebreaker_game !== b.is_tiebreaker_game) return a.is_tiebreaker_game ? -1 : 1;
      return new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
    });
    const last = sorted[0];
    const finalGame =
      allFinal && last
        ? {
            matchup: `${last.away_team} @ ${last.home_team}`,
            total: (last.home_score ?? 0) + (last.away_score ?? 0),
          }
        : null;

    return {
      ready: allFinal && rows.length > 0,
      rows,
      highlights: (highlights.data ?? []) as RecapHighlight[],
      casualties,
      finalGame,
    };
  });
