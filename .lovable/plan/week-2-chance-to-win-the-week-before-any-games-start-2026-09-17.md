# Week 2 "Chance to win the week" before any games start

## What's happening

Week 2's 16 games are all still scheduled — the first kickoff is Thursday 7:15 PM Central. But the standings page shows the "Chance to win the week" panel as soon as you pick a week, whether or not a ball has been snapped.

## Where those percentages come from

The panel runs 5,000 simulations of the week and counts how often each manager ends up on top. Each undecided game is simulated using a live win probability from the score feed.

Before kickoff, the feed publishes no win probability at all (it only starts once the game is underway). The simulation falls back to treating every unplayed game as a 50/50 coin flip. So the Week 2 numbers are not a real forecast of anything — they are coin flips weighted only by how many confidence points each manager put on each game. A manager who spread their big numbers across games no one else backed shows a higher number, and that's all it reflects.

## The fix

Don't show the panel until the week's first game has kicked off.

- Before kickoff: the panel is hidden entirely. Standings still show the week's rows normally.
- Once the first game starts: the panel appears exactly as it does today, with real live win probabilities behind it.
- Once every game is final: it keeps showing the settled result, as today.

Also correct the status line so it can't read "All games final" for a week where nothing has been played.

## Technical notes

- `src/routes/_authenticated/leaderboard.tsx`: gate `<LivePoints />` on the selected slate's `anyStarted` flag (already computed in `src/lib/slate.ts`) in addition to `mode === "week"`. That requires passing the full `SlateInfo` rather than just `seasonType`/`week`, or looking the slate up from `slates`.
- `src/components/LivePoints.tsx`: header pill logic becomes three-state — hidden pre-kickoff, "Games in progress" while `remaining > 0`, "All games final" only when the slate is actually final.
- No change to `src/lib/win-odds.ts` or the score feed; the math is fine once real probabilities exist.

## Out of scope

- No change to scoring, tiebreakers, or the weekly trophy.
