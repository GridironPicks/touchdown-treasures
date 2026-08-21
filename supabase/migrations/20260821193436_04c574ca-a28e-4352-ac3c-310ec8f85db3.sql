revoke all on function public.fantasy_pool(integer, season_type, integer, uuid) from public, anon;
revoke all on function public.fantasy_board(integer, season_type, integer, uuid) from public, anon;
revoke all on function public.fantasy_weekly_totals(integer, season_type, uuid) from public, anon;
revoke all on function public.fantasy_standings(integer, season_type, uuid) from public, anon;
grant execute on function public.fantasy_pool(integer, season_type, integer, uuid) to authenticated;
grant execute on function public.fantasy_board(integer, season_type, integer, uuid) to authenticated;
grant execute on function public.fantasy_weekly_totals(integer, season_type, uuid) to authenticated;
grant execute on function public.fantasy_standings(integer, season_type, uuid) to authenticated;