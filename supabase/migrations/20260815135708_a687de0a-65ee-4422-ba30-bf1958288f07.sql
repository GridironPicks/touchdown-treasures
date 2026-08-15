-- 1. leagues table
CREATE TABLE public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code text UNIQUE NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}',
  is_global_pool boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.leagues TO authenticated;
GRANT ALL ON public.leagues TO service_role;

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- 2. league_memberships table
CREATE TABLE public.league_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.league_memberships TO authenticated;
GRANT ALL ON public.league_memberships TO service_role;

ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;

-- 3. Add nullable league_id columns
ALTER TABLE public.picks ADD COLUMN league_id uuid REFERENCES public.leagues(id);
ALTER TABLE public.tiebreakers ADD COLUMN league_id uuid REFERENCES public.leagues(id);
ALTER TABLE public.survivor_picks ADD COLUMN league_id uuid REFERENCES public.leagues(id);
ALTER TABLE public.messages ADD COLUMN league_id uuid REFERENCES public.leagues(id);

-- 4. Create the permanent Global Pool league
INSERT INTO public.leagues (name, owner_id, join_code, settings, is_global_pool)
SELECT 'Global Pool', id, 'GLOBAL', '{}', true
FROM auth.users
ORDER BY created_at
LIMIT 1
ON CONFLICT (join_code) DO NOTHING;

-- 5. Backfill league_id to Global Pool (disable lock triggers during backfill)
DO $$
DECLARE global_id uuid;
BEGIN
  SELECT id INTO global_id FROM public.leagues WHERE is_global_pool = true LIMIT 1;

  ALTER TABLE public.picks DISABLE TRIGGER picks_lock;
  ALTER TABLE public.tiebreakers DISABLE TRIGGER tb_lock;
  ALTER TABLE public.survivor_picks DISABLE TRIGGER survivor_lock;

  UPDATE public.picks SET league_id = global_id WHERE league_id IS NULL;
  UPDATE public.tiebreakers SET league_id = global_id WHERE league_id IS NULL;
  UPDATE public.survivor_picks SET league_id = global_id WHERE league_id IS NULL;
  UPDATE public.messages SET league_id = global_id WHERE league_id IS NULL;

  ALTER TABLE public.picks ENABLE TRIGGER picks_lock;
  ALTER TABLE public.tiebreakers ENABLE TRIGGER tb_lock;
  ALTER TABLE public.survivor_picks ENABLE TRIGGER survivor_lock;
END $$;

-- 6. Make league_id NOT NULL
ALTER TABLE public.picks ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE public.tiebreakers ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE public.survivor_picks ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE public.messages ALTER COLUMN league_id SET NOT NULL;

-- 7. Drop old unique constraints and recreate with league_id
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_user_id_game_id_key;
ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_user_season_type_week_confidence_key;
ALTER TABLE public.picks ADD CONSTRAINT picks_user_league_game_key UNIQUE (user_id, league_id, game_id);
ALTER TABLE public.picks ADD CONSTRAINT picks_user_league_season_type_week_confidence_key UNIQUE (user_id, league_id, season, season_type, week, confidence);

ALTER TABLE public.tiebreakers DROP CONSTRAINT IF EXISTS tiebreakers_user_season_type_week_key;
ALTER TABLE public.tiebreakers ADD CONSTRAINT tiebreakers_user_league_season_type_week_key UNIQUE (user_id, league_id, season, season_type, week);

ALTER TABLE public.survivor_picks DROP CONSTRAINT IF EXISTS survivor_picks_user_id_season_team_key;
ALTER TABLE public.survivor_picks DROP CONSTRAINT IF EXISTS survivor_picks_user_id_season_week_key;
ALTER TABLE public.survivor_picks ADD CONSTRAINT survivor_picks_user_league_season_team_key UNIQUE (user_id, league_id, season, team);
ALTER TABLE public.survivor_picks ADD CONSTRAINT survivor_picks_user_league_season_week_key UNIQUE (user_id, league_id, season, week);

-- 8. Enroll every existing user into Global Pool
DO $$
DECLARE global_id uuid;
BEGIN
  SELECT id INTO global_id FROM public.leagues WHERE is_global_pool = true LIMIT 1;

  INSERT INTO public.league_memberships (league_id, user_id, role)
  SELECT global_id, p.id, 'member'
  FROM public.profiles p
  ON CONFLICT (league_id, user_id) DO NOTHING;
END $$;

-- 9. Helper function: generate a random 6-character join code
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT upper(substring(md5(random()::text) from 1 for 6));
$$;

-- 10. Helper function: create a league with owner membership
CREATE OR REPLACE FUNCTION public.create_league(_name text, _owner_id uuid, _settings jsonb DEFAULT '{}')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _league_id uuid; _code text;
BEGIN
  LOOP
    _code := public.generate_join_code();
    BEGIN
      INSERT INTO public.leagues (name, owner_id, join_code, settings)
      VALUES (_name, _owner_id, _code, _settings)
      RETURNING id INTO _league_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  INSERT INTO public.league_memberships (league_id, user_id, role)
  VALUES (_league_id, _owner_id, 'owner')
  ON CONFLICT (league_id, user_id) DO NOTHING;

  RETURN _league_id;
END;
$$;

-- 11. Helper function: join a league by code
CREATE OR REPLACE FUNCTION public.join_league_by_code(_code text, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _league_id uuid;
BEGIN
  SELECT id INTO _league_id FROM public.leagues WHERE join_code = _code;
  IF _league_id IS NULL THEN
    RAISE EXCEPTION 'Invalid join code';
  END IF;
  INSERT INTO public.league_memberships (league_id, user_id, role)
  VALUES (_league_id, _user_id, 'member')
  ON CONFLICT (league_id, user_id) DO NOTHING;
  RETURN _league_id;
END;
$$;

-- 12. Update handle_new_user to auto-enroll in Global Pool
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE global_id uuid;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO global_id FROM public.leagues WHERE is_global_pool = true LIMIT 1;
  IF global_id IS NOT NULL THEN
    INSERT INTO public.league_memberships (league_id, user_id, role)
    VALUES (global_id, NEW.id, 'member')
    ON CONFLICT (league_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 13. Update picks_revealed to accept league_id
CREATE OR REPLACE FUNCTION public.picks_revealed(_season integer, _season_type season_type, _week integer, _league_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN _season_type = 'reg'
        THEN COALESCE(now() >= public.picks_deadline(_season, _week, _season_type), false)
      ELSE COALESCE(
        now() >= (SELECT min(kickoff) FROM public.games
                  WHERE season = _season AND season_type = _season_type AND week = _week),
        false)
    END
    OR (
      (SELECT count(*) FROM public.league_memberships lm WHERE lm.league_id = _league_id) > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.league_memberships lm
        WHERE lm.league_id = _league_id
          AND NOT EXISTS (
            SELECT 1 FROM public.picks pk
            WHERE pk.user_id = lm.user_id
              AND pk.league_id = _league_id
              AND pk.season = _season
              AND pk.season_type = _season_type
              AND pk.week = _week
          )
      )
    );
$$;

-- 14. Update week_submission_status to accept league_id
CREATE OR REPLACE FUNCTION public.week_submission_status(_season integer, _season_type season_type, _week integer, _league_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid, display_name text, team_name text, mascot text, primary_color text, submitted boolean, pick_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id,
         p.display_name,
         p.team_name,
         p.mascot,
         p.primary_color,
         coalesce(c.n, 0) > 0 as submitted,
         coalesce(c.n, 0)::int as pick_count
  FROM public.league_memberships lm
  JOIN public.profiles p ON p.id = lm.user_id
  LEFT JOIN (
    SELECT pk.user_id, count(*) as n
    FROM public.picks pk
    WHERE pk.season = _season AND pk.season_type = _season_type AND pk.week = _week
      AND pk.league_id = _league_id
    GROUP BY pk.user_id
  ) c ON c.user_id = p.id
  WHERE lm.league_id = _league_id
  ORDER BY (coalesce(c.n,0) > 0) desc, p.team_name asc
$$;

-- 15. Update survivor_board to accept league_id
CREATE OR REPLACE FUNCTION public.survivor_board(_season integer, _league_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid, display_name text, team_name text, mascot text, primary_color text, week integer, team text, revealed boolean, result text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id,
         p.display_name,
         p.team_name,
         p.mascot,
         p.primary_color,
         sp.week,
         CASE
           WHEN sp.week IS NULL THEN NULL
           WHEN p.id = auth.uid() OR public.picks_revealed(_season, 'reg'::season_type, sp.week, _league_id) THEN sp.team
           ELSE NULL
         END,
         CASE WHEN sp.week IS NULL THEN false
              ELSE (p.id = auth.uid() OR public.picks_revealed(_season, 'reg'::season_type, sp.week, _league_id)) END,
         CASE
           WHEN sp.week IS NULL THEN NULL
           WHEN g.id IS NULL OR g.status <> 'final' THEN 'pending'
           WHEN g.home_score = g.away_score THEN 'survived'
           WHEN (g.home_team = sp.team AND g.home_score > g.away_score)
             OR (g.away_team = sp.team AND g.away_score > g.home_score) THEN 'survived'
           ELSE 'eliminated'
         END
  FROM public.league_memberships lm
  JOIN public.profiles p ON p.id = lm.user_id
  LEFT JOIN public.survivor_picks sp
    ON sp.user_id = p.id AND sp.season = _season AND sp.league_id = _league_id
  LEFT JOIN public.games g
    ON g.season = _season AND g.season_type = 'reg'::season_type
   AND g.week = sp.week AND (g.home_team = sp.team OR g.away_team = sp.team)
  WHERE lm.league_id = _league_id
  ORDER BY p.team_name, sp.week
$$;

-- 16. Update weekly_scores view to include league_id
DROP VIEW IF EXISTS public.weekly_scores CASCADE;
CREATE VIEW public.weekly_scores AS
SELECT p.user_id,
       p.league_id,
       p.season,
       p.season_type,
       p.week,
       (sum(
           CASE
             WHEN g.status = 'final'::text
               AND ((g.home_score > g.away_score AND p.picked_team = g.home_team)
                 OR (g.away_score > g.home_score AND p.picked_team = g.away_team))
             THEN p.confidence
             ELSE 0
           END
       ))::integer AS points
FROM public.picks p
JOIN public.games g ON g.id = p.game_id
GROUP BY p.user_id, p.league_id, p.season, p.season_type, p.week;

GRANT SELECT ON public.weekly_scores TO authenticated;
GRANT ALL ON public.weekly_scores TO service_role;

-- 17. Update leaderboard views to include league_id
DROP VIEW IF EXISTS public.leaderboard CASCADE;
CREATE VIEW public.leaderboard AS
SELECT pr.id AS user_id,
       pr.display_name,
       pr.team_name,
       pr.mascot,
       pr.primary_color,
       ws.league_id,
       (COALESCE(sum(ws.points), (0)::bigint))::integer AS season_points,
       (count(ws.week) FILTER (WHERE ws.points > 0))::integer AS weeks_played
FROM public.profiles pr
LEFT JOIN public.weekly_scores ws ON ws.user_id = pr.id AND ws.season_type = 'reg'::season_type
GROUP BY pr.id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color, ws.league_id;

GRANT SELECT ON public.leaderboard TO authenticated;
GRANT ALL ON public.leaderboard TO service_role;

DROP VIEW IF EXISTS public.preseason_leaderboard CASCADE;
CREATE VIEW public.preseason_leaderboard AS
SELECT pr.id AS user_id,
       pr.display_name,
       pr.team_name,
       pr.mascot,
       pr.primary_color,
       ws.league_id,
       (COALESCE(sum(ws.points), (0)::bigint))::integer AS season_points,
       (count(ws.week) FILTER (WHERE ws.points > 0))::integer AS weeks_played
FROM public.profiles pr
LEFT JOIN public.weekly_scores ws ON ws.user_id = pr.id AND ws.season_type = 'pre'::season_type
GROUP BY pr.id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color, ws.league_id;

GRANT SELECT ON public.preseason_leaderboard TO authenticated;
GRANT ALL ON public.preseason_leaderboard TO service_role;

-- 18. Policies on leagues
CREATE POLICY "League members can read their leagues"
  ON public.leagues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = public.leagues.id AND lm.user_id = auth.uid()
    )
    OR public.leagues.owner_id = auth.uid()
  );

CREATE POLICY "Authenticated users can create leagues"
  ON public.leagues FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "League owners can update their league"
  ON public.leagues FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 19. Policies on league_memberships
CREATE POLICY "Members can read memberships in their leagues"
  ON public.league_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = public.league_memberships.league_id AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join a league"
  ON public.league_memberships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave a league or owners can remove members"
  ON public.league_memberships FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = public.league_memberships.league_id
        AND lm.user_id = auth.uid()
        AND lm.role = 'owner'
    )
  );

-- 20. Update RLS policies on picks/tiebreakers/survivor_picks/messages
DROP POLICY IF EXISTS picks_select_own_or_revealed ON public.picks;
DROP POLICY IF EXISTS picks_write_own ON public.picks;

CREATE POLICY "Picks readable by league members when revealed or own"
  ON public.picks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1 FROM public.league_memberships lm
        WHERE lm.league_id = public.picks.league_id AND lm.user_id = auth.uid()
      )
      AND public.picks_revealed(season, season_type, week, league_id)
    )
  );

CREATE POLICY "Users can insert their own league picks"
  ON public.picks FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = public.picks.league_id AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tb_select_own_or_revealed ON public.tiebreakers;
DROP POLICY IF EXISTS tb_insert_own ON public.tiebreakers;

CREATE POLICY "Tiebreakers readable by league members when revealed or own"
  ON public.tiebreakers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1 FROM public.league_memberships lm
        WHERE lm.league_id = public.tiebreakers.league_id AND lm.user_id = auth.uid()
      )
      AND public.picks_revealed(season, season_type, week, league_id)
    )
  );

CREATE POLICY "Users can insert their own league tiebreakers"
  ON public.tiebreakers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = public.tiebreakers.league_id AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS survivor_select_own_or_revealed ON public.survivor_picks;
DROP POLICY IF EXISTS survivor_insert_own ON public.survivor_picks;

CREATE POLICY "Survivor picks readable by league members when revealed or own"
  ON public.survivor_picks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1 FROM public.league_memberships lm
        WHERE lm.league_id = public.survivor_picks.league_id AND lm.user_id = auth.uid()
      )
      AND public.picks_revealed(season, 'reg'::season_type, week, league_id)
    )
  );

CREATE POLICY "Users can insert their own league survivor picks"
  ON public.survivor_picks FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = public.survivor_picks.league_id AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS messages_insert_own ON public.messages;
DROP POLICY IF EXISTS messages_delete_own ON public.messages;

CREATE POLICY "Messages readable by league members"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = public.messages.league_id AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can post in their leagues"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = public.messages.league_id AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own league messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 21. Grants for helper functions
GRANT EXECUTE ON FUNCTION public.generate_join_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_league(text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_league_by_code(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.picks_revealed(integer, season_type, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.week_submission_status(integer, season_type, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.survivor_board(integer, uuid) TO authenticated;