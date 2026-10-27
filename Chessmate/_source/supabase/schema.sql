-- Chessmate 2.1: run once in a new Supabase project's SQL editor.
begin;
create table public.cm_players (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 24),
 room_name text not null unique check (room_name ~ '^[a-z0-9][a-z0-9-]{1,23}$'),
 avatar text not null default 'june', outfit text not null default 'classic',
 elo integer not null default 800 check (elo between 100 and 10000),
 created_at timestamptz not null default now()
);
create table public.cm_progress (
 owner_id uuid primary key references public.cm_players(id) on delete cascade,
 data jsonb not null default '{}'::jsonb,
 revision integer not null default 0
);
create table public.cm_rooms (
 owner_id uuid primary key references public.cm_players(id) on delete cascade,
 online boolean not null default false,
 busy boolean not null default false,
 seen_at timestamptz not null default now()
);
create table public.cm_matches (
 id uuid primary key default gen_random_uuid(),
 host_id uuid not null references public.cm_players(id),
 guest_id uuid not null references public.cm_players(id),
 status text not null default 'active' check (status in ('active','finished','cancelled')),
 fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 ply integer not null default 0, draw_by uuid,
 created_at timestamptz not null default now(),
 check (host_id <> guest_id)
);
create table public.cm_visits (
 guest_id uuid primary key references public.cm_players(id) on delete cascade,
 host_id uuid not null references public.cm_players(id) on delete cascade,
 status text not null default 'waiting' check(status in ('waiting','accepted','declined')),
 match_id uuid references public.cm_matches(id),
 seen_at timestamptz not null default now(), check(host_id <> guest_id)
);
create table public.cm_friends (
 owner_id uuid not null references public.cm_players(id) on delete cascade,
 friend_id uuid not null references public.cm_players(id) on delete cascade,
 primary key(owner_id,friend_id), check(owner_id <> friend_id)
);
create table public.cm_invites (
 sender_id uuid not null references public.cm_players(id) on delete cascade,
 target_id uuid not null references public.cm_players(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(sender_id,target_id), check(sender_id <> target_id)
);
create table public.cm_events (
 id bigint generated always as identity primary key,
 match_id uuid not null references public.cm_matches(id) on delete cascade,
 sender_id uuid not null references public.cm_players(id),
 data jsonb not null, created_at timestamptz not null default now()
);
create index cm_events_match on public.cm_events(match_id,id);
create index cm_visits_host on public.cm_visits(host_id);
create index cm_matches_host on public.cm_matches(host_id,status);
create index cm_matches_guest on public.cm_matches(guest_id,status);

-- Reserve the home room in the same transaction as the Auth account.
-- The non-deliverable alias is an internal username identifier, not a verified email.
create function public.cm_handle_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_username text; v_name text; begin
 if new.email is null or new.email !~ '^[a-z0-9][a-z0-9-]{1,23}@players[.]chessmate[.]invalid$' then
  raise exception 'Create a Chessmate username account';
 end if;
 v_username := split_part(new.email,'@',1);
 v_name := left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),v_username),24);
 insert into public.cm_players(id,name,room_name) values(new.id,v_name,v_username);
 insert into public.cm_progress(owner_id) values(new.id);
 insert into public.cm_rooms(owner_id) values(new.id);
 return new;
end $$;
revoke all on function public.cm_handle_signup() from public;
create trigger cm_create_username_player after insert on auth.users
 for each row execute function public.cm_handle_signup();

-- Usernames are permanent: client-side Auth metadata/email changes cannot rename rooms.
create function public.cm_keep_username() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.email is distinct from old.email then raise exception 'Chessmate usernames cannot be changed'; end if;
 return new;
end $$;
revoke all on function public.cm_keep_username() from public;
create trigger cm_keep_username before update of email on auth.users
 for each row execute function public.cm_keep_username();

alter table public.cm_players enable row level security;
alter table public.cm_progress enable row level security;
alter table public.cm_rooms enable row level security;
alter table public.cm_matches enable row level security;
alter table public.cm_visits enable row level security;
alter table public.cm_friends enable row level security;
alter table public.cm_invites enable row level security;
alter table public.cm_events enable row level security;
revoke all on public.cm_players,public.cm_progress,public.cm_rooms,public.cm_matches,public.cm_visits,public.cm_friends,public.cm_invites,public.cm_events from anon,authenticated;
revoke all on sequence public.cm_events_id_seq from anon,authenticated;
-- Public room cards contain no email, password, or private progress.
create policy public_player_cards on public.cm_players for select using (true);
create policy edit_own_player on public.cm_players for update to authenticated using(id = (select auth.uid())) with check(id = (select auth.uid()));
create policy own_progress on public.cm_progress for select to authenticated using(owner_id = (select auth.uid()));
create policy public_room_status on public.cm_rooms for select using(true);
create policy match_members on public.cm_matches for select to authenticated using((select auth.uid()) in (host_id,guest_id));
create policy visit_members on public.cm_visits for select to authenticated using((select auth.uid()) in (host_id,guest_id));
create policy own_friends on public.cm_friends for select to authenticated using(owner_id = (select auth.uid()));
create policy invite_members on public.cm_invites for select to authenticated using((select auth.uid()) in (sender_id,target_id));
create policy event_members on public.cm_events for select to authenticated using(exists(select 1 from public.cm_matches m where m.id=match_id and (select auth.uid()) in (m.host_id,m.guest_id)));
grant select on public.cm_players,public.cm_rooms to anon,authenticated;
-- The organizer-only reset utility reads the player ID using its server credential.
grant select on public.cm_players to service_role;
grant select on public.cm_progress,public.cm_matches,public.cm_visits,public.cm_friends,public.cm_invites,public.cm_events to authenticated;
grant update(name,avatar,outfit,elo) on public.cm_players to authenticated;

create function public.cm_save_progress(p_revision integer,p_data jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_revision integer; begin
 if auth.uid() is null or not exists(select 1 from public.cm_players where id=auth.uid()) then raise exception 'Sign in first'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>2000000 then raise exception 'Invalid progress'; end if;
 insert into public.cm_progress(owner_id) values(auth.uid()) on conflict do nothing;
 update public.cm_progress set data=p_data,revision=revision+1 where owner_id=auth.uid() and revision=p_revision returning revision into v_revision;
 if v_revision is null then raise exception 'Progress changed on another device. Reload before saving.' using errcode='40001'; end if;
 return v_revision;
end $$;

create function public.cm_room_action(p_action text,p_target uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_match uuid; v_visit public.cm_visits; begin
 if v_user is null or not exists(select 1 from public.cm_players where id=v_user) then raise exception 'Sign in first'; end if;
 if p_action='online' then
  insert into public.cm_rooms(owner_id,online,seen_at) values(v_user,true,now()) on conflict(owner_id) do update set online=true,seen_at=now();
 elsif p_action='offline' then update public.cm_rooms set online=false,seen_at=now() where owner_id=v_user;
 elsif p_action='join' then
  if p_target=v_user or not exists(select 1 from public.cm_players where id=p_target) then raise exception 'Room not found'; end if;
  if exists(select 1 from public.cm_matches where status='active' and v_user in(host_id,guest_id)) then raise exception 'Finish your current game first'; end if;
  perform id from public.cm_players where id=p_target for update;
  if (select count(*) from public.cm_visits where host_id=p_target and status='waiting' and seen_at>now()-interval '60 seconds' and guest_id<>v_user)>=8 then raise exception 'This waiting room is full'; end if;
  insert into public.cm_visits(guest_id,host_id) values(v_user,p_target) on conflict(guest_id) do update set host_id=p_target,status='waiting',match_id=null,seen_at=now();
 elsif p_action='waiting' then update public.cm_visits set seen_at=now() where guest_id=v_user and status='waiting';
 elsif p_action='leave' then delete from public.cm_visits where guest_id=v_user;
 elsif p_action='decline' then update public.cm_visits set status='declined' where host_id=v_user and guest_id=p_target and status='waiting';
 elsif p_action='accept' then
  -- Lock both players so two hosts cannot start simultaneous games with one guest.
  perform id from public.cm_players where id in(v_user,p_target) order by id for update;
  if exists(select 1 from public.cm_matches where status='active' and (v_user in(host_id,guest_id) or p_target in(host_id,guest_id))) then raise exception 'A player is already in a game'; end if;
  select * into v_visit from public.cm_visits where host_id=v_user and guest_id=p_target and status='waiting' and seen_at>now()-interval '60 seconds' for update;
  if not found then raise exception 'That guest is no longer waiting'; end if;
  insert into public.cm_matches(host_id,guest_id) values(v_user,p_target) returning id into v_match;
  update public.cm_visits set status='accepted',match_id=v_match where guest_id=p_target;
  update public.cm_rooms set busy=true where owner_id in(v_user,p_target);
  insert into public.cm_friends(owner_id,friend_id) values(v_user,p_target),(p_target,v_user) on conflict do nothing;
  return v_match;
 elsif p_action='invite' then
  if not exists(select 1 from public.cm_friends where owner_id=v_user and friend_id=p_target) then raise exception 'Play together before using friend invitations'; end if;
  insert into public.cm_invites(sender_id,target_id) values(v_user,p_target) on conflict(sender_id,target_id) do update set created_at=now();
 elsif p_action='dismiss' then delete from public.cm_invites where target_id=v_user and sender_id=p_target;
 else raise exception 'Unknown room action'; end if;
 return null;
end $$;

create function public.cm_send_event(p_match uuid,p_data jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare m public.cm_matches; v_id bigint; v_user uuid:=auth.uid(); v_type text:=p_data->>'type'; begin
 select * into m from public.cm_matches where id=p_match for update;
 if v_user is null or m.id is null or v_user not in(m.host_id,m.guest_id) then raise exception 'You are not in this match'; end if;
 if octet_length(p_data::text)>4096 then raise exception 'Message too long'; end if;
 if v_type='chat' then
  if jsonb_typeof(p_data->'text') is distinct from 'string' or length(p_data->>'text') not between 1 and 500 then raise exception 'Invalid message'; end if;
  if (select count(*) from public.cm_events where sender_id=v_user and created_at>now()-interval '1 second')>=10 then raise exception 'Please slow down'; end if;
 else
  if m.status<>'active' then raise exception 'This match has ended'; end if;
  if v_type='move' then
   if (p_data->>'ply')::integer is distinct from m.ply+1 or p_data->>'before' is distinct from m.fen or v_user<>(case when m.ply%2=0 then m.host_id else m.guest_id end) then raise exception 'Move is out of turn or out of sync'; end if;
   if jsonb_typeof(p_data->'after') is distinct from 'string' or length(p_data->>'after') not between 15 and 100 or jsonb_typeof(p_data->'move') is distinct from 'object' then raise exception 'Invalid move'; end if;
   update public.cm_matches set fen=p_data->>'after',ply=ply+1,draw_by=null where id=p_match;
  elsif v_type='resign' then update public.cm_matches set status='finished' where id=p_match;
  elsif v_type='draw-offer' then update public.cm_matches set draw_by=v_user where id=p_match;
  elsif v_type='draw-accept' then
   if m.draw_by is null or m.draw_by=v_user then raise exception 'No opponent draw offer'; end if;
   update public.cm_matches set status='finished' where id=p_match;
  elsif v_type='draw-decline' then update public.cm_matches set draw_by=null where id=p_match;
  elsif v_type='leave' then update public.cm_matches set status='cancelled' where id=p_match;
  else raise exception 'Unknown game event'; end if;
 end if;
 if v_type in ('resign','draw-accept','leave') then update public.cm_rooms set busy=false where owner_id in(m.host_id,m.guest_id); end if;
 insert into public.cm_events(match_id,sender_id,data) values(p_match,v_user,p_data) returning id into v_id;
 return v_id;
end $$;

create function public.cm_finish_match(p_match uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.cm_matches where id=p_match and auth.uid() in(host_id,guest_id)) then raise exception 'You are not in this match'; end if;
 update public.cm_matches set status='finished' where id=p_match and status='active';
 update public.cm_rooms set busy=false where owner_id in(select host_id from public.cm_matches where id=p_match union select guest_id from public.cm_matches where id=p_match);
end $$;
revoke all on function public.cm_save_progress(integer,jsonb),public.cm_room_action(text,uuid),public.cm_send_event(uuid,jsonb),public.cm_finish_match(uuid) from public;
grant execute on function public.cm_save_progress(integer,jsonb),public.cm_room_action(text,uuid),public.cm_send_event(uuid,jsonb),public.cm_finish_match(uuid) to authenticated;
-- Polling remains a fallback if Realtime is temporarily unavailable.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.cm_events,public.cm_visits,public.cm_invites,public.cm_rooms;
 end if;
end $$;

commit;
