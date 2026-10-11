# Tie games: keep no-points rule, make it visible

## What happened

The Week 5 Giants @ Commanders game ended 27–27. I verified the data and every scoring path (weekly points, live standings, recap, Picks page): all use strict greater-than, so a tie correctly awards **zero** points to both sides. Nobody was actually credited for the tie — the live points likely showed Washington pickers ahead briefly while the score feed had them leading, then corrected when the true final synced.

## Rule (confirmed)

Tied game = no confidence points for either side. No scoring changes.

## Changes

1. **Picks page game card** (`src/routes/_authenticated/picks.tsx`)
   - When a game is final with equal scores, show a "TIE — no points awarded" badge on the card instead of the usual winner trophy / green glow.
   - Both team rows render in the neutral (non-winner) style so neither looks like it won.

2. **How to Play** (`src/components/HowToPlay.tsx`)
   - Add one line to the scoring rules: "If a game ends in a tie, neither side earns points — the confidence numbers on that game are lost."

## Verification

- Typecheck passes.
- Confirm the Week 5 Giants @ Commanders card shows the tie badge and no trophy.
