CREATE OR REPLACE FUNCTION public.enforce_pick_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row record;
  _kickoff timestamptz;
  _last timestamptz;
  _deadline timestamptz;
  _open timestamptz;
  _total int;
  _started int;
  _ceiling int;
BEGIN
  _row := COALESCE(NEW, OLD);

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Picks are final once submitted';
  END IF;

  IF _row.season_type = 'reg' THEN
    _deadline := public.picks_deadline(_row.season, _row.week, _row.season_type);
    _open := _deadline - interval '42 hours';

    IF _open IS NOT NULL AND now() < _open THEN
      RAISE EXCEPTION 'Week % is not open yet — picks open Tuesday 12:00 AM ET', _row.week;
    END IF;

    IF _deadline IS NOT NULL AND now() >= _deadline THEN
      RAISE EXCEPTION 'Picks for week % are locked (Wednesday 6:00 PM ET deadline)', _row.week;
    END IF;
  ELSE
    -- Preseason: the week stays open until the last game kicks off, but the
    -- highest confidence numbers burn off as games start.
    SELECT count(*)::int,
           count(*) FILTER (WHERE g.kickoff <= now())::int,
           max(g.kickoff)
      INTO _total, _started, _last
    FROM public.games g
    WHERE g.season = _row.season
      AND g.season_type = _row.season_type
      AND g.week = _row.week;

    IF _last IS NOT NULL AND now() >= _last THEN
      RAISE EXCEPTION 'Preseason week % is closed — the final game has kicked off', _row.week;
    END IF;

    IF TG_TABLE_NAME = 'picks' AND _total IS NOT NULL AND _total > 0 THEN
      _ceiling := _total - COALESCE(_started, 0);
      IF _row.confidence > _ceiling THEN
        RAISE EXCEPTION 'Confidence % is off the board — % game(s) have kicked off, so the highest % number(s) are burned this week', _row.confidence, _started, _started;
      END IF;
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