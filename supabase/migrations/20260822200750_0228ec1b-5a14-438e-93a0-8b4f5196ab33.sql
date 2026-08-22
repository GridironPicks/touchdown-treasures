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
  _any_final boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.league_memberships lm
    WHERE lm.league_id = _league_id AND lm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  SELECT bool_and(g.status = 'final'), bool_or(g.status = 'final')
    INTO _all_final, _any_final
  FROM public.games g
  WHERE g.season = _season AND g.season_type = _season_type AND g.week = _week;

  IF coalesce(_any_final, false) = false THEN
    RETURN;
  END IF;

  IF coalesce(_all_final, false) THEN
    SELECT coalesce(g.home_score, 0) + coalesce(g.away_score, 0) INTO _final_total
    FROM public.games g
    WHERE g.season = _season AND g.season_type = _season_type AND g.week = _week
    ORDER BY g.is_tiebreaker_game DESC, g.kickoff DESC
    LIMIT 1;
  ELSE
    _final_total := NULL;
  END IF;

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
           CASE WHEN t.predicted_total IS NULL OR _final_total IS NULL THEN NULL
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