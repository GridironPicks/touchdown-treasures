# Live Scoreboard Tab

Add a dedicated Scoreboard tab showing every game in the current week with live clock, quarter, score, possession, and situation.

## What you'll see

A new **Scoreboard** tab in the nav (top nav on desktop, bottom bar on mobile) at `/scoreboard`:

- Week selector at the top (same picker used on Picks), defaulting to the live week.
- One card per game showing:
  - Both teams with logo, record, and current score (leader bolded).
  - Status line: `Q2 7:41`, `Halftime`, `End of 3rd`, `Final`, or kickoff time in Central for games not started.
  - Live games get a pulsing red "LIVE" dot.
  - Possession: a small football icon next to the team with the ball, plus down & distance and ball spot (e.g. `2nd & 7 at DAL 34`).
  - Red-zone games get a red tint on the possession chip.
  - Last play description under the situation line.
- Games grouped: Live first, then upcoming, then final.
- Auto-refresh every 20 seconds while any game is live; pauses when no game is live and refreshes on tab focus.
- Tiny summary strip at top: "3 live · 2 final · 5 upcoming".

## Technical notes

- New `src/lib/scoreboard.server.ts`: a `fetchLiveScoreboard(season, week, seasonType)` reading the existing ESPN scoreboard payload (reuses `fetchScoreboard` in `nfl.server.ts`, so the existing host-fallback and headers apply). It extracts per event: teams, logos, records, scores, `status.type.state/description`, `status.displayClock`, `status.period`, and `competitions[0].situation` (`possession`, `downDistanceText`, `possessionText`, `isRedZone`, `lastPlay.text`).
- New `src/lib/scoreboard.functions.ts`: public `getLiveScoreboard` server function (read-only provider data, same shape as `getWinProbabilities`), returning `[]` on provider failure so the page degrades to "scores unavailable".
- New route `src/routes/_authenticated/scoreboard.tsx` with its own `head()` metadata, using TanStack Query with a conditional `refetchInterval` (20s when any game is `in`), plus `refetchOnWindowFocus`.
- Nav: add the Scoreboard entry to `NAV` in `src/components/AppShell.tsx`. The mobile bottom bar is currently `grid-cols-4` with 8 items; with 9 it becomes uneven, so the bottom bar switches to a horizontally scrollable row of fixed-width items (no page horizontal scroll).
- No database or cron changes; this reads live from the provider and does not alter the stored `games` rows or scoring.
