# Trophy Case tab

A new league-wide Trophy Case: a display-cabinet style page where every manager's badges and weekly trophies sit on lit glass shelves.

## What you'll get

- A **Trophy Case** tab in the nav (desktop + mobile) at `/trophy-case`.
- **Hall of Fame shelf** at the top: the current season leader with the big metallic trophy, plus a hardware count (weekly wins, total badges) for the league.
- **One cabinet per manager**, sorted by hardware earned:
  - Manager crest/mascot, team name, manager name.
  - A row of gold weekly-win trophies — one per week they won, week number engraved on each.
  - Their badge collection as glowing medallion chips (Perfect Week, Bullseye, Gutsy Call, Hot Streak, etc.) with the existing tap-to-see-details popover showing exactly which week/game earned it.
  - Empty shelf state: "No hardware yet — the case is waiting."
- **Season type toggle** (Preseason / Regular Season), matching the rest of the app.
- Tapping a manager opens their existing manager page.
- Badge glossary link so newcomers know what each award means.

## Look and feel

Dark walnut/navy cabinet with metallic silver framing, backlit glass shelves (soft green stadium glow behind each shelf), reflection strip under each trophy, and subtle shine sweep on hover. Uses existing app tokens — no new color scheme.

## Technical notes

- New route `src/routes/_authenticated/trophy-case.tsx` with its own `head()` meta.
- Data comes from existing sources, no schema changes:
  - `getManagerBadges` server fn (`manager_badges` RPC) for badges.
  - `league_week_winners` RPC for weekly trophies.
  - `profiles` (via existing league membership query pattern) for crest/team name.
- Reuses `BadgeRow`/`BadgeChip`, `WinnerTrophy`, `Mascot`, `BadgeGlossary`.
- New presentational component `src/components/TrophyCase.tsx` (shelf + cabinet styling); shelf/glass classes added to `src/styles.css` as reusable utilities.
- Add `{ to: "/trophy-case", label: "Trophies", icon: Trophy }` to `NAV` in `AppShell.tsx`.
