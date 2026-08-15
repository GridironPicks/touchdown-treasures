# Get Gridiron Confidence live on gridironconfidence.com

## Goal
Publish the app and connect the Wix-purchased domain `gridironconfidence.com` so the league is accessible at the custom domain.

## Current state
- App is currently only on a preview URL; it is **not published**.
- Effective publish visibility is already **public**.
- Domain `gridironconfidence.com` was purchased through Wix, so DNS records must be added in the Wix domain manager (or the registrar's DNS host if Wix is not hosting DNS).

## Steps

1. **Publish the app**
   - Use the Lovable publish flow to create a `.lovable.app` production deployment.
   - Publishing is a prerequisite before any custom domain can be attached.

2. **Start custom-domain setup in Lovable**
   - In Project Settings → Domains (or the Publish dialog → Add custom domain), add:
     - `gridironconfidence.com`
     - `www.gridironconfidence.com`
   - Lovable will provide the exact DNS records to add:
     - A record for `@` → `185.158.133.1`
     - A record for `www` → `185.158.133.1`
     - TXT record for `_lovable` → verification value shown by Lovable

3. **Add DNS records in Wix**
   - Open the Wix domain management page for `gridironconfidence.com`.
   - Add the A records and TXT record exactly as Lovable shows.
   - If the domain is currently pointed at a Wix site, this will redirect the root/ www traffic to the Lovable app instead.
   - Note: the `notify.gridironconfidence.com` email subdomain is already delegated to Lovable via NS records and should remain untouched.

4. **Choose a primary domain**
   - In Lovable, set either the root domain or `www` as primary so the other redirects.

5. **Verify domain status**
   - Wait for DNS propagation and Lovable verification (can take up to 72 hours, often much faster).
   - Confirm SSL is provisioned and the domain status moves to **Active**.

6. **Test the live site**
   - Visit `https://gridironconfidence.com` and `https://www.gridironconfidence.com`.
   - Verify the auth flow, picks page, pot page, and leaderboard load correctly on the custom domain.

## Alternative (if Wix DNS is too restrictive)
- Transfer the domain into Lovable (Workspace settings → Workspace domains → Transfer in) or move DNS hosting to a provider that supports the required records (e.g., Cloudflare's free plan). The domain keeps its current registrar; only DNS management changes.

## Technical notes
- No code changes are required; this is a publishing + domain-configuration task.
- Backend (database, Stripe webhooks, email domain) is already deployed and will continue working once the frontend is published.
