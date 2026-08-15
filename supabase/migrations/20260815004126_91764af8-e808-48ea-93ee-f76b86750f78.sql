-- 1. season_type column
DO $$ BEGIN
  CREATE TYPE public.season_type AS ENUM ('pre', 'reg');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS season_type public.season_type NOT NULL DEFAULT 'reg';
ALTER TABLE public.picks ADD COLUMN IF NOT EXISTS season_type public.season_type NOT NULL DEFAULT 'reg';
ALTER TABLE public.tiebreakers ADD COLUMN IF NOT EXISTS season_type public.season_type NOT NULL DEFAULT 'reg';
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS season_type public.season_type NOT NULL DEFAULT 'reg';

-- 2. widen uniqueness to include season_type
ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_user_id_season_week_key;
ALTER TABLE public.entries ADD CONSTRAINT entries_user_season_type_week_key UNIQUE (user_id, season, season_type, week);

ALTER TABLE public.tiebreakers DROP CONSTRAINT IF EXISTS tiebreakers_user_id_season_week_key;
ALTER TABLE public.tiebreakers ADD CONSTRAINT tiebreakers_user_season_type_week_key UNIQUE (user_id, season, season_type, week);

ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_user_id_season_week_confidence_key;
ALTER TABLE public.picks ADD CONSTRAINT picks_user_season_type_week_confidence_key UNIQUE (user_id, season, season_type, week, confidence);

-- 3. deadline + current week helpers become season_type aware
CREATE OR REPLACE FUNCTION public.picks_deadline(_season integer, _week integer, _season_type public.season_type DEFAULT 'reg')
RETURNS timestamp with time zone
LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  SELECT date_trunc('week', min(kickoff) AT TIME ZONE 'America/New_York')
         + interval '2 days 18 hours'
  FROM public.games
  WHERE season = _season AND week = _week AND season_type = _season_type;
$function$;

CREATE OR REPLACE FUNCTION public.current_week(_season integer, _season_type public.season_type DEFAULT 'reg')
RETURNS integer
LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  SELECT COALESCE(
    (SELECT min(week) FROM public.games WHERE season = _season AND season_type = _season_type AND status <> 'final'),
    (SELECT max(week) FROM public.games WHERE season = _season AND season_type = _season_type),
    1
  );
$function$;

-- Which slate is active right now: preseason until a regular-season game exists that is not final.
CREATE OR REPLACE FUNCTION public.current_slate(_season integer)
RETURNS TABLE (season_type public.season_type, week integer)
LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  SELECT g.season_type, g.week
  FROM public.games g
  WHERE g.season = _season AND g.status <> 'final'
  ORDER BY g.kickoff
  LIMIT 1;
$function$;

-- 4. entry fee only required for regular season
CREATE OR REPLACE FUNCTION public.enforce_entry_paid()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE _row record;
BEGIN
  _row := COALESCE(NEW, OLD);
  IF TG_OP <> 'DELETE' AND _row.season_type = 'reg' AND NOT EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.user_id = _row.user_id
      AND e.season = _row.season
      AND e.season_type = _row.season_type
      AND e.week = _row.week
      AND e.paid
  ) THEN
    RAISE EXCEPTION 'Entry fee for week % is not paid', _row.week;
  END IF;
  RETURN _row;
END; $function$;

-- 5. lock: weekly deadline + per-game kickoff
CREATE OR REPLACE FUNCTION public.enforce_pick_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE _row record; _deadline timestamptz; _kickoff timestamptz;
BEGIN
  _row := COALESCE(NEW, OLD);
  _deadline := public.picks_deadline(_row.season, _row.week, _row.season_type);
  IF _deadline IS NOT NULL AND now() > _deadline THEN
    RAISE EXCEPTION 'Picks for week % are locked', _row.week;
  END IF;

  IF TG_TABLE_NAME = 'picks' THEN
    SELECT g.kickoff INTO _kickoff FROM public.games g WHERE g.id = _row.game_id;
    IF _kickoff IS NOT NULL AND now() >= _kickoff THEN
      RAISE EXCEPTION 'That game has already started';
    END IF;
  END IF;

  RETURN _row;
END; $function$;

-- 6. views scoped by season type
DROP VIEW IF EXISTS public.weekly_results;
DROP VIEW IF EXISTS public.leaderboard;
DROP VIEW IF EXISTS public.weekly_scores;

CREATE VIEW public.weekly_scores
WITH (security_invoker = true) AS
SELECT p.user_id, p.season, p.season_type, p.week,
  (sum(CASE
    WHEN g.status = 'final' AND ((g.home_score > g.away_score AND p.picked_team = g.home_team)
      OR (g.away_score > g.home_score AND p.picked_team = g.away_team)) THEN p.confidence
    ELSE 0 END))::integer AS points
FROM public.picks p
JOIN public.games g ON g.id = p.game_id
GROUP BY p.user_id, p.season, p.season_type, p.week;

CREATE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT pr.id AS user_id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color,
  (COALESCE(sum(ws.points), 0::bigint))::integer AS season_points,
  (count(ws.week) FILTER (WHERE ws.points > 0))::integer AS weeks_played
FROM public.profiles pr
LEFT JOIN public.weekly_scores ws ON ws.user_id = pr.id AND ws.season_type = 'reg'
GROUP BY pr.id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color;

CREATE VIEW public.preseason_leaderboard
WITH (security_invoker = true) AS
SELECT pr.id AS user_id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color,
  (COALESCE(sum(ws.points), 0::bigint))::integer AS season_points,
  (count(ws.week) FILTER (WHERE ws.points > 0))::integer AS weeks_played
FROM public.profiles pr
LEFT JOIN public.weekly_scores ws ON ws.user_id = pr.id AND ws.season_type = 'pre'
GROUP BY pr.id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color;

CREATE VIEW public.weekly_results
WITH (security_invoker = true) AS
WITH week_state AS (
  SELECT season, season_type, week, bool_and(status = 'final') AS complete
  FROM public.games GROUP BY season, season_type, week
), tb_game AS (
  SELECT season, season_type, week, (home_score + away_score) AS actual_total
  FROM public.games
  WHERE is_tiebreaker_game AND status = 'final' AND home_score IS NOT NULL AND away_score IS NOT NULL
), scored AS (
  SELECT ws.season, ws.season_type, ws.week, ws.user_id, ws.points,
    t.predicted_total, tg.actual_total,
    CASE WHEN t.predicted_total IS NOT NULL AND tg.actual_total IS NOT NULL
      THEN abs(t.predicted_total - tg.actual_total) END AS tiebreak_diff,
    COALESCE(w.complete, false) AS complete
  FROM public.weekly_scores ws
  LEFT JOIN public.tiebreakers t
    ON t.user_id = ws.user_id AND t.season = ws.season AND t.season_type = ws.season_type AND t.week = ws.week
  LEFT JOIN tb_game tg ON tg.season = ws.season AND tg.season_type = ws.season_type AND tg.week = ws.week
  LEFT JOIN week_state w ON w.season = ws.season AND w.season_type = ws.season_type AND w.week = ws.week
  WHERE ws.season_type = 'reg'
)
SELECT season, season_type, week, user_id, points, predicted_total, actual_total, tiebreak_diff, complete,
  (row_number() OVER (PARTITION BY season, week ORDER BY points DESC, tiebreak_diff) = 1) AND complete AS is_winner
FROM scored;

GRANT SELECT ON public.weekly_scores TO authenticated;
GRANT SELECT ON public.leaderboard TO authenticated;
GRANT SELECT ON public.preseason_leaderboard TO authenticated;
GRANT SELECT ON public.weekly_results TO authenticated;
GRANT ALL ON public.weekly_scores TO service_role;
GRANT ALL ON public.leaderboard TO service_role;
GRANT ALL ON public.preseason_leaderboard TO service_role;
GRANT ALL ON public.weekly_results TO service_role;