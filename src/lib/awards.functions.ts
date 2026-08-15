import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SEASON } from "@/lib/league";

const weekSchema = z.object({
  leagueId: z.string().uuid(),
  seasonType: z.enum(["pre", "reg"]),
  week: z.number().int().min(1).max(22),
});

const seasonSchema = z.object({
  leagueId: z.string().uuid(),
  seasonType: z.enum(["pre", "reg"]),
});

export type LiveRow = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  banked: number;
  live: number;
  max_possible: number;
  correct_count: number;
  remaining: number;
};

export type BadgeRow = {
  week: number | null;
  user_id: string;
  badge: string;
  detail: string | null;
};

export type H2HRow = {
  user_id: string;
  opponent_id: string;
  wins: number;
  losses: number;
  ties: number;
};

/** Banked / live / best-case points for one week while games are in progress. */
export const getLiveStandings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => weekSchema.parse(input))
  .handler(async ({ data, context }): Promise<LiveRow[]> => {
    const { data: rows, error } = await context.supabase.rpc("week_live_standings", {
      _season: SEASON,
      _season_type: data.seasonType,
      _week: data.week,
      _league_id: data.leagueId,
    });
    if (error) throw error;
    return (rows ?? []) as LiveRow[];
  });

/** Every badge earned by every manager in the league this season. */
export const getManagerBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => seasonSchema.parse(input))
  .handler(async ({ data, context }): Promise<BadgeRow[]> => {
    const { data: rows, error } = await context.supabase.rpc("manager_badges", {
      _season: SEASON,
      _season_type: data.seasonType,
      _league_id: data.leagueId,
    });
    if (error) throw error;
    return (rows ?? []) as BadgeRow[];
  });

/** Pairwise weekly win/loss/tie records inside the league. */
export const getHeadToHead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => seasonSchema.parse(input))
  .handler(async ({ data, context }): Promise<H2HRow[]> => {
    const { data: rows, error } = await context.supabase.rpc("head_to_head", {
      _season: SEASON,
      _season_type: data.seasonType,
      _league_id: data.leagueId,
    });
    if (error) throw error;
    return (rows ?? []) as H2HRow[];
  });

export type OpenPickRow = {
  user_id: string;
  external_id: string;
  picked_team: string;
  home_team: string;
  points: number;
};

/** Still-undecided picks for the week, used to simulate each manager's win odds. */
export const getOpenPicks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => weekSchema.parse(input))
  .handler(async ({ data, context }): Promise<OpenPickRow[]> => {
    const { data: rows, error } = await context.supabase.rpc("week_open_picks", {
      _season: SEASON,
      _season_type: data.seasonType,
      _week: data.week,
      _league_id: data.leagueId,
    });
    if (error) throw error;
    return (rows ?? []) as OpenPickRow[];
  });
