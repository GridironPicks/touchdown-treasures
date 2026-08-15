CREATE OR REPLACE FUNCTION public.week_open_picks(_season integer, _season_type season_type, _week integer, _league_id uuid)
RETURNS TABLE(user_id uuid, external_id text, picked_team text, home_team text, points integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  SELECT pk.user_id,
         COALESCE(g.external_id, g.id::text) AS external_id,
         pk.picked_team,
         g.home_team,
         pk.confidence::int AS points
  FROM public.picks pk
  JOIN public.games g ON g.id = pk.game_id
  WHERE pk.season = _season AND pk.season_type = _season_type
    AND pk.week = _week AND pk.league_id = _league_id
    AND g.status <> 'final';
END;
$function$;