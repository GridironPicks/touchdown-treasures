create or replace function public.week_submission_status(_season integer, _season_type season_type, _week integer)
returns table(user_id uuid, display_name text, team_name text, mascot text, primary_color text, submitted boolean, pick_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.display_name,
         p.team_name,
         p.mascot,
         p.primary_color,
         coalesce(c.n, 0) > 0 as submitted,
         coalesce(c.n, 0)::int as pick_count
  from public.profiles p
  left join (
    select pk.user_id, count(*) as n
    from public.picks pk
    where pk.season = _season and pk.season_type = _season_type and pk.week = _week
    group by pk.user_id
  ) c on c.user_id = p.id
  order by (coalesce(c.n,0) > 0) desc, p.team_name asc
$$;

revoke all on function public.week_submission_status(integer, season_type, integer) from public;
grant execute on function public.week_submission_status(integer, season_type, integer) to authenticated;