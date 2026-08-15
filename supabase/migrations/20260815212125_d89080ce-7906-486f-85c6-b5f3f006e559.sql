-- Weekly recap: tiebroken standings for one league + slate.
CREATE OR REPLACE FUNCTION public.week_recap(
  _season integer,
  _season_type season_type,
  _week integer,
  _league_id uuid
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  team_name text,
  mascot text,
  primary_color text,
  points integer,
  correct_count integer,
  predicted_total integer,
  tiebreak_diff integer,
  submitted_at timestamptz,
  place integer,
  decided_by text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _final_total integer;
  _all_final boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.league_memberships lm
    WHERE lm.league_id = _league_id AND lm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  SELECT bool_and(g.status = 'final') INTO _all_final
  FROM public.games g
  WHERE g.season = _season AND g.season_type = _season_type AND g.week = _week;

  IF coalesce(_all_final, false) = false THEN
    RETURN;
  END IF;

  SELECT coalesce(g.home_score, 0) + coalesce(g.away_score, 0) INTO _final_total
  FROM public.games g
  WHERE g.season = _season AND g.season_type = _season_type AND g.week = _week
  ORDER BY g.is_tiebreaker_game DESC, g.kickoff DESC
  LIMIT 1;

  RETURN QUERY
  WITH scored AS (
    SELECT pk.user_id,
           pk.confidence,
           pk.created_at,
           (g.status = 'final' AND (
             (g.home_score > g.away_score AND pk.picked_team = g.home_team) OR
             (g.away_score > g.home_score AND pk.picked_team = g.away_team)
           )) AS won
    FROM public.picks pk
    JOIN public.games g ON g.id = pk.game_id
    WHERE pk.season = _season AND pk.season_type = _season_type
      AND pk.week = _week AND pk.league_id = _league_id
  ),
  base AS (
    SELECT s.user_id,
           sum(CASE WHEN s.won THEN s.confidence ELSE 0 END)::int AS points,
           count(*) FILTER (WHERE s.won)::int AS correct_count,
           min(s.created_at) AS submitted_at
    FROM scored s
    GROUP BY s.user_id
  ),
  joined AS (
    SELECT b.*,
           t.predicted_total,
           CASE WHEN t.predicted_total IS NULL THEN NULL
                ELSE abs(t.predicted_total - _final_total) END AS tiebreak_diff
    FROM base b
    LEFT JOIN public.tiebreakers t
      ON t.user_id = b.user_id AND t.league_id = _league_id
     AND t.season = _season AND t.season_type = _season_type AND t.week = _week
  ),
  ranked AS (
    SELECT j.*,
           row_number() OVER (
             ORDER BY j.points DESC,
                      j.tiebreak_diff ASC NULLS LAST,
                      j.correct_count DESC,
                      j.submitted_at ASC
           )::int AS place
    FROM joined j
  )
  SELECT r.user_id,
         pr.display_name,
         pr.team_name,
         pr.mascot,
         pr.primary_color,
         r.points,
         r.correct_count,
         r.predicted_total,
         r.tiebreak_diff,
         r.submitted_at,
         r.place,
         CASE
           WHEN r.place <> 1 THEN NULL
           WHEN (SELECT count(*) FROM ranked r2 WHERE r2.points = r.points) = 1 THEN 'points'
           WHEN (SELECT count(*) FROM ranked r2
                  WHERE r2.points = r.points
                    AND r2.tiebreak_diff IS NOT DISTINCT FROM r.tiebreak_diff) = 1 THEN 'tiebreaker'
           WHEN (SELECT count(*) FROM ranked r2
                  WHERE r2.points = r.points
                    AND r2.tiebreak_diff IS NOT DISTINCT FROM r.tiebreak_diff
                    AND r2.correct_count = r.correct_count) = 1 THEN 'correct'
           ELSE 'submitted'
         END AS decided_by
  FROM ranked r
  JOIN public.profiles pr ON pr.id = r.user_id
  ORDER BY r.place;
END;
$$;

GRANT EXECUTE ON FUNCTION public.week_recap(integer, season_type, integer, uuid) TO authenticated, service_role;

-- Highlights: biggest hit, biggest miss, upset of the week.
CREATE OR REPLACE FUNCTION public.week_highlights(
  _season integer,
  _season_type season_type,
  _week integer,
  _league_id uuid
)
RETURNS TABLE(
  kind text,
  user_id uuid,
  team_name text,
  mascot text,
  primary_color text,
  picked_team text,
  matchup text,
  points integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _all_final boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.league_memberships lm
    WHERE lm.league_id = _league_id AND lm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  SELECT bool_and(g.status = 'final') INTO _all_final
  FROM public.games g
  WHERE g.season = _season AND g.season_type = _season_type AND g.week = _week;

  IF coalesce(_all_final, false) = false THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT pk.user_id, pk.confidence, pk.picked_team, g.id AS game_id,
           g.away_team || ' @ ' || g.home_team AS matchup,
           (g.home_score > g.away_score AND pk.picked_team = g.home_team) OR
           (g.away_score > g.home_score AND pk.picked_team = g.away_team) AS won
    FROM public.picks pk
    JOIN public.games g ON g.id = pk.game_id
    WHERE pk.season = _season AND pk.season_type = _season_type
      AND pk.week = _week AND pk.league_id = _league_id
  ),
  hit AS (
    SELECT 'hit'::text AS kind, s.user_id, s.picked_team, s.matchup, s.confidence AS points
    FROM scored s WHERE s.won ORDER BY s.confidence DESC LIMIT 1
  ),
  miss AS (
    SELECT 'miss'::text AS kind, s.user_id, s.picked_team, s.matchup, s.confidence AS points
    FROM scored s WHERE NOT s.won ORDER BY s.confidence DESC LIMIT 1
  ),
  upset AS (
    SELECT 'upset'::text AS kind, NULL::uuid AS user_id, NULL::text AS picked_team,
           s.matchup, sum(s.confidence)::int AS points
    FROM scored s WHERE NOT s.won
    GROUP BY s.matchup
    ORDER BY sum(s.confidence) DESC LIMIT 1
  ),
  all_rows AS (
    SELECT * FROM hit UNION ALL SELECT * FROM miss UNION ALL SELECT * FROM upset
  )
  SELECT a.kind, a.user_id, pr.team_name, pr.mascot, pr.primary_color,
         a.picked_team, a.matchup, a.points
  FROM all_rows a
  LEFT JOIN public.profiles pr ON pr.id = a.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.week_highlights(integer, season_type, integer, uuid) TO authenticated, service_role;

-- Tiebroken winner for every completed week of a league + season type.
CREATE OR REPLACE FUNCTION public.league_week_winners(
  _season integer,
  _season_type season_type,
  _league_id uuid
)
RETURNS TABLE(week integer, user_id uuid, points integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _w integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.league_memberships lm
    WHERE lm.league_id = _league_id AND lm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  FOR _w IN
    SELECT DISTINCT pk.week
    FROM public.picks pk
    WHERE pk.season = _season AND pk.season_type = _season_type AND pk.league_id = _league_id
    ORDER BY 1
  LOOP
    RETURN QUERY
    SELECT _w, r.user_id, r.points
    FROM public.week_recap(_season, _season_type, _w, _league_id) r
    WHERE r.place = 1 AND r.points > 0;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.league_week_winners(integer, season_type, uuid) TO authenticated, service_role;

-- Commissioner: owners can see who is in their league.
CREATE POLICY "League owners can read memberships of their league"
ON public.league_memberships
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.leagues l
  WHERE l.id = league_memberships.league_id AND l.owner_id = auth.uid()
));

-- Commissioner: owners can change member roles (used by ownership transfer).
CREATE POLICY "League owners can update memberships"
ON public.league_memberships
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.leagues l
  WHERE l.id = league_memberships.league_id AND l.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.leagues l
  WHERE l.id = league_memberships.league_id AND l.owner_id = auth.uid()
));

-- Regenerate a league's join code (owner only).
CREATE OR REPLACE FUNCTION public.regenerate_join_code(_league_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _code text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.leagues l
    WHERE l.id = _league_id AND l.owner_id = auth.uid() AND l.is_global_pool = false
  ) THEN
    RAISE EXCEPTION 'Only the league owner can regenerate the join code';
  END IF;

  _code := public.generate_join_code();
  UPDATE public.leagues SET join_code = _code, updated_at = now() WHERE id = _league_id;
  RETURN _code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_join_code(uuid) TO authenticated;

-- Transfer league ownership to another member (owner only, atomic).
CREATE OR REPLACE FUNCTION public.transfer_league_ownership(_league_id uuid, _new_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current uuid;
BEGIN
  SELECT l.owner_id INTO _current
  FROM public.leagues l
  WHERE l.id = _league_id AND l.is_global_pool = false;

  IF _current IS NULL OR _current <> auth.uid() THEN
    RAISE EXCEPTION 'Only the league owner can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships lm
    WHERE lm.league_id = _league_id AND lm.user_id = _new_owner
  ) THEN
    RAISE EXCEPTION 'That player is not a member of this league';
  END IF;

  UPDATE public.leagues SET owner_id = _new_owner, updated_at = now() WHERE id = _league_id;
  UPDATE public.league_memberships SET role = 'owner'
   WHERE league_id = _league_id AND user_id = _new_owner;
  UPDATE public.league_memberships SET role = 'member'
   WHERE league_id = _league_id AND user_id = _current;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_league_ownership(uuid, uuid) TO authenticated;