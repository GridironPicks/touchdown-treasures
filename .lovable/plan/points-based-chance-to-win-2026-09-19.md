# Points-based chance to win

## What will change

Replace the simulated “Chance to win the week” percentages with a transparent live calculation based only on points:

- A manager’s potential is their **banked points plus confidence points still available from unplayed games**.
- Mathematically eliminated managers show **Out / 0%**.
- If a manager has already secured the week, they show **Clinched / 100%**.
- Otherwise, each eligible manager receives their share of the eligible field’s combined potential, so the displayed percentages total 100%.
- Percentages refresh every 60 seconds as games finish and remaining points change.

## Display behavior

- Keep the existing “Chance to win the week” panel and player rows.
- Continue hiding the panel before the first game starts.
- Keep “Games in progress” and “All games final” status labels.
- Update the note beneath the list to explain that percentages use current points and points still available—not game-outcome simulations.
- Once all games are final, the winner shows 100% and everyone else shows 0%; tied winners split 100% evenly.

## Technical details

- Calculate percentages directly from the existing live standings fields: `banked`, `max_possible`, and `remaining`.
- Remove the open-picks and live win-probability requests from this panel because they are no longer needed.
- Remove the Monte Carlo calculation from this panel while leaving the separate in-game win-probability bars on matchup cards unchanged.
- Preserve existing scoring, confidence points, tiebreakers, refresh timing, and pre-kickoff visibility rules.
