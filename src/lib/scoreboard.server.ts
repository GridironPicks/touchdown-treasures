// Server-only live scoreboard feed (ESPN scoreboard payload, full detail).
import type { SeasonType } from "@/lib/league";
import { fetchScoreboard } from "@/lib/nfl.server";

export type LiveGame = {
  external_id: string;
  kickoff: string;
  state: "pre" | "in" | "post";
  statusDetail: string;
  shortDetail: string;
  clock: string;
  period: number;
  awayTeam: string;
  homeTeam: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: number | null;
  homeScore: number | null;
  awayRecord: string | null;
  homeRecord: string | null;
  possessionAbbr: string | null;
  downDistance: string | null;
  /** Ball spot as shown by the provider, e.g. "KC 34". */
  ballSpot: string | null;
  /** 0-100 along the field from the possessing team's own goal line. */
  ballPercent: number | null;
  isRedZone: boolean;
  lastPlay: string | null;
  broadcast: string | null;
};

/** Converts a provider ball spot ("KC 34") into 0-100 toward the opponent goal. */
function ballPercentFrom(spot: string | null, possessionAbbr: string | null): number | null {
  if (!spot) return null;
  const match = spot.trim().match(/^([A-Z]{2,4})\s+(\d{1,2})$/i);
  if (!match) return null;
  const side = match[1]!.toUpperCase();
  const yard = Number(match[2]);
  if (!Number.isFinite(yard)) return null;
  const own = possessionAbbr ? side === possessionAbbr.toUpperCase() : true;
  return Math.min(100, Math.max(0, own ? yard : 100 - yard));
}


export async function fetchLiveScoreboard(
  season: number,
  week: number,
  seasonType: SeasonType,
): Promise<LiveGame[]> {
  const json = (await fetchScoreboard(season, week, seasonType)) as {
    events?: Array<{
      id: string;
      date: string;
      status?: {
        displayClock?: string;
        period?: number;
        type?: { state?: string; detail?: string; shortDetail?: string };
      };
      competitions?: Array<{
        broadcasts?: Array<{ names?: string[] }>;
        situation?: {
          possession?: string;
          downDistanceText?: string;
          possessionText?: string;
          isRedZone?: boolean;
          lastPlay?: { text?: string };
        };
        competitors?: Array<{
          id?: string;
          homeAway: string;
          score?: string;
          records?: Array<{ summary?: string }>;
          team?: { displayName?: string; abbreviation?: string };
        }>;
      }>;
    }>;
  };

  const out: LiveGame[] = [];
  for (const event of json.events ?? []) {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find((c) => c.homeAway === "home");
    const away = comp?.competitors?.find((c) => c.homeAway === "away");
    if (!home?.team?.displayName || !away?.team?.displayName) continue;

    const rawState = event.status?.type?.state ?? "pre";
    const state: LiveGame["state"] =
      rawState === "in" ? "in" : rawState === "post" ? "post" : "pre";
    const scored = state !== "pre";
    const situation = comp?.situation;
    const possessionId = situation?.possession;
    const possessionAbbr =
      possessionId && comp?.competitors
        ? (comp.competitors.find((c) => c.id === possessionId)?.team?.abbreviation ?? null)
        : null;

    out.push({
      external_id: `espn:${event.id}`,
      kickoff: new Date(event.date).toISOString(),
      state,
      statusDetail: event.status?.type?.detail ?? "",
      shortDetail: event.status?.type?.shortDetail ?? "",
      clock: event.status?.displayClock ?? "",
      period: event.status?.period ?? 0,
      awayTeam: away.team.displayName,
      homeTeam: home.team.displayName,
      awayAbbr: away.team.abbreviation ?? "",
      homeAbbr: home.team.abbreviation ?? "",
      awayScore: scored ? Number(away.score ?? 0) : null,
      homeScore: scored ? Number(home.score ?? 0) : null,
      awayRecord: away.records?.[0]?.summary ?? null,
      homeRecord: home.records?.[0]?.summary ?? null,
      possessionAbbr: state === "in" ? possessionAbbr : null,
      downDistance:
        state === "in"
          ? [situation?.downDistanceText, situation?.possessionText]
              .filter(Boolean)
              .join(" at ") || null
          : null,
      ballSpot: state === "in" ? (situation?.possessionText ?? null) : null,
      ballPercent:
        state === "in"
          ? ballPercentFrom(situation?.possessionText ?? null, possessionAbbr)
          : null,
      isRedZone: state === "in" && !!situation?.isRedZone,

      lastPlay: state === "in" ? (situation?.lastPlay?.text ?? null) : null,
      broadcast: comp?.broadcasts?.[0]?.names?.[0] ?? null,
    });
  }

  out.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  return out;
}
