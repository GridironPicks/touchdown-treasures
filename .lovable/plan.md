# Make league deletion easy to find

The delete option does exist, but it lives on the Leagues page, and there's no "Leagues" link in the top navigation. The only way in today is the small league name dropdown in the header, whose last item reads "Create or join league" — nothing hints that managing or deleting a league happens there.

## What to change

1. **Add "Leagues" to the main navigation** — a link next to Picks, Standings, Survivor, Trash Talk, Team (both desktop and mobile nav), so the page is always one tap away.
2. **Relabel the switcher item** from "Create or join league" to "Manage leagues" so it clearly covers creating, joining, and deleting.
3. **Add a "Manage" shortcut inside the switcher for leagues you own** — a small gear/crown affordance on owned leagues that jumps to the Leagues page.
4. **Make the delete button more visible on the Leagues page** — render it as an outlined destructive button (not a ghost button) with the label "Delete league", and add a short "You own this league" line under owned private leagues.

No changes to the delete logic itself: still owner-only, still type-the-league-name confirmation, and the Global Pool can never be deleted.

## Technical notes

- Nav links live in the authenticated layout header alongside the existing route links; add `/leagues` there.
- Label and owner shortcut changes in `src/components/LeagueSwitcher.tsx`.
- Button styling/copy changes in `src/routes/_authenticated/leagues.index.tsx`; server function and RLS policy stay as-is.
