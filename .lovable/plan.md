# Custom 3D Team Emblems

Create five premium 3D crest emblems from your prompts and make them selectable in team branding, alongside the existing mascot set and NFL logos.

## The five emblems

- Cartel Cowboyz — golden bull skull, long horns, "CC" engraving, purple jewel accents
- Heavy Hitters — gold star with red "H", industrial steel and tire tread, metal bezel
- Mama Bear — purple crystal bear head, polished purple rim, gold trophy detail
- Junkyard Dogs — chrome bulldog in a steel gear, chains, electric blue glow
- The Trey-tors — silver and royal blue helmet crest, trident through a "T" monogram

All rendered as circular esports crests on a dark slate background with beveling, depth, and cinematic lighting, sized for the round avatar spots used across standings, picks, chat, and profiles.

## How they show up

- A new "Signature crests" group appears in the team branding picker, next to the current mascot emblems and NFL logos.
- Anyone can pick one — they are not locked to a specific manager — so a crest chosen here replaces that manager's mascot everywhere their team appears.
- After you see the first renders, any crest can be regenerated with tweaks (color, angle, detail) before we finalize.

## Technical notes

- Generate five square PNGs with transparent-safe framing into `src/assets/mascots/` following the existing asset-json import pattern used by `Mascot.tsx`.
- Register the new keys in the mascot registry so `Mascot` resolves them; add them as a separate labelled group in the branding/team-setup selector.
- No database change needed: `profiles.mascot` already stores an arbitrary key string.
