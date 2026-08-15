# My Account page

Right now there's no place in the app to see which email your account uses. This adds one.

## What you'll get

A new **Account** page (reachable from the header/menu and mobile nav) showing:
- The email address your account signs in with
- Sign-in method (password or Google)
- Account created date and last sign-in
- Your manager name, team name and badge (read-only summary with a link to Team Setup)
- Leagues you belong to, with your role (owner/member)
- Buttons: Change password (sends a reset link to your email) and Sign out

## Technical notes

- New route `src/routes/_authenticated/account.tsx`.
- Reads the signed-in user from `supabase.auth.getUser()` (email, `app_metadata.provider`, `created_at`, `last_sign_in_at`) and the `profiles` row for team info; leagues come from the existing leagues query.
- "Change password" calls `supabase.auth.resetPasswordForEmail` with `redirectTo` `/reset-password` (already built).
- Add an Account entry to the nav in `src/components/AppShell.tsx` (user icon), keeping mobile nav from getting crowded by placing it next to the sign-out button on desktop and in the bottom nav grid on mobile.
- Route `head()` with its own title/description.
- No schema or backend changes.
