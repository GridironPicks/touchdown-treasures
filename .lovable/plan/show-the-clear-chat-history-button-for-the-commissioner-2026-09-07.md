# Show the "Clear chat history" button for the commissioner

## What's happening

The button exists on the Trash Talk page, but it only shows when your membership row in the league is labeled "owner". Your membership row in the 2026 Gridiron Pool says "member" — you're the commissioner because the league itself points to your account as owner. So the button stays hidden for you.

Everything else already works: the backend clearing action correctly checks that you are the league owner, so only you can run it.

## The fix

- Treat you as commissioner anywhere the app decides what to show, based on the league's owner being your account — not just the membership label.
- Apply the same corrected check on the Trash Talk page (clear chat history), the Leagues page (rename, invite code, delete, ownership controls), and the league switcher badge, so commissioner controls appear consistently.
- Also correct the membership label for the pool so the crown shows next to your name in the member list.

## Technical notes

- `src/lib/leagues.functions.ts` derives `role` from `league_memberships.role`; change it so a league whose `owner_id` matches the signed-in user resolves to `role: "owner"`.
- With that in place, existing `league.role === "owner"` checks in `chat.tsx`, `leagues.index.tsx`, and `LeagueSwitcher.tsx` start working — no gate rewrites needed.
- One small migration to set the commissioner's `league_memberships.role` to `owner` for the pool (cosmetic, drives the crown in `CommissionerPanel`).
- No change to server-side authorization; `clear_league_chat` and commissioner server functions already verify `owner_id`.
