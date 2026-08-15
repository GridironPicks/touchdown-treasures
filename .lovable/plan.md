# Win Probability in Standings

Add a "Chance to win the week" percentage for every manager on the Standings page, next to the existing Live Points panel.

## What you'll see

On Standings → **By week**, the Live points panel gains a **Win %** column:

- Each manager shows their odds of finishing the week with the most points, e.g. `62%`.
- A leader is shown as `Clinched` (100%) and a mathematically eliminated manager as `Out` (0%) — reusing the badges already there.
- Odds update on the same live cadence as the rest of the panel (every 60s while games run) and freeze once all games are final.
- Before any game kicks off, the panel shows odds based purely on the pregame win probabilities of each game.
- A one-line note explains the number: "Odds simulate the remaining games using live win probability."

## How the number is calculated

For each still-unresolved game we already pull ESPN's live win probability (the same feed powering the win-probability bars on the Picks page). Each manager's outstanding confidence points are attached to the team they picked in that game. We then run a simulation (about 5,000 random runs) where each remaining game is decided by its live probability, add each manager's earned points to their banked total, and count how often each manager finishes first. Ties for first split the credit.

This gives odds that correctly account for correlated outcomes — two managers who picked the same team rise and fall together, which a simple per-game estimate would miss.

## Technical notes

- New security-definer SQL function `week_open_picks(_season, _season_type, _week, _league_id)` returning one row per manager per unresolved game: `user_id, external_id, picked_team, points`. It respects the same reveal gate as `picks_revealed`/`week_live_standings`, so nothing leaks before the deadline.
- New server function `getOpenPicks` in `src/lib/awards.functions.ts` (auth middleware, same shape as `getLiveStandings`).
- New `src/lib/win-odds.ts` — pure client-side Monte Carlo: takes banked totals, open picks, and the win-probability map, returns `Record<userId, number>`. Deterministic seed so numbers don't jitter between renders of the same data.
- `src/components/LivePoints.tsx` gains a `useQuery` on the existing `getWinProbabilities` server fn (`src/lib/winprob.functions.ts`) plus the new open-picks query, computes odds with `useMemo`, and renders the Win % column. Games missing a probability from the feed fall back to 50/50 (pregame games without a probability use the same fallback).
- No changes to scoring, reveal rules, or existing queries; all styling uses existing semantic tokens.
