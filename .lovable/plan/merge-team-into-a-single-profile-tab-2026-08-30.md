# Merge Team into a single Profile tab

Combine the Team Setup page and My Account page into one **Profile** tab, with the franchise badge editor living inside it. Tab count drops from 11 to 10.

## What changes for you

- The bottom/side nav shows one **Profile** tab instead of separate **Team** and **Account** tabs.
- Profile page sections, top to bottom:
  1. **Franchise** — live badge preview, team name, manager name, badge picker (Mascots / Crests / NFL Teams), team color swatches, Save button. This is the full editor, inline — no more "Edit team setup" link.
  2. **Sign-in details** — email, sign-in method, created / last sign-in.
  3. **Your leagues** — list plus Manage leagues button.
  4. **Security** — change password, sign out.
  5. **Danger zone** — delete account.
- Franchise editing is the first thing you see, since it is the section people actually change.
- Saving your franchise stays on Profile with a confirmation toast instead of bouncing you to Picks.

## Technical notes

- New route `src/routes/_authenticated/profile.tsx` containing the merged UI, with its own `head()` metadata (title/description/og for "Profile — Gridiron Confidence").
- Delete `src/routes/_authenticated/team.tsx` and `src/routes/_authenticated/account.tsx`.
- Keep `/team` and `/account` working as permanent redirects to `/profile` so existing bookmarks and any stale links don't 404.
- `src/components/AppShell.tsx`: replace the two nav entries with a single `{ to: "/profile", label: "Profile", icon: UserCircle }`.
- Reuse the existing profile query, upsert logic, badge/color pickers, and account server function (`deleteMyAccount`) as-is; no database or business-logic changes.
- Verify the two-row mobile nav grid still lays out cleanly at 10 tabs with no horizontal scroll.
