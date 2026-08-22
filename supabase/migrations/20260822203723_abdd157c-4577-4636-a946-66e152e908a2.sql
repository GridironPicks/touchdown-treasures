create or replace function public.fantasy_lock_at(_season integer, _season_type season_type, _week integer)
returns timestamptz
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.picks_deadline(_season, _week, _season_type);
$$;

revoke all on function public.fantasy_lock_at(integer, season_type, integer) from public, anon;
grant execute on function public.fantasy_lock_at(integer, season_type, integer) to authenticated, service_role;

create or replace function public.enforce_fantasy_lock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare _row record; _deadline timestamptz; _open timestamptz;
        _cost integer; _pos text; _total integer;
begin
  _row := coalesce(NEW, OLD);

  _deadline := public.fantasy_lock_at(_row.season, _row.season_type, _row.week);
  _open := _deadline - interval '42 hours';

  if _open is not null and now() < _open then
    raise exception 'Week % lineups are not open yet - they open Tuesday 12:00 AM ET', _row.week;
  end if;
  if _deadline is not null and now() >= _deadline then
    raise exception 'Week % lineups are locked (Wednesday 6:00 PM ET deadline)', _row.week;
  end if;

  if TG_OP = 'DELETE' then return _row; end if;
  if TG_TABLE_NAME <> 'fantasy_lineup_slots' then return NEW; end if;

  select p.cost, p."position" into _cost, _pos
  from public.fantasy_players p where p.id = NEW.player_id;
  if _pos is null then raise exception 'Unknown player'; end if;

  if NEW.slot = 'FLEX' then
    if _pos not in ('RB','WR','TE') then
      raise exception 'A % cannot fill the FLEX slot', _pos;
    end if;
  elsif NEW.slot <> _pos then
    raise exception 'A % cannot fill the % slot', _pos, NEW.slot;
  end if;

  select coalesce(sum(p.cost), 0) into _total
  from public.fantasy_lineup_slots s
  join public.fantasy_players p on p.id = s.player_id
  where s.lineup_id = NEW.lineup_id and s.id <> NEW.id;

  if _total + _cost > 15 then
    raise exception 'That pick puts you over the 15-star cap';
  end if;

  return NEW;
end $$;

revoke all on function public.enforce_fantasy_lock() from public, anon, authenticated;
grant execute on function public.enforce_fantasy_lock() to service_role;

create or replace function public.fantasy_board(_season integer, _season_type season_type, _week integer, _league_id uuid)
returns table(user_id uuid, display_name text, team_name text, mascot text, primary_color text,
              slot text, is_captain boolean, pl_name text, pl_pos text, pl_team text,
              pl_cost integer, pl_points numeric, revealed boolean)
language plpgsql stable security definer set search_path to 'public'
as $$
declare _revealed boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.league_memberships lm
    where lm.league_id = _league_id and lm.user_id = auth.uid()
  ) then return; end if;

  _revealed := coalesce(now() >= public.fantasy_lock_at(_season, _season_type, _week), false);

  return query
  select pr.id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color,
         s.slot,
         (l.captain_slot is not null and l.captain_slot = s.slot),
         case when _revealed or pr.id = auth.uid() then p.name else null end,
         case when _revealed or pr.id = auth.uid() then p."position" else null end,
         case when _revealed or pr.id = auth.uid() then p.team else null end,
         case when _revealed or pr.id = auth.uid() then p.cost else null end,
         case when _revealed or pr.id = auth.uid() then coalesce(st.points, 0) else null end,
         (_revealed or pr.id = auth.uid())
  from public.league_memberships lm
  join public.profiles pr on pr.id = lm.user_id
  left join public.fantasy_lineups l
    on l.league_id = _league_id and l.user_id = pr.id
   and l.season = _season and l.season_type = _season_type and l.week = _week
  left join public.fantasy_lineup_slots s on s.lineup_id = l.id
  left join public.fantasy_players p on p.id = s.player_id
  left join public.fantasy_player_stats st
    on st.season = p.season and st.season_type = p.season_type
   and st.week = p.week and st.espn_id = p.espn_id
  where lm.league_id = _league_id
  order by pr.team_name, s.slot;
end $$;

revoke all on function public.fantasy_board(integer, season_type, integer, uuid) from public, anon;
grant execute on function public.fantasy_board(integer, season_type, integer, uuid) to authenticated, service_role;