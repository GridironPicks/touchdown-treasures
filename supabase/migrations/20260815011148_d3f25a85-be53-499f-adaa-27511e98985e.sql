CREATE OR REPLACE FUNCTION public.enforce_pick_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _row record; _kickoff timestamptz; _last timestamptz; _deadline timestamptz;
BEGIN
  _row := COALESCE(NEW, OLD);

  IF _row.season_type = 'reg' THEN
    _deadline := public.picks_deadline(_row.season, _row.week, _row.season_type);
    IF _deadline IS NOT NULL AND now() >= _deadline THEN
      RAISE EXCEPTION 'Picks for week % are locked (Wednesday 6:00 PM ET deadline)', _row.week;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'picks' THEN
    SELECT g.kickoff INTO _kickoff FROM public.games g WHERE g.id = _row.game_id;
    IF _kickoff IS NOT NULL AND now() >= _kickoff THEN
      RAISE EXCEPTION 'That game has already started';
    END IF;
  ELSE
    SELECT max(g.kickoff) INTO _last
    FROM public.games g
    WHERE g.season = _row.season
      AND g.season_type = _row.season_type
      AND g.week = _row.week;
    IF _last IS NOT NULL AND now() >= _last THEN
      RAISE EXCEPTION 'The final game of week % has already started', _row.week;
    END IF;
  END IF;

  RETURN _row;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_pick_lock() FROM PUBLIC, anon, authenticated;