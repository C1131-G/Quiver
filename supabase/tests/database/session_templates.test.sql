-- Scheduled sessions: admins plan them on Quiver Dashboard, active scorers
-- read them and start sessions from them in QuiverScore. Runs against the
-- seeded local database; everything rolls back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

\set admin_id '00000000-0000-4000-8000-000000000001'
\set scorer_id '00000000-0000-4000-8000-000000000002'
\set plan_id '88888888-8888-4888-8888-888888888888'
\set started '99999999-9999-4999-8999-999999999999'

create function pg_temp.act_as(p_id uuid, p_role text)
returns void
language sql
as $$
  select
    set_config('role', 'authenticated', true),
    set_config(
      'request.jwt.claims',
      json_build_object(
        'sub', p_id,
        'role', 'authenticated',
        'app_metadata', json_build_object('role', p_role)
      )::text,
      true
    );
$$;

create function pg_temp.act_as_owner()
returns void
language sql
as $$
  select
    set_config('role', 'postgres', true),
    set_config('request.jwt.claims', '', true);
$$;

-- Two athletes to plan for.
create temp table picked as
select array_agg(id order by id_no) as ids
from (select id, id_no from public.athletes where is_active order by id_no limit 2) a;
grant select on picked to authenticated;

-- ---------------------------------------------------------------------------
-- An admin plans a session
-- ---------------------------------------------------------------------------

select pg_temp.act_as(:'admin_id', 'admin');

select is(
  public.save_session_template(
    :'plan_id', '  State trials  ', '2026-10-03', 'competition', 'outdoor',
    '[{"distance_id": null, "target_face_id": null, "arrows_per_end": 6, "planned_ends": 6},
      {"distance_id": 1, "target_face_id": null, "arrows_per_end": 3, "planned_ends": 10}]',
    (select ids from picked)
  ),
  :'plan_id'::uuid,
  'an admin saves a scheduled session'
);
select is(
  (select title from public.session_templates where id = :'plan_id'),
  'State trials',
  'the title is saved trimmed'
);
select results_eq(
  format(
    $$ select round_no::int, distance_id::int, arrows_per_end::int
       from public.session_template_rounds where template_id = %L order by round_no $$,
    :'plan_id'
  ),
  $$ values (1, null::int, 6), (2, 1, 3) $$,
  'rounds are numbered in order, and an empty distance stays empty'
);
select is(
  (select count(*)::int from public.session_template_athletes where template_id = :'plan_id'),
  2,
  'both athletes are on it'
);

select lives_ok(
  format(
    $$ select public.save_session_template(
         %L, 'State trials', '2026-10-04', 'competition', 'outdoor',
         '[{"distance_id": null, "target_face_id": null, "arrows_per_end": 6, "planned_ends": 12}]',
         (select ids[1:1] from picked)
       ) $$,
    :'plan_id'
  ),
  'an admin edits the scheduled session'
);
select results_eq(
  format(
    $$ select t.session_date::text,
         (select count(*)::int from public.session_template_rounds r where r.template_id = t.id),
         (select count(*)::int from public.session_template_athletes a where a.template_id = t.id)
       from public.session_templates t where t.id = %L $$,
    :'plan_id'
  ),
  $$ values ('2026-10-04', 1, 1) $$,
  'saving again replaces the rounds and athletes'
);
select throws_ok(
  $$ select public.save_session_template(
       null, 'Empty', '2026-10-05', 'training', 'indoor', '[]', (select ids from picked)
     ) $$,
  '23514',
  'A scheduled session needs 1 to 6 rounds',
  'a scheduled session needs a round'
);
select throws_ok(
  $$ select public.save_session_template(
       null, 'Nobody', '2026-10-05', 'training', 'indoor',
       '[{"arrows_per_end": 3, "planned_ends": 10}]', '{}'
     ) $$,
  '23514',
  'Choose at least one athlete',
  'a scheduled session needs an athlete'
);

-- ---------------------------------------------------------------------------
-- A scorer reads it and starts from it
-- ---------------------------------------------------------------------------

select pg_temp.act_as(:'scorer_id', 'scorer');

select results_eq(
  format(
    $$ select
         (select count(*)::int from public.session_templates where id = %1$L),
         (select count(*)::int from public.session_template_rounds where template_id = %1$L),
         (select count(*)::int from public.session_template_athletes where template_id = %1$L) $$,
    :'plan_id'
  ),
  $$ values (1, 1, 1) $$,
  'a scorer reads the scheduled session, its rounds and athletes'
);
select throws_ok(
  $$ select public.save_session_template(
       null, 'Mine', '2026-10-05', 'training', 'indoor',
       '[{"arrows_per_end": 3, "planned_ends": 10}]', (select ids from picked)
     ) $$,
  '42501',
  'Only an admin can plan sessions',
  'a scorer cannot plan a session'
);
select throws_ok(
  $$ insert into public.session_templates (title, session_date, session_type, venue)
     values ('Mine', '2026-10-05', 'training', 'indoor') $$,
  '42501',
  null,
  'a scorer cannot insert a scheduled session directly'
);
select throws_ok(
  format(
    $$ insert into public.session_template_athletes (template_id, athlete_id)
       values (%L, (select ids[2] from picked)) $$,
    :'plan_id'
  ),
  '42501',
  null,
  'a scorer cannot add an athlete to it'
);

-- Changes the policies do not allow match no rows; checked below.
update public.session_templates set title = 'Renamed' where id = :'plan_id';
delete from public.session_template_rounds where template_id = :'plan_id';
delete from public.session_templates where id = :'plan_id';

select lives_ok(
  format(
    $$ insert into public.sessions (id, athlete_id, scorer_id, session_type, venue, template_id)
       values (%L, (select ids[1] from picked), %L, 'competition', 'outdoor', %L) $$,
    :'started', :'scorer_id', :'plan_id'
  ),
  'a scorer starts a session from it'
);

select pg_temp.act_as_owner();

select results_eq(
  format(
    $$ select t.title,
         (select count(*)::int from public.session_template_rounds r where r.template_id = t.id)
       from public.session_templates t where t.id = %L $$,
    :'plan_id'
  ),
  $$ values ('State trials', 1) $$,
  'a scorer cannot change or delete a scheduled session'
);

-- ---------------------------------------------------------------------------
-- Who else may read it
-- ---------------------------------------------------------------------------

update public.profiles set is_active = false where id = :'scorer_id';
select pg_temp.act_as(:'scorer_id', 'scorer');
select is(
  (select count(*)::int from public.session_templates),
  0,
  'a deactivated scorer reads no scheduled sessions'
);

select pg_temp.act_as_owner();
set local role anon;
select throws_ok(
  $$ select 1 from public.session_templates $$,
  '42501',
  null,
  'signed-out callers read nothing'
);

-- ---------------------------------------------------------------------------
-- Removing it keeps the sessions it started
-- ---------------------------------------------------------------------------

select pg_temp.act_as(:'admin_id', 'admin');
delete from public.session_templates where id = :'plan_id';

select pg_temp.act_as_owner();

select is(
  (select template_id from public.sessions where id = :'started'),
  null,
  'the started session stays, no longer tied to the plan'
);
select is(
  (select count(*)::int from public.session_template_rounds where template_id = :'plan_id')
    + (select count(*)::int from public.session_template_athletes where template_id = :'plan_id'),
  0,
  'its rounds and athletes go with it'
);

select * from finish();
rollback;
