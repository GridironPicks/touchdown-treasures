# App audit — Gridiron Confidence

Overall the app is in good shape heading into the regular season. No critical security holes, no vulnerable dependencies, no broken data, no debug leftovers. Here's what I actually found and what I'd change.

## Health check (verified)

- 9 members, 9 profiles, 226 picks, 0 pending join requests, 5 devices signed up for push.
- Full 2026 schedule loaded: preseason weeks 1-4 complete, all 18 regular-season weeks present starting Sep 10.
- Both background jobs (score sync, notification sweep) are active and running every 15 minutes.
- No finished games with missing scores.
- Dependency scan: clean.

## What I'd change

### 1. Week 18 has placeholder kickoff times
Every Week 18 game currently sits at the same time slot because the NFL hasn't set them yet. Scoring and the Wednesday lock aren't affected, but the schedule will look wrong on the Picks and Scoreboard pages until real times land. Fix: show a "times TBD" note for any week where all games share one kickoff, and let the sync overwrite them automatically when the NFL publishes.

### 2. No social preview image
Sharing a link to the app in a group text or on social shows plain text with no image. Fix: add a branded share card (trophy + Gridiron Confidence on the navy/green field) and wire it into the home, sign-in, and join pages.

### 3. Notification log table is fully locked
The `notification_log` table has security on but zero access rules, so nothing outside the server can read it. That's safe, but it means you have no way to see a history of nudges and alerts you've sent. Fix: add a commissioner-only read rule and a small "Recent alerts sent" list in the commissioner panel.

### 4. Tighten backend function permissions
24 privileged database functions are technically callable by any signed-in account. None of them currently leak anything, since each one checks who's asking, but the safer posture is to revoke direct access on the admin-only ones (member removal, rename, join-request decisions, score sync) so they can only run through the app's own server code.

### 5. No postseason handling
There are no playoff games in the schedule and nothing defines what happens after Week 18. Fix: decide now whether the season simply ends and the trophy is awarded after Week 18, or whether playoff weeks get added. Currently it just ends.

## Nice-to-have, not required

- **Pick reminders by email** as a fallback for the 4 members with no push device registered.
- **Auto-fill safety net**: default an unsubmitted manager's picks to favorites at the lock instead of a zero week (regular season only).
- **Landing page still says "Always free"** — accurate today, keep unless you revisit buy-ins.

## Technical notes

- Week 18: detect `count(distinct kickoff) = 1` in the slate helper and render a TBD badge; no schema change.
- Share image: static asset in `public/`, referenced as an absolute https URL in `og:image` / `twitter:image` on `index.tsx`, `auth.tsx`, `join.tsx` only.
- `notification_log`: add `SELECT` policy for the league owner plus a `GRANT SELECT ... TO authenticated`, and a `listRecentAlerts` server function.
- Function hardening: `REVOKE EXECUTE ... FROM authenticated` on the admin-only `SECURITY DEFINER` functions; keep `service_role`. Verify each is only ever called from server-side code before revoking.

Tell me which of these you want and I'll build them — or say "all of it" and I'll do 1-4 in one pass.
