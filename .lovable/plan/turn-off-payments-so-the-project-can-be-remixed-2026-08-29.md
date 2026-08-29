# Turn off payments so the project can be remixed

## What's going on

The app's code already has zero payment functionality — no checkout, no pot, no entry-fee UI, and no payment tables in the database. What's still there is the project-level **Payments (Stripe sandbox) integration**, which stays attached even after the payment code was deleted. Lovable blocks remixing any project that has payments enabled, which is the error you hit.

## The fix

Disconnect the Stripe sandbox integration from this project. Nothing in the app uses it, so nothing breaks:

- No page, button, or database table references Stripe.
- The league stays free-to-play exactly as it is today.
- Standings, picks, survivor, trophies, chat, and commissioner tools are untouched.
- Your published site at gridironconfidence.com keeps working; no re-publish needed.

After that, Remix will be available and you can spin up a copy to experiment in.

## Note

If you ever want buy-ins and a real pot later, payments can be re-enabled — it's a reversible switch, not a one-way door.
