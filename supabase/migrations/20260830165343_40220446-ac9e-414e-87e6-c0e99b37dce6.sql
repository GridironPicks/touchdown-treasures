CREATE OR REPLACE FUNCTION public.picks_deadline(_season integer, _week integer, _season_type public.season_type DEFAULT 'reg')
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT LEAST(
    (date_trunc('week', min(g.kickoff) AT TIME ZONE 'America/Chicago')
       + interval '2 days 18 hours') AT TIME ZONE 'America/Chicago',
    min(g.kickoff) - interval '30 minutes'
  )
  FROM public.games g
  WHERE g.season = _season AND g.week = _week AND g.season_type = _season_type;
$$;

CREATE OR REPLACE FUNCTION public.picks_open_at(_season integer, _week integer, _season_type public.season_type DEFAULT 'reg')
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT LEAST(
    date_trunc('week', min(g.kickoff) AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago',
    public.picks_deadline(_season, _week, _season_type) - interval '42 hours'
  )
  FROM public.games g
  WHERE g.season = _season AND g.week = _week AND g.season_type = _season_type;
$$;

REVOKE EXECUTE ON FUNCTION public.picks_deadline(integer, integer, public.season_type) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.picks_open_at(integer, integer, public.season_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.picks_deadline(integer, integer, public.season_type) TO service_role;
GRANT EXECUTE ON FUNCTION public.picks_open_at(integer, integer, public.season_type) TO service_role;