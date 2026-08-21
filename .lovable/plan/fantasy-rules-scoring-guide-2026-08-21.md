# Fantasy Rules & Scoring Guide

Add a clear, in-app rules and scoring breakdown to the Fantasy tab so new managers understand how to play without leaving the app.

## What to build

1. **New "Rules" tab inside `/fantasy`**
   - Add a fourth tab next to "My Lineup", "Live", and "Season" called "Rules".
   - Keep the existing navy/green stadium aesthetic.

2. **Rules content sections**
   - **The Draft**: One manager can own a player each week. First click = claim. If someone beats you, the app shows an error and refreshes the pool.
   - **Lineup**: Build a 5-player lineup: QB, RB, WR, TE, and FLEX (RB/WR/TE only). Each player comes from the teams playing in that week's slate.
   - **Star Cap**: Every player costs 1–5 stars. You have 15 stars total. Mix expensive stars with cheap sleepers.
   - **Captain**: Pick one slot as Captain; that player scores 1.5x points. The captain can be any filled slot.
   - **Lock Times**:
     - Preseason: lineups lock at the first kickoff of the week.
     - Regular season: lineups open Tuesday 12:00 AM ET and lock Wednesday 6:00 PM ET.
   - **No edits after lock**: Once the deadline passes or the first preseason kickoff starts, lineups are final.

3. **Scoring breakdown card**
   - Show PPR scoring rules with examples:
     - Passing: 1 point per 25 yards, 4 points per TD, -2 per interception
     - Rushing: 1 point per 10 yards, 6 points per TD
     - Receiving: 1 point per reception, 1 point per 10 yards, 6 points per TD
     - Fumbles lost: -2 each
   - Note that live points update from ESPN box scores every 30 seconds.

4. **Winner / standings explanation**
   - Highest total PPR score wins the week.
   - Season standings track cumulative fantasy points and weekly wins.

## Files to change

- `src/routes/_authenticated/fantasy.tsx` — add the Rules tab and content.

## Out of scope

- No schema changes.
- No new server functions.
- No changes to scoring math; only documentation UI.
