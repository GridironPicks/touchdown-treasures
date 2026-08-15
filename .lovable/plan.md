# Private Leagues Plan

Add a multi-tenant "Private Leagues" feature while keeping the default "Global Pool" as a permanent, opt-out league.

## Decisions

- Picks are **separate per league**. A user can belong to multiple leagues and submit a different pick set for each.
- Survivor pool is also **separate per league**.
- The default "Global Pool" is created automatically. New users are enrolled by default, but they can leave it.
- League URL structure: `/leagues/:leagueId/picks`, `/leagues/:leagueId/leaderboard`, `/leagues/:leagueId/survivor`, `/leagues/:leagueId/chat`, `/leagues/:leagueId/team`. Existing top-level routes (`/picks`, `/leaderboard`, etc.) redirect to the user's active/default league.
- Lock rules for private leagues initially mirror the global rules (preseason per-kickoff, regular season Tuesday open / Wednesday lock). A `deadline_type` setting is stored in `settings` JSONB and surfaced in the UI; enforcement will follow the chosen setting in a later phase if needed. For this phase we store the setting and apply the existing global logic to all leagues.

## Database Changes

1. **Create `public.leagues` table**
   - `id` uuid PK
   - `name` text not null
   - `owner_id` uuid references auth.users(id)
   - `join_code` text unique, 6-character random string
   - `settings` jsonb default `{}`
   - `is_global_pool` boolean default false
   - `created_at`, `updated_at`

2. **Create `public.league_memberships` table**
   - `id` uuid PK
   - `league_id` uuid references public.leagues(id) on delete cascade
   - `user_id` uuid references auth.users(id) on delete cascade
   - `role` text check ('owner' | 'member')
   - unique (`league_id`, `user_id`)
   - `created_at`

3. **Add `league_id` to existing tables**
   - `picks.league_id` uuid references public.leagues(id)
   - `tiebreakers.league_id` uuid references public.leagues(id)
   - `survivor_picks.league_id` uuid references public.leagues(id)
   - `messages.league_id` uuid references public.leagues(id)
   - Update unique constraints to include `league_id` where appropriate.

4. **Backfill data**
   - Insert one `leagues` row for the Global Pool (`is_global_pool = true`).
   - Backfill `league_id` on all existing picks, tiebreakers, survivor_picks, and messages with the Global Pool id.
   - Enroll every existing profile into the Global Pool membership with role 'member'.

5. **RLS / policies**
   - `leagues`: readable by members; updatable by owner; insertable by authenticated users.
   - `league_memberships`: readable by members of the same league; insertable on join; deletable by owner or self.
   - Update picks/tiebreakers/survivor_picks/messages policies to scope by `league_id` and respect membership.

6. **Helper functions**
   - `public.generate_join_code()` returns a random 6-character alphanumeric string.
   - `public.create_league(name, owner_id, settings)` creates the league, membership as owner, and join code.
   - `public.join_league_by_code(code, user_id)` adds membership if not already a member.

## Backend Server Functions

1. **`src/lib/leagues.functions.ts`**
   - `createLeague({ name, settings })` — authenticated, returns the new league id and join code.
   - `joinLeagueByCode({ code })` — authenticated, adds membership.
   - `getMyLeagues()` — authenticated, returns all leagues the user belongs to with role.
   - `getLeagueById({ leagueId })` — authenticated, returns league + membership info.
   - `leaveLeague({ leagueId })` — authenticated, self-removal; blocked if it is the only league the user belongs to.

2. **Update existing server functions**
   - `refreshSlateScores`, `getWinProbabilities`: no league changes needed (games are global).
   - `week_submission_status`, `survivor_board`, leaderboard views: accept `league_id` and filter members.

## Frontend Changes

1. **League context / switcher**
   - Add `src/lib/league-context.tsx` to hold the active league id.
   - Update `AppShell.tsx` header to include a League Selector dropdown (Global Pool + user's leagues). Selecting a league navigates to `/leagues/:leagueId/picks`.

2. **Route restructuring**
   - Create `src/routes/_authenticated/leagues.$leagueId.tsx` as a layout that validates membership and provides league context.
   - Move existing pages to:
     - `src/routes/_authenticated/leagues.$leagueId.picks.tsx`
     - `src/routes/_authenticated/leagues.$leagueId.leaderboard.tsx`
     - `src/routes/_authenticated/leagues.$leagueId.survivor.tsx`
     - `src/routes/_authenticated/leagues.$leagueId.chat.tsx`
     - `src/routes/_authenticated/leagues.$leagueId.team.tsx`
     - `src/routes/_authenticated/leagues.$leagueId.manager.$userId.tsx`
   - Keep old top-level routes (`/picks`, `/leaderboard`, etc.) as redirects to the active league.

3. **Picks page updates**
   - Read `league_id` from route params/context.
   - Fetch and submit picks scoped to the active league.
   - Roster status scoped to league members.
   - How-to-play text mentions the league name.

4. **Leaderboard / manager / survivor / chat updates**
   - Pass `league_id` to standings, streaks, survivor board, and chat queries.
   - Manager page only shows picks for that league.

5. **Create League wizard**
   - Add `src/routes/_authenticated/leagues.create.tsx` (or modal on `/picks`).
   - Step 1: league name + optional icon/color.
   - Step 2: deadline type (first kickoff / individual kickoff), drop-lowest-week toggle, custom rules textarea.
   - Step 3: generated join code and copyable link `/join?code=XYZ`.

6. **Join flow**
   - Create `src/routes/join.tsx` public route.
   - If logged in, call `joinLeagueByCode` and redirect to `/leagues/:leagueId/picks`.
   - If logged out, redirect to `/auth?redirect=/join?code=XYZ` first, then complete join after login.

7. **Team page**
   - Add a "My Leagues" section showing enrolled leagues and a "Leave league" button (disabled for last league).

## Migration & Backfill

- Single Supabase migration creates tables, adds columns, backfills Global Pool data, updates policies, and creates helper functions.
- After migration, run a type regeneration so `src/integrations/supabase/types.ts` reflects the new schema.

## Verification

- Type-check the app.
- Confirm a new user is auto-enrolled in Global Pool.
- Confirm a user can create a private league, copy the join link, and join from an incognito session.
- Confirm picks submitted in one league do not appear in another.
- Confirm leaving Global Pool is allowed only when another league membership exists.
