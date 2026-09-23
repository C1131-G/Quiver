-- Quiver archery scoring schema.
--
-- Shared by the desktop admin app (reads, analyses, corrects) and the mobile
-- scoring app (writes sessions → rounds → ends → arrows). All aggregation is
-- computed from arrow rows; nothing here stores derived totals.
--
-- Roles live in auth app_metadata ('admin' | 'scorer'), which users cannot
-- edit, and are mirrored in public.profiles for listing. Accounts are only
-- provisioned by an admin through the admin-users Edge Function.

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('admin', 'scorer');
create type public.gender as enum ('male', 'female');
create type public.session_type as enum ('training', 'competition');
create type public.venue as enum ('indoor', 'outdoor');
create type public.session_status as enum ('in_progress', 'completed');

-- ---------------------------------------------------------------------------
-- Auth helpers (private schema: not exposed through the Data API)
-- ---------------------------------------------------------------------------

create function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  login_id text not null unique
    check (login_id ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- A deactivated scorer's JWT stays valid until it expires, so write access
-- also checks the live profile flag.
create function private.is_active_scorer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'scorer', false)
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_active
    );
$$;

-- ---------------------------------------------------------------------------
-- Lookups (admin-maintained; drive athlete fields and dashboard filters)
-- ---------------------------------------------------------------------------

create table public.categories (
  id smallint generated always as identity primary key,
  name text not null unique,
  sort_order smallint not null default 0,
  is_active boolean not null default true
);

create table public.events (
  id smallint generated always as identity primary key,
  name text not null unique,
  sort_order smallint not null default 0,
  is_active boolean not null default true
);

create table public.distances (
  id smallint generated always as identity primary key,
  meters smallint not null unique check (meters between 5 and 100),
  is_active boolean not null default true
);

-- lowest_score is the lowest scoring ring on the face: 1 for full faces,
-- 5 for 6-ring faces, 6 for triple-spot faces. Anything outside is a miss.
create table public.target_faces (
  id smallint generated always as identity primary key,
  name text not null unique,
  diameter_cm smallint not null check (diameter_cm between 10 and 200),
  lowest_score smallint not null default 1 check (lowest_score between 1 and 10),
  sort_order smallint not null default 0,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Athletes
-- ---------------------------------------------------------------------------

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  id_no text not null unique check (length(trim(id_no)) between 1 and 40),
  aai_no text unique check (aai_no is null or length(trim(aai_no)) between 1 and 40),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  gender public.gender not null,
  category_id smallint not null references public.categories (id),
  event_id smallint not null references public.events (id),
  distance_id smallint not null references public.distances (id),
  target_face_id smallint not null references public.target_faces (id),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index athletes_category_id_idx on public.athletes (category_id);
create index athletes_event_id_idx on public.athletes (event_id);
create index athletes_distance_id_idx on public.athletes (distance_id);
create index athletes_target_face_id_idx on public.athletes (target_face_id);
create index athletes_created_by_idx on public.athletes (created_by);

create trigger athletes_updated_at before update on public.athletes
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Scoring: session → round → end → arrow
-- ---------------------------------------------------------------------------

-- category_id / event_id snapshot the athlete at scoring time, so history
-- still filters correctly after an athlete moves category.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete restrict,
  scorer_id uuid references public.profiles (id) on delete set null default auth.uid(),
  category_id smallint not null references public.categories (id),
  event_id smallint not null references public.events (id),
  session_type public.session_type not null,
  venue public.venue not null,
  session_date date not null default current_date,
  title text check (title is null or length(title) <= 120),
  notes text check (notes is null or length(notes) <= 2000),
  status public.session_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (completed_at is not null))
);

create index sessions_athlete_date_idx on public.sessions (athlete_id, session_date desc);
create index sessions_date_idx on public.sessions (session_date desc);
create index sessions_scorer_id_idx on public.sessions (scorer_id);
create index sessions_category_id_idx on public.sessions (category_id);
create index sessions_event_id_idx on public.sessions (event_id);

create function private.snapshot_session_athlete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is null or new.event_id is null then
    select coalesce(new.category_id, a.category_id), coalesce(new.event_id, a.event_id)
      into new.category_id, new.event_id
    from public.athletes a
    where a.id = new.athlete_id;
  end if;
  return new;
end;
$$;

create trigger sessions_snapshot_athlete before insert on public.sessions
  for each row execute function private.snapshot_session_athlete();
create trigger sessions_updated_at before update on public.sessions
  for each row execute function private.set_updated_at();

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  round_no smallint not null check (round_no >= 1),
  distance_id smallint not null references public.distances (id),
  target_face_id smallint not null references public.target_faces (id),
  arrows_per_end smallint not null check (arrows_per_end between 1 and 6),
  planned_ends smallint not null check (planned_ends between 1 and 36),
  created_at timestamptz not null default now(),
  unique (session_id, round_no)
);

create index rounds_distance_id_idx on public.rounds (distance_id);
create index rounds_target_face_id_idx on public.rounds (target_face_id);

create table public.ends (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  end_no smallint not null check (end_no >= 1),
  created_at timestamptz not null default now(),
  unique (round_id, end_no)
);

create table public.arrows (
  id uuid primary key default gen_random_uuid(),
  end_id uuid not null references public.ends (id) on delete cascade,
  arrow_no smallint not null check (arrow_no between 1 and 6),
  value text not null
    check (value in ('X', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'M')),
  points smallint generated always as (
    case value when 'X' then 10 when 'M' then 0 else value::smallint end
  ) stored,
  is_x boolean generated always as (value = 'X') stored,
  is_ten_plus_x boolean generated always as (value in ('X', '10')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (end_id, arrow_no)
);

create trigger arrows_updated_at before update on public.arrows
  for each row execute function private.set_updated_at();

-- Rejects arrows the round can't produce: an arrow number beyond the round's
-- arrows per end, or a ring below the target face's lowest scoring ring.
create function private.validate_arrow()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  round_arrows smallint;
  face_lowest smallint;
begin
  select r.arrows_per_end, tf.lowest_score
    into round_arrows, face_lowest
  from public.ends e
  join public.rounds r on r.id = e.round_id
  join public.target_faces tf on tf.id = r.target_face_id
  where e.id = new.end_id;

  if new.arrow_no > round_arrows then
    raise exception 'Arrow % exceeds % arrows per end', new.arrow_no, round_arrows
      using errcode = 'check_violation';
  end if;

  if new.value not in ('X', 'M') and new.value::smallint < face_lowest then
    raise exception 'Score % is below the lowest ring (%) on this target face',
      new.value, face_lowest
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger arrows_validate before insert or update of value, arrow_no, end_id
  on public.arrows
  for each row execute function private.validate_arrow();

-- ---------------------------------------------------------------------------
-- Arrow correction audit log
-- ---------------------------------------------------------------------------

create table public.arrow_corrections (
  id bigint generated always as identity primary key,
  arrow_id uuid not null references public.arrows (id) on delete cascade,
  old_value text not null,
  new_value text not null,
  reason text check (reason is null or length(reason) <= 500),
  corrected_by uuid references public.profiles (id) on delete set null,
  corrected_at timestamptz not null default now()
);

create index arrow_corrections_arrow_id_idx on public.arrow_corrections (arrow_id);
create index arrow_corrections_corrected_by_idx on public.arrow_corrections (corrected_by);

-- Every value change is logged regardless of who makes it or how. Runs as
-- the owner so the audit row is written even though no client may insert
-- into arrow_corrections directly. It is only reachable as a trigger.
create function private.log_arrow_correction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.value is distinct from old.value then
    insert into public.arrow_corrections (arrow_id, old_value, new_value, reason, corrected_by)
    values (
      new.id,
      old.value,
      new.value,
      nullif(current_setting('quiver.correction_reason', true), ''),
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

revoke execute on function private.log_arrow_correction() from public;

create trigger arrows_log_correction after update of value on public.arrows
  for each row execute function private.log_arrow_correction();

-- Admin correction with a reason. SECURITY INVOKER: the arrows UPDATE policy
-- decides who may call it successfully.
create function public.correct_arrow(p_arrow_id uuid, p_value text, p_reason text)
returns public.arrows
language plpgsql
set search_path = ''
as $$
declare
  updated public.arrows;
begin
  if not (select private.is_admin()) then
    raise exception 'Only an admin can correct scores' using errcode = 'insufficient_privilege';
  end if;

  perform set_config('quiver.correction_reason', coalesce(p_reason, ''), true);

  update public.arrows set value = p_value where id = p_arrow_id
  returning * into updated;

  if updated.id is null then
    raise exception 'Arrow not found' using errcode = 'no_data_found';
  end if;

  return updated;
end;
$$;

-- ---------------------------------------------------------------------------
-- Session access helpers
-- ---------------------------------------------------------------------------

-- Admins may change any session (corrections); scorers only their own, and
-- only while it is still in progress.
create function private.can_edit_session(p_session_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select private.is_admin())
    or (
      (select private.is_active_scorer())
      and exists (
        select 1 from public.sessions s
        where s.id = p_session_id
          and s.scorer_id = (select auth.uid())
          and s.status = 'in_progress'
      )
    );
$$;

create function private.session_of_round(p_round_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select r.session_id from public.rounds r where r.id = p_round_id;
$$;

create function private.session_of_end(p_end_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select r.session_id
  from public.ends e
  join public.rounds r on r.id = e.round_id
  where e.id = p_end_id;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;
alter table public.distances enable row level security;
alter table public.target_faces enable row level security;
alter table public.athletes enable row level security;
alter table public.sessions enable row level security;
alter table public.rounds enable row level security;
alter table public.ends enable row level security;
alter table public.arrows enable row level security;
alter table public.arrow_corrections enable row level security;

-- Profiles: writes only through the admin-users Edge Function (service role).
create policy "Users read own profile; admins read all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

-- Lookups: everyone signed in reads; admins maintain.
create policy "Signed-in users read categories" on public.categories
  for select to authenticated using (true);
create policy "Admins insert categories" on public.categories
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update categories" on public.categories
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Signed-in users read events" on public.events
  for select to authenticated using (true);
create policy "Admins insert events" on public.events
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update events" on public.events
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Signed-in users read distances" on public.distances
  for select to authenticated using (true);
create policy "Admins insert distances" on public.distances
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update distances" on public.distances
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Signed-in users read target faces" on public.target_faces
  for select to authenticated using (true);
create policy "Admins insert target faces" on public.target_faces
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update target faces" on public.target_faces
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Athletes: admins manage; active scorers pick from active athletes. No
-- delete policy — athletes are deactivated, never removed.
create policy "Admins read all athletes; scorers read active" on public.athletes
  for select to authenticated
  using ((select private.is_admin()) or (is_active and (select private.is_active_scorer())));
create policy "Admins create athletes" on public.athletes
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update athletes" on public.athletes
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Sessions
create policy "Admins read all sessions; scorers read own" on public.sessions
  for select to authenticated
  using (
    (select private.is_admin())
    or (scorer_id = (select auth.uid()) and (select private.is_active_scorer()))
  );
create policy "Active scorers start their own sessions" on public.sessions
  for insert to authenticated
  with check (scorer_id = (select auth.uid()) and (select private.is_active_scorer()));
create policy "Admins and in-progress owners update sessions" on public.sessions
  for update to authenticated
  using ((select private.can_edit_session(id)))
  with check (
    (select private.is_admin())
    or (scorer_id = (select auth.uid()) and (select private.is_active_scorer()))
  );
create policy "Admins delete sessions" on public.sessions
  for delete to authenticated using ((select private.is_admin()));

-- Rounds, ends, arrows follow their session. Reads reuse the sessions
-- policy through the EXISTS subquery.
create policy "Read rounds of visible sessions" on public.rounds
  for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id));
create policy "Write rounds of editable sessions" on public.rounds
  for insert to authenticated with check ((select private.can_edit_session(session_id)));
create policy "Update rounds of editable sessions" on public.rounds
  for update to authenticated
  using ((select private.can_edit_session(session_id)))
  with check ((select private.can_edit_session(session_id)));
create policy "Delete rounds of editable sessions" on public.rounds
  for delete to authenticated using ((select private.can_edit_session(session_id)));

create policy "Read ends of visible rounds" on public.ends
  for select to authenticated
  using (exists (select 1 from public.rounds r where r.id = round_id));
create policy "Write ends of editable sessions" on public.ends
  for insert to authenticated
  with check ((select private.can_edit_session(private.session_of_round(round_id))));
create policy "Delete ends of editable sessions" on public.ends
  for delete to authenticated
  using ((select private.can_edit_session(private.session_of_round(round_id))));

create policy "Read arrows of visible ends" on public.arrows
  for select to authenticated
  using (exists (select 1 from public.ends e where e.id = end_id));
create policy "Write arrows of editable sessions" on public.arrows
  for insert to authenticated
  with check ((select private.can_edit_session(private.session_of_end(end_id))));
create policy "Update arrows of editable sessions" on public.arrows
  for update to authenticated
  using ((select private.can_edit_session(private.session_of_end(end_id))))
  with check ((select private.can_edit_session(private.session_of_end(end_id))));
create policy "Delete arrows of editable sessions" on public.arrows
  for delete to authenticated
  using ((select private.can_edit_session(private.session_of_end(end_id))));

-- Audit log: admins read; rows are only ever written by the trigger.
create policy "Admins read arrow corrections" on public.arrow_corrections
  for select to authenticated using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Data API grants: signed-in users only, never anon
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
revoke all on all functions in schema private from anon, public;

grant select on public.profiles to authenticated;
grant select, insert, update on
  public.categories, public.events, public.distances, public.target_faces,
  public.athletes
  to authenticated;
grant select, insert, update, delete on
  public.sessions, public.rounds, public.ends, public.arrows
  to authenticated;
grant select on public.arrow_corrections to authenticated;

grant execute on function
  private.is_admin(),
  private.is_active_scorer(),
  private.can_edit_session(uuid),
  private.session_of_round(uuid),
  private.session_of_end(uuid)
  to authenticated;
grant execute on function public.correct_arrow(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: live competition updates on the desktop dashboard
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.sessions, public.ends, public.arrows;
