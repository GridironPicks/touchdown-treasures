# Weekly Recap + Commissioner Tools

## How the winner is announced today

- Once every game in the slate is final, an automated push alert goes out to opted-in players: "X won Preseason Week 3 in Global Pool" plus your own finish and points.
- The Standings page marks weekly wins and the flame streak badge.
- Gap: the winner is picked purely by highest points, and the Monday-night/final-game tiebreaker is not applied — if two people tie, the alert names whichever row sorts first. There is no in-app announcement anyone can go read after the fact.

This plan fixes that: the recap becomes the official announcement, and the tiebreaker ladder decides the winner everywhere (recap, standings, push alert).

## 1. Weekly Recap

A new Recap view (per league, per week), reachable from Standings and from the results push alert.

- **Winner card** — team name, mascot, points, margin over second place, and which tiebreaker step decided it if the top score was tied
- **Tiebreaker ladder**, applied in order: total confidence points → closest to the final game's combined score (without going over is not used; closest absolute) → most correct picks → earliest submission time
- **Final standings for the week** with each player's points and correct-pick count
- **Biggest hit / biggest miss** — highest confidence points won and lost across the league
- **Upset of the week** — the game where the most confidence points were burned league-wide
- **Survivor casualties** — who was eliminated that week (regular season only)
- **Share recap** — copies a plain-text summary for the group text
- Recap only appears once every game in the slate is final; before then it shows a "week still in progress" state

The results push alert and the standings "weekly wins" count both switch to the same tiebroken winner so nothing disagrees.

## 2. Commissioner Tools

An owner-only panel on the Leagues page for any league you own (not the Global Pool):

- **Rename league**
- **Regenerate join code** and copy the invite link
- **Members list** with role, join date, and current-week submission status
- **Remove a member**
- **Transfer ownership** to another member (with confirmation)
- **Nudge unsubmitted players** — one tap sends a deadline push to league members who haven't submitted this week
- Delete league stays where it is

Non-owners see the league details read-only, as today.

## Technical notes

- Recap is a read-only aggregation over `weekly_scores`, `picks`, `games`, `tiebreakers` and `survivor_picks`, exposed as a security-definer database function scoped to league members, called from an authenticated server function. No new tables.
- The tiebreaker ladder lives in one shared SQL function so the recap, standings weekly-win count and `notify.server.ts` results alert all use the same result.
- Commissioner tools need new RLS: an owner-scoped UPDATE policy on `league_memberships` (for role transfer) — the delete-member and league-update policies already exist. Ownership transfer updates `leagues.owner_id` and both membership rows in one security-definer function so it can't half-apply.
- Nudge reuses the existing push pipeline in `src/lib/push.server.ts` with a dedupe key so a commissioner can't spam the league.
- New route: `src/routes/_authenticated/recap.tsx` (league + week from search params), plus an owner panel section inside the existing Leagues page.
