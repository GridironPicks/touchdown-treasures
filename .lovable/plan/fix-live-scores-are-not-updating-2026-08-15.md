# Fix: live scores are not updating

## What's actually wrong

The app's polling is fine — the score feed is being blocked.

Confirmed from the live system:
- The every-15-minute sync job runs on schedule and succeeds in calling the app, but the app's response is an error: `{"error":"Sync failed","detail":"NFL provider responded 403"}` — every run today, including 20:00 and 20:15 UTC.
- As a result the database still shows today's preseason Week 2 games (Browns/Bears, Vikings/Giants, Panthers/Bills at 12:00 CT, Rams/Chiefs and Jaguars/Saints at 15:00 CT) as "scheduled" with no scores, hours after kickoff.
- The on-page refresh (fired on page load, tab focus, and the 60-second poll) calls the same provider fetch, so it fails the same way and silently falls back to the stale stored rows.

Cause: the ESPN host currently used (`site.api.espn.com`) rejects requests coming from server/data-center IPs with HTTP 403. It works from a home browser, which is why it looked fine earlier.

Verified alternative: `site.web.api.espn.com` returns HTTP 200 with the exact same JSON shape for the same query. `sports.core.api.espn.com` also responds 200 as a secondary option.

## The fix

1. **Switch the score feed host** in the NFL provider module to `site.web.api.espn.com`, keeping the same path, query parameters, browser-like headers, and response parsing (no data-shape changes).
2. **Add a fallback chain**: try the new host first, then the old host, then treat it as an error only if both fail. This protects against one host being blocked again.
3. **Surface failures instead of hiding them**: the sync endpoint and the on-demand refresh should log which host failed, and the refresh server function should return a flag when the provider could not be reached, so a stale slate is detectable rather than silently stale.
4. **Reduce the on-page refresh throttle** from 20s to ~15s so the 60-second live poll always gets fresh provider data rather than being skipped.
5. **Backfill immediately after the fix**: run a sync for preseason Week 2 (and Week 3) so today's in-progress and completed games get real statuses and scores right away.

## Verification

- Call the sync endpoint and confirm it returns a success payload instead of a 502.
- Re-query the games table and confirm today's games show `in_progress`/`final` with scores.
- Confirm the Picks page shows live scores and the winner highlight without a manual reload.

## Technical notes

- Files touched: `src/lib/nfl.server.ts` (host + fallback), `src/lib/scores.server.ts` (throttle), `src/lib/scores.functions.ts` and `src/routes/api/public/nfl-sync.ts` (error reporting).
- No database schema changes, no cron changes — the existing `nfl-sync` job keeps running every 15 minutes and will start succeeding.
