# Broadcast badges + live field-position strip on Picks

Both ideas are good fits, and the data you need is already coming in — the Live Scoreboard tab already pulls network, quarter, clock, possession, down & distance and red-zone status from the same feed. This plan reuses that on the Picks cards, so nothing new has to be fetched or stored.

## 1. Network pill next to each kickoff time

- On every game card, show a small pill (NBC, CBS, FOX, ESPN, PRIME, NETFLIX, etc.) right beside the kickoff time / status line.
- Styling: `bg-slate-800/80 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-white/5`, adapted to the app's existing tokens so it stays right in dark mode.
- If the feed doesn't list a network yet (common for far-out weeks and TBD times), the pill is simply hidden — no empty box.

## 2. Live field-position strip

- Shows only while a game is actually in play. Along the bottom of that card:
  - Left: quarter and clock (e.g. `Q3 · 4:12`)
  - Middle: possession team and down & distance (e.g. `KC ball · 3rd & 4 at KC 34`)
  - A thin field bar with pinstripes and a glowing green dot at the ball's spot on the field, flipping to a red tint when the offense is in the red zone.
- The strip disappears the moment the game goes final; nothing changes for scheduled or completed games.

## 3. Auto-update

- While at least one game in the week is live, the card data refreshes every 20 seconds (and instantly when you come back to the tab). When no game is live, polling stops so nothing runs in the background.
- Your picks and confidence numbers are untouched by the refresh — only the score/clock strip changes.

## What it will look like

```text
 SUN 12:00 PM  [CBS]                              Kicked off
 ┌──────────────────────┬──────────────────────┐
 │ (logo) CHIEFS   24   │ (logo) BILLS    21   │
 └──────────────────────┴──────────────────────┘
 Q3 · 4:12   KC ball · 3rd & 4 at KC 34
 ▓▒▓▒▓▒▓▒▓▒▓▒▓●▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓
```

## Technical notes

- Field position needs one small addition to the live feed mapping: the ball spot (`yardLine` / `possessionText`) alongside the existing possession and down-distance fields in `src/lib/scoreboard.server.ts`, plus its `LiveGame` type.
- `src/routes/_authenticated/picks.tsx` adds a query against the existing `getLiveScoreboard` server function, keyed by season type and week, joined to the games by `external_id`, with `refetchInterval` of 20s only while a game is live.
- New presentational pieces: a `NetworkBadge` pill and a `FieldPositionBar` component; the pinstripe/glow styling goes in `src/styles.css` as a utility so no hardcoded colors land in the component.
- No database, schedule, scoring, or pick-locking changes.
