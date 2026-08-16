# Badge details: show what each badge was earned for

Today each badge chip only shows a generic hover tooltip ("Gutsy Call — Biggest confidence points earned on a road-team win"). The database already returns a per-badge `detail` string (e.g. "Biggest road-team call: SEA"), but the UI throws it away, and the detail itself doesn't name the game, the week, or the points.

## What changes

1. **Richer detail text from the database**
   - Gutsy Call: "Week 3 — SEA won at SF for 14 pts"
   - Perfect Week: "Week 5 — 16 of 16 correct"
   - Week Win: "Week 5 — 121 pts, 1st of 12"
   - Bullseye: "Week 5 — 2 pts off the tiebreaker"
   - Ice Cold: "Week 5 — last of 12"
   - Comeback: "Week 5 — climbed 4 places"
   - Iron Manager: "Submitted picks in all 6 weeks"

2. **Tap or click a badge to see the details**
   Badge chips become buttons. Tapping opens a small popover listing every time that manager earned the badge, one line per week with the detail text above. Hover tooltip stays as a quick preview for desktop.

3. **Badge glossary**
   A "Badges" link on the manager profile page opens a dialog listing all eight badges, their icon, and how each one is earned — so a new player can see what's possible, not just what they've won.

## Technical notes

- Migration replacing `public.manager_badges` so each row's `detail` includes the week, matchup/teams, and the relevant number. The Gutsy Call branch joins back to `games` for the away/home abbreviations and uses the pick's confidence value.
- `src/components/BadgeRow.tsx`: `EarnedBadge` carries `entries: { week: number | null; detail: string | null }[]` instead of just `weeks`. `BadgeChip` renders inside a shadcn `Popover` with the earned-list content.
- All three call sites (`leaderboard.tsx`, `recap.tsx`, `manager.$userId.tsx`) already pass the raw rows through, so they only need to forward `detail`.
- New `src/components/BadgeGlossary.tsx` driven by the existing `BADGE_META` map in `src/lib/badges.ts`.
