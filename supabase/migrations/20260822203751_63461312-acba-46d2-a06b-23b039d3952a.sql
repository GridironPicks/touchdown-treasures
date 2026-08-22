create or replace function public.fantasy_lock_at(_season integer, _season_type season_type, _week integer)
returns timestamptz
language sql
stable
security invoker
set search_path to 'public'
as $$
  select public.picks_deadline(_season, _week, _season_type);
$$;

revoke all on function public.fantasy_lock_at(integer, season_type, integer) from public, anon;
grant execute on function public.fantasy_lock_at(integer, season_type, integer) to authenticated, service_role;