# 2026 Gridiron Pool — rename and request-to-join

Yes, this works. Confirmed against the live data: there is exactly one league, "Global Pool", flagged as the global pool, with 9 members — you're the owner. Nothing about picks, scoring, locks, standings, trophies, or the chat changes. Two things change: the name, and how new people get in.

## What changes

**1. Rename**
- "Global Pool" becomes **2026 Gridiron Pool** everywhere it appears (league switcher, standings header, commissioner panel, notification text).
- The same league row is renamed — all 9 current members, every pick, every result, and the full trophy case stay exactly as they are. Nobody has to re-join.

**2. New signups no longer auto-join**
- Today, anyone who creates an account is dropped straight into the pool. That stops.
- A new account lands on a **"Request to join 2026 Gridiron Pool"** screen instead: they set their team name and colors, then hit Request. They see "Waiting on the commissioner" until you act.
- Existing members are untouched — they keep full access on their next sign-in.

**3. Your approval queue**
- A **Join requests** section appears in your commissioner panel with a count badge, listing each requester's team name, display name, and when they asked.
- **Approve** adds them to the pool immediately; **Decline** removes the request. A declined person can ask again, and you can also just ignore it.
- You get a push notification when a new request comes in (same alert system as the nudge).
- The existing **Re-add** picker stays for anyone you removed who you want back without them asking.

**4. Removed members**
- Removing someone from the pool now also means they can't get back in on their own — they'd have to send a request, or you re-add them. That's the behavior you want and it comes free with this change.

## What does not change

Rules editor, nudges, rename, remove, the Wednesday 6:00 PM lock, confidence scoring, survivor pool, fantasy, chat, trophy case — all identical.

## Technical notes

- Data change: `UPDATE leagues SET name = '2026 Gridiron Pool'`. The `is_global_pool` flag stays `true` so the league keeps its role as the default pool everywhere in the app; it just no longer means "auto-join".
- Migration edits `handle_new_user()` to stop inserting a `league_memberships` row for new signups. It keeps creating the `profiles` row, so team branding still works pre-approval.
- New table `league_join_requests` (league_id, user_id, status pending/approved/declined, created_at, decided_at, decided_by) with GRANTs and RLS: a user reads and creates only their own request; the league owner reads and updates all requests for their league.
- New server functions in `commissioner.functions.ts`: `requestToJoin`, `listJoinRequests`, `decideJoinRequest` (owner-gated, adds the membership on approve via the same admin path `addMember` already uses).
- New UI: a pending-approval state on the app's entry path for users with no membership, plus a `JoinRequests` section in `CommissionerPanel`. Membership checks already gate every data function, so someone with a pending request simply sees no league data.
