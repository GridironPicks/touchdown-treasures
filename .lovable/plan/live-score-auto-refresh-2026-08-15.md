# Live Score Auto-Refresh

## Current state
- A `pg_cron` job (`nfl-sync`) already runs every 15 minutes and calls `/api/public/nfl-sync` to pull the latest scores/statuses from ESPN into the database.
- The Picks page and Leaderboard use TanStack Query, but they do not poll, so a user sitting on the page will not see score changes until they refresh.\n## What will change
1. **Picks page live refresh**
   - Add a `refetchInterval` to the games query that polls every 60 seconds while the selected week has at least one `in_progress` game.
   - Stop polling once all games in the week are `final` or `scheduled` (no live action).
2. **Leaderboard live refresh**
   - Add a matching polling interval to the leaderboard query when the current/default slate has live games, so standings and win streaks update as scores come in.
3. **Visual feedback on update**
   - Keep the existing winner highlight/glow and final-score display; polling will make them appear automatically as games go final.

No backend or cron changes are needed — the existing 15-minute ESPN sync stays in place, and UI polling will surface those updates within a minute on screen.
