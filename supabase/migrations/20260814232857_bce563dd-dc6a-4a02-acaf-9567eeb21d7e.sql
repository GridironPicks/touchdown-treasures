
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'New Manager',
  team_name text NOT NULL DEFAULT 'Unnamed Squad',
  mascot text NOT NULL DEFAULT 'eagle',
  primary_color text NOT NULL DEFAULT '#00E676',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season int NOT NULL,
  week int NOT NULL,
  kickoff timestamptz NOT NULL,
  away_team text NOT NULL,
  home_team text NOT NULL,
  away_score int,
  home_score int,
  status text NOT NULL DEFAULT 'scheduled',
  is_tiebreaker_game boolean NOT NULL DEFAULT false,
  external_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "games_select" ON public.games FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.picks_deadline(_season int, _week int)
RETURNS timestamptz LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT date_trunc('week', min(kickoff) AT TIME ZONE 'America/New_York')
         + interval '2 days 18 hours'
  FROM public.games WHERE season = _season AND week = _week;
$$;

CREATE TABLE public.picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  season int NOT NULL,
  week int NOT NULL,
  picked_team text NOT NULL,
  confidence int NOT NULL CHECK (confidence > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id),
  UNIQUE (user_id, season, week, confidence)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.picks TO authenticated;
GRANT ALL ON public.picks TO service_role;
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "picks_select" ON public.picks FOR SELECT TO authenticated USING (true);
CREATE POLICY "picks_write_own" ON public.picks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "picks_update_own" ON public.picks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "picks_delete_own" ON public.picks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_pick_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _row record; _deadline timestamptz;
BEGIN
  _row := COALESCE(NEW, OLD);
  _deadline := public.picks_deadline(_row.season, _row.week);
  IF _deadline IS NOT NULL AND now() > _deadline THEN
    RAISE EXCEPTION 'Picks for week % are locked', _row.week;
  END IF;
  RETURN _row;
END; $$;
CREATE TRIGGER picks_lock BEFORE INSERT OR UPDATE OR DELETE ON public.picks
FOR EACH ROW EXECUTE FUNCTION public.enforce_pick_lock();

CREATE TABLE public.tiebreakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season int NOT NULL,
  week int NOT NULL,
  predicted_total int NOT NULL CHECK (predicted_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season, week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiebreakers TO authenticated;
GRANT ALL ON public.tiebreakers TO service_role;
ALTER TABLE public.tiebreakers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tb_select" ON public.tiebreakers FOR SELECT TO authenticated USING (true);
CREATE POLICY "tb_insert_own" ON public.tiebreakers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tb_update_own" ON public.tiebreakers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tb_lock BEFORE INSERT OR UPDATE ON public.tiebreakers
FOR EACH ROW EXECUTE FUNCTION public.enforce_pick_lock();

CREATE TABLE public.entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season int NOT NULL,
  week int NOT NULL,
  amount_cents int NOT NULL DEFAULT 500,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  method text NOT NULL DEFAULT 'apple_pay',
  UNIQUE (user_id, season, week)
);
GRANT SELECT, INSERT, UPDATE ON public.entries TO authenticated;
GRANT ALL ON public.entries TO service_role;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries_select" ON public.entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "entries_insert_own" ON public.entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "entries_update_own" ON public.entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.weekly_scores WITH (security_invoker = on) AS
SELECT p.user_id, p.season, p.week,
  SUM(CASE WHEN g.status = 'final' AND (
    (g.home_score > g.away_score AND p.picked_team = g.home_team) OR
    (g.away_score > g.home_score AND p.picked_team = g.away_team)
  ) THEN p.confidence ELSE 0 END)::int AS points
FROM public.picks p JOIN public.games g ON g.id = p.game_id
GROUP BY p.user_id, p.season, p.week;
GRANT SELECT ON public.weekly_scores TO authenticated;

CREATE OR REPLACE VIEW public.leaderboard WITH (security_invoker = on) AS
SELECT pr.id AS user_id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color,
  COALESCE(SUM(ws.points), 0)::int AS season_points,
  COUNT(ws.week) FILTER (WHERE ws.points > 0)::int AS weeks_played
FROM public.profiles pr
LEFT JOIN public.weekly_scores ws ON ws.user_id = pr.id
GROUP BY pr.id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color;
GRANT SELECT ON public.leaderboard TO authenticated;

INSERT INTO public.games (season, week, kickoff, away_team, home_team, is_tiebreaker_game) VALUES
(2026, 1, '2026-09-11 00:20:00+00', 'Dallas Cowboys', 'Kansas City Chiefs', false),
(2026, 1, '2026-09-13 17:00:00+00', 'Pittsburgh Steelers', 'Cleveland Browns', false),
(2026, 1, '2026-09-13 17:00:00+00', 'Miami Dolphins', 'New England Patriots', false),
(2026, 1, '2026-09-13 17:00:00+00', 'New York Jets', 'Buffalo Bills', false),
(2026, 1, '2026-09-13 17:00:00+00', 'Chicago Bears', 'Green Bay Packers', false),
(2026, 1, '2026-09-13 17:00:00+00', 'Atlanta Falcons', 'Carolina Panthers', false),
(2026, 1, '2026-09-13 17:00:00+00', 'Houston Texans', 'Indianapolis Colts', false),
(2026, 1, '2026-09-13 17:00:00+00', 'Jacksonville Jaguars', 'Tennessee Titans', false),
(2026, 1, '2026-09-13 20:05:00+00', 'Arizona Cardinals', 'Seattle Seahawks', false),
(2026, 1, '2026-09-13 20:05:00+00', 'New Orleans Saints', 'Los Angeles Rams', false),
(2026, 1, '2026-09-13 20:25:00+00', 'Denver Broncos', 'Las Vegas Raiders', false),
(2026, 1, '2026-09-13 20:25:00+00', 'Detroit Lions', 'San Francisco 49ers', false),
(2026, 1, '2026-09-13 20:25:00+00', 'Philadelphia Eagles', 'Los Angeles Chargers', false),
(2026, 1, '2026-09-14 00:20:00+00', 'Baltimore Ravens', 'Cincinnati Bengals', false),
(2026, 1, '2026-09-14 23:00:00+00', 'Washington Commanders', 'New York Giants', false),
(2026, 1, '2026-09-15 00:15:00+00', 'Minnesota Vikings', 'Tampa Bay Buccaneers', true);
