# Add a "How to Play" quick-overview section to the Picks page

## Goal
Give new and returning managers a concise, scannable set of rules directly on the Picks page so they know when games lock, how confidence points work, and how weekly winners are decided.

## What we will build
A compact, inline rules card/section near the top of `src/routes/_authenticated/picks.tsx`. It will use the existing navy/field-green design tokens and will be open by default on first visit, then collapsible.

## Rules content (quick-overview)
The section will cover the actual game mechanics discovered in the codebase:

- **Preseason play is free.** Each preseason game locks at its own kickoff time. You can edit picks for any not-yet-started game.
- **Regular season weeks open Tuesday at 12:00 AM ET** and **lock Wednesday at 6:00 PM ET** of that week.
- **Confidence points:** rank every game from 1 (least confident) up to the total number of games that week (most confident). Each number can only be used once per week.
- **Tiebreaker:** predict the combined final score of the week's last-kickoff game (usually Monday Night Football in the regular season; the last preseason game during preseason). Closest prediction breaks ties.
- **Scoring:** earn the confidence points you assigned to every game you picked correctly. Most points that week wins.
- **Picks are final** once you hit Submit or the Wednesday regular-season deadline passes.

## Technical plan
1. Create a small presentational component `src/components/HowToPlay.tsx` (or inline section) that renders the rules as a themed card with a chevron collapse toggle.
2. Import it into `src/routes/_authenticated/picks.tsx` and place it below the week/status header, above the game list.
3. Use local state (`useState`) to let users collapse/expand the card. Persist the collapsed preference in `localStorage` under a key like `gc-how-to-play-collapsed` so it stays out of the way after the first read.
4. Pull dynamic values (season type, open/lock times, number of games) from the existing `weekOpensAt`, `weekDeadline`, and `games` data already available on the Picks page so the rules feel contextual.
5. Verify with `tsgo` and a quick preview check that the card renders correctly on mobile and desktop without causing horizontal scroll.

## Out of scope
- No new route or navigation item (per the user's "Inline section" choice).
- No changes to scoring, locking, or payment logic.
- No authenticated-only gating beyond what the Picks page already requires.

## Acceptance criteria
- A "How to Play" card is visible on the Picks page.
- It accurately reflects the current preseason vs. regular-season lock rules and confidence-point mechanics.
- It is collapsible and respects the user's preference across reloads.
- It displays cleanly on mobile (no horizontal scroll, touch-friendly toggle).
