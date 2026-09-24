-- API roles keep only explicit least-privilege grants. Runs against the
-- seeded local database with `supabase test db`; everything rolls back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Anonymous callers get no table, view, sequence, or routine access.
select is(
  (
    select count(*)::int
    from unnest(
      array[
        'public.profiles', 'public.categories', 'public.events',
        'public.distances', 'public.target_faces', 'public.athletes',
        'public.sessions', 'public.rounds', 'public.ends', 'public.arrows',
        'public.arrow_corrections', 'public.session_summaries',
        'public.arrow_details'
      ]::regclass[]
    ) as relation_name
    where has_table_privilege('anon', relation_name, 'SELECT')
  ),
  0,
  'anon has no select privilege on public relations'
);
select is(
  (
    select count(*)::int
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  0,
  'anon cannot execute application or helper routines'
);
select is(
  (
    select count(*)::int
    from unnest(
      array[
        'public.categories_id_seq', 'public.events_id_seq',
        'public.distances_id_seq', 'public.target_faces_id_seq',
        'public.arrow_corrections_id_seq'
      ]::regclass[]
    ) as sequence_name
    where has_sequence_privilege('anon', sequence_name, 'USAGE')
      or has_sequence_privilege('anon', sequence_name, 'SELECT')
      or has_sequence_privilege('anon', sequence_name, 'UPDATE')
  ),
  0,
  'anon has no sequence privileges'
);

-- Authenticated callers keep reads everywhere, but writes only where RLS allows.
select is(
  (
    select count(*)::int
    from unnest(
      array[
        'public.profiles', 'public.categories', 'public.events',
        'public.distances', 'public.target_faces', 'public.athletes',
        'public.sessions', 'public.rounds', 'public.ends', 'public.arrows',
        'public.arrow_corrections', 'public.session_summaries',
        'public.arrow_details'
      ]::regclass[]
    ) as relation_name
    where not has_table_privilege('authenticated', relation_name, 'SELECT')
  ),
  0,
  'authenticated keeps every required read'
);
select is(
  (
    select count(*)::int
    from information_schema.role_table_grants
    where grantee = 'authenticated'
      and table_schema = 'public'
      and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
  ),
  0,
  'authenticated has no truncate, trigger, or references privileges'
);
select is(
  (
    select count(*)::int
    from information_schema.role_table_grants
    where grantee = 'authenticated'
      and table_schema = 'public'
      and privilege_type = 'DELETE'
      and table_name not in (
        'sessions', 'rounds', 'ends', 'arrows', 'session_templates',
        'session_template_rounds', 'session_template_athletes'
      )
  ),
  0,
  'authenticated deletes only scoring-hierarchy and template rows'
);
select is(
  (
    select count(*)::int
    from information_schema.role_table_grants
    where grantee = 'authenticated'
      and table_schema = 'public'
      and privilege_type in ('INSERT', 'UPDATE')
      and table_name not in (
        'categories', 'events', 'distances', 'target_faces', 'athletes',
        'sessions', 'rounds', 'ends', 'arrows', 'session_templates',
        'session_template_rounds', 'session_template_athletes'
      )
  ),
  0,
  'authenticated writes only lookups, athletes, scoring, and template rows'
);

-- Lookup identity sequences remain usable, without sequence updates.
select ok(
  (
    select bool_and(
      has_sequence_privilege('authenticated', sequence_name, 'USAGE')
        and has_sequence_privilege('authenticated', sequence_name, 'SELECT')
        and not has_sequence_privilege('authenticated', sequence_name, 'UPDATE')
    )
    from unnest(
      array[
        'public.categories_id_seq', 'public.events_id_seq',
        'public.distances_id_seq', 'public.target_faces_id_seq'
      ]::regclass[]
    ) as sequence_name
  ),
  'authenticated uses lookup sequences without updating them'
);

-- Only the documented helpers and public RPCs remain executable.
select is(
  (
    select count(*)::int
    from unnest(
      array[
        'private.is_admin()', 'private.is_active_scorer()',
        'private.caller_is_active()', 'private.can_edit_session(uuid)',
        'private.session_of_round(uuid)', 'private.session_of_end(uuid)',
        'private.filtered_arrows(date, date, uuid[], smallint[], smallint[], smallint[], smallint[], public.session_type[], public.venue[], public.gender[])'
      ]::regprocedure[]
    ) as routine_name
    where not has_function_privilege('authenticated', routine_name, 'EXECUTE')
  ),
  0,
  'authenticated keeps the required private helper routines'
);
select is(
  (
    select count(*)::int
    from unnest(
      array[
        'public.admin_save_scores(uuid, jsonb, text)',
        'public.athlete_performance(date, date, boolean, uuid[], smallint[], smallint[], smallint[], smallint[], public.session_type[], public.venue[], public.gender[])',
        'public.score_distribution(date, date, uuid[], smallint[], smallint[], smallint[], smallint[], public.session_type[], public.venue[], public.gender[])'
      ]::regprocedure[]
    ) as routine_name
    where not has_function_privilege('authenticated', routine_name, 'EXECUTE')
  ),
  0,
  'authenticated keeps the required public RPC routines'
);

-- Future objects created by the migration role must not inherit API access.
-- supabase_admin bootstrap defaults are platform-managed and cannot be
-- altered by this migration role, so the check below pins postgres-owned
-- objects: every project migration creates objects as postgres.
select is(
  (
    select count(*)::int
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    join pg_roles r on r.oid = d.defaclrole
    where n.nspname in ('public', 'private')
      and r.rolname = 'postgres'
      and d.defaclacl::text ~ '(anon|authenticated)='
  ),
  0,
  'postgres-owned future objects grant nothing to anon or authenticated by default'
);
create table public.__least_privilege_probe (id integer);
select is(
  (
    select count(*)::int
    from (values ('anon'), ('authenticated')) as api_role(name)
    where has_table_privilege(api_role.name, 'public.__least_privilege_probe', 'SELECT')
  ),
  0,
  'a new postgres-owned table is not readable through API roles'
);
drop table public.__least_privilege_probe;

select * from finish();
rollback;
