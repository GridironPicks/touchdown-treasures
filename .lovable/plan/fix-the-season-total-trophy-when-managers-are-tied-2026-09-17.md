# Fix the season-total trophy when managers are tied

## What's actually happening

Checked the Week 1 numbers in the database:

- Dustin Off My Trophy — 104 points, 12 correct, guessed 42
- Mama Bear — 104 points, 13 correct, guessed 42
- Actual tiebreaker game total (Denver at Kansas City) — 41

Both are within 1 on the tiebreaker guess, so the week is decided on correct picks: **Mama Bear wins Week 1 with 13 correct**. That part of the app is right — the weekly trophy on the "By week" view and in the Weekly Recap goes to Mama Bear.

The "Season total" view is the problem. It adds up points only and sorts by points, with no tiebreak at all. Dustin and Mama Bear are both sitting on 104, and the list happens to put Dustin first, so the gold 2026 trophy badge lands on his row. It isn't saying he won the week — it's just an unbroken tie displayed in an arbitrary order.

## The fix

1. **Break season ties properly.** When two managers have the same season points, rank them by: most weekly wins, then most correct picks across the season, then better cumulative tiebreaker accuracy. Same ladder spirit as the weekly winner, so the two views stop disagreeing.

2. **Don't hand out the trophy on a true tie.** If the top managers are still dead even after that ladder, both rows show "T-1" and neither gets the gold 2026 badge, instead of silently crowning whoever sorted first.

3. **Show weekly wins in the season view.** Add a small count of weekly trophies next to each manager so the season list visibly reflects who has actually been winning weeks.

4. **Label the badge clearly.** The gold badge tooltip reads "Season points leader" so nobody reads it as "won the week."

## Technical notes

- `src/routes/_authenticated/leaderboard.tsx`: in season mode, join the existing `league_week_winners` and `league_weekly_points` results (both already fetched on this page) onto the leaderboard view rows, then sort by `season_points`, weekly wins, season correct picks, cumulative tiebreak diff. Compute `place` with shared placement for exact ties and gate the `2026` trophy badge on a single unique leader.
- No schema or scoring changes; weekly scoring and `week_recap` stay as they are.
