# Confidence dropdown: hide used numbers

## What changes

On the Picks page, the points dropdown for each game currently lists every number from the total game count down to 1, greying out the ones already assigned elsewhere. Instead, each dropdown will list only the numbers still available — plus the number currently assigned to that game, so it stays visible and re-selectable.

Also greyed-out-and-hidden: numbers locked up by games that already kicked off (those points stay reserved and simply won't appear).

Behavior details:
- Selecting a number removes it from every other game's dropdown immediately.
- Clearing a game's selection ("Pts") puts that number back into the other dropdowns.
- If every number is taken, the dropdown shows only "Pts" and the game's own current value.

## Technical

In `src/routes/_authenticated/picks.tsx`, the `<select>` options are built from `Array.from({ length: maxPoints }, ...)` with a `disabled` prop based on `usedPoints` / `reservedPoints`. Replace that with a `.filter()` that keeps a number only when it is not in `usedPoints` or `reservedPoints`, or when it equals `sel?.confidence`. Remove the now-unneeded `disabled` attribute on the options. No data or lock-logic changes.
