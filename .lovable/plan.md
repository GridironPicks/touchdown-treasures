# Show the week that's actually being played

## What's going on

The schedule is correct. Checked the database:

- Cowboys at Seahawks — Preseason Week 2, kicks off tonight (Sat Aug 15, 5:00 PM PT)
- Cowboys at Cardinals — Preseason Week 3, Sat Aug 22

The picks page isn't showing the wrong game, it has already rolled forward. Week 2's Wednesday 6:00 PM lock passed on Aug 12, so the app jumps to the next week whose deadline is still open — Week 3. There is currently no way to look back at the week in progress, which makes it look like the schedule is wrong.

## The fix

Add week navigation to the picks page so you can see any week, not just the open one.

1. Week selector at the top of the picks page: back/forward arrows plus a dropdown listing every preseason and regular-season week for 2026.
2. Default to the "smart" week — the week currently being played if its games haven't all finished, otherwise the next open week. So today it opens on Preseason Week 2 (locked, with live/final scores) instead of Week 3.
3. Clear status banner per week: "Open — locks Wednesday 6:00 PM ET" with the countdown, "Locked — games in progress", or "Final".
4. Locked weeks render read-only: your submitted picks and confidence points shown alongside each score, no editing. Open weeks behave exactly as they do now.
5. Same selector treatment on the standings page so you can view a specific week's results.

## Technical notes

- `fetchCurrentSlate` in `src/lib/slate.ts` picks the first group whose Wednesday deadline hasn't passed; change it to prefer the most recent slate that still has non-final games, and expose a full list of available slates for the selector.
- `src/routes/_authenticated/picks.tsx` gains a slate state (URL search param `?type=pre&week=2` so weeks are linkable) driving the existing game query.
- No database or schedule changes — the games data already matches ESPN.
