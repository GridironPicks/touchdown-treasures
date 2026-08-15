REVOKE EXECUTE ON FUNCTION public.picks_revealed(integer, season_type, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.week_submission_status(integer, season_type, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.picks_revealed(integer, season_type, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.week_submission_status(integer, season_type, integer) TO authenticated, service_role;