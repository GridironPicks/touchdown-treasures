# Installable App + Push Notifications

Turn Gridiron Confidence into an app people install on their phone home screen, with opt-in push alerts for deadlines, results, chat, and survivor status. No app stores, no fees.

## Answers to your questions

- **Downloadable?** Yes — as an installable web app (PWA). Players open gridironconfidence.com and tap "Add to Home Screen" (iOS Safari) or "Install app" (Android Chrome). It gets its own icon and opens full-screen with no browser bar. Apple/Google store listings would be a separate, paid path ($99/yr Apple, $25 Google) and aren't needed here.
- **Push notifications?** Yes, free. Web push uses the browser's own service (VAPID) — no Firebase bill, no per-message cost. Important caveat: on iPhone, push only works after the user installs the app to their home screen; in a normal Safari tab iOS will not deliver notifications.
- **Opt-in agreement?** Yes. The browser itself shows a permission prompt, and we'll add our own consent step before it: a short notification-preferences screen explaining what we send, plus a one-line consent statement and an easy off switch per alert type. We'll also add a brief notifications clause to a Privacy/Notice section so the disclosure is on record.

## What gets built

**1. Installable app**
- App manifest with the Gridiron name, navy/green theme colors, and standalone display
- Generated app icons (helmet/field mark) in required sizes, plus Apple touch icon
- An "Install app" hint card that appears for players who haven't installed yet, with separate iOS and Android instructions

**2. Notification opt-in**
- New **Notifications** section in settings: master toggle plus per-type switches for Pick deadlines, Weekly results, Chat mentions/messages, Survivor status
- Consent text shown before the browser prompt; declining leaves everything off
- Unsubscribe/turn-off works from the same screen and clears the stored subscription

**3. Alerts sent**
- **Pick deadlines** — Tuesday "week is open" nudge, plus reminders 24h and 2h before the Wednesday 6:00 PM ET lock, sent only to players who haven't submitted
- **Weekly results** — when a week finishes scoring: your rank, weekly winner announcement
- **Chat** — new trash-talk messages in your league, batched so a busy thread doesn't spam
- **Survivor** — survived / eliminated confirmation after the week resolves

**4. Delivery**
- Scheduled checks run on the backend and send only to opted-in devices; tapping a notification deep-links to the right page (Picks, Standings, Chat, Survivor)

## Technical notes

- `vite-plugin-pwa` (generateSW) with a guarded registration wrapper so the service worker never registers in the Lovable preview/iframe/dev; NetworkFirst for navigations
- New tables: `push_subscriptions` (user, endpoint, keys, device label) and `notification_preferences` (per-type booleans, consent timestamp/version), both RLS-scoped to the owner
- VAPID keypair stored as project secrets; sending done server-side with a Web Push implementation compatible with the Worker runtime
- `pg_cron` jobs hit a signed `/api/public/notify/*` route for deadline sweeps and post-week results; chat pushes fire from the message insert path with per-user batching
- Notification click handling routed through the service worker `notificationclick` handler

## Caveats

- iOS 16.4+ only, and only after home-screen install — the install card will call this out
- Players on desktop Chrome/Edge/Firefox get push without installing
- Existing preview URLs won't show installability; it works on the published domain
