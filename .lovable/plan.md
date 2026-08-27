# Late-pick penalty visibility

The penalty is already visible to late players on the Picks page: reduced max in the header, an amber banner listing the burned numbers, and dropdowns that omit them.

One gap worth closing: players get no warning before numbers start burning.

## Add a pre-kickoff burn warning

- Send a push notification to managers who haven't submitted, timed shortly before the week's first kickoff, saying their top confidence number is about to come off the board.
- Show a countdown line on the Picks page ("First kickoff in 45m — confidence 16 burns then") for unsubmitted managers during preseason weeks.

## Technical notes

- Reuse the existing nudge notification path for the push send, triggered on a schedule keyed to the week's earliest game time.
- Countdown lives in `src/routes/_authenticated/picks.tsx` next to the existing burn banner, using the already-computed first kickoff time.

No changes to scoring, lock rules, or the database.
