# Better nudges for the Global Pool

The nudge button already works for you as Global Pool commissioner, but it sends a push notification only — managers who never turned on alerts get nothing, and you can't tell who those are. This makes the nudge honest about who it actually reaches.

## What changes

**See who's missing, before you send**
- The commissioner tools get an expandable "Still missing picks" list for the current slate: each manager's team name plus a small badge — "Alerts on" or "No alerts".
- The nudge button's count becomes the number of managers who will actually receive the push, with a line underneath like "3 of 5 missing managers have alerts on".

**After sending**
- The confirmation toast reports both numbers: how many notifications went out and how many managers are unreachable, so you know who still needs a text from you.

**Copy-a-reminder fallback**
- A "Copy names" button next to the list puts the unreachable managers' team names on your clipboard, so you can chase them however you normally do.

Email reminders are deliberately not part of this — that needs a verified sending domain and its own setup. Say the word if you want that next.

## Technical notes

- New server function `listUnsubmitted` in `src/lib/commissioner.functions.ts`, owner-gated with `allowGlobalPool: true`. It combines the existing `week_submission_status` RPC with a count of rows in `push_subscriptions` per user, and returns team name, display name, and a `reachable` flag. Push subscription lookup runs through `supabaseAdmin`, loaded inside the handler after the owner check, and returns only a boolean per user — never endpoints or keys.
- `nudgeUnsubmitted` keeps its current behaviour but returns `{ sent, pending, unreachable }` so the toast can be precise.
- `src/components/CommissionerPanel.tsx` renders the list and the new counts; no changes to the lock, picks, or scoring logic.
