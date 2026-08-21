# Weekly Mini DFS Lineup — Draft Style (Exclusive Player Ownership)

A new weekly fantasy game alongside the confidence pool. Each manager builds a 5-slot lineup from real NFL players, but **every player can only be owned by one manager per week** — first come, first served.

## How it plays

1. **Lineup opens** when the week's pick window opens (Tuesday for regular season, immediately for preseason).
2. Each manager fills 5 slots: **QB, RB, WR, TE, FLEX (RB/WR/TE)**.
3. Each player has a **star cost of 1–5**; total lineup must be **15 stars or fewer**.
4. **Exclusive ownership**: the moment a manager locks a player into a slot, that player is claimed for the week in that league. Everyone else sees him greyed out as "Rostered by <team name>". Claims are per week and per league — the pool resets fresh every week.
5. Managers can **swap players out** until the week locks; releasing a player instantly returns him to the available pool for others.
6. **Captain**: one of the 5 gets a 1.5x multiplier.
7. Lineups lock at the same deadline as picks; after lock, all lineups become visible to the league.

## Player pool screen

- Tabs by position (QB / RB / WR / TE), searchable by name or team.
- Each row: headshot, name, team logo, opponent, star cost, and status (Available / Yours / Rostered by someone).
- Filters: "Available only", "Fits my remaining stars".
- Running header shows stars used, slots filled, and a countdown to lock.
- If two managers grab the same player at once, the second gets a clear "Just claimed by <team>" message and the pool refreshes live.

## Scoring

Standard PPR from live ESPN box scores: 0.04/pass yd, 4/pass TD, -2 INT, 0.1/rush-rec yd, 6/rush-rec TD, 1/reception, -2 fumble lost. Captain slot x1.5.

- Live fantasy scoreboard during games, updating with the same refresh cycle as the main scoreboard.
- Weekly fantasy winner announced when all games are final, plus a season-long fantasy standings table (cumulative points, weekly wins).

## New "Fantasy" tab

- **My Lineup**: slot builder + player pool.
- **Live**: everyone's lineups and live fantasy totals (hidden until lock).
- **Season**: fantasy standings.

## Technical notes

- Tables: `fantasy_players` (weekly pool with star costs, synced from ESPN rosters/depth charts), `fantasy_lineups` (one per user/league/week, captain flag), `fantasy_lineup_slots` (slot, player, unique constraint on league+season+week+player to enforce exclusive ownership at the database level), `fantasy_player_stats` (synced live).
- RLS mirrors picks: own lineup always readable; others' lineups only after reveal. Claimed-player *names* are visible to everyone pre-lock (needed for the draft), but not which slot or the rest of a rival's lineup.
- A trigger enforces the same lock windows as `enforce_pick_lock`, plus the 15-star cap and position eligibility.
- Player pool and stats sync through the existing ESPN server functions and pg_cron sync job.

## Open item

Star costs need a source. Plan is to derive them from ESPN season stats (top producers cost 5, down to 1 for low-usage starters), recalculated weekly. Can be overridden by the commissioner if you want manual control.
