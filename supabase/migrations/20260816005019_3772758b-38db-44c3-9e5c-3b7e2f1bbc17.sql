ALTER VIEW public.weekly_scores SET (security_invoker = on);
ALTER VIEW public.leaderboard SET (security_invoker = on);
ALTER VIEW public.preseason_leaderboard SET (security_invoker = on);

REVOKE SELECT ON public.weekly_scores FROM anon;
REVOKE SELECT ON public.leaderboard FROM anon;
REVOKE SELECT ON public.preseason_leaderboard FROM anon;

-- Trigger functions must never be callable through the API
REVOKE ALL ON FUNCTION public.enforce_survivor_lock() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_pick_lock() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Signed-out users should not be able to execute any SECURITY DEFINER routine
REVOKE ALL ON FUNCTION public.create_league(text, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.head_to_head(integer, season_type, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_league_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_league_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_league_by_code(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.league_week_winners(integer, season_type, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.league_weekly_points(integer, season_type, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manager_badges(integer, season_type, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.picks_revealed(integer, season_type, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.picks_revealed(integer, season_type, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_join_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.survivor_board(integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.survivor_board(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_league_ownership(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.week_highlights(integer, season_type, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.week_live_standings(integer, season_type, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.week_open_picks(integer, season_type, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.week_recap(integer, season_type, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.week_submission_status(integer, season_type, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.week_submission_status(integer, season_type, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_league(text, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.head_to_head(integer, season_type, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_league_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_league_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_league_by_code(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.league_week_winners(integer, season_type, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.league_weekly_points(integer, season_type, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.manager_badges(integer, season_type, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.picks_revealed(integer, season_type, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.picks_revealed(integer, season_type, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.regenerate_join_code(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.survivor_board(integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.survivor_board(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_league_ownership(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.week_highlights(integer, season_type, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.week_live_standings(integer, season_type, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.week_open_picks(integer, season_type, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.week_recap(integer, season_type, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.week_submission_status(integer, season_type, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.week_submission_status(integer, season_type, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_survivor_lock() TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_pick_lock() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;