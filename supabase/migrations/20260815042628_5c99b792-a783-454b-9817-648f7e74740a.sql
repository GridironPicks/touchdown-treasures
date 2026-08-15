-- SURVIVOR POOL --------------------------------------------------------
CREATE TABLE public.survivor_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season integer NOT NULL,
  week integer NOT NULL,
  team text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season, week),
  UNIQUE (user_id, season, team)
);

GRANT SELECT, INSERT ON public.survivor_picks TO authenticated;
GRANT ALL ON public.survivor_picks TO service_role;

ALTER TABLE public.survivor_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY survivor_insert_own ON public.survivor_picks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY survivor_select_own_or_revealed ON public.survivor_picks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.picks_revealed(season, 'reg'::season_type, week));

CREATE OR REPLACE FUNCTION public.enforce_survivor_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _row record; _deadline timestamptz; _open timestamptz;
BEGIN
  _row := COALESCE(NEW, OLD);

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Survivor picks are final once submitted';
  END IF;

  _deadline := public.picks_deadline(_row.season, _row.week, 'reg'::season_type);
  _open := _deadline - interval '42 hours';

  IF _open IS NOT NULL AND now() < _open THEN
    RAISE EXCEPTION 'Week % is not open yet — survivor picks open Tuesday 12:00 AM ET', _row.week;
  END IF;

  IF _deadline IS NOT NULL AND now() >= _deadline THEN
    RAISE EXCEPTION 'Survivor picks for week % are locked (Wednesday 6:00 PM ET deadline)', _row.week;
  END IF;

  RETURN _row;
END;
$$;

CREATE TRIGGER survivor_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.survivor_picks
FOR EACH ROW EXECUTE FUNCTION public.enforce_survivor_lock();

-- Board: every manager's survivor run. Ties survive (only an outright loss eliminates).
CREATE OR REPLACE FUNCTION public.survivor_board(_season integer)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  team_name text,
  mascot text,
  primary_color text,
  week integer,
  team text,
  revealed boolean,
  result text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id,
         p.display_name,
         p.team_name,
         p.mascot,
         p.primary_color,
         sp.week,
         CASE
           WHEN sp.week IS NULL THEN NULL
           WHEN p.id = auth.uid() OR public.picks_revealed(_season, 'reg'::season_type, sp.week) THEN sp.team
           ELSE NULL
         END,
         CASE WHEN sp.week IS NULL THEN false
              ELSE (p.id = auth.uid() OR public.picks_revealed(_season, 'reg'::season_type, sp.week)) END,
         CASE
           WHEN sp.week IS NULL THEN NULL
           WHEN g.id IS NULL OR g.status <> 'final' THEN 'pending'
           WHEN g.home_score = g.away_score THEN 'survived'
           WHEN (g.home_team = sp.team AND g.home_score > g.away_score)
             OR (g.away_team = sp.team AND g.away_score > g.home_score) THEN 'survived'
           ELSE 'eliminated'
         END
  FROM public.profiles p
  LEFT JOIN public.survivor_picks sp
    ON sp.user_id = p.id AND sp.season = _season
  LEFT JOIN public.games g
    ON g.season = _season AND g.season_type = 'reg'::season_type
   AND g.week = sp.week AND (g.home_team = sp.team OR g.away_team = sp.team)
  ORDER BY p.team_name, sp.week;
$$;

-- CHAT REACTIONS --------------------------------------------------------
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reactions_select ON public.message_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY reactions_insert_own ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY reactions_delete_own ON public.message_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;