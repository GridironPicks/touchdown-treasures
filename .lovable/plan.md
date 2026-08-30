# Audit fixes 1-4, plus playoff options

## Approved work (items 1-4)

**1. Week 18 "times TBD"**
All 18 Week 18 games currently share one placeholder kickoff because the NFL hasn't scheduled them. Detect when every game in a week shares the same kickoff and show a "Times TBD" badge on the Picks and Scoreboard pages instead of a fake time. The score sync replaces the placeholders automatically once real times publish. Scoring and the Wednesday lock are unaffected.

**2. Social share image**
Add a branded share card (navy field, green accent, trophy, "Gridiron Confidence") so links shared in a group text or on social show an image instead of plain text. Wired into the home, sign-in, and join pages.

**3. Commissioner alert history**
Add a "Recent alerts sent" list to the commissioner panel showing the nudges and notifications that went out, with kind and timestamp. Today that history exists but nothing can read it.

**4. Tighten backend function permissions**
Revoke direct database access to the admin-only functions (join code regeneration, ownership transfer, join-request decisions and the like) so they can only run through the app's own server code. No behavior change for players.

### Technical notes
- Week 18: slate helper flags `count(distinct kickoff) = 1` for a week; UI renders a TBD badge. No schema change.
- Share image: static asset in `public/`, absolute https `og:image` + `twitter:image` on `index.tsx`, `auth.tsx`, `join.tsx` only.
- Alert history: migration adds a league-owner `SELECT` policy plus `GRANT SELECT ... TO authenticated` on `notification_log`, and a `listRecentAlerts` server function called from `CommissionerPanel`.
- Permissions: `REVOKE EXECUTE ... FROM authenticated` on the admin-only `SECURITY DEFINER` functions, keeping `service_role`. The member-facing reporting functions (`week_recap`, `league_weekly_points`, `manager_badges`, `survivor_board`, etc.) keep their grants — they already gate on league membership and the UI calls them directly.

---

## Playoffs — options to choose from

The schedule stops at Week 18 and nothing defines what happens after. Here are the directions, cheapest first. Pick one (or more) and I'll fold it into the build.

**A. Season ends at Week 18 (do nothing)**
Trophy awarded on the Week 18 standings. Zero work. January goes quiet.

**B. Playoff confidence weeks**
Keep the exact same game: Wild Card, Divisional, Conference Championship, Super Bowl each become their own pick week with confidence numbers sized to the slate (6, 4, 2, 1). Separate "Playoff Standings" tab so it doesn't distort the regular-season race. Cheapest way to keep everyone engaged through February.

**C. Bracket challenge**
Before Wild Card weekend, everyone fills out the full 13-game bracket in one shot — pick every round's winner plus the Super Bowl champ and total score. Points escalate by round (2/4/8/16). One submission, locked at the first kickoff, big reveal board. Most fun, most build.

**D. Playoff survivor**
Survivor continues into January: one team per round, can't reuse. Brutal and short — most people are out by the Divisional round.

**E. Season-long playoff bonus**
No new picking. Whoever picked the most eventual playoff teams correctly all season gets a bonus badge in the trophy case. Purely automatic.

**F. Super Bowl props night**
A one-off prop sheet for the Super Bowl: coin toss, first score type, halftime over/under, MVP, final margin. Great for a watch party, tiny build.

### My recommendation
**B + C together.** The bracket is filled once before the playoffs and delivers the big-picture drama; confidence weeks keep the weekly ritual alive. D and F are good add-ons if you want more. All of them need the playoff schedule pulled into the games table with a new `post` season type — that groundwork is shared, so picking two now costs much less than adding the second one later.

Reply with the letters you want and I'll build 1-4 plus those.
