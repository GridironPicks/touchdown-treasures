# Remove the Survivor game

Survivor disappears from the app entirely: no tab, no page, no alerts, no mentions.

## What changes

**Navigation**
- Remove the Survivor entry from the top and bottom navigation bars.

**The page itself**
- Delete the Survivor page and its team-pool grid. Anyone who visits the old `/survivor` link gets sent to Picks instead, so no broken page.

**Weekly Recap**
- Remove the "Survivor casualties" section and drop survivor wording from the page description.

**Alerts**
- Remove the "Survivor status" notification toggle and its history label, and stop sending survivor alerts after games go final.
- Update the alert page copy so it no longer mentions survivor.

**Wording elsewhere**
- Remove survivor mentions from the account-deletion and league-deletion warnings.

## Data

The survivor tables and the past picks stay in the database untouched — nothing is deleted, so the game can be restored later if you change your mind. Nothing in the app reads them anymore.

## Technical notes

- Delete `src/routes/_authenticated/survivor.tsx` and `src/components/SurvivorTeamPool.tsx`; add a redirect route at `/survivor` pointing to `/picks`.
- Remove the nav item in `AppShell.tsx` (bottom nav stays a 5-column grid with the remaining 9 items flowing across two rows as it does today).
- Strip `survivor` from `NotificationKind` in `push.server.ts`, from prefs in `notifications.functions.ts`, `notifications.tsx`, and `AlertHistory.tsx`; drop `survivorAlerts()` from `notify.server.ts`.
- Remove the `survivor_board` RPC call and casualties block in `recap.functions.ts` / `recap.tsx`.
- Leave `survivor_picks`, `survivor_board`, and related SQL and generated types in place.
