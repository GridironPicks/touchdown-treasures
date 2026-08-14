CREATE OR REPLACE FUNCTION public.enforce_entry_paid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE _row record;
BEGIN
  _row := COALESCE(NEW, OLD);
  IF TG_OP <> 'DELETE' AND NOT EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.user_id = _row.user_id
      AND e.season = _row.season
      AND e.week = _row.week
      AND e.paid
  ) THEN
    RAISE EXCEPTION 'Entry fee for week % is not paid', _row.week;
  END IF;
  RETURN _row;
END; $$;

DROP TRIGGER IF EXISTS picks_require_paid ON public.picks;
CREATE TRIGGER picks_require_paid
BEFORE INSERT OR UPDATE ON public.picks
FOR EACH ROW EXECUTE FUNCTION public.enforce_entry_paid();

DROP TRIGGER IF EXISTS tb_require_paid ON public.tiebreakers;
CREATE TRIGGER tb_require_paid
BEFORE INSERT OR UPDATE ON public.tiebreakers
FOR EACH ROW EXECUTE FUNCTION public.enforce_entry_paid();