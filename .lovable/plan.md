# Pick highlight in each team's real colors

Yes — this is a good add. Right now every selected team glows the same field green, so the pick board looks uniform. Switching the selection glow to the team's actual NFL color makes each pick instantly recognizable, and keeps green meaningful: green only appears once that team has actually won.

## What you'll see

- Tap a team to pick it: that card lights up in the team's own colors — Cowboys navy, Chiefs red, Seahawks action green, Bills blue, and so on — with a matching glow ring, team-colored name, and a "your pick" tag in the same color.
- Nothing else changes while the game is in progress: the pick simply carries the team's identity instead of generic green.
- When the game goes final:
  - **Winner** — the card switches to the familiar green win glow with the trophy, exactly as today.
  - **Loser** — the card dims out as today.
- Unpicked teams stay neutral with the usual subtle hover.
- Teams with very dark primary colors (Raiders black, Ravens/Steelers deep tones) get a slightly lifted variant so the card stays readable on the navy background.

## Technical notes

- Add a `TEAM_COLORS` map in `src/lib/teams.ts`: primary (and secondary) hex per franchise, plus a `teamColor(name)` helper returning a fallback for unknown names.
- In `src/routes/_authenticated/picks.tsx`, the selected-but-not-final state stops using `glow-ring border-primary bg-primary/*` and instead applies inline CSS custom properties (`--pick-color`) on the button with `color-mix()` for the border tint, background wash, and box-shadow glow, so no hardcoded Tailwind color utilities are added.
- Add a `pick-glow` utility in `src/styles.css` that reads `--pick-color` for the ring/wash, keeping color rules in the design system layer.
- Win/loss branches keep their current `primary` styling — ordering of the conditional stays won → lost → selected → default.
