# Commissioner controls for the Global Pool

## What you get

As the creator of the Global Pool, you get the same commissioner tools every private-league owner has, plus a new league rules editor.

### 1. Commissioner tools unlocked on the Global Pool
- Remove a manager from the Global Pool (with a confirm dialog naming their team).
- Rename the pool.
- Nudge managers who haven't submitted this week.
- Member list with join date and this week's submission status.
- Excluded on purpose: join-code regeneration and ownership transfer stay off for the Global Pool, since everyone is auto-added at signup and it has no invite flow. Say the word if you want those too.
- Removal is permanent for that person unless you re-add them: new signups are auto-joined, but an existing removed account is not. A "Re-add a removed manager" picker lists accounts that are not currently in the pool so you can put someone back with one tap.

### 2. Add and edit rules at any time
- A new **League Rules** section that only you can edit, saved to the league.
- Free-form rule entries (title + description), added, edited, reordered, and deleted from the commissioner panel.
- Everyone sees your rules on the Picks page, right under the built-in "How to Play" card, labeled "House Rules — set by the commissioner".
- The built-in How to Play card (lock times, scoring, tiebreaker) stays as-is; your rules sit alongside it rather than replacing it.
- Rules changes take effect immediately for everyone; they are display-only text and don't change scoring or lock logic.

## Current state confirmed
- You (Dustin Off My Trophy) are the `owner_id` of the Global Pool, which currently has 9 members.
- `CommissionerPanel` is rendered only when `!league.is_global_pool && league.role === "owner"`, and the server-side `assertOwner` helper plus the `regenerate_join_code` / `transfer_league_ownership` database functions explicitly reject the Global Pool.
- There is no rules storage today — `HowToPlay.tsx` is fully hardcoded.

## Technical changes

**Database**
- `assertOwner` gains a flag so remove/rename/nudge accept the Global Pool while `regenerate_join_code` and `transfer_league_ownership` keep rejecting it.
- New `league_rules` table (`league_id`, `title`, `body`, `sort_order`, timestamps) with grants, RLS: members of the league can read; only the league owner can insert/update/delete.

**Server functions** (`src/lib/commissioner.functions.ts`)
- Relax the global-pool guard for `listLeagueMembers`, `renameLeague`, `removeMember`, `nudgeUnsubmitted`.
- Add `listLeagueRules`, `upsertLeagueRule`, `deleteLeagueRule`, `reorderLeagueRules`.
- Add `listRemovableCandidates` / `addMember` for the re-add picker (owner-only, Global Pool only).

**UI**
- `leagues.index.tsx`: render `CommissionerPanel` for the Global Pool when you're the owner; keep the delete/leave buttons hidden there.
- `CommissionerPanel.tsx`: hide the invite-code and "Make owner" controls for the Global Pool; add the Rules editor and the re-add picker.
- New `LeagueRules.tsx` read-only card rendered on the Picks page under `HowToPlay`, hidden when the league has no rules.
