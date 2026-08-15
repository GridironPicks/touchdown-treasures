// Server-only live win probability feed (ESPN scoreboard "situation" block).
import type { SeasonType } from "@/lib/league";
import { fetchScoreboard } from "@/lib/nfl.server";

export type WinProb = {
  external_id: string;
  homePct: number; // 0-100
  awayPct: number; // 0-100
  live: boolean;
};

export async function fetchWinProbabilities(
  season: number,
  week: number,
  seasonType: SeasonType,
): Promise<WinProb[]> {
  const json = (await fetchScoreboard(season, week, seasonType)) as {

    events?: Array<{
      id: string;
      status?: { type?: { state?: string } };
      competitions?: Array<{
        situation?: {
          lastPlay?: {
            probability?: { homeWinPercentage?: number; awayWinPercentage?: number };
          };
};
      }>;
    }>;
  };

  const out: WinProb[] = [];
  for (const event of json.events ?? []) {
    const state = event.status?.type?.state ?? "pre";
    const prob = event.competitions?.[0]?.situation?.lastPlay?.probability;
    if (!prob || typeof prob.homeWinPercentage !== "number") continue;
    const homePct = Math.round(prob.homeWinPercentage * 100);
    out.push({
      external_id: `espn:${event.id}`,
      homePct,
      awayPct: 100 - homePct,
      live: state === "in",
    });
  }
  return out;
}
