# Pot, buy-ins, and payouts

Recommendation: **collect buy-ins with card / Apple Pay through the app, track the pot and payouts in a ledger you control.** Automatic payouts straight to winners' bank accounts aren't a good fit here — that requires each player to onboard as a payment recipient, and payment processors treat prize-pot contests as restricted business, so an automated payout rail is the piece most likely to get the account frozen mid-season. Money in through checkout, money out by you (Venmo/Zelle/cash) with the app recording it, keeps everything transparent without that risk.

If you'd rather not run money through a processor at all, the same ledger works in "honor system" mode: you just mark who paid. Everything below except the checkout button applies either way.

## What players see

**Pot banner (Picks page and Standings)**
- "Pot: $180 — 36 of 40 buy-ins collected" with the prize split underneath.
- Your own status chip: "You're paid up" or "Buy-in due — $20", with a **Pay now** button that opens Apple Pay / card checkout.
- Paying is instant: the chip flips to paid as soon as the payment confirms.

**Payout board**
- A "Pot & payouts" section showing the split you configured, each week's winner and their amount, and whether it's been sent yet ("Paid Aug 12" / "Pending").
- Season prizes listed the same way, filled in once the season settles.

**Unpaid managers**
- Configurable by you: either blocked from submitting picks until paid, or allowed to play but marked "not eligible for payouts" with a badge on the standings row. Default is the softer option — nobody gets locked out of the fun mid-week.

## What you see as commissioner (owner-only tab)

A new "Pot" section inside the commissioner panel on the Leagues page, only visible when you're the league owner:

- **Pot setup**: buy-in amount, and the split — a weekly-winner share plus season prizes (1st/2nd/3rd), with a live preview showing exact dollar amounts as you type. Must add to 100% before it saves.
- **Roster of payments**: who paid, when, how much; a **Mark as paid** button for anyone who hands you cash or Venmos you outside the app.
- **Payout log**: for each week's winner and each season prize, a **Mark paid** button with an optional note ("Venmo 8/12"). This is what fills the players' payout board.
- **Refund** on any collected buy-in, in case someone drops out early.
- **Block unpaid managers** toggle. Default off.

Players never see the setup, roster, or payout-log controls. They only see the public pot banner and their own payment status.


## Order of work

1. Pot configuration + ledger tables and the commissioner setup screen (usable immediately in honor-system mode).
2. Player pot banner, payout board, and eligibility badges.
3. Card / Apple Pay checkout wired to the ledger.

## Technical notes

- New tables: `league_pots` (buy-in cents, split percentages, whether unpaid managers are blocked), `pot_entries` (per member: amount, status paid/refunded, source checkout/manual, paid_at), `pot_payouts` (week or season prize, winner, amount, sent_at, note). All with GRANTs, RLS scoped so league members read their league's rows and only the owner writes; entries are only ever written server-side.
- Payments go through the Lovable payments connector (Stripe in test until published) with a one-time price per league buy-in amount. A webhook route under `src/routes/api/public/` verifies the signature and marks the matching `pot_entries` row paid — the client is never trusted to confirm a payment.
- Weekly winners come from the existing `week_recap` / `league_week_winners` functions, so payout amounts are derived from real settled results rather than entered by hand.
- Blocking unpaid managers, if you enable it, is enforced in the pick-submission path server-side, not just hidden in the UI.
- Worth knowing: prize-pot contests fall under payment processors' restricted business rules, and pooled-money contests are regulated differently state by state. This build tracks and collects money; it doesn't give legal cover. The honor-system mode avoids the processor question entirely.
