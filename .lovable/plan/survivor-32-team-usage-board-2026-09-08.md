# Survivor: 32-team usage board

Good add. It turns "which teams have I burned?" into a single glance instead of scanning every matchup card.

## What you'll see

- A new strip at the top of the Survivor tab showing all 32 NFL logos in a tidy grid (8 across on desktop, 4-6 on phone).
- Teams you haven't used yet: full color, full brightness, subtle lift on hover.
- Teams you've already used (including this week's locked pick): faded back to roughly 30% and desaturated — still clearly visible, just spent, with a small "W3"-style tag showing the week you used them.
- This week's pick gets a thin ring in that team's own color so it stands out from earlier burns.
- A counter above the grid: "12 teams left" so the shrinking pool is obvious.
- Optional detail: hovering/tapping a faded logo shows "Used week 3" as a tooltip.

Everything else on the Survivor page stays exactly as it is.

## Technical notes

- New component `src/components/SurvivorTeamPool.tsx`, rendered in `src/routes/_authenticated/survivor.tsx` just below the header (above the "How survivor works" panel).
- Props: `usedTeams` (map of team name to week) and `currentPick`. Both already derived in `SurvivorPage` from `myRuns` — pass them down, no new queries.
- Uses existing `NFL_BADGES` from `src/lib/teams.ts` for the full 32-team list, `TeamLogo` for the mark, and `teamColor(name)` for the current-pick ring via an inline `--pick-color` custom property, matching the pattern already used on the matchup buttons.
- Faded state: `opacity-30 grayscale` on the logo wrapper; no hardcoded color utilities.
- Grid: `grid grid-cols-6 sm:grid-cols-8 gap-2` inside the existing `field-panel rounded-2xl` shell.
