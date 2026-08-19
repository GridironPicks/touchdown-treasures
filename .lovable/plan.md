# Weekly NFL Squares (Lucky Squares)

Add a simple, social, luck-based side game to Gridiron Confidence using the existing weekly schedule. Each week the league gets a 10×10 grid for the final/tiebreaker game of the slate. Players claim squares before kickoff, and winners are decided by the last digit of each team's score at the end of every quarter.

## Why this one

- Pure luck — no NFL knowledge required, so everyone feels welcome.
- Highly social; quarter-by-quarter winners keep trash talk alive all game.
- Reuses the schedule and score data we already sync from ESPN.
- Free-to-play, matching the rest of the app.

## What it looks like

```text
Picks | Scores | Standings | Survivor | Squares | Trash Talk | ...
```

A new **Squares** tab shows:
- The featured game for the week (last kickoff of the slate).
- A 10×10 grid with rows = away-team score digit (0–9), columns = home-team score digit (0–9).
- Each claimed square shows the manager's mascot.
- Empty squares can be clicked to claim while the game is not final.
- After each quarter, winning squares are highlighted and a results panel lists who won.

## Game rules

- One grid per league per week.
- Featured game = the week's tiebreaker game (last scheduled kickoff).
- Managers claim up to a configurable number of squares before kickoff (default 2 per manager).
- Digits are revealed randomly once the game kicks off (or pre-revealed at lock).
- Winners at end of 1st quarter, halftime, 3rd quarter, and final.
- Payouts are bragging-rights only (coins/trophy points), no real money.

## Technical work

### Database

1. New `squares_grids` table:
   - `id`, `league_id`, `season`, `season_type`, `week`, `game_id`, `locked_at`, `created_at`.
2. New `squares_picks` table:
   - `id`, `grid_id`, `user_id`, `row_digit`, `col_digit`, `claimed_at`.
3. New `squares_results` table (or computed on read):
   - `grid_id`, `quarter`, `winning_user_id`, `away_digit`, `home_digit`, `awarded_at`.
4. RLS policies so users can only see/claim squares in leagues they belong to.
5. Database function `squares_winners(grid_id)` returns the winner per quarter using live scores.

### Backend

1. Server function to create the week's grid for a league (idempotent — called on first visit or by commissioner).
2. Server function to claim a square with validation:
   - Game not started.
   - Square unclaimed.
   - Manager under per-week square limit.
   - Manager is a league member.
3. Server function to compute and cache winners after each quarter.

### Frontend

1. New route `/squares` added to the authenticated nav.
2. `SquaresGrid` component:
   - Render 10×10 grid.
   - Show manager mascot in claimed squares.
   - Highlight current quarter winner.
   - Disable claiming once kickoff passes.
3. `SquaresHeader` component:
   - Featured game info, kickoff time, live score.
   - Countdown to lock.
   - Rules explainer.
4. `SquaresResults` component:
   - List quarter winners with trophy icons.

### Navigation

- Add **Squares** to `AppShell` nav between Survivor and Trash Talk.
- Ensure mobile grid still shows all tabs (two-row layout already in place).

### Badges

- Add `squares_winner` badge for any quarter win.
- Add `squares_sweep` badge if one manager wins 2+ quarters in the same game.

## Out of scope

- Real-money buy-ins or payouts.
- Multiple grids per week.
- Custom digit randomization strategies.
- Squares for playoff games (can be added later).

## Success criteria

- Managers can open the Squares tab, see the grid, and claim squares.
- Once the featured game starts, claiming is locked and digits are visible.
- As the game progresses, winning squares per quarter are highlighted automatically.
- Winners appear in the results panel and earn a badge.
