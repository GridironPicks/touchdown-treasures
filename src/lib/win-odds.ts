/** Monte Carlo odds that each manager finishes the week with the most points. */

export type OpenPick = {
  user_id: string;
  external_id: string;
  picked_team: string;
  home_team: string;
  points: number;
};

/** Deterministic PRNG so repeated renders of the same data show the same odds. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param banked points already locked in, per manager
 * @param openPicks unresolved picks (one per manager per undecided game)
 * @param homeWinPct external_id -> home team win probability (0-100); missing = 50
 * @returns userId -> chance of winning the week (0-100)
 */
export function winOdds(
  banked: Record<string, number>,
  openPicks: OpenPick[],
  homeWinPct: Record<string, number>,
  runs = 5000,
): Record<string, number> {
  const users = Object.keys(banked);
  const odds: Record<string, number> = {};
  for (const u of users) odds[u] = 0;
  if (users.length === 0) return odds;

  if (openPicks.length === 0) {
    const best = Math.max(...users.map((u) => banked[u] ?? 0));
    const winners = users.filter((u) => (banked[u] ?? 0) === best);
    for (const u of winners) odds[u] = 100 / winners.length;
    return odds;
  }

  const games = [...new Set(openPicks.map((p) => p.external_id))];
  const gameIndex = new Map(games.map((g, i) => [g, i]));
  // Per game: list of [userIndex, points] awarded when the home team wins / loses.
  const userIndex = new Map(users.map((u, i) => [u, i]));
  const onHome: Array<Array<[number, number]>> = games.map(() => []);
  const onAway: Array<Array<[number, number]>> = games.map(() => []);
  for (const p of openPicks) {
    const gi = gameIndex.get(p.external_id)!;
    const ui = userIndex.get(p.user_id);
    if (ui === undefined) continue;
    (p.picked_team === p.home_team ? onHome : onAway)[gi]!.push([ui, p.points]);
  }
  const homeProb = games.map((g) => Math.min(1, Math.max(0, (homeWinPct[g] ?? 50) / 100)));

  const base = users.map((u) => banked[u] ?? 0);
  const wins = new Array(users.length).fill(0);
  const rand = mulberry32(games.length * 7919 + openPicks.length * 104729 + users.length);
  const totals = new Array(users.length).fill(0);

  for (let r = 0; r < runs; r++) {
    for (let i = 0; i < totals.length; i++) totals[i] = base[i]!;
    for (let gi = 0; gi < games.length; gi++) {
      const homeWon = rand() < homeProb[gi]!;
      for (const [ui, pts] of (homeWon ? onHome : onAway)[gi]!) totals[ui] += pts;
    }
    let best = -Infinity;
    let tied = 0;
    for (const t of totals) {
      if (t > best) {
        best = t;
        tied = 1;
      } else if (t === best) tied++;
    }
    for (let i = 0; i < totals.length; i++) if (totals[i] === best) wins[i] += 1 / tied;
  }

  for (let i = 0; i < users.length; i++) odds[users[i]!] = (wins[i] / runs) * 100;
  return odds;
}
