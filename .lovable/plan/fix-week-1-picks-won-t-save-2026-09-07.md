# Fix: Week 1 picks won't save

## What's happening

The Picks page says Week 1 is open (it opened Monday at 12:00 AM Central), but the
database is still refusing to accept picks until **Tuesday 12:00 AM Central**. So
players can fill everything out and the save fails.

Confirmed: no Week 1 picks have been saved by anyone yet.

The two rules disagree:

```text
App shows open:   Mon Sep 7, 12:00 AM CT
Database allows:  Tue Sep 8, 12:00 AM CT   <-- blocks everyone until then
Lock (both):      Wed Sep 9, 6:00 PM CT
```

## The fix

Make the database use the same "opens Monday 12:00 AM Central" rule the app shows,
including the short-week adjustment for Thanksgiving. Also correct the outdated
error wording that still says "Tuesday 12:00 AM ET".

Once applied, Week 1 picks save immediately for everyone.

## Technical detail

- `enforce_pick_lock()` computes the open time inline as `picks_deadline() - 42 hours`
  instead of calling `picks_open_at()`, which already implements Monday-midnight CT
  with the 42-hour floor. Change the trigger to call `public.picks_open_at(...)` and
  update the two exception messages to Central Time wording.
- No schema or app changes needed; `src/lib/league.ts` (`weekOpensAt`) already matches
  `picks_open_at`.

## Also worth noting (not part of this fix)

Week 1's stored kickoff is Wed Sep 9, 7:20 PM CT; the real season opener is Thursday
Sep 10. If the schedule feed is a day off for that game, the Wednesday lock and the
tiebreaker game could be wrong. Say the word and I'll verify the feed and re-sync.
