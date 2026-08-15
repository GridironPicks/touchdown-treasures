# Delete a League (Owner Only)

Today the Leagues page only offers "Leave" — an owner who creates a league by mistake can't remove it. This adds a proper delete.

## What you'll see

- On the Leagues page, any league you own (and that isn't the Global Pool) gets a red "Delete league" button next to Leave.
- Clicking it opens a confirmation dialog explaining that all picks, survivor picks, tiebreakers, chat messages, and members for that league are permanently removed.
- You must type the league name to confirm — no accidental taps.
- After deleting, you're switched back to the Global Pool and the league disappears from the switcher for every member.

Rules:
- Only the league owner can delete.
- The Global Pool can never be deleted.
- Non-owners keep only the Leave option.

## Technical notes

- Migration: add a `DELETE` policy on `public.leagues` for `authenticated` using `owner_id = auth.uid() AND is_global_pool = false`. Confirm the child tables (`league_memberships`, `picks`, `survivor_picks`, `tiebreakers`, `messages`) cascade on `league_id`; add `ON DELETE CASCADE` where the foreign key doesn't already have it.
- Add a `deleteLeague` server function in `src/lib/leagues.functions.ts` using `requireSupabaseAuth`, verifying ownership and the non-global flag before deleting.
- `src/routes/_authenticated/leagues.index.tsx`: add the delete button + shadcn `AlertDialog` with type-to-confirm, wired through `useMutation`; invalidate league queries on success.
- `src/lib/league-context.tsx`: if the deleted league was active, fall back to the Global Pool.
