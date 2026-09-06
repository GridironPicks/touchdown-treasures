# LeagueSafe pot integration for Gridiron Confidence

## What you get

A new commissioner-only **Pot** tab where you can create and manage a season pot that players pay into through LeagueSafe. The app tracks who has paid, the current pot total, and how winnings will be split.

## Key facts about LeagueSafe

LeagueSafe holds player dues in escrow and pays out winners based on the payout schedule you configure on leaguesafe.com. It does not expose an API to your app, so Gridiron Confidence cannot confirm payments automatically. Players will still pay on LeagueSafe, and you (or the commissioner) will mark them as paid inside the app.

## Proposed design

### Commissioner controls

- Create/edit a pot for a league with a buy-in amount and payout splits.
- Mark/unmark members as paid. This is the source of truth inside the app because LeagueSafe does not push payment status to third parties.
- Display pot total = (number paid × buy-in) − LeagueSafe fees if you want to enter the net amount, or gross if you prefer.
- Configure payout percentages for season champion, runner-up, weekly winners, survivor winner, bracket winner, etc.

### Player view

- Members see the pot tab with: total collected, their own payment status, the payout schedule, and a link to your LeagueSafe payment page.
- Unpaid members see a "Pay dues on LeagueSafe" button that opens your LeagueSafe league URL.

### Data model

- New `league_pots` table: league_id, buy_in_amount, fee_amount, payout_schedule JSONB, commissioner_notes, timestamps.
- New `pot_payments` table: pot_id, user_id, paid boolean, paid_at, method ('leaguesafe'), notes.
- Grants/RLS: league members can read; only the league owner can insert/update/delete pot settings and mark payments.

### UI

- New `/pot` route under `_authenticated`.
- Add a "Pot" entry to the authenticated navigation.
- Card showing pot total, paid count, and a member checklist.
- Payout schedule breakdown.
- Commissioner-only edit mode for buy-in, splits, and LeagueSafe link.

## Questions before building

1. Do you want real in-app payments too (Stripe), or only LeagueSafe tracking?
2. What payout splits do you want as the default (e.g., 70/20/10 season only, or include weekly/survivor/bracket payouts)?
3. Should unpaid players be blocked from submitting picks, or allowed to play but marked as ineligible for the pot?

## Technical notes

- Since payments were previously removed to unblock Remix, reintroducing Stripe would require reconnecting payments. LeagueSafe tracking avoids payment code entirely.
- LeagueSafe links can be stored as a string in `league_pots` and opened with a normal `<a>` tag.
