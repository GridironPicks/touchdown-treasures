import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { PLAYOFF_ROUNDS, SEASON, weekDeadline, type Game, type SeasonType } from "@/lib/league";

export type Slate = { seasonType: SeasonType; week: number };

export type SlateInfo = Slate & {
  games: Game[];
  deadline: Date | null;
  allFinal: boolean;
  anyStarted: boolean;
};

/** Every 2026 slate (preseason then regular season) in chronological order. */
export async function fetchSlates(): Promise<SlateInfo[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("season", SEASON)
    .order("kickoff");
  if (error) throw error;

  const games = (data ?? []) as Game[];
  const groups: SlateInfo[] = [];
  for (const g of games) {
    let found = groups.find((x) => x.seasonType === g.season_type && x.week === g.week);
    if (!found) {
      found = {
        seasonType: g.season_type,
        week: g.week,
        games: [],
        deadline: null,
        allFinal: true,
        anyStarted: false,
      };
      groups.push(found);
    }
    found.games.push(g);
  }

  const now = Date.now();
  for (const group of groups) {
    group.deadline = weekDeadline(group.games);
    group.allFinal = group.games.every((g) => g.status === "final");
    group.anyStarted = group.games.some((g) => new Date(g.kickoff).getTime() <= now);
  }
  return groups;
}

export function useSlates() {
  return useQuery({ queryKey: ["slates", SEASON], queryFn: fetchSlates });
}

/**
 * The slate to show by default: the earliest slate that still has games left
 * to play — so a week in progress stays visible until it wraps up, instead of
 * jumping ahead the moment its Wednesday lock passes.
 */
export function defaultSlate(slates: SlateInfo[]): Slate | null {
  if (slates.length === 0) return null;
  const live = slates.find((s) => !s.allFinal);
  const chosen = live ?? slates[slates.length - 1]!;
  return { seasonType: chosen.seasonType, week: chosen.week };
}

export function sameSlate(a: Slate | null, b: Slate | null): boolean {
  return !!a && !!b && a.seasonType === b.seasonType && a.week === b.week;
}

export function slateLabel(slate: Slate): string {
  if (slate.seasonType === "pre") return `Preseason Week ${slate.week}`;
  if (slate.seasonType === "post") return PLAYOFF_ROUNDS[slate.week]?.label ?? "Playoffs";
  return `Week ${slate.week}`;
}

/**
 * True when every game of a slate shares one kickoff time — the NFL hasn't
 * scheduled the week yet, so the feed serves a placeholder slot.
 */
export function hasPlaceholderTimes(games: { kickoff: string }[]): boolean {
  if (games.length < 2) return false;
  return new Set(games.map((g) => g.kickoff)).size === 1;
}

/**
 * Awards (week trophies, badges) are only official once every game of the week
 * is final — a week still in progress can flip its winner with the last game.
 */
export function settledWeeks(slates: SlateInfo[], seasonType: SeasonType): Set<number> {
  return new Set(
    slates.filter((s) => s.seasonType === seasonType && s.allFinal).map((s) => s.week),
  );
}

/** True when every week of the slate type that has kicked off is fully final. */
export function allPlayedWeeksSettled(slates: SlateInfo[], seasonType: SeasonType): boolean {
  return slates
    .filter((s) => s.seasonType === seasonType && s.anyStarted)
    .every((s) => s.allFinal);
}

/** Backwards-compatible single-slate hook. */
export function useCurrentSlate() {
  return useQuery({
    queryKey: ["current-slate", SEASON],
    queryFn: async () => defaultSlate(await fetchSlates()),
  });
}
