# Better Team Logo Options

Replace the 12 generic line icons in Team Setup with a real badge gallery: 20 custom illustrated mascot crests in the Gridiron Glory look (navy / field green / metallic silver), plus a second tab to pick any of the 32 real NFL team logos.

## What you'll see

Team Setup gets a two-tab logo picker:

- **Mascots** — 20 illustrated emblem badges: Eagle, Bull, Shark, Wolf, Bear, Falcon, Ram, Cobra, Stallion, Titan, Hornet, Bolt, Lion, Raven, Panther, Rhino, Bison, Viper, Knight, Outlaw. Each is a circular/shield crest rendered in the stadium navy + field green + chrome silver palette so they feel like one coherent set.
- **NFL Teams** — grid of all 32 franchise logos (the same ESPN artwork already used on the matchup cards). Pick one and it becomes your badge.

Selected badge gets the green glow ring; the live preview at the top of Team Setup updates instantly. Your team color still applies as an accent ring around the badge. Existing users keep their current mascot — old ids map straight onto the new illustrated versions.

Wherever your badge already appears (leaderboard, standings rows), it now renders the new artwork.

## Technical notes

- Generate 20 mascot crest PNGs (transparent background, consistent art direction prompt, 512px) into `src/assets/mascots/` and externalize them via `lovable-assets` pointers.
- `src/lib/league.ts`: expand `MASCOTS` to the 20 ids/labels; add an `NFL_BADGES` list derived from the existing `ABBR` map in `src/lib/teams.ts`.
- `src/components/Mascot.tsx`: render an `<img>` from the mascot asset map; if the id starts with `nfl:` (e.g. `nfl:dal`), fall back to `teamLogo()` from `src/lib/teams.ts`. Keeps the existing `mascot`/`color`/`size` props so every call site is unchanged.
- `src/routes/_authenticated/team.tsx`: swap the flat grid for a tabbed picker (shadcn `Tabs`) with the mascot grid and the NFL grid.
- No database change needed — `profiles.mascot` is already a text column, so `nfl:dal` stores fine.
