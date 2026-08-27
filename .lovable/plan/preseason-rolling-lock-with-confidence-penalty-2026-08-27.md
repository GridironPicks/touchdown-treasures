# Preseason: rolling lock with confidence penalty

Yes, that makes sense — and it's a fairer middle ground than "miss kickoff, sit the week out." Late players still get to play, but they pay a price that grows the longer they wait, and they can never bet on a game that already started.

## The rule

- Each game locks individually at its own kickoff. A started game can't be picked, edited, or scored for you if you hadn't picked it.
- The highest confidence numbers are burned as games kick off: with a 16-game slate, once 1 game has started the 16 is gone, once 3 have started 16, 15, and 14 are gone.
- You assign the remaining numbers across the games that are still open.
- Anyone who submitted before the first kickoff is untouched — they keep the full 1-16 range.

Example, 16-game week, you open the app after 3 games have kicked off:
```text
Available numbers: 1 - 13
Games you can pick:  13 remaining
Games already started: no pick, no points
Max possible score:  91 instead of 136
```

## What changes on the Picks page

- The week no longer hard-closes at the first kickoff. It stays open until the last game of the week kicks off.
- A banner shows the penalty in plain language: "3 games have started — confidence 14, 15, and 16 are off the board for you this week."
- Started games render as locked cards (score/status shown), not pickable.
- The confidence dropdowns only offer numbers that are still both unused and un-burned.
- "Complete" means every still-open game has a team and a number; the tiebreaker is skipped if that game already started.
- Submission is still one-shot and final, as it is today.

## What changes in the database

The pick-lock trigger is updated for preseason so it:
- still rejects any pick on a game that has already kicked off;
- rejects the whole week only once the last game has started;
- rejects any confidence value inside the burned top band — the number of games already kicked off at insert time determines the ceiling, so the rule can't be bypassed by calling the API directly.

Regular season is untouched: Tuesday open, strict Wednesday 6:00 PM ET lock.

## Open question folded into the build

Players who submit early are compared against late players who physically can't reach the top numbers. That's the intended penalty — late entries simply score lower. Weekly winner logic needs no change.
