-- Replace broad Data API defaults with explicit least-privilege grants.
--
-- The initial schema left PostgreSQL's default grants in place, so
-- authenticated kept every table privilege (including TRUNCATE, TRIGGER, and
-- REFERENCES), broad sequence privileges, and broad future-object defaults.
-- RLS limits rows, but it does not make those extra object privileges safe.
-- This migration keeps the documented RLS access model and regrants only the
-- operations the apps use. service_role and postgres keep their grants.

-- Current objects: deny by default, then regrant intentionally.
revoke all on all tables in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated, public;
revoke all on all functions in schema public from anon, authenticated, public;
revoke all on all functions in schema private from anon, authenticated, public;

-- Future objects: no API-role default access in either owned schema.
alter default privileges in schema public
  revoke all on tables from anon, authenticated, public;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated, public;
alter default privileges in schema public
  revoke all on functions from anon, authenticated, public;
alter default privileges in schema private
  revoke all on tables from anon, authenticated, public;
alter default privileges in schema private
  revoke all on sequences from anon, authenticated, public;
alter default privileges in schema private
  revoke all on functions from anon, authenticated, public;

-- Profiles are read by admins; all writes use the service-role Edge Function.
grant select on public.profiles to authenticated;

-- Admin-maintained lookups: signed-in reads, admin inserts/updates, no deletes.
grant select, insert, update on
  public.categories, public.events, public.distances, public.target_faces,
  public.athletes
  to authenticated;

-- Scoring hierarchy: the RLS policies decide which rows each role can touch.
grant select, insert, update, delete on
  public.sessions, public.rounds, public.ends, public.arrows
  to authenticated;

-- Corrections and read-only analytics views: admins or RLS-scoped reads only.
grant select on public.arrow_corrections to authenticated;
grant select on public.session_summaries to authenticated;
grant select on public.arrow_details to authenticated;

-- Identity sequences needed when admins add lookup rows.
grant usage, select on sequence
  public.categories_id_seq, public.events_id_seq,
  public.distances_id_seq, public.target_faces_id_seq
  to authenticated;

-- Private helpers referenced by RLS policies and analytics functions.
grant execute on function
  private.is_admin(),
  private.is_active_scorer(),
  private.caller_is_active(),
  private.can_edit_session(uuid),
  private.session_of_round(uuid),
  private.session_of_end(uuid),
  private.filtered_arrows(
    date, date, uuid[], smallint[], smallint[], smallint[], smallint[],
    public.session_type[], public.venue[], public.gender[]
  )
  to authenticated;

-- Public RPC API used by the desktop dashboard.
grant execute on function public.admin_save_scores(uuid, jsonb, text) to authenticated;
grant execute on function public.athlete_performance(
  date, date, boolean, uuid[], smallint[], smallint[], smallint[], smallint[],
  public.session_type[], public.venue[], public.gender[]
) to authenticated;
grant execute on function public.score_distribution(
  date, date, uuid[], smallint[], smallint[], smallint[], smallint[],
  public.session_type[], public.venue[], public.gender[]
) to authenticated;
