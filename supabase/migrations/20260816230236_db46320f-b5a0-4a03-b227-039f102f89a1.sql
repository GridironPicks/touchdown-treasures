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
           g.away_team, g.home_team, g.away_score, g.home_score,
           row_number() OVER (PARTITION BY pk.week, pk.user_id ORDER BY pk.confidence DESC) AS rn
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
           ('Week ' || w.week || ' — all ' || gc.n || ' games called correctly')::text AS detail
    FROM wk w JOIN game_counts gc ON gc.week = w.week
    WHERE w.correct_count = gc.n AND gc.n > 0

    UNION ALL
    SELECT w.week, w.user_id, 'week_win',
           'Week ' || w.week || ' — won the week with ' || w.points || ' pts (1st of ' || w.field_size || ')'
    FROM wk w WHERE w.place = 1 AND w.points > 0

    UNION ALL
    SELECT w.week, w.user_id, 'bullseye',
           'Week ' || w.week || ' — tiebreaker was off by only ' || w.tiebreak_diff || ' pts'
    FROM wk w WHERE w.tiebreak_diff IS NOT NULL AND w.tiebreak_diff <= 3

    UNION ALL
    SELECT w.week, w.user_id, 'ice_cold',
           'Week ' || w.week || ' — finished last (' || w.place || ' of ' || w.field_size || ') with ' || w.points || ' pts'
    FROM wk w WHERE w.field_size > 2 AND w.place = w.field_size

    UNION ALL
    SELECT r.week, r.user_id, 'gutsy_call',
           'Week ' || r.week || ' — ' || r.picked_team || ' won at ' || r.home_team ||
           ' ' || r.away_score || '-' || r.home_score || ' for ' || r.confidence || ' pts'
    FROM road r WHERE r.rn = 1

    UNION ALL
    SELECT c.week, c.user_id, 'comeback',
           'Week ' || c.week || ' — climbed ' || c.gain || ' places in the season standings'
    FROM climb c WHERE c.gain >= 3

    UNION ALL
    SELECT NULL::integer, a.user_id, 'iron_manager',
           'Submitted picks in all ' || wp.n || ' weeks so far'
    FROM attendance a, weeks_played wp
    WHERE wp.n > 1 AND a.n = wp.n
  )
  SELECT ro.week, ro.user_id, ro.badge, ro.detail FROM rows_out ro;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.manager_badges(integer, season_type, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manager_badges(integer, season_type, uuid) TO authenticated;