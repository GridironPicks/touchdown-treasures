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

## Playoffs — bracket challenge + confidence weeks (B & C)

The season currently stops dead at Week 18. This adds a full January.

### Shared groundwork
Playoff games get pulled into the schedule as a new `post` season type — Wild Card, Divisional, Conference Championships, Super Bowl. The existing score sync picks them up automatically once the NFL seeds the field, so no manual entry.

### C. Bracket challenge (filled once, before Wild Card weekend)
- After Week 18 ends, a **Bracket** tab opens for everyone.
- You fill the entire postseason in one sitting: every matchup in every round, advancing your winners through to a Super Bowl champion, plus a total-score tiebreaker.
- One submission, final, locked at the first Wild Card kickoff. Everyone's bracket is hidden until then, then the whole board reveals at once.
- Escalating points: 2 per Wild Card game, 4 Divisional, 8 Conference, 16 Super Bowl — 52 possible.
- Live bracket board shows every manager's tree with hits in green, busts struck through, and a "still alive for the win" marker.

### B. Playoff confidence weeks
- The normal weekly game continues through the playoffs: each round is its own pick week with confidence numbers sized to the slate (6 down to 1 for Wild Card, 4 for Divisional, 2 for Conference, 1 for the Super Bowl).
- Same lock rules, same tiebreaker, same weekly winner.
- Points land in a separate **Playoff Standings** tab so the regular-season race and its trophy stay untouched.

### Trophies
The 2026 season trophy is still awarded on the Week 18 standings. The playoffs add two new trophy-case awards: **Bracket Champion** and **Playoff Points Leader**.

### Technical notes
- `season_type` enum gains `post`. Week numbering 1-4 within `post`.
- `picks`, `tiebreakers`, and the reporting functions already key on `season_type`, so confidence weeks mostly come free once the games exist; confidence ceiling becomes the game count for the round rather than a fixed 16.
- New `bracket_entries` + `bracket_picks` tables (league-scoped, RLS by owner/member, GRANTs), locked by a trigger at the first `post` week 1 kickoff, same one-shot-final rule as picks.
- New `bracket_standings` and `playoff_standings` database functions mirroring the existing membership-gated pattern.
- Sync extended to fetch `seasontype=3` from the score feed.
- Build order: audit fixes 1-4 first (they're small), then the playoff groundwork, then the bracket, then the confidence weeks.

