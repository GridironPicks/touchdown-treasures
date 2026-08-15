# Gaps worth closing in Gridiron Confidence

You already have the core covered: confidence picks with the Tuesday/Wednesday window, survivor pool, standings with streaks, trash talk, private leagues, alerts, account and password recovery. Below is what's actually missing, strongest first. Pick the ones you want and I'll build them.

## 1. Weekly recap (highest impact)

After a week scores out, there's nowhere that tells the story. Add a Recap view per week:
- Winner of the week with score, plus the margin over second
- Biggest hit and biggest miss (highest confidence points won/lost across the league)
- Games where the league was most wrong (upset of the week)
- Survivor casualties for the week
- A "share recap" button that copies a text summary for group chats

## 2. Commissioner tools

Right now a league owner can create, share and delete, and nothing else. Add an owner-only league settings panel:
- Rename league, regenerate join code, view/copy invite link
- Remove a member, transfer ownership
- Toggle which games the league runs (confidence / survivor)
- Nudge unsubmitted players with one tap before the lock

## 3. My season page (personal stats)

A player can see this week, but not their season. Add a personal dashboard:
- Weekly points history chart, best/worst week, rank over time
- Accuracy by confidence tier (how often your 16s and 15s hit vs your 1s and 2s)
- Record vs each NFL team, most-picked team

## 4. Onboarding for invited players

A new player landing on a join link goes straight into a blank picks page. Add a short first-run flow: set team name and mascot, read a 3-step "how it works" card, then land on picks with alerts opt-in offered.

## 5. Public-facing polish

- Landing page currently has no screenshot or social preview image; add a generated hero image and wire `og:image` / `twitter:image` so shared links look real
- Add `sitemap.xml` and `og:type` / `twitter:card` tags
- A short public rules page so people can read the format before signing up

## 6. Smaller wins

- Pick locking safety net: an "are you sure, this is final" confirm on submit (currently one tap makes picks permanent)
- Countdown to lock pinned in the header on mobile, not just on the picks page
- Empty states for a brand-new league (no games scored yet) so it doesn't read as broken
- Loading skeletons on standings and picks instead of a blank frame

## Technical notes

- Recap and personal stats are read-only aggregations over existing `picks`, `games`, `survivor_picks` — computed in server functions, no schema changes needed except an optional materialized weekly-results cache if it feels slow
- Commissioner tools need new owner-scoped RLS policies on `league_memberships` (delete member, update role) and a `leagues` update policy for rename/regenerate code
- Onboarding is client routing plus a `profiles.onboarded_at` column
- SEO items are per-route `head()` additions plus one generated hero asset

## Suggested order

Start with 1 and 2 — recap gives the league something to talk about every Tuesday, and commissioner tools remove the support requests you'd otherwise field yourself. Then 3, then the polish items.
