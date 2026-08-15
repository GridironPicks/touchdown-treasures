-- Live standings for an in-progress week
CREATE OR REPLACE FUNCTION public.week_live_standings(
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
  banked integer,
  live integer,
  max_possible integer,
  correct_count integer,
  remaining integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.league_memberships lm
    WHERE lm.league_id = _league_id AND lm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  IF NOT public.picks_revealed(_season, _season_type, _week, _league_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT pk.user_id,
           pk.confidence,
           g.status,
           (g.status = 'final') AS is_final,
           (g.status <> 'final' AND (g.home_score IS NOT NULL OR g.away_score IS NOT NULL)) AS in_play,
           (COALESCE(g.home_score,0) > COALESCE(g.away_score,0) AND pk.picked_team = g.home_team)
             OR (COALESCE(g.away_score,0) > COALESCE(g.home_score,0) AND pk.picked_team = g.away_team) AS leading
    FROM public.picks pk
    JOIN public.games g ON g.id = pk.game_id
    WHERE pk.season = _season AND pk.season_type = _season_type
      AND pk.week = _week AND pk.league_id = _league_id
  ),
  agg AS (
    SELECT s.user_id,
           COALESCE(sum(s.confidence) FILTER (WHERE s.is_final AND s.leading), 0)::int AS banked,
           COALESCE(sum(s.confidence) FILTER (WHERE (s.is_final OR s.in_play) AND s.leading), 0)::int AS live,
           COALESCE(sum(s.confidence) FILTER (WHERE s.is_final AND s.leading), 0)::int
             + COALESCE(sum(s.confidence) FILTER (WHERE NOT s.is_final), 0)::int AS max_possible,
           count(*) FILTER (WHERE s.is_final AND s.leading)::int AS correct_count,
           count(*) FILTER (WHERE NOT s.is_final)::int AS remaining
    FROM scored s
    GROUP BY s.user_id
  )
  SELECT a.user_id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color,
         a.banked, a.live, a.max_possible, a.correct_count, a.remaining
  FROM agg a
  JOIN public.profiles pr ON pr.id = a.user_id
  ORDER BY a.live DESC, a.banked DESC;
END;
$$;

-- Per-week finished results across the whole season (built on week_recap)
CREATE OR REPLACE FUNCTION public.league_weekly_points(
  _season integer,
  _season_type season_type,
  _league_id uuid
)
RETURNS TABLE(
  week integer,
  user_id uuid,
  points integer,
  correct_count integer,
  tiebreak_diff integer,
  place integer,
  field_size integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _w integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
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
    SELECT _w, r.user_id, r.points, r.correct_count, r.tiebreak_diff, r.place,
           (SELECT count(*)::int FROM public.week_recap(_season, _season_type, _w, _league_id))
    FROM public.week_recap(_season, _season_type, _w, _league_id) r;
  END LOOP;
END;
$$;

-- Badges / awards earned by each manager
CREATE OR REPLACE FUNCTION public.manager_badges(
  _season integer,
  _season_type season_type,
  _league_id uuid
)
RETURNS TABLE(
  week integer,
  user_id uuid,
  badge text,
  detail text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.league_memberships lm
    WHERE lm.league_id = _league_id AND lm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH wk AS (
    SELECT * FROM public.league_weekly_points(_season, _season_type, _league_id)
  ),
  game_counts AS (
    SELECT g.week, count(*)::int AS n
    FROM public.games g
    WHERE g.season = _season AND g.season_type = _season_type
    GROUP BY g.week
  ),
  cumulative AS (
    SELECT w.week, w.user_id,
           sum(w.points) OVER (PARTITION BY w.user_id ORDER BY w.week) AS cume
    FROM wk w
  ),
  cume_rank AS (
    SELECT c.week, c.user_id,
           rank() OVER (PARTITION BY c.week ORDER BY c.cume DESC)::int AS rnk
    FROM cumulative c
  ),
  climb AS (
    SELECT cr.week, cr.user_id,
           (lag(cr.rnk) OVER (PARTITION BY cr.user_id ORDER BY cr.week) - cr.rnk) AS gain
    FROM cume_rank cr
  ),
  road AS (
    SELECT pk.week, pk.user_id, pk.confidence, pk.picked_team,
           row_number() OVER (PARTITION BY pk.week ORDER BY pk.confidence DESC) AS rn
    FROM public.picks pk
    JOIN public.games g ON g.id = pk.game_id
    WHERE pk.season = _season AND pk.season_type = _season_type AND pk.league_id = _league_id
      AND g.status = 'final'
      AND pk.picked_team = g.away_team
      AND g.away_score > g.home_score
  ),
  weeks_played AS (
    SELECT count(DISTINCT w.week)::int AS n FROM wk w
  ),
  attendance AS (
    SELECT w.user_id, count(DISTINCT w.week)::int AS n
    FROM wk w GROUP BY w.user_id
  ),
  rows_out AS (
    SELECT w.week, w.user_id, 'perfect_week'::text AS badge,
           'Every game correct'::text AS detail
    FROM wk w JOIN game_counts gc ON gc.week = w.week
    WHERE w.correct_count = gc.n AND gc.n > 0

    UNION ALL
    SELECT w.week, w.user_id, 'week_win', 'Won the week'
    FROM wk w WHERE w.place = 1 AND w.points > 0

    UNION ALL
    SELECT w.week, w.user_id, 'bullseye', 'Tiebreaker within 3 points'
    FROM wk w WHERE w.tiebreak_diff IS NOT NULL AND w.tiebreak_diff <= 3

    UNION ALL
    SELECT w.week, w.user_id, 'ice_cold', 'Finished last that week'
    FROM wk w WHERE w.field_size > 2 AND w.place = w.field_size

    UNION ALL
    SELECT r.week, r.user_id, 'gutsy_call',
           'Biggest road-team call: ' || r.picked_team
    FROM road r WHERE r.rn = 1

    UNION ALL
    SELECT c.week, c.user_id, 'comeback', 'Climbed 3+ places in the standings'
    FROM climb c WHERE c.gain >= 3

    UNION ALL
    SELECT NULL::integer, a.user_id, 'iron_manager', 'Submitted picks every week'
    FROM attendance a, weeks_played wp
    WHERE wp.n > 1 AND a.n = wp.n
  )
  SELECT ro.week, ro.user_id, ro.badge, ro.detail FROM rows_out ro;
END;
$$;

-- Head-to-head weekly records between league members
CREATE OR REPLACE FUNCTION public.head_to_head(
  _season integer,
  _season_type season_type,
  _league_id uuid
)
RETURNS TABLE(
  user_id uuid,
  opponent_id uuid,
  wins integer,
  losses integer,
  ties integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.league_memberships lm
    WHERE lm.league_id = _league_id AND lm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH wk AS (
    SELECT * FROM public.league_weekly_points(_season, _season_type, _league_id)
  ),
  pairs AS (
    SELECT a.user_id AS ua, b.user_id AS ub, a.points AS pa, b.points AS pb
    FROM wk a JOIN wk b ON a.week = b.week AND a.user_id <> b.user_id
  )
  SELECT p.ua, p.ub,
         count(*) FILTER (WHERE p.pa > p.pb)::int,
         count(*) FILTER (WHERE p.pa < p.pb)::int,
         count(*) FILTER (WHERE p.pa = p.pb)::int
  FROM pairs p
  GROUP BY p.ua, p.ub;
END;
$$;