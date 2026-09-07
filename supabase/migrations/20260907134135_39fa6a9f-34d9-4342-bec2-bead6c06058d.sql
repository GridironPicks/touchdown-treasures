CREATE OR REPLACE FUNCTION public.enforce_survivor_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _row record; _deadline timestamptz; _open timestamptz;
BEGIN
  _row := COALESCE(NEW, OLD);

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Survivor picks are final once submitted';
  END IF;

  _deadline := public.picks_deadline(_row.season, _row.week, 'reg'::season_type);
  _open := public.picks_open_at(_row.season, _row.week, 'reg'::season_type);

  IF _open IS NOT NULL AND now() < _open THEN
    RAISE EXCEPTION 'Week % is not open yet — survivor picks open Monday 12:00 AM CT', _row.week;
  END IF;

  IF _deadline IS NOT NULL AND now() >= _deadline THEN
    RAISE EXCEPTION 'Survivor picks for week % are locked (Wednesday 6:00 PM CT deadline)', _row.week;
  END IF;

  RETURN _row;
END;
$function$;