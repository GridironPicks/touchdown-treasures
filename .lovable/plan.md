# Awards & Head-to-Head + Live Possible Points

Two upgrades that top pick'em sites have and Gridiron Confidence doesn't yet.

## 1. Live possible points + rank projection

While games are being played, every manager sees where they actually stand — not just points banked so far.

On the Standings page (and a compact strip on the Picks page) each manager row shows:
- **Banked** — points from games already final
- **Live** — banked plus points currently winning in in-progress games
- **Max possible** — banked plus every point still in play
- **Projected rank** — sorted by live points, with an arrow showing movement vs. banked rank
- **Eliminated / clinched** badges: if your max possible can't catch the current leader's banked total, you're mathematically out for the week; if your banked total already beats everyone's max, you've clinched.

Only visible once the week's picks are revealed (existing reveal rules stay untouched). The panel auto-refreshes on the same live cadence the scoreboard already uses, and shows a "Games in progress" indicator so it's obvious the numbers are moving.

## 2. Awards, badges & head-to-head

**Badges** appear next to a manager everywhere they're listed (standings, recap, roster, profile):
- Perfect Week — every game correct
- Hot Streak — 2+ weekly wins in a row (extends the existing flame)
- Bullseye — nailed the tiebreaker within 3 points
- Gutsy Call — highest confidence points earned on a road underdog
- Ice Cold — a week finishing last
- Comeback — moved up 3+ places in season rank in one week
- Iron Manager — submitted every week so far

Badges are computed from existing picks and game results, so they backfill automatically for weeks already played. Each badge has a tooltip explaining how it was earned, and a manager's profile page gets a trophy case of everything they've collected.

**Awards** on the weekly Recap page, expanding today's highlights:
- Best pick / worst pick of the week
- Biggest upset called
- Luckiest win (fewest points needed to hold on)
- Closest tiebreaker

**Head-to-head** on a new tab of the manager profile page:
- Your record vs. that manager, week by week (who scored more each week)
- Season series summary: "You lead 6-3"
- A compact grid on the Standings page showing everyone's record against everyone else in the league

## Technical notes

- New security-definer SQL functions in the database, matching the style of the existing `week_recap` / `week_highlights`:
  - `week_live_standings(season, season_type, week, league_id)` — per-manager banked, live, max possible, correct counts, remaining games; respects the same reveal gate as `picks_revealed`.
  - `manager_badges(season, season_type, league_id)` — one row per earned badge per manager per week.
  - `head_to_head(season, season_type, league_id)` — pairwise weekly win/loss/tie records.
- New `src/lib/awards.functions.ts` wrapping those calls, and a `src/components/BadgeRow.tsx` plus `src/components/LivePoints.tsx`.
- Standings (`leaderboard.tsx`), Recap (`recap.tsx`) and the manager profile route (`manager.$userId.tsx`) consume the new data; existing queries, streak logic and reveal rules stay in place.
- All new colors/glows go in `src/styles.css` as semantic tokens.
- Also fixing a hydration warning on the sign-in screen while in these files.
