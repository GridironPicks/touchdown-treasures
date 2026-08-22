# Week-by-Week Standings by Default

Standings currently open on cumulative season totals, so Preseason shows every week added together. Make the page show one week at a time by default, with placement decided by that week's points, and keep a toggle for the season-long view.

## What changes

1. **Default view is the selected week**
   - Standings open on the current week (the same slate default the rest of the app uses).
   - A week picker sits at the top so you can flip between Preseason Week 1, 2, 3 and Regular Season weeks.
   - Highest points that week is 1st place, then 2nd, 3rd and so on — with the winner trophy on the top row.

2. **Preseason / Regular season stay separate**
   - The week picker already groups Preseason and Regular Season slates, so switching between them is one tap.

3. **Season totals kept behind a toggle**
   - A small "Week / Season" switch. Season mode shows cumulative points, weeks scored, and the 2026 trophy chase exactly as today.

4. **Ties within a week**
   - Managers tied on weekly points share the same displayed place, ordered by the existing tiebreaker ladder (correct picks, then tiebreaker prediction closeness) so the weekly winner is always a single manager.

## Technical notes

- `src/routes/_authenticated/leaderboard.tsx`: replace the three-way `reg | pre | week` board switch with a `week | season` mode toggle; `week` becomes the default state. Week rows come from `league_weekly_points` (already exposes `points`, `correct_count`, `tiebreak_diff`, `place`, `field_size`) instead of the raw `weekly_scores` read, so placement and tie ordering come from the same ladder the recap uses.
- Season mode keeps the existing `leaderboard` / `preseason_leaderboard` view reads, choosing preseason vs regular from the selected slate's season type rather than a separate button.
- `SlatePicker` renders in both modes so the streaks, badges and head-to-head sections stay scoped to the right season type.
- Live points panel keeps showing whenever a week is selected and games are in progress.

## Out of scope

- No schema or scoring-math changes; weekly points are already computed by `league_weekly_points`.
