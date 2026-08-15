# Free preseason picks, $5 buy-in starting Week 1 of the 2026 regular season

## Goal
Let managers play the full confidence pick 'em game during NFL preseason for free (no entry fee, no pot), then switch automatically to the paid $5-per-week format when the 2026 regular season kicks off.

## How it will work

- **Preseason weeks** — labelled "Preseason Week 1-4" in the app. Picks, confidence ranking, Monday-night style tiebreaker, and the Wednesday 6:00 PM lock all work exactly as they do now. No payment gate, no pot, no payout. Results still score and show on a separate "Preseason" standings view so people can practice.
- **Regular season Week 1 onward** — the current behavior returns: $5 entry required before picks can be submitted, pot total, weekly winner, payout, and the season leaderboard that drives the 2026 championship trophy.
- **Season leaderboard** only counts regular-season weeks. Preseason results are practice-only and marked as such.

## Current state confirmed

- `games`, `picks`, and `entries` all store `season` + `week` with no notion of preseason vs regular season, so preseason weeks would currently collide with regular-season weeks 1-4.
- The NFL sync route pulls only `seasontype=2` (regular season) from the data provider.
- `picks.tsx` blocks submission whenever `myEntry.paid !== true`, and the database also enforces a paid-entry rule, so the gate must be relaxed on both sides for preseason.

## Technical changes

**Database migration**
- Add `season_type` (`'pre' | 'reg'`, default `'reg'`) to `games`, `picks`, and `entries`.
- Update the unique constraints and keys that currently use `(user_id, season, week)` to include `season_type` — picks, tiebreakers, and entries — so preseason Week 1 and regular Week 1 are distinct.
- Update the paid-entry enforcement so it only applies when `season_type = 'reg'`; preseason picks insert freely.
- Update `leaderboard`, `weekly_scores`, and `weekly_results` views to filter to `season_type = 'reg'`, and add a preseason-only standings view.
- Keep the Wednesday 6:00 PM ET lock trigger applying to both.

**NFL data sync**
- Extend the sync to fetch preseason weeks using the provider's preseason season type, tagging those rows `season_type = 'pre'`.
- Extend `current_week` resolution to return both the active `season_type` and week, so the app auto-advances from preseason into regular Week 1 with no manual switch.

**App changes**
- `picks.tsx`: resolve current `season_type`/`week` from the database instead of a fixed week constant. When preseason, hide the entry-fee banner, skip the paid check, and show a "Preseason — free practice week, no entry fee" badge. Submit button reads "Submit preseason picks".
- `pot.tsx`: during preseason, show a message that the pot opens in regular-season Week 1 rather than a checkout button.
- `leaderboard.tsx`: default to the regular-season standings, with a preseason tab while preseason is active.

**Not changed**
- Stripe product/price, webhook, receipt email, and the $5 amount all stay as-is; they simply are not invoked during preseason.
