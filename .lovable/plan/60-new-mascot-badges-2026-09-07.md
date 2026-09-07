# 60+ New Mascot Badges

Expand the badge gallery in Profile with 60 new illustrated emblems in the app's own navy / field green / metallic silver look, organized into browsable groups so the list stays easy to scan.

## What you'll see

The badge picker in Profile gains grouped tabs instead of one long grid:

- **Beasts (20)** — gorilla, panther, dragon, wolf pack, grizzly, rhino, octopus, raptor, shark, hound, boar, elk, scorpion, crocodile, owl, phoenix, kraken, mustang, wolverine, badger
- **Warriors (20)** — spartan, samurai, viking, knight, gladiator, pirate, ninja, outlaw, marshal, centurion, berserker, pharaoh, aztec sun, tribal chief, archer, crusader, sentinel, legionnaire, corsair, warlord
- **Sci-Fi & Gridiron (12)** — mech head, astronaut, cyber wolf, jet, android, circuit skull, flaming football, helmet crest, lightning bolt, laser hawk, star ranger, drone
- **Horror (10)** — reaper, jester clown, vampire, mummy, werewolf, swamp ghoul, scarecrow, gargoyle, cursed doll, horned demon

All original artwork — no movie characters or copyrighted mascots. Each is a circular crest with the same beveled depth, dark background disc, and silver/green highlight so the whole gallery looks like one set alongside your current emblems, signature crests, and the 32 NFL logos.

Existing badges stay exactly where they are; nobody's logo changes unless they pick a new one.

## Technical notes

- Generate 62 square PNGs (1024px, transparent-safe framing) into `src/assets/mascots/`, one consistent art-direction prompt per group with the navy `#0B162A` / field green `#00E676` / metallic silver palette, then externalize each with `lovable-assets` pointers.
- Register the new keys in `MASCOT_ART` in `src/components/Mascot.tsx`.
- Add grouped lists in `src/lib/league.ts` (e.g. `MASCOT_GROUPS: { label, ids[] }[]`) keeping the existing `MASCOTS` and `SIGNATURE_CRESTS` exports intact.
- Update the picker in `src/routes/_authenticated/profile.tsx` to render group tabs/sections with a scrollable grid; selection behavior, glow ring, and live preview unchanged.
- No database change — `profiles.mascot` already stores an arbitrary key.
- Generation runs in batches; a few crests may need a regeneration pass for consistency before finishing.
