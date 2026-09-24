-- Admin rights need both the admin role claim and an active profile, so a
-- deactivated admin's still-valid token stops working at once.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

\set admin_id '00000000-0000-4000-8000-000000000001'

create function pg_temp.act_as_admin(p_id uuid)
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
        'app_metadata', json_build_object('role', 'admin')
      )::text,
      true
    );
$$;

create temp table some_session as
select id from public.sessions limit 1;
grant select on some_session to authenticated;

select pg_temp.act_as_admin(:'admin_id');

select ok(private.is_admin(), 'an active admin is an admin');
select ok(
  (select count(*) from public.sessions) > 0,
  'an active admin reads sessions'
);

reset role;
update public.profiles set is_active = false where id = :'admin_id';
select pg_temp.act_as_admin(:'admin_id');

select ok(not private.is_admin(), 'a deactivated admin with a valid token is not an admin');
select is(
  (select count(*) from public.sessions),
  0::bigint,
  'a deactivated admin reads no sessions'
);
select throws_ok(
  format(
    $$ select public.admin_save_scores(%L, '[]'::jsonb, 'Reason') $$,
    (select id from some_session)
  ),
  '42501',
  'Only an admin can edit scores',
  'a deactivated admin cannot save scores'
);

select * from finish();
rollback;
