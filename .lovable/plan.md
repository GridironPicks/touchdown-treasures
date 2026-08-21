# Weekly Mini DFS Lineup

Add a weekly fantasy-football side game where each manager builds a 5-player lineup under a salary cap. The lineup scores real fantasy points from that week's games, and the highest weekly total wins.

## Why this one

- It feels like a real fantasy spin instead of just picking winners.
- Managers can root for individual players across all games.
- It runs in parallel to the existing confidence pool without replacing it.
- ESPN boxscore data gives us live player stats as games progress.

## Game rules

- Each week every manager submits one lineup.
- Lineup slots: **1 QB, 1 RB, 1 WR, 1 TE, 1 Flex** (RB/WR/TE only).
- **Salary cap**: each player costs 1–5 "stars" derived from projected fantasy points for that week. A valid lineup must total ≤ 15 stars.
- One player is designated **Captain** and scores **1.5×** fantasy points.
- Lineups lock at the same time as the week's first kickoff.
- Scoring is standard PPR:
  - Passing: 1 pt per 25 yards, 4 pts per TD, -2 per INT.
  - Rushing/Receiving: 1 pt per 10 yards, 6 pts per TD.
  - Receptions: 1 PPR point each.
  - 2-pt conversion: 2 pts.
- The manager with the highest weekly fantasy total wins the week. Season standings accumulate weekly fantasy points.

## Data source

- Use ESPN's `/summary` and boxscore endpoints for the games in the selected week.
- For each game, parse passing/rushing/receiving leaders and stats.
- Build a player pool of the top performers from the week's games.
- Player "salary" (stars) is computed from ESPN's projected fantasy points when available; otherwise from a simple tier based on season averages or name recognition.

## Database changes

1. New `fantasy_lineups` table:
   - `id`, `user_id`, `league_id`, `season`, `season_type`, `week`, `captain_player_id`, `submitted_at`.
2. New `fantasy_lineup_players` table:
   - `id`, `lineup_id`, `player_id`, `slot` (qb/rb/wr/te/flex), `salary` (1–5 stars).
3. New `fantasy_player_stats` table:
   - `id`, `season`, `week`, `player_id`, `name`, `team`, `position`, `pass_yds`, `pass_td`, `pass_int`, `rush_yds`, `rush_td`, `rec_yds`, `rec_td`, `rec`, `fantasy_points`.
4. RLS policies:
   - Users can read all fantasy stats (public within the league once the week starts).
   - Users can insert/update only their own lineup before lock.
   - Lineups are hidden from other users until the lock time, then revealed to all league members.

## Backend work

1. Server function `syncFantasyStats({ season, seasonType, week })`:
   - Fetches ESPN boxscores for every game in the week.
   - Parses player stats and upserts into `fantasy_player_stats`.
   - Called on page load/refocus and on a 60-second interval while games are live.
2. Server function `submitFantasyLineup({ ... })`:
   - Validates slot constraints, no duplicate players, salary cap, and lock time.
   - Inserts or replaces the user's lineup for the week.
3. Server function `getFantasyStandings({ leagueId, seasonType })`:
   - Returns cumulative fantasy points and weekly wins per manager.
4. Database function `fantasy_weekly_scores(...)`:
   - Computes weekly total fantasy points for each lineup using `fantasy_player_stats` and captain multiplier.

## Frontend work

1. New route `/fantasy` added to authenticated navigation.
2. `FantasyLineupBuilder` component:
   - Position filters (QB, RB, WR, TE).
   - Player list with name, team, position, and star cost.
   - Lineup slots at the top showing selected players, remaining salary, and captain toggle.
   - Submit/lock button with countdown to first kickoff.
3. `FantasyLeaderboard` component:
   - Shows weekly fantasy scores and season-long fantasy standings.
   - Highlights the weekly winner with the large trophy.
4. `FantasyPlayerCard` component:
   - Displays live fantasy points as games progress.
5. Navigation:
   - Add **Fantasy** tab to `AppShell` nav.
   - Keep mobile nav two-row layout so all tabs remain visible.

## Integration with existing features

- Badges: add `fantasy_week_win` and `fantasy_sweep` (win both confidence and fantasy in the same week).
- Recap: optional summary on the weekly recap page showing the fantasy winner.
- Push notifications: notify managers when their fantasy players score TDs or when the week locks.

## Out of scope

- Real-money entry fees or prizes (app remains free-to-play).
- Draft-style rosters or season-long player ownership.
- Defense/special-teams slots.
- College football players.

## Success criteria

- Managers can open the Fantasy tab, see the player pool, and build a valid lineup under the star cap.
- Lineups lock at first kickoff and cannot be changed after.
- As games progress, live fantasy points update automatically.
- A weekly fantasy winner is crowned and season fantasy standings accumulate.
