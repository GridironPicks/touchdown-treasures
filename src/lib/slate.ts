import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { SEASON, weekDeadline, type Game, type SeasonType } from "@/lib/league";

export type Slate = { seasonType: SeasonType; week: number };

/**
 * The slate managers are currently picking: the earliest week that still has
 * games to play and whose Wednesday 6PM lock has not passed. Preseason weeks
 * come first, so the league rolls into the regular season automatically.
 */
export async function fetchCurrentSlate(): Promise<Slate> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("season", SEASON)
    .neq("status", "final")
    .order("kickoff");
  if (error) throw error;

  const games = (data ?? []) as Game[];
  if (games.length === 0) return { seasonType: "reg", week: 18 };

  const groups: Array<{ slate: Slate; games: Game[] }> = [];
  for (const g of games) {
    const found = groups.find(
      (x) => x.slate.seasonType === g.season_type && x.slate.week === g.week,
    );
    if (found) found.games.push(g);
    else groups.push({ slate: { seasonType: g.season_type, week: g.week }, games: [g] });
  }

  const now = Date.now();
  const open = groups.find((x) => {
    const d = weekDeadline(x.games);
    return d !== null && d.getTime() > now;
  });
  return (open ?? groups[0]!).slate;
}

export function useCurrentSlate() {
  return useQuery({ queryKey: ["current-slate"], queryFn: fetchCurrentSlate });
}


export function slateLabel(slate: Slate): string {
  return slate.seasonType === "pre" ? `Preseason Week ${slate.week}` : `Week ${slate.week}`;
}
