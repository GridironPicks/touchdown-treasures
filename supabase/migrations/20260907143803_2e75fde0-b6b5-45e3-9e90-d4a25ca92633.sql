create or replace function public.clear_league_chat(_league_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _count integer;
begin
  if not public.is_league_owner(_league_id, auth.uid()) then
    raise exception 'Only the league commissioner can clear the chat';
  end if;

  delete from public.message_reactions r
  using public.messages m
  where r.message_id = m.id and m.league_id = _league_id;

  with deleted as (
    delete from public.messages where league_id = _league_id returning 1
  )
  select count(*) into _count from deleted;

  return _count;
end;
$$;

revoke all on function public.clear_league_chat(uuid) from public, anon;
grant execute on function public.clear_league_chat(uuid) to authenticated;