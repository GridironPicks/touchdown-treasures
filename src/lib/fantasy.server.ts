// Server-only fantasy (Mini DFS) data sync: weekly player pool + live PPR scoring.
// Provider: ESPN public team roster and game summary feeds.
import type { SeasonType } from "@/lib/league";
import { teamAbbr } from "@/lib/teams";

const ESPN_HOSTS = [
  "https://site.web.api.espn.com/apis/site/v2/sports/football/nfl",
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl",
];

const HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  referer: "https://www.espn.com/",
};

async function espn(path: string): Promise<any> {
  let lastError = "";
  for (const host of ESPN_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { headers: HEADERS });
      if (res.ok) return await res.json();
      lastError = `${host}${path} responded ${res.status}`;
    } catch (error) {
      lastError = `${host}${path} threw ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  throw new Error(`NFL provider unreachable (${lastError})`);
}

const SLOT_POSITIONS = ["QB", "RB", "WR", "TE"] as const;
export type FantasyPosition = (typeof SLOT_POSITIONS)[number];

/** Depth-order baseline used before we have any real production to rank on. */
const BASELINE: Record<FantasyPosition, number[]> = {
  QB: [4, 1],
  RB: [4, 3, 2],
  WR: [4, 3, 2],
  TE: [3, 1],
};

type PoolPlayer = {
  espn_id: string;
  name: string;
  position: FantasyPosition;
  team: string;
  opponent: string | null;
  headshot: string | null;
  cost: number;
};

async function fetchRoster(team: string, opponent: string | null): Promise<PoolPlayer[]> {
  const abbr = teamAbbr(team);
  if (!abbr) return [];
  const json = await espn(`/teams/${abbr}/roster`);
  const out: PoolPlayer[] = [];
  const depth: Record<string, number> = {};

  for (const group of json.athletes ?? []) {
    for (const item of group.items ?? []) {
      const pos = item?.position?.abbreviation as string | undefined;
      if (!pos || !SLOT_POSITIONS.includes(pos as FantasyPosition)) continue;
      if (item?.status?.type && item.status.type !== "active") continue;
      const position = pos as FantasyPosition;
      const index = depth[position] ?? 0;
      depth[position] = index + 1;
      out.push({
        espn_id: String(item.id),
        name: item.fullName ?? item.displayName ?? "Unknown",
        position,
        team,
        opponent,
        headshot: item?.headshot?.href ?? null,
        cost: BASELINE[position][index] ?? 1,
      });
    }
  }
  return out;
}

/**
 * Rebuilds the star costs from season-to-date production once we have games in
 * the books: top producers at each position cost 5 stars, down to 1.
 */
async function applyStatBasedCosts(
  players: PoolPlayer[],
  season: number,
  seasonType: SeasonType,
  week: number,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("fantasy_player_stats")
    .select("espn_id, points, week")
    .eq("season", season)
    .eq("season_type", seasonType)
    .lt("week", week);

  const rows = data ?? [];
  if (rows.length === 0) return;

  const totals = new Map<string, { pts: number; games: number }>();
  for (const r of rows) {
    const prev = totals.get(r.espn_id) ?? { pts: 0, games: 0 };
    totals.set(r.espn_id, { pts: prev.pts + Number(r.points), games: prev.games + 1 });
  }

  const byPosition = new Map<FantasyPosition, PoolPlayer[]>();
  for (const p of players) {
    const list = byPosition.get(p.position) ?? [];
    list.push(p);
    byPosition.set(p.position, list);
  }

  for (const [, list] of byPosition) {
    const scored = list
      .map((p) => {
        const t = totals.get(p.espn_id);
        return { p, avg: t && t.games > 0 ? t.pts / t.games : -1 };
      })
      .filter((x) => x.avg >= 0)
      .sort((a, b) => b.avg - a.avg);

    const n = scored.length;
    scored.forEach((entry, i) => {
      const pct = n <= 1 ? 0 : i / (n - 1);
      entry.p.cost = pct < 0.06 ? 5 : pct < 0.16 ? 4 : pct < 0.32 ? 3 : pct < 0.55 ? 2 : 1;
    });
  }
}

/** Builds (or refreshes) the draftable player pool for one slate. */
export async function syncFantasyPool(season: number, seasonType: SeasonType, week: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: games, error } = await supabaseAdmin
    .from("games")
    .select("home_team, away_team")
    .eq("season", season)
    .eq("season_type", seasonType)
    .eq("week", week);
  if (error) throw new Error(error.message);
  if (!games || games.length === 0) return { players: 0 };

  const matchups: Array<{ team: string; opponent: string }> = [];
  for (const g of games) {
    matchups.push({ team: g.home_team, opponent: `vs ${g.away_team}` });
    matchups.push({ team: g.away_team, opponent: `at ${g.home_team}` });
  }

  const rosters = await Promise.all(
    matchups.map((m) =>
      fetchRoster(m.team, m.opponent).catch((e) => {
        console.error("[fantasy roster]", m.team, e);
        return [] as PoolPlayer[];
      }),
    ),
  );
  const players = rosters.flat();
  if (players.length === 0) return { players: 0 };

  await applyStatBasedCosts(players, season, seasonType, week);

  const rows = players.map((p) => ({
    season,
    season_type: seasonType,
    week,
    espn_id: p.espn_id,
    name: p.name,
    position: p.position,
    team: p.team,
    opponent: p.opponent,
    headshot: p.headshot,
    cost: p.cost,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabaseAdmin
    .from("fantasy_players")
    .upsert(rows, { onConflict: "season,season_type,week,espn_id" });
  if (upsertError) throw new Error(upsertError.message);

  return { players: rows.length };
}

function num(value: unknown): number {
  const n = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function pick(labels: string[], stats: string[], label: string): number {
  const i = labels.findIndex((l) => l.toUpperCase() === label.toUpperCase());
  return i === -1 ? 0 : num(stats[i]);
}

type StatLine = {
  espn_id: string;
  points: number;
  line: string;
};

function scoreBox(json: any): StatLine[] {
  const acc = new Map<string, { pts: number; bits: string[] }>();

  for (const teamBlock of json?.boxscore?.players ?? []) {
    for (const cat of teamBlock?.statistics ?? []) {
      const name = String(cat?.name ?? "").toLowerCase();
      const labels: string[] = cat?.labels ?? [];
      for (const a of cat?.athletes ?? []) {
        const id = a?.athlete?.id ? String(a.athlete.id) : null;
        if (!id) continue;
        const stats: string[] = a?.stats ?? [];
        let pts = 0;
        let bit = "";

        if (name === "passing") {
          const yds = pick(labels, stats, "YDS");
          const td = pick(labels, stats, "TD");
          const int = pick(labels, stats, "INT");
          pts = yds * 0.04 + td * 4 - int * 2;
          bit = `${yds} pass yd, ${td} TD, ${int} INT`;
        } else if (name === "rushing") {
          const yds = pick(labels, stats, "YDS");
          const td = pick(labels, stats, "TD");
          pts = yds * 0.1 + td * 6;
          bit = `${yds} rush yd, ${td} TD`;
        } else if (name === "receiving") {
          const rec = pick(labels, stats, "REC");
          const yds = pick(labels, stats, "YDS");
          const td = pick(labels, stats, "TD");
          pts = rec + yds * 0.1 + td * 6;
          bit = `${rec} rec, ${yds} yd, ${td} TD`;
        } else if (name === "fumbles") {
          const lost = pick(labels, stats, "LOST");
          pts = -2 * lost;
          if (lost > 0) bit = `${lost} fumble lost`;
        } else {
          continue;
        }

        const prev = acc.get(id) ?? { pts: 0, bits: [] };
        prev.pts += pts;
        if (bit) prev.bits.push(bit);
        acc.set(id, prev);
      }
    }
  }

  return [...acc.entries()].map(([espn_id, v]) => ({
    espn_id,
    points: Math.round(v.pts * 100) / 100,
    line: v.bits.join(" · "),
  }));
}

/** Pulls live PPR scoring for every game in a slate. */
export async function syncFantasyStats(season: number, seasonType: SeasonType, week: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: games, error } = await supabaseAdmin
    .from("games")
    .select("external_id, status")
    .eq("season", season)
    .eq("season_type", seasonType)
    .eq("week", week);
  if (error) throw new Error(error.message);

  const events = (games ?? [])
    .filter((g) => g.external_id && g.status !== "scheduled")
    .map((g) => ({ id: g.external_id!.replace("espn:", ""), final: g.status === "final" }));
  if (events.length === 0) return { players: 0 };

  const results = await Promise.all(
    events.map(async (e) => {
      try {
        const json = await espn(`/summary?event=${e.id}`);
        return scoreBox(json).map((s) => ({ ...s, is_final: e.final }));
      } catch (err) {
        console.error("[fantasy box]", e.id, err);
        return [];
      }
    }),
  );

  const rows = results.flat().map((s) => ({
    season,
    season_type: seasonType,
    week,
    espn_id: s.espn_id,
    points: s.points,
    line: s.line,
    is_final: s.is_final,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return { players: 0 };

  const { error: upsertError } = await supabaseAdmin
    .from("fantasy_player_stats")
    .upsert(rows, { onConflict: "season,season_type,week,espn_id" });
  if (upsertError) throw new Error(upsertError.message);

  return { players: rows.length };
}

const MIN_INTERVAL_MS = 20_000;
const POOL_INTERVAL_MS = 6 * 60 * 60 * 1000;
const lastRun = new Map<string, number>();

export function shouldRun(key: string, interval = MIN_INTERVAL_MS): boolean {
  const now = Date.now();
  const prev = lastRun.get(key) ?? 0;
  if (now - prev < interval) return false;
  lastRun.set(key, now);
  return true;
}

export const POOL_THROTTLE_MS = POOL_INTERVAL_MS;
