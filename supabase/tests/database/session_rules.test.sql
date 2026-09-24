-- What a scorer may do to a session from QuiverScore: cancel it while in
-- progress, never move it to another athlete or scorer. Cancelled sessions
-- count in no statistic, and only corrections reach the audit log. Runs
-- against the seeded local database; everything rolls back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

\set admin_id '00000000-0000-4000-8000-000000000001'
\set scorer_id '00000000-0000-4000-8000-000000000002'
\set other_scorer_id '00000000-0000-4000-8000-000000000003'
\set mine '44444444-4444-4444-8444-444444444444'
\set mine_end '55555555-5555-4555-8555-555555555555'
\set theirs '66666666-6666-4666-8666-666666666666'
\set theirs_end '77777777-7777-4777-8777-777777777777'

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

-- The database owner with no signed-in user, like the service role.
create function pg_temp.act_as_owner()
returns void
language sql
as $$
  select
    set_config('role', 'postgres', true),
    set_config('request.jwt.claims', '', true);
$$;

-- Two sessions in progress, one per scorer, each with an arrow.
insert into public.sessions (id, athlete_id, scorer_id, session_type, venue)
select s.id, a.id, s.scorer_id, 'training', 'outdoor'
from (values (:'mine'::uuid, :'scorer_id'::uuid), (:'theirs'::uuid, :'other_scorer_id'::uuid))
  as s (id, scorer_id)
cross join lateral (
  select id from public.athletes where is_active order by id_no limit 1
) a;
insert into public.rounds (id, session_id, round_no, distance_id, target_face_id, arrows_per_end, planned_ends)
select gen_random_uuid(), s.id, 1, 1, tf.id, 3, 10
from (values (:'mine'::uuid), (:'theirs'::uuid)) as s (id)
cross join lateral (
  select id from public.target_faces where lowest_score = 1 order by id limit 1
) tf;
insert into public.ends (id, round_id, end_no)
select e.id, r.id, 1
from (values (:'mine_end'::uuid, :'mine'::uuid), (:'theirs_end'::uuid, :'theirs'::uuid))
  as e (id, session_id)
join public.rounds r on r.session_id = e.session_id;
insert into public.arrows (end_id, arrow_no, value)
values (:'mine_end', 1, '9'), (:'theirs_end', 1, '9');

-- A submitted session of the scorer, and another for the statistics.
create temp table done as
select s.id,
  (select count(*)::int
   from public.rounds r
   join public.ends e on e.round_id = r.id
   join public.arrows ar on ar.end_id = e.id
   where r.session_id = s.id) as arrows
from public.sessions s
where s.status = 'completed' and s.scorer_id = :'scorer_id'
order by s.session_date, s.id
limit 2;
grant select on done to authenticated;

create temp view my_done as select id from done order by id limit 1;
create temp view counted as select id, arrows from done order by id desc limit 1;
grant select on my_done, counted to authenticated;

-- ---------------------------------------------------------------------------
-- A scorer and their own session
-- ---------------------------------------------------------------------------

select pg_temp.act_as(:'scorer_id', 'scorer');

select lives_ok(
  format($$ update public.arrows set value = '8' where end_id = %L $$, :'mine_end'),
  'a scorer fixes an arrow in their session'
);
select lives_ok(
  format($$ update public.sessions set title = 'Morning practice' where id = %L $$, :'mine'),
  'a scorer edits their session''s details'
);
select throws_ok(
  format(
    $$ update public.sessions
       set athlete_id = (select id from public.athletes where is_active order by id_no desc limit 1)
       where id = %L $$,
    :'mine'
  ),
  '42501',
  'Only an admin can change the athlete or scorer of a session',
  'a scorer cannot move their session to another athlete'
);
select throws_ok(
  format($$ update public.sessions set scorer_id = %L where id = %L $$, :'other_scorer_id', :'mine'),
  '42501',
  'Only an admin can change the athlete or scorer of a session',
  'a scorer cannot hand their session to another scorer'
);
select throws_ok(
  format(
    $$ update public.sessions
       set category_id = (select id from public.categories order by id desc limit 1)
       where id = %L $$,
    :'mine'
  ),
  '42501',
  'Only an admin can change the athlete or scorer of a session',
  'a scorer cannot change the category the session was scored in'
);

-- Updates the policies do not allow match no rows; checked below.
update public.sessions set status = 'cancelled' where id = :'theirs';
update public.sessions set status = 'cancelled' where id = (select id from my_done);

select lives_ok(
  format($$ update public.sessions set status = 'cancelled' where id = %L $$, :'mine'),
  'a scorer cancels their session while it is in progress'
);
select throws_ok(
  format($$ insert into public.arrows (end_id, arrow_no, value) values (%L, 2, '9') $$, :'mine_end'),
  '42501',
  null,
  'a cancelled session takes no more arrows'
);

select pg_temp.act_as_owner();

select is(
  (select status::text from public.sessions where id = :'mine'),
  'cancelled',
  'the session is cancelled'
);
select is(
  (select status::text from public.sessions where id = :'theirs'),
  'in_progress',
  'a scorer cannot cancel another scorer''s session'
);
select is(
  (select status::text from public.sessions where id = (select id from my_done)),
  'completed',
  'a scorer cannot cancel a submitted session'
);
select is(
  (select count(*)::int from public.arrow_corrections where session_id = :'mine'),
  0,
  'a scorer''s fix before submitting is not a correction'
);

-- ---------------------------------------------------------------------------
-- Admins and the audit log
-- ---------------------------------------------------------------------------

select pg_temp.act_as(:'admin_id', 'admin');

select lives_ok(
  format(
    $$ update public.sessions
       set athlete_id = (select id from public.athletes where is_active order by id_no desc limit 1)
       where id = %L $$,
    :'theirs'
  ),
  'an admin moves a session to another athlete'
);
select lives_ok(
  format($$ update public.arrows set value = 'X' where end_id = %L $$, :'theirs_end'),
  'an admin fixes an arrow in a session in progress'
);

select pg_temp.act_as_owner();

select is(
  (select count(*)::int from public.arrow_corrections
   where session_id = :'theirs' and old_value = '9' and new_value = 'X'
     and corrected_by = :'admin_id'),
  1,
  'an admin''s fix is logged even before submission'
);

update public.arrows ar
set value = case when ar.value = 'M' then '9' else 'M' end
from public.ends e, public.rounds r
where ar.end_id = e.id and e.round_id = r.id
  and r.session_id = (select id from my_done)
  and e.end_no = 1 and ar.arrow_no = 1;

select is(
  (select count(*)::int from public.arrow_corrections
   where session_id = (select id from my_done) and corrected_by is null),
  1,
  'a change to a submitted session is logged whoever makes it'
);

-- ---------------------------------------------------------------------------
-- Cancelled sessions count nowhere
-- ---------------------------------------------------------------------------

create temp table baseline as
select
  (select count(*)::int from public.session_summaries) as summaries,
  (select count(*)::int from public.arrow_details) as details,
  (select sum(arrows)::int from public.athlete_performance()) as performance,
  (select sum(arrows)::int from public.score_distribution()) as distribution;
grant select on baseline to authenticated;

select pg_temp.act_as(:'admin_id', 'admin');
update public.sessions set status = 'cancelled', completed_at = null
where id = (select id from counted);

select is(
  (select count(*)::int from public.session_summaries),
  (select summaries - 1 from baseline),
  'a cancelled session leaves the session list'
);
select is(
  (select count(*)::int from public.arrow_details),
  (select details - (select arrows from counted) from baseline),
  'its arrows leave the export'
);
select is(
  (select sum(arrows)::int from public.athlete_performance()),
  (select performance - (select arrows from counted) from baseline),
  'its arrows leave athlete performance'
);
select is(
  (select sum(arrows)::int from public.score_distribution()),
  (select distribution - (select arrows from counted) from baseline),
  'its arrows leave the score distribution'
);

select * from finish();
rollback;
