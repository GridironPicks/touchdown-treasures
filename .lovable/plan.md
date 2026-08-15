# Standings as a Football Field

Yes — this can look great, as long as the field is a *view mode* on top of the existing table, not a replacement. A field is fun and instantly readable at a glance; a table is better for exact numbers, weeks played and streaks. So: add a "Field" / "Table" toggle on the Standings page, defaulting to Field.

## The visual

```text
+--------------------------------------------------------------+
| W |                                                        | L |
| I |  50   40   30   20   10   20   30   40   50            | O |
| N |   .    .    .    .    .    .    .    .    .            | S |
| N |  (1) Bolts 214                                         | E |
| E |        (2) Hawks 201                                   | R |
| R |               (3) Wolves 188                           | S |
|   |                        (4) Ravens 160                  |   |
+--------------------------------------------------------------+
```

- Dark navy field with field-green turf, yard lines every 10 yards, hash marks, subtle stadium-light glow.
- Left endzone reads WINNER (green, glowing); right endzone reads LOSERS (muted silver/red).
- Each manager is a chip on the field: their mascot/logo badge, team name, and points.
- Horizontal position is scaled by points — leader sits on the goal line at the WINNER endzone, last place sits back near the LOSERS endzone, everyone else spaced proportionally between them.
- Vertical position is by rank so chips never overlap; the field scrolls vertically if there are many players.
- Leader gets the trophy badge; hot-streak players keep the flame; the signed-in user's chip is outlined so they can find themselves.
- Chips animate to their new yard line when standings change.

## Mobile

On phones the field rotates to a vertical drive: WINNER endzone at the top, LOSERS at the bottom, chips stacked down the field. Same logic, no horizontal scrolling.

## Behavior

- Works for all three boards already on the page (regular season, preseason, single week) and respects the active league.
- Tapping a chip opens that manager's profile page, same as the table rows do today.
- If everyone is tied at 0 (before week 1) all chips sit at midfield with a "Kickoff pending" note.

## Technical notes

- New component `src/components/StandingsField.tsx`, rendered from `src/routes/_authenticated/leaderboard.tsx` behind a view toggle; existing query, streak and winner logic is reused untouched.
- Position = normalized points between min and max in the current board; single-player or all-equal cases clamp to the goal line / midfield.
- Field, endzone, turf and glow colors added as semantic tokens in `src/styles.css` — no hardcoded color utilities.
- Chips reuse `Mascot` for logos; layout uses percentage offsets so it scales without media-query hacks.
