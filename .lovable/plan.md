# 3D Sports Icons for the Navigation Bar

Replace the thin line icons in the navigation with a set of ten custom 3D sports icons, matching the metallic silver / navy / field-green look you liked.

## What you'll get

Ten original icons, each drawn fresh (no league logos or trademarks):

| Tab | Icon |
| --- | --- |
| Picks | Clipboard with play diagram and football |
| Scores | Stadium scoreboard |
| Standings | 1-2-3 winner's podium |
| Survivor | Silver shield with helmet crest |
| Bracket | Playoff bracket diagram |
| Trash Talk | Metal speech bubble |
| Leagues | Interlocking gears with helmets |
| Trophies | Trio of trophies |
| Alerts | Chrome bell |
| Profile | Green-and-black helmet |

## How they behave in the app

- Each icon is a transparent PNG rendered at high resolution so it stays crisp on phones and tablets.
- Inactive tabs show the icon at slightly reduced brightness with a silver label.
- The active tab shows the icon at full brightness with a green label and a green underline bar.
- Sizes stay the same as today so the bar doesn't grow taller; labels keep their current wording.

## Notes

- One trade-off: detailed 3D icons read beautifully at normal size but lose some clarity at very small sizes. To protect that, icons will be rendered large and scaled down, and the shapes kept bold and simple.
- These add roughly ten small images to the app. They'll be hosted so page loading stays fast.
- The reference sheet showed a league shield and trophy shapes that resemble real trademarks. The final icons will be original designs in the same style, without any league marks.

## Technical details

- Generate ten 1024px transparent PNGs into `src/assets/nav-icons/`, then externalize each through Lovable Assets as `.png.asset.json` pointers.
- Add a `NavIcon` component that resolves an icon key to its pointer URL via `import.meta.glob`, mirroring the existing `Mascot.tsx` pattern.
- Update `AppShell.tsx` to render `NavIcon` in place of the current Lucide icons for the ten nav entries, keeping route wiring, labels, and active-state logic unchanged.
- Active/inactive treatment via opacity and label color tokens; no new colors added outside the existing palette.
