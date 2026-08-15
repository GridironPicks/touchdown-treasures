# Guaranteed Single Weekly Winner (No Ties)

Today a week's winner is simply "whoever has the most confidence points" — computed in the leaderboard UI from `weekly_scores`. With 20+ players that will produce tied weeks regularly, and there is no rule that resolves them. This adds a full tiebreaker cascade that always ends with exactly one winner.

## The tiebreaker ladder

Applied in order; the first step that separates players decides the week:

1. **Most confidence points** — the normal weekly score.
2. **Closest to the final game's combined total, without going over** — the existing tiebreaker guess. Over-guesses fall behind all valid under-or-exact guesses.
3. **Closest total by absolute distance** — catches the case where everyone went over.
4. **Most correct winners picked** — raw number of games called right.
5. **Highest points earned on the top-confidence pick** — did they nail their most confident game, then next-most, and so on down the ranking.
6. **Earliest submission timestamp** — the final guarantee. First sheet in wins.

Anyone who did not submit any picks for the week is excluded. Steps 2–5 resolve virtually every realistic tie; step 6 makes a tie mathematically impossible.

## What players see

- **Leaderboard, weekly view**: the winner row gets a trophy/crown and a short line explaining how it was decided — e.g. "Won on tiebreaker: closest to 44 (guessed 45)" or "Won on tiebreaker: earliest submission".
- **Weekly winner panel** on the leaderboard showing the winner's team, mascot, points, their total guess vs the actual total, and — once you turn on dues — the amount owed to them.
- **How to Play** section on the Picks tab gains a "How ties are broken" list with the ladder above, so it's clear before anyone pays.
- Because submission time can decide a week, the Picks tab will note that the submission timestamp is recorded and used as the last resort — this rewards submitting early.

## Going live with weekly dues

You chose manual payouts, so nothing changes in how money moves — you collect and pay out. What the app should add when you're ready (not built in this pass unless you say so):

- A per-week paid/unpaid marker per manager, shown on the League Status roster.
- A pot total for the week (players paid x entry amount) and "owed to winner" on the weekly winner panel.

Say the word and I'll layer that on top; the tiebreaker work below is independent of it and should land first.

## Technical notes

- New database function `public.week_winner(_season, _season_type, _week)` returning the ranked field with a `tiebreak_reason` column, implemented as `SECURITY DEFINER` so it can read all picks after the reveal point without loosening RLS. It joins `picks`, `tiebreakers`, and `games` and orders by the six criteria above, using `min(picks.created_at)` per user for step 6.
- A companion `public.week_standings(...)` returning every submitter in tiebreak order, so the weekly leaderboard view can be sorted correctly rather than by points alone.
- Grants: `EXECUTE` to `authenticated` only.
- Results are only exposed for weeks where `picks_revealed` is true or all games are final, keeping hidden-picks privacy intact.
- `leaderboard.tsx` switches its weekly view from client-side max-points logic to these functions; the streak engine reuses `week_winner` so multi-week streaks also respect tiebreakers instead of counting co-winners.
