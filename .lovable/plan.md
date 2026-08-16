# Show every tab on phone and desktop

Right now the mobile bottom bar is a single horizontally scrollable strip, so tabs past the 4th look cut off, and on narrower laptops the desktop nav row is squeezed by the logo, league switcher, and sign-out button so items get clipped.

## What changes

**Phone**
- The bottom bar becomes a fixed 5-column grid across two rows, showing all 9 tabs at once with no side scrolling: Picks, Scores, Standings, Survivor, Trash Talk / Team, Leagues, Alerts, Account.
- Slightly smaller icons and labels so both rows fit comfortably; safe-area padding kept for iPhone home indicator.
- Page bottom padding increases so content is never hidden behind the taller bar.

**Desktop / tablet**
- Nav moves to its own full-width second row under the logo bar, so all 9 links have room instead of competing with the logo, league switcher, and sign-out button.
- Links get tighter padding and are allowed to wrap, so nothing clips at 768–1024px widths.
- League switcher and sign-out stay in the top row on the right.

## Technical notes

- Only `src/components/AppShell.tsx` changes: replace the `overflow-x-auto` flex strip with `grid grid-cols-5`, and restructure the header into two rows (`hidden sm:flex` nav row below the brand row).
- Add `pb-[env(safe-area-inset-bottom)]` on the mobile bar and bump `main`'s `pb-28` to match the two-row height.
- No routing, data, or backend changes.
