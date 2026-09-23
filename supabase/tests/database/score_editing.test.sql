-- Admin score editing through admin_save_scores, and what the audit log
-- records. Runs against the seeded local database; everything rolls back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

\set admin_id '00000000-0000-4000-8000-000000000001'
\set scorer_id '00000000-0000-4000-8000-000000000002'

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

-- A completed seeded round with all its ends, on a full-size face.
create temp table target as
select r.id as round_id, r.session_id, r.planned_ends, r.arrows_per_end
from public.rounds r
join public.target_faces tf on tf.id = r.target_face_id
where tf.lowest_score = 1
  and (select count(*) from public.ends e where e.round_id = r.id) = r.planned_ends
limit 1;
grant select on target to authenticated;

create temp view slot as
select a.id, a.value, e.end_no, a.arrow_no
from public.arrows a
join public.ends e on e.id = a.end_id
where e.round_id = (select round_id from target);
grant select on slot to authenticated;

select pg_temp.act_as(:'admin_id', 'admin');

-- Change one arrow.
select lives_ok(
  format(
    $$ select public.admin_save_scores(%L, %L::jsonb, 'Judge call') $$,
    (select session_id from target),
    json_build_array(json_build_object(
      'round_id', (select round_id from target), 'end_no', 1, 'arrow_no', 1, 'value', 'M'
    ))
  ),
  'admin can change an arrow'
);
select is(
  (select value from slot where end_no = 1 and arrow_no = 1),
  'M',
  'the arrow has its new value'
);
select is(
  (select count(*)::int from public.arrow_corrections
   where session_id = (select session_id from target)
     and end_no = 1 and arrow_no = 1 and new_value = 'M'
     and reason = 'Judge call' and corrected_by = :'admin_id'),
  1,
  'the change is logged with its place, reason and admin'
);

-- Clear one arrow.
select lives_ok(
  format(
    $$ select public.admin_save_scores(%L, %L::jsonb, 'Duplicate entry') $$,
    (select session_id from target),
    json_build_array(json_build_object(
      'round_id', (select round_id from target), 'end_no', 1, 'arrow_no', 2, 'value', null
    ))
  ),
  'admin can clear an arrow'
);
select is(
  (select count(*)::int from slot where end_no = 1 and arrow_no = 2),
  0,
  'the cleared arrow is gone'
);
select is(
  (select count(*)::int from public.arrow_corrections
   where session_id = (select session_id from target)
     and end_no = 1 and arrow_no = 2 and new_value is null and arrow_id is null),
  1,
  'the removal is logged even though the arrow no longer exists'
);

-- Clear all of end 2: the end goes and later ends move up.
select lives_ok(
  format(
    $$ select public.admin_save_scores(%L, %L::jsonb, 'End scored twice') $$,
    (select session_id from target),
    (select json_agg(json_build_object(
       'round_id', (select round_id from target), 'end_no', 2, 'arrow_no', n, 'value', null))
     from generate_series(1, (select arrows_per_end from target)) n)
  ),
  'admin can clear a whole end'
);
select is(
  (select array_agg(end_no order by end_no) from public.ends where round_id = (select round_id from target)),
  (select array_agg(n::smallint order by n) from generate_series(1, (select planned_ends from target) - 1) n),
  'the remaining ends are renumbered without a gap'
);

-- Add the missing end back as the last end.
select lives_ok(
  format(
    $$ select public.admin_save_scores(%L, %L::jsonb, 'Missed end found on paper') $$,
    (select session_id from target),
    json_build_array(json_build_object(
      'round_id', (select round_id from target),
      'end_no', (select planned_ends from target), 'arrow_no', 1, 'value', 'X'
    ))
  ),
  'admin can add an end that was not scored'
);
select is(
  (select value from slot where end_no = (select planned_ends from target) and arrow_no = 1),
  'X',
  'the new end holds the new arrow'
);

-- Guard rails.
select throws_ok(
  format(
    $$ select public.admin_save_scores(%L, %L::jsonb, 'x') $$,
    (select session_id from target),
    json_build_array(json_build_object(
      'round_id', (select round_id from target),
      'end_no', (select planned_ends from target) + 1, 'arrow_no', 1, 'value', '9'
    ))
  ),
  '23514',
  null,
  'an end beyond the planned ends is refused'
);
select throws_ok(
  format(
    $$ select public.admin_save_scores(%L, %L::jsonb, 'x') $$,
    (select session_id from target),
    json_build_array(json_build_object(
      'round_id', (select r.id from public.rounds r where r.session_id <> (select session_id from target) limit 1),
      'end_no', 1, 'arrow_no', 1, 'value', '9'
    ))
  ),
  '23503',
  null,
  'a round from another session is refused'
);
select throws_ok(
  format(
    $$ select public.admin_save_scores(%L, '[]'::jsonb, '  ') $$,
    (select session_id from target)
  ),
  '23514',
  'A reason is required',
  'a reason is required'
);
select throws_ok(
  format(
    $$ select public.admin_save_scores(%L, %L::jsonb, 'x') $$,
    (select session_id from target),
    json_build_array(json_build_object(
      'round_id', (select round_id from target), 'end_no', 1,
      'arrow_no', (select arrows_per_end from target) + 1, 'value', '9'
    ))
  ),
  '23514',
  null,
  'an arrow beyond the round''s arrows per end is refused'
);
reset role;

-- Scorers cannot use it, and their own entry is not logged as a correction.
select pg_temp.act_as(:'scorer_id', 'scorer');
select throws_ok(
  format(
    $$ select public.admin_save_scores(%L, '[]'::jsonb, 'x') $$,
    (select session_id from target)
  ),
  '42501',
  'Only an admin can edit scores',
  'a scorer cannot edit scores'
);
reset role;

insert into public.sessions (id, athlete_id, scorer_id, session_type, venue)
select '11111111-1111-4111-8111-111111111111', a.id, :'scorer_id', 'training', 'outdoor'
from public.athletes a where a.is_active limit 1;
insert into public.rounds (id, session_id, round_no, distance_id, target_face_id, arrows_per_end, planned_ends)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 1, 1, 1, 3, 10);
insert into public.ends (id, round_id, end_no)
values ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 1);

select pg_temp.act_as(:'scorer_id', 'scorer');
select lives_ok(
  $$ insert into public.arrows (end_id, arrow_no, value)
     values ('33333333-3333-4333-8333-333333333333', 1, '9') $$,
  'a scorer enters an arrow in their session'
);
reset role;
select is(
  (select count(*)::int from public.arrow_corrections
   where session_id = '11111111-1111-4111-8111-111111111111'),
  0,
  'ordinary scoring is not logged as a correction'
);

select * from finish();
rollback;
