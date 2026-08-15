# Get Gridiron Confidence live on gridironconfidence.com

## Goal
Publish the app and connect the Lovable-purchased domain `gridironconfidence.com` so the league is accessible at the custom domain.

## Current state
- App is currently only on a preview URL; it is **not published**.
- Effective publish visibility is already **public**.
- Domain `gridironconfidence.com` has been purchased through Lovable.

## Steps

1. **Publish the app**
   - Use the Lovable publish flow to create a `.lovable.app` production deployment.
   - Publishing is a prerequisite before any custom domain can be attached.

2. **Connect the custom domain**
   - Add `gridironconfidence.com` (and `www.gridironconfidence.com`) as a custom domain in Project Settings → Domains.
   - Because the domain was bought through Lovable, DNS records can be managed inside the same Domains settings panel.

3. **Configure DNS**
   - For a Lovable-purchased domain, set the required records through the in-product DNS manager:
     - A record for `@` pointing to `185.158.133.1`
     - A record for `www` pointing to `185.158.133.1`
     - TXT record for `_lovable` with the verification value provided by Lovable
   - If the registrar/DNS is external instead, add the same records at the provider.

4. **Verify domain status**
   - Wait for DNS propagation and Lovable verification (can take up to 72 hours, often much faster).
   - Confirm SSL is provisioned and the domain status moves to **Active**.

5. **Test the live site**
   - Visit `https://gridironconfidence.com` and `https://www.gridironconfidence.com`.
   - Verify the auth flow, picks page, pot page, and leaderboard load correctly on the custom domain.

## Technical notes
- No code changes are required; this is a publishing + domain-configuration task.
- Backend (database, Stripe webhooks, email domain) is already deployed and will continue working once the frontend is published.
- If `www` is added, choose one version as the primary domain so the other redirects.
