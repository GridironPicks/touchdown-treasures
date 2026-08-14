# Live NFL Data + Real Apple Pay

Two additions: real NFL schedules/scores flowing in automatically, and a real $5 Apple Pay charge for the weekly pot.

## 1. NFL data provider

Recommendation: **ESPN's public NFL scoreboard feed**. It is free, needs no API key or paid account, covers the full season schedule plus live scores and final results, and updates within seconds of scoring plays. Tank01/Sportradar would need a paid key and add no data we use. If you later want a contracted provider, the sync layer stays the same — only the fetch/parse step changes.

What gets built:
- A sync endpoint that pulls a given season + week, upserts each matchup into `games` (teams, kickoff time, status, scores), and flags the last game of the week as the Monday Night tiebreaker game.
- Idempotent upserts keyed on the provider's game id, so repeated runs update scores instead of duplicating games.
- A scheduled sync so schedules appear ahead of each week and scores refresh while games are live.
- Automatic current-week detection, replacing the hardcoded Week 1 on the Picks and Pot pages, with a week selector so you can look back at past weeks.
- Weekly winner resolution once all of a week's games are final: highest confidence points, Monday Night total-score tiebreaker as the decider.

## 2. Apple Pay for the $5 entry

Apple Pay needs a real payment processor behind it. I'll set up Lovable's built-in Stripe payments (no Stripe account or API keys needed from you — a test environment is created immediately so you can run the full flow without real money; going live later just requires claiming the account).

What gets built:
- A `$5 weekly entry` product.
- Checkout from the Pot page, with Apple Pay shown automatically on Apple devices and card as fallback.
- A webhook that marks the `entries` row paid only after Stripe confirms payment — no more client-side "paid" writes.
- Pot total and paid/unpaid list driven by confirmed payments.

Since this is a digital entry fee, Stripe tax calculation and collection is included at checkout.

## Technical notes

- Sync and webhook live under `src/routes/api/public/*` (external callers), with signature verification on the webhook and a shared-secret check on the sync endpoint.
- `games.external_id` already exists and becomes the upsert key.
- Scores/status write with the service-role client; clients keep read-only RLS access.
- Winner calculation runs server-side off final scores, not in the browser.

## Needs your approval during the build

Enabling payments opens a short form (name/email) you'll need to confirm.
