# Darker, More Cinematic Look

Take the current stadium-navy theme deeper: near-black canvas, stadium spotlight lighting, frosted glass panels, and a restrained neon field-green accent. Nothing about how the pool works changes — same picks, same numbers, same rules. This is purely how it looks.

## What changes visually

**Background**
- Move from navy to a near-black stadium night with a soft overhead spotlight glow at the top and a faint green field wash at the bottom.
- Add a gentle vignette so the edges fall off and content feels lit from above.

**Panels and cards**
- Replace the flat navy panels with frosted-glass slabs: dark translucent fill, thin light edge, deeper drop shadow so they float above the black.
- Cards lift slightly and their edge brightens on hover.

**Matchup cards (Picks and Survivor)**
- Keep the real NFL logos and crest watermarks exactly as they are.
- Deepen the card interior so logos and team colors pop harder against the black.
- Selected team: keep its true team-color glow, but make it a soft bloom instead of a hard ring.
- Unpicked side dims further; a losing pick fades back rather than looking broken.
- Kickoff time and network pill get a quieter, more broadcast-like treatment.

**Accents**
- Green stays the signal color: countdown, "picks in", winner state, live indicators. It is used less often so it reads as important when it appears.
- Gold stays reserved for trophies and first place.

**Header and navigation**
- Top bar becomes a darker glass strip with a stronger blur.
- Mobile bottom bar matches, with a subtle glow on the active tab.

## Pages touched

Picks, Survivor, Scores, Standings, Bracket, Trophy Case, Trash Talk, Leagues, Alerts, Profile — all of them inherit the change automatically because it is done in the shared theme, with small per-card touch-ups on Picks and Survivor.

## Technical notes

- Retune the color tokens in `src/styles.css`: darken `--background`, `--card`, `--popover`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`; keep `--primary` (field green), `--gold`, and `--destructive` at current hues so team colors and trophies are unaffected.
- Add cinematic body layers: top spotlight radial, bottom turf wash, and a vignette overlay.
- Rework the `field-panel` utility into a glass surface (translucent fill + backdrop blur + hairline top highlight + deeper `--shadow-stadium`), and add a `panel-lift` hover utility.
- Soften `pick-glow` into a bloom (larger, lower-opacity spread) while keeping `--pick-color` team-color driven.
- Update header/bottom-nav classes in `src/components/AppShell.tsx` to the new glass treatment with an active-tab glow.
- Light touch-ups only in `src/routes/_authenticated/picks.tsx` and `survivor.tsx` for card interior depth and dim states — no logic changes.
- All values stay semantic tokens in `src/styles.css`; no hardcoded colors in components.

## Out of scope

No changes to picks logic, lock times, scoring, survivor rules, or the database.
