import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { SEASON, type SeasonType } from "@/lib/league";

export type Slate = { seasonType: SeasonType; week: number };

/**
 * The slate managers are currently picking: the earliest game that is not final.
 * Preseason weeks come first, so the league rolls into the regular season
 * automatically once preseason Week 4 goes final.
 */
export async function fetchCurrentSlate(): Promise<Slate> {
  const { data, error } = await supabase
    .from("games")
    .select("season_type, week")
    .eq("season", SEASON)
    .neq("status", "final")
    .order("kickoff")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return { seasonType: data.season_type, week: data.week };

  const last = await supabase
    .from("games")
    .select("season_type, week")
    .eq("season", SEASON)
    .order("kickoff", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last.data) return { seasonType: last.data.season_type, week: last.data.week };
  return { seasonType: "pre", week: 1 };
}

export function useCurrentSlate() {
  return useQuery({ queryKey: ["current-slate"], queryFn: fetchCurrentSlate });
}

export function slateLabel(slate: Slate): string {
  return slate.seasonType === "pre" ? `Preseason Week ${slate.week}` : `Week ${slate.week}`;
}
