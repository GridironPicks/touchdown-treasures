# Forgot Password / Account Recovery

Right now the sign-in screen only offers email + password and Google. If someone forgets their password there is no way back in. This adds a standard, secure reset flow by email.

Note on "temporary password": sending a plaintext temporary password by email is insecure and isn't supported by the auth system. The equivalent — and safer — flow is a one-time secure reset link emailed to the address on the account, which lets the user set a new password themselves. That's what this plan builds.

## What the user experiences

1. On the sign-in screen, a "Forgot password?" link under the password field.
2. Clicking it swaps the card into a reset request view: enter your email, hit "Send reset link".
3. Confirmation message: "If that email is registered, a reset link is on the way." (Worded so it can't be used to discover which emails exist.)
4. The email arrives with a link back to the app at `/reset-password`.
5. That page asks for a new password twice, validates they match and meet the 6-character minimum, saves it, and drops the user straight into their picks page signed in.
6. If the link is expired or already used, the page says so and offers to send a new one.

Google sign-in users who never set a password can also use this to create one, so they gain a second way in.

## Technical notes

- New public route `src/routes/reset-password.tsx` (top-level, not under the auth gate), `ssr: false`, with its own head metadata.
- `src/routes/auth.tsx` gains a third mode `reset` alongside `signin` / `signup`, calling `resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
- Reset page listens for the `PASSWORD_RECOVERY` auth event / recovery session before showing the form, then calls `supabase.auth.updateUser({ password })` and navigates to `/picks`.
- Same Gridiron field-panel styling and stadium heading as the auth card; no new dependencies.
- No database or schema changes needed.

## Optional follow-up (not in this change)

Auth emails currently go out with default branding from the platform sender. If you want them to come from `gridironconfidence.com` with league styling, that's a separate email-domain setup step we can do after this.
