-- Access rules for analytics and arrow corrections. Runs against the seeded
-- local database with `supabase test db`; everything rolls back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

-- Seeded accounts (supabase/seed.sql).
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

-- Anonymous callers get nothing.
set local role anon;
select throws_ok(
  'select * from public.session_summaries',
  '42501',
  null,
  'anon cannot read session summaries'
);
select throws_ok(
  'select * from public.athlete_performance()',
  '42501',
  null,
  'anon cannot call athlete_performance'
);
select throws_ok(
  'select * from public.score_distribution()',
  '42501',
  null,
  'anon cannot call score_distribution'
);
select throws_ok(
  'select * from public.arrow_details',
  '42501',
  null,
  'anon cannot read arrow details'
);
reset role;

-- Admins see every session.
select pg_temp.act_as(:'admin_id', 'admin');
select is(
  (select count(*) from public.session_summaries),
  (select count(*) from public.sessions),
  'admin sees every session summary'
);
select is(
  (select sum(arrows) from public.athlete_performance()),
  (select count(*)::bigint from public.arrows),
  'performance totals account for every arrow'
);
select ok(
  (select bool_and(week_start is not null) from public.athlete_performance(p_by_week => true)),
  'weekly rows all carry a week'
);
select is(
  (select sum(arrows) from public.athlete_performance(p_by_week => true)),
  (select sum(arrows) from public.athlete_performance()),
  'weekly rows add up to the summary'
);
select ok(
  (select bool_and(distance_id = 8) from public.athlete_performance(p_distance_ids => '{8}')),
  'the distance filter narrows rows'
);

select is(
  (select sum(arrows) from public.score_distribution()),
  (select count(*)::bigint from public.arrows),
  'the score distribution accounts for every arrow'
);
select is(
  (select count(*) from public.arrow_details),
  (select count(*) from public.arrows),
  'arrow details has one row per arrow'
);
select is(
  (select sum(arrows) from public.athlete_performance(p_distance_ids => '{8}')),
  (select count(*)::bigint from public.arrow_details where distance_id = 8),
  'performance and the arrow export agree on a filter'
);

-- Admin corrections are applied and audited with the reason.
select lives_ok(
  (select format(
     $$ select public.admin_save_scores(%L, %L::jsonb, 'pgTAP check') $$,
     r.session_id,
     json_build_array(json_build_object(
       'round_id', r.id, 'end_no', e.end_no, 'arrow_no', a.arrow_no, 'value', '8'
     ))
   )
   from public.arrows a
   join public.ends e on e.id = a.end_id
   join public.rounds r on r.id = e.round_id
   where a.value = '7'
   limit 1),
  'admin can correct an arrow'
);
select is(
  (select count(*)::int from public.arrow_corrections
   where reason = 'pgTAP check' and old_value = '7' and new_value = '8'
     and corrected_by = :'admin_id'),
  1,
  'the correction is logged with its reason and admin'
);
reset role;

-- Scorers see only their own sessions and cannot correct.
select pg_temp.act_as(:'scorer_id', 'scorer');
select is(
  (select count(*) from public.session_summaries where scorer_id <> :'scorer_id'),
  0::bigint,
  'a scorer sees only their own sessions'
);
select is(
  (select count(*) from public.arrow_details where scorer_id <> :'scorer_id'),
  0::bigint,
  'a scorer exports only their own arrows'
);
select is(
  (select sum(arrows) from public.score_distribution()),
  (select count(*)::bigint from public.arrow_details),
  'a scorer''s distribution matches their own arrows'
);
select is(
  (select coalesce(sum(correction_count), 0)::int from public.session_summaries),
  0,
  'a scorer cannot see correction counts'
);
select throws_ok(
  format(
    $$ select public.admin_save_scores(%L, '[]'::jsonb, 'not allowed') $$,
    (select id from public.sessions limit 1)
  ),
  '42501',
  'Only an admin can edit scores',
  'a scorer cannot correct arrows'
);
reset role;

select * from finish();
rollback;
