ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS stripe_session_id text;
CREATE UNIQUE INDEX IF NOT EXISTS entries_stripe_session_id_key ON public.entries (stripe_session_id);
ALTER TABLE public.entries ALTER COLUMN method SET DEFAULT 'stripe';

DROP POLICY IF EXISTS "entries_insert_own" ON public.entries;
DROP POLICY IF EXISTS "entries_update_own" ON public.entries;
REVOKE INSERT, UPDATE ON public.entries FROM authenticated;

CREATE OR REPLACE FUNCTION public.current_week(_season int)
RETURNS int LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT min(week) FROM public.games WHERE season = _season AND status <> 'final'),
    (SELECT max(week) FROM public.games WHERE season = _season),
    1
  );
$$;
GRANT EXECUTE ON FUNCTION public.current_week(int) TO authenticated;

CREATE OR REPLACE VIEW public.weekly_results WITH (security_invoker = on) AS
WITH week_state AS (
  SELECT season, week, bool_and(status = 'final') AS complete
  FROM public.games GROUP BY season, week
),
tb_game AS (
  SELECT season, week, (home_score + away_score) AS actual_total
  FROM public.games
  WHERE is_tiebreaker_game AND status = 'final' AND home_score IS NOT NULL AND away_score IS NOT NULL
),
scored AS (
  SELECT ws.season, ws.week, ws.user_id, ws.points,
         t.predicted_total,
         tg.actual_total,
         CASE WHEN t.predicted_total IS NOT NULL AND tg.actual_total IS NOT NULL
              THEN abs(t.predicted_total - tg.actual_total) END AS tiebreak_diff,
         COALESCE(w.complete, false) AS complete
  FROM public.weekly_scores ws
  LEFT JOIN public.tiebreakers t
    ON t.user_id = ws.user_id AND t.season = ws.season AND t.week = ws.week
  LEFT JOIN tb_game tg ON tg.season = ws.season AND tg.week = ws.week
  LEFT JOIN week_state w ON w.season = ws.season AND w.week = ws.week
)
SELECT s.*,
  (row_number() OVER (
     PARTITION BY s.season, s.week
     ORDER BY s.points DESC, s.tiebreak_diff ASC NULLS LAST
   ) = 1 AND s.complete) AS is_winner
FROM scored s;
GRANT SELECT ON public.weekly_results TO authenticated;