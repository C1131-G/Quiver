-- A deactivated admin is banned from refreshing, but an access token already
-- issued stays valid until it expires (jwt_expiry). The role claim alone would
-- keep admin rights for that window, so admin also requires an active profile,
-- the same way private.is_active_scorer() already does.

-- The profiles read policy itself calls is_admin(), so reading profiles from
-- is_admin() as the caller would recurse through that policy. This helper
-- reads only the caller's own row, bypassing RLS for that one lookup.
create function private.caller_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

revoke execute on function private.caller_is_active() from public, anon;
grant execute on function private.caller_is_active() to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    and (select private.caller_is_active());
$$;
