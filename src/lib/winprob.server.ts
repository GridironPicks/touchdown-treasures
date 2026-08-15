// Server-only live win probability feed (ESPN scoreboard "situation" block).
import type { SeasonType } from "@/lib/league";

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

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
  const espnSeasonType = seasonType === "pre" ? 1 : 2;
  const url = `${ESPN_SCOREBOARD}?dates=${season}&seasontype=${espnSeasonType}&week=${week}`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      referer: "https://www.espn.com/",
    },
  });
  if (!res.ok) throw new Error(`Win probability provider responded ${res.status}`);

  const json = (await res.json()) as {
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
