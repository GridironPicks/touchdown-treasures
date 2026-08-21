-- Weekly Mini DFS lineups with draft-style exclusive player ownership.

create table public.fantasy_players (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  season_type season_type not null default 'reg'::season_type,
  week integer not null,
  espn_id text not null,
  name text not null,
  "position" text not null,
  team text not null,
  opponent text,
  cost integer not null default 1,
  headshot text,
  updated_at timestamptz not null default now(),
  unique (season, season_type, week, espn_id)
);
grant select on public.fantasy_players to authenticated;
grant all on public.fantasy_players to service_role;
alter table public.fantasy_players enable row level security;
create policy fantasy_players_select on public.fantasy_players
  for select to authenticated using (true);

create table public.fantasy_player_stats (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  season_type season_type not null default 'reg'::season_type,
  week integer not null,
  espn_id text not null,
  points numeric not null default 0,
  line text,
  is_final boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (season, season_type, week, espn_id)
);
grant select on public.fantasy_player_stats to authenticated;
grant all on public.fantasy_player_stats to service_role;
alter table public.fantasy_player_stats enable row level security;
create policy fantasy_player_stats_select on public.fantasy_player_stats
  for select to authenticated using (true);

create table public.fantasy_lineups (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  season integer not null,
  season_type season_type not null default 'reg'::season_type,
  week integer not null,
  captain_slot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id, season, season_type, week)
);
grant select, insert, update, delete on public.fantasy_lineups to authenticated;
grant all on public.fantasy_lineups to service_role;
alter table public.fantasy_lineups enable row level security;

create policy fantasy_lineups_select on public.fantasy_lineups
  for select to authenticated
  using (
    auth.uid() = user_id
    or (public.is_league_member(league_id, auth.uid())
        and public.picks_revealed(season, season_type, week, league_id))
  );
create policy fantasy_lineups_insert on public.fantasy_lineups
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_league_member(league_id, auth.uid()));
create policy fantasy_lineups_update on public.fantasy_lineups
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy fantasy_lineups_delete on public.fantasy_lineups
  for delete to authenticated using (auth.uid() = user_id);

create table public.fantasy_lineup_slots (
  id uuid primary key default gen_random_uuid(),
  lineup_id uuid not null references public.fantasy_lineups(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  season integer not null,
  season_type season_type not null default 'reg'::season_type,
  week integer not null,
  slot text not null check (slot in ('QB','RB','WR','TE','FLEX')),
  player_id uuid not null references public.fantasy_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lineup_id, slot),
  unique (league_id, season, season_type, week, player_id)
);
create index fantasy_slots_week_idx
  on public.fantasy_lineup_slots (league_id, season, season_type, week);
grant select, insert, update, delete on public.fantasy_lineup_slots to authenticated;
grant all on public.fantasy_lineup_slots to service_role;
alter table public.fantasy_lineup_slots enable row level security;

create policy fantasy_slots_select_own on public.fantasy_lineup_slots
  for select to authenticated using (auth.uid() = user_id);
create policy fantasy_slots_insert_own on public.fantasy_lineup_slots
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_league_member(league_id, auth.uid()));
create policy fantasy_slots_delete_own on public.fantasy_lineup_slots
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.enforce_fantasy_lock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare _row record; _deadline timestamptz; _open timestamptz; _first timestamptz;
        _cost integer; _pos text; _total integer;
begin
  _row := coalesce(NEW, OLD);

  if _row.season_type = 'reg' then
    _deadline := public.picks_deadline(_row.season, _row.week, _row.season_type);
    _open := _deadline - interval '42 hours';
    if _open is not null and now() < _open then
      raise exception 'Week % lineups are not open yet - they open Tuesday 12:00 AM ET', _row.week;
    end if;
    if _deadline is not null and now() >= _deadline then
      raise exception 'Week % lineups are locked (Wednesday 6:00 PM ET deadline)', _row.week;
    end if;
  else
    select min(g.kickoff) into _first from public.games g
     where g.season = _row.season and g.season_type = _row.season_type and g.week = _row.week;
    if _first is not null and now() >= _first then
      raise exception 'Week % lineups are locked - the week has kicked off', _row.week;
    end if;
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

create trigger fantasy_slots_lock
  before insert or update or delete on public.fantasy_lineup_slots
  for each row execute function public.enforce_fantasy_lock();

create trigger fantasy_lineups_lock
  before update on public.fantasy_lineups
  for each row execute function public.enforce_fantasy_lock();

create or replace function public.fantasy_pool(_season integer, _season_type season_type, _week integer, _league_id uuid)
returns table(pl_id uuid, pl_espn_id text, pl_name text, pl_pos text, pl_team text,
              pl_opp text, pl_cost integer, pl_headshot text,
              claimed_by uuid, claimed_team text, pl_points numeric)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.league_memberships lm
    where lm.league_id = _league_id and lm.user_id = auth.uid()
  ) then return; end if;

  return query
  select p.id, p.espn_id, p.name, p."position", p.team, p.opponent, p.cost, p.headshot,
         s.user_id, pr.team_name, coalesce(st.points, 0)
  from public.fantasy_players p
  left join public.fantasy_lineup_slots s
    on s.player_id = p.id and s.league_id = _league_id
  left join public.profiles pr on pr.id = s.user_id
  left join public.fantasy_player_stats st
    on st.season = p.season and st.season_type = p.season_type
   and st.week = p.week and st.espn_id = p.espn_id
  where p.season = _season and p.season_type = _season_type and p.week = _week
  order by p.cost desc, p.name;
end $$;

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

  _revealed := public.picks_revealed(_season, _season_type, _week, _league_id);

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

create or replace function public.fantasy_weekly_totals(_season integer, _season_type season_type, _league_id uuid)
returns table(week integer, user_id uuid, points numeric, filled integer)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.league_memberships lm
    where lm.league_id = _league_id and lm.user_id = auth.uid()
  ) then return; end if;

  return query
  select l.week, l.user_id,
         round(coalesce(sum(
           coalesce(st.points, 0)
           * case when l.captain_slot is not null and l.captain_slot = s.slot then 1.5 else 1 end
         ), 0), 2),
         count(s.id)::int
  from public.fantasy_lineups l
  left join public.fantasy_lineup_slots s on s.lineup_id = l.id
  left join public.fantasy_players p on p.id = s.player_id
  left join public.fantasy_player_stats st
    on st.season = p.season and st.season_type = p.season_type
   and st.week = p.week and st.espn_id = p.espn_id
  where l.league_id = _league_id and l.season = _season and l.season_type = _season_type
  group by l.week, l.user_id;
end $$;

create or replace function public.fantasy_standings(_season integer, _season_type season_type, _league_id uuid)
returns table(user_id uuid, display_name text, team_name text, mascot text, primary_color text,
              total numeric, weeks_played integer, wins integer)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.league_memberships lm
    where lm.league_id = _league_id and lm.user_id = auth.uid()
  ) then return; end if;

  return query
  with wk as (
    select * from public.fantasy_weekly_totals(_season, _season_type, _league_id)
  ),
  ranked as (
    select w.week, w.user_id, w.points,
           rank() over (partition by w.week order by w.points desc) as rnk
    from wk w
  )
  select pr.id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color,
         round(coalesce(sum(r.points), 0), 2),
         count(r.week)::int,
         count(*) filter (where r.rnk = 1 and r.points > 0)::int
  from public.league_memberships lm
  join public.profiles pr on pr.id = lm.user_id
  left join ranked r on r.user_id = pr.id
  where lm.league_id = _league_id
  group by pr.id, pr.display_name, pr.team_name, pr.mascot, pr.primary_color
  order by 6 desc, pr.team_name;
end $$;