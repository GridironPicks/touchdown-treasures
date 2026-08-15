-- Reveal rule: picks stay hidden until the week's lock, first preseason
-- kickoff, or once every manager has submitted.
CREATE OR REPLACE FUNCTION public.picks_revealed(_season integer, _season_type season_type, _week integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN _season_type = 'reg'
        THEN COALESCE(now() >= public.picks_deadline(_season, _week, _season_type), false)
      ELSE COALESCE(
        now() >= (SELECT min(kickoff) FROM public.games
                  WHERE season = _season AND season_type = _season_type AND week = _week),
        false)
    END
    OR (
      (SELECT count(*) FROM public.profiles) > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE NOT EXISTS (
          SELECT 1 FROM public.picks pk
          WHERE pk.user_id = p.id AND pk.season = _season
            AND pk.season_type = _season_type AND pk.week = _week
        )
      )
    );
$$;

DROP POLICY IF EXISTS picks_select_own_or_started ON public.picks;
CREATE POLICY picks_select_own_or_revealed ON public.picks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.picks_revealed(season, season_type, week));

DROP POLICY IF EXISTS tb_select_own_or_started ON public.tiebreakers;
CREATE POLICY tb_select_own_or_revealed ON public.tiebreakers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.picks_revealed(season, season_type, week));

-- Picks are final once submitted (both season types).
DROP POLICY IF EXISTS picks_update_own ON public.picks;
DROP POLICY IF EXISTS picks_delete_own ON public.picks;
DROP POLICY IF EXISTS tb_update_own ON public.tiebreakers;

CREATE OR REPLACE FUNCTION public.enforce_pick_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _row record; _kickoff timestamptz; _last timestamptz; _deadline timestamptz; _open timestamptz;
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

-- League-wide trash talk chat
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY messages_insert_own ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY messages_delete_own ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.body := btrim(NEW.body);
  IF length(NEW.body) = 0 OR length(NEW.body) > 500 THEN
    RAISE EXCEPTION 'Message must be between 1 and 500 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_validate BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE INDEX messages_created_at_idx ON public.messages (created_at DESC);