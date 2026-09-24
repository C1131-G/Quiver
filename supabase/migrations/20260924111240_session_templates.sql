-- Scheduled sessions: an admin plans a session on Quiver Dashboard (date,
-- type, venue, rounds and the athletes who shoot it), and scorers start it
-- from QuiverScore, one session per athlete with the rounds filled in.
--
-- A template only prefills. The sessions it starts are ordinary sessions
-- the scorer owns, and they point back at the template so the dashboard can
-- show who has started.

create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  session_date date not null,
  session_type public.session_type not null,
  venue public.venue not null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index session_templates_date_idx on public.session_templates (session_date desc);
create index session_templates_created_by_idx on public.session_templates (created_by);

create trigger session_templates_updated_at before update on public.session_templates
  for each row execute function private.set_updated_at();

-- A null distance or face means each athlete's own, so one template serves
-- athletes who shoot different distances.
create table public.session_template_rounds (
  template_id uuid not null references public.session_templates (id) on delete cascade,
  round_no smallint not null check (round_no between 1 and 6),
  distance_id smallint references public.distances (id),
  target_face_id smallint references public.target_faces (id),
  arrows_per_end smallint not null check (arrows_per_end between 1 and 6),
  planned_ends smallint not null check (planned_ends between 1 and 36),
  primary key (template_id, round_no)
);

create index session_template_rounds_distance_id_idx on public.session_template_rounds (distance_id);
create index session_template_rounds_target_face_id_idx on public.session_template_rounds (target_face_id);

create table public.session_template_athletes (
  template_id uuid not null references public.session_templates (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete restrict,
  primary key (template_id, athlete_id)
);

create index session_template_athletes_athlete_id_idx on public.session_template_athletes (athlete_id);

-- Removing a template keeps the sessions it started.
alter table public.sessions
  add column template_id uuid references public.session_templates (id) on delete set null;

create index sessions_template_id_idx on public.sessions (template_id);

-- ---------------------------------------------------------------------------
-- Row level security: admins plan, active scorers read
-- ---------------------------------------------------------------------------

alter table public.session_templates enable row level security;
alter table public.session_template_rounds enable row level security;
alter table public.session_template_athletes enable row level security;

create policy "Admins and active scorers read templates" on public.session_templates
  for select to authenticated
  using ((select private.is_admin()) or (select private.is_active_scorer()));
create policy "Admins create templates" on public.session_templates
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update templates" on public.session_templates
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete templates" on public.session_templates
  for delete to authenticated using ((select private.is_admin()));

-- Children are visible with their template, through its read policy.
create policy "Read rounds of visible templates" on public.session_template_rounds
  for select to authenticated
  using (exists (select 1 from public.session_templates t where t.id = template_id));
create policy "Admins add template rounds" on public.session_template_rounds
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins delete template rounds" on public.session_template_rounds
  for delete to authenticated using ((select private.is_admin()));

create policy "Read athletes of visible templates" on public.session_template_athletes
  for select to authenticated
  using (exists (select 1 from public.session_templates t where t.id = template_id));
create policy "Admins add template athletes" on public.session_template_athletes
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins delete template athletes" on public.session_template_athletes
  for delete to authenticated using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Saving a template with its rounds and athletes in one go
-- ---------------------------------------------------------------------------

-- SECURITY INVOKER: the policies above decide who may save. The rounds and
-- athletes are replaced as a whole, so the dashboard sends the full list.
create function public.save_session_template(
  p_id uuid,
  p_title text,
  p_session_date date,
  p_session_type public.session_type,
  p_venue public.venue,
  p_rounds jsonb,
  p_athlete_ids uuid[]
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
begin
  if not (select private.is_admin()) then
    raise exception 'Only an admin can plan sessions' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_rounds) is distinct from 'array'
     or jsonb_array_length(p_rounds) not between 1 and 6 then
    raise exception 'A scheduled session needs 1 to 6 rounds' using errcode = 'check_violation';
  end if;
  if coalesce(cardinality(p_athlete_ids), 0) = 0 then
    raise exception 'Choose at least one athlete' using errcode = 'check_violation';
  end if;

  insert into public.session_templates (id, title, session_date, session_type, venue)
  values (v_id, trim(p_title), p_session_date, p_session_type, p_venue)
  on conflict (id) do update
    set title = excluded.title,
        session_date = excluded.session_date,
        session_type = excluded.session_type,
        venue = excluded.venue;

  delete from public.session_template_rounds where template_id = v_id;
  insert into public.session_template_rounds (
    template_id, round_no, distance_id, target_face_id, arrows_per_end, planned_ends
  )
  select v_id, r.round_no::smallint, r.distance_id, r.target_face_id, r.arrows_per_end, r.planned_ends
  from rows from (
    jsonb_to_recordset(p_rounds)
      as (distance_id smallint, target_face_id smallint, arrows_per_end smallint, planned_ends smallint)
  ) with ordinality
    as r (distance_id, target_face_id, arrows_per_end, planned_ends, round_no);

  delete from public.session_template_athletes where template_id = v_id;
  insert into public.session_template_athletes (template_id, athlete_id)
  select distinct v_id, athlete_id from unnest(p_athlete_ids) as athlete_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Data API grants: signed-in users only, never anon
-- ---------------------------------------------------------------------------

revoke all on public.session_templates, public.session_template_rounds,
  public.session_template_athletes from anon;
grant select, insert, update, delete on public.session_templates to authenticated;
grant select, insert, delete on
  public.session_template_rounds, public.session_template_athletes
  to authenticated;

revoke execute on function public.save_session_template(
  uuid, text, date, public.session_type, public.venue, jsonb, uuid[]
) from public, anon;
grant execute on function public.save_session_template(
  uuid, text, date, public.session_type, public.venue, jsonb, uuid[]
) to authenticated;
