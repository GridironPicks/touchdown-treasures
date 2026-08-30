// Server-only NFL data sync. Provider: ESPN public NFL scoreboard feed.
// Swapping providers only requires changing `fetchProviderWeek`.
import type { Database } from "@/integrations/supabase/types";
import type { SeasonType } from "@/lib/league";

export type ProviderGame = {
  external_id: string;
  season: number;
  season_type: SeasonType;
  week: number;
  kickoff: string;
  away_team: string;
  home_team: string;
  away_score: number | null;
  home_score: number | null;
  status: "scheduled" | "in_progress" | "final";
};

// ESPN serves the same scoreboard payload from several hosts. `site.api`
// blocks data-center IPs with a 403, so `site.web.api` is tried first and the
// legacy host is kept as a fallback.
const ESPN_SCOREBOARD_HOSTS = [
  "https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
];

function mapStatus(state: string, completed: boolean): ProviderGame["status"] {
  if (completed || state === "post") return "final";
  if (state === "in") return "in_progress";
  return "scheduled";
}

/** Fetches one week of the ESPN scoreboard, trying each host in turn. */
export async function fetchScoreboard(
  season: number,
  week: number,
  seasonType: SeasonType,
): Promise<any> {
  const espnSeasonType = seasonType === "pre" ? 1 : seasonType === "post" ? 3 : 2;
  const query = `?dates=${season}&seasontype=${espnSeasonType}&week=${week}`;
  let lastError = "";
  for (const host of ESPN_SCOREBOARD_HOSTS) {
    try {
      const res = await fetch(`${host}${query}`, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          referer: "https://www.espn.com/",
        },
      });
      if (res.ok) return await res.json();
      lastError = `${host} responded ${res.status}`;
      console.error("[espn]", lastError);
    } catch (error) {
      lastError = `${host} threw ${error instanceof Error ? error.message : String(error)}`;
      console.error("[espn]", lastError);
    }
  }
  throw new Error(`NFL provider unreachable (${lastError})`);
}

export async function fetchProviderWeek(
  season: number,
  week: number,
  seasonType: SeasonType = "reg",
): Promise<ProviderGame[]> {
  const json = (await fetchScoreboard(season, week, seasonType)) as {

    events?: Array<{
      id: string;
      date: string;
      status?: { type?: { state?: string; completed?: boolean } };
      competitions?: Array<{
        competitors?: Array<{
          homeAway: string;
          score?: string;
          team?: { displayName?: string };
        }>;
      }>;
    }>;
  };

  const games: ProviderGame[] = [];
  for (const event of json.events ?? []) {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find((c) => c.homeAway === "home");
    const away = comp?.competitors?.find((c) => c.homeAway === "away");
    if (!home?.team?.displayName || !away?.team?.displayName) continue;

    const state = event.status?.type?.state ?? "pre";
    const completed = event.status?.type?.completed ?? false;
    const status = mapStatus(state, completed);
    const scored = status !== "scheduled";

    games.push({
      external_id: `espn:${event.id}`,
      season,
      season_type: seasonType,
      week,
      kickoff: new Date(event.date).toISOString(),
      away_team: away.team.displayName,
      home_team: home.team.displayName,
      away_score: scored ? Number(away.score ?? 0) : null,
      home_score: scored ? Number(home.score ?? 0) : null,
      status,
    });
  }

  games.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  return games;
}

type GameInsert = Database["public"]["Tables"]["games"]["Insert"];

/**
 * Upserts one week of games keyed on the provider game id, flags the last
 * kickoff of the week as the Monday-night tiebreaker game, and removes stale
 * rows (seeded placeholders or games the provider rescheduled away).
 */
export async function syncWeek(season: number, week: number, seasonType: SeasonType = "reg") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const games = await fetchProviderWeek(season, week, seasonType);
  if (games.length === 0)
    return { season, season_type: seasonType, week, synced: 0, removed: 0 };

  const rows: GameInsert[] = games.map((g, i) => ({
    ...g,
    is_tiebreaker_game: i === games.length - 1,
  }));

  const { error } = await supabaseAdmin
    .from("games")
    .upsert(rows, { onConflict: "external_id" });
  if (error) throw new Error(error.message);

  const keep = games.map((g) => g.external_id);
  const { data: stale, error: staleError } = await supabaseAdmin
    .from("games")
    .select("id, external_id")
    .eq("season", season)
    .eq("season_type", seasonType)
    .eq("week", week);
  if (staleError) throw new Error(staleError.message);

  const staleIds = (stale ?? [])
    .filter((g) => !g.external_id || !keep.includes(g.external_id))
    .map((g) => g.id);

  if (staleIds.length > 0) {
    const { error: delError } = await supabaseAdmin.from("games").delete().in("id", staleIds);
    if (delError) throw new Error(delError.message);
  }

  return { season, season_type: seasonType, week, synced: rows.length, removed: staleIds.length };
}

export type Slate = { seasonType: SeasonType; week: number };

/** Active slate per the database helper, falling back to preseason week 1. */
export async function resolveCurrentSlate(season: number): Promise<Slate> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("current_slate", { _season: season });
  const row = Array.isArray(data) ? data[0] : null;
  if (row) return { seasonType: row.season_type, week: row.week };
  return { seasonType: "pre", week: 1 };
}

/**
 * Preseason runs Hall of Fame week + weeks 1-3; regular season runs 1-18;
 * postseason runs Wild Card through the Super Bowl (ESPN weeks 1-4, where
 * week 4 is the Super Bowl — ESPN numbers it 5, handled in the fetch layer).
 */
export function nextSlate(slate: Slate): Slate {
  const maxWeek = slate.seasonType === "pre" ? 4 : slate.seasonType === "post" ? 4 : 18;
  if (slate.week < maxWeek) return { seasonType: slate.seasonType, week: slate.week + 1 };
  if (slate.seasonType === "pre") return { seasonType: "reg", week: 1 };
  if (slate.seasonType === "reg") return { seasonType: "post", week: 1 };
  return slate;
}

