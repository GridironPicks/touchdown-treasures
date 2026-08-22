# Manager Stats & Picking DNA

A personal analytics dashboard on every manager profile that turns the season's picks into insight cards: what this manager is good at, where they struggle, and how their confidence evolves week to week.

## What you will see

On each manager profile page (`/manager/:userId`), a new **Picking DNA** panel appears above the weekly picks:

- **Overall accuracy** — correct picks / total picks submitted.
- **Average confidence** — average confidence points they assign to winning picks vs losing picks.
- **Confidence heat map** — win rate grouped by confidence band (high 13-16, mid 7-12, low 1-6).
- **Spotlight traits** — auto-generated badges like:
  - *Primetime Player* — best win rate on Thursday/Sunday/Monday night games.
  - *Road Warrior* — best win rate picking away teams.
  - *Underdog Whisperer* — best win rate when picking the team that was not favored (we infer underdog by lower confidence usage, or by spread if odds are added later).
  - *Choker* — lowest win rate on their highest-confidence picks.
  - *Closer* — best win rate in the final month of the regular season.
- **Weekly trend sparkline** — a tiny bar chart of points earned per week for the selected season type.
- **Best and worst weeks** — week number, points, and a link to that week's picks.

The panel respects the existing reveal rules: it only includes weeks whose picks have been revealed to the viewer, so you cannot reverse-engineer hidden picks.

## Technical details

- New security-definer SQL function `manager_picking_dna(_season int, _season_type text, _league_id uuid, _user_id uuid)` returns one row of aggregate stats plus JSON arrays for the weekly trend and confidence heat map.
- New `src/lib/stats.functions.ts` wrapping the RPC call in a thin `createServerFn`.
- New `src/components/PickingDNA.tsx` card component, used on the manager profile route.
- Extend `src/routes/_authenticated/manager.$userId.tsx` to fetch and render the new card.
- All calculations read only `games` and `picks` rows where `status = 'final'` and the week is revealed via `picks_revealed()`.
- No new tables required; this is a read-only analytics layer over existing data.

## Out of scope

- Spread/odds integration is not required for launch; underdog detection can use confidence rank relative to the league average for that game.
- No comparison to other managers yet; this release is per-manager only.
- No email/export of the stats.
