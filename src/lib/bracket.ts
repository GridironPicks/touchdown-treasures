import { PLAYOFF_ROUNDS } from "@/lib/league";
import { conferenceOf } from "@/lib/conference";

export type PostGame = {
  week: number;
  kickoff: string;
  status: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
};

/** Winner of a finished postseason game, or null while it's unplayed. */
export function winnerOf(g: PostGame): string | null {
  if (g.status !== "final" || g.home_score === null || g.away_score === null) return null;
  if (g.home_score === g.away_score) return null;
  return g.home_score > g.away_score ? g.home_team : g.away_team;
}

/** Teams that actually advanced out of each round, by round number. */
export function actualWinners(games: PostGame[]): Map<number, Set<string>> {
  const out = new Map<number, Set<string>>();
  for (const g of games) {
    const w = winnerOf(g);
    if (!w) continue;
    const set = out.get(g.week) ?? new Set<string>();
    set.add(w);
    out.set(g.week, set);
  }
  return out;
}

export type BracketPick = { round: number; slot: number; team: string };

/**
 * Escalating scoring: every correctly advanced team is worth the round's
 * point value (2 / 4 / 8 / 16), so the Super Bowl decides most brackets.
 */
export function scoreBracket(picks: BracketPick[], games: PostGame[]): number {
  const winners = actualWinners(games);
  let total = 0;
  for (const p of picks) {
    if (winners.get(p.round)?.has(p.team)) total += PLAYOFF_ROUNDS[p.round]?.points ?? 0;
  }
  return total;
}

/** How many teams a round advances per conference, in bracket order. */
export const ROUND_SLOTS: Record<number, number> = { 1: 3, 2: 2, 3: 1, 4: 1 };

/** The playoff field derived from the Wild Card slate plus the bye teams. */
export function fieldFromWildCard(games: PostGame[]): { AFC: string[]; NFC: string[] } {
  const field = { AFC: [] as string[], NFC: [] as string[] };
  for (const g of games.filter((x) => x.week === 1)) {
    for (const t of [g.home_team, g.away_team]) {
      const conf = conferenceOf(t);
      if (!field[conf].includes(t)) field[conf].push(t);
    }
  }
  return field;
}
