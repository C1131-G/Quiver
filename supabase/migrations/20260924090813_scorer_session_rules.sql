-- Rules QuiverScore relies on before it starts sending scores.
--
-- 1. Cancelled sessions are left out of every statistic and export. A
--    scorer cancels their own session while it is in progress; the existing
--    sessions policies already allow that and nothing more.
-- 2. The audit log records corrections, not ordinary scoring: an admin's
--    changes, and any value changed after the session was submitted.
-- 3. Only an admin can change who a session is for or who scored it.

-- ---------------------------------------------------------------------------
-- 1. Cancelled sessions count nowhere
-- ---------------------------------------------------------------------------

-- Feeds athlete_performance and score_distribution, so both follow.
create or replace function private.filtered_arrows(
  p_from date,
  p_to date,
  p_athlete_ids uuid[],
  p_category_ids smallint[],
  p_event_ids smallint[],
  p_distance_ids smallint[],
  p_target_face_ids smallint[],
  p_session_types public.session_type[],
  p_venues public.venue[],
  p_genders public.gender[]
)
returns table (
  session_id uuid,
  athlete_id uuid,
  session_date date,
  distance_id smallint,
  target_face_id smallint,
  value text,
  points smallint,
  is_x boolean,
  is_ten_plus_x boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.athlete_id,
    s.session_date,
    r.distance_id,
    r.target_face_id,
    ar.value,
    ar.points,
    ar.is_x,
    ar.is_ten_plus_x
  from public.sessions s
  join public.athletes a on a.id = s.athlete_id
  join public.rounds r on r.session_id = s.id
  join public.ends e on e.round_id = r.id
  join public.arrows ar on ar.end_id = e.id
  where s.status <> 'cancelled'
    and (p_from is null or s.session_date >= p_from)
    and (p_to is null or s.session_date <= p_to)
    and (p_athlete_ids is null or s.athlete_id = any (p_athlete_ids))
    and (p_category_ids is null or s.category_id = any (p_category_ids))
    and (p_event_ids is null or s.event_id = any (p_event_ids))
    and (p_distance_ids is null or r.distance_id = any (p_distance_ids))
    and (p_target_face_ids is null or r.target_face_id = any (p_target_face_ids))
    and (p_session_types is null or s.session_type = any (p_session_types))
    and (p_venues is null or s.venue = any (p_venues))
    and (p_genders is null or a.gender = any (p_genders));
$$;

create or replace view public.session_summaries
with (security_invoker = true)
as
select
  s.id,
  s.athlete_id,
  a.id_no,
  a.full_name as athlete_name,
  a.gender,
  s.scorer_id,
  p.full_name as scorer_name,
  s.category_id,
  c.name as category_name,
  s.event_id,
  ev.name as event_name,
  s.session_type,
  s.venue,
  s.session_date,
  s.title,
  s.status,
  s.started_at,
  s.completed_at,
  coalesce(fmt.rounds, 0) as rounds,
  coalesce(fmt.distance_ids, '{}') as distance_ids,
  coalesce(fmt.target_face_ids, '{}') as target_face_ids,
  coalesce(fmt.formats, '') as formats,
  totals.arrows,
  totals.total_points,
  totals.arrows * 10 as max_points,
  round(totals.total_points::numeric / nullif(totals.arrows, 0), 2) as avg_arrow,
  totals.x_count,
  totals.ten_plus_x_count,
  totals.miss_count,
  corrections.correction_count
from public.sessions s
join public.athletes a on a.id = s.athlete_id
join public.categories c on c.id = s.category_id
join public.events ev on ev.id = s.event_id
left join public.profiles p on p.id = s.scorer_id
left join lateral (
  select
    count(*)::int as rounds,
    array_agg(r.distance_id order by r.round_no) as distance_ids,
    array_agg(r.target_face_id order by r.round_no) as target_face_ids,
    string_agg(distinct d.meters || ' m · ' || tf.name, ', ') as formats
  from public.rounds r
  join public.distances d on d.id = r.distance_id
  join public.target_faces tf on tf.id = r.target_face_id
  where r.session_id = s.id
) fmt on true
cross join lateral (
  select
    count(ar.id)::int as arrows,
    coalesce(sum(ar.points), 0)::int as total_points,
    count(*) filter (where ar.is_x)::int as x_count,
    count(*) filter (where ar.is_ten_plus_x)::int as ten_plus_x_count,
    count(*) filter (where ar.value = 'M')::int as miss_count
  from public.rounds r
  join public.ends e on e.round_id = r.id
  join public.arrows ar on ar.end_id = e.id
  where r.session_id = s.id
) totals
-- arrow_corrections is admin-only under RLS, so scorers always see 0.
cross join lateral (
  select count(*)::int as correction_count
  from public.arrow_corrections ac
  where ac.session_id = s.id
) corrections
where s.status <> 'cancelled';

create or replace view public.arrow_details
with (security_invoker = true)
as
select
  ar.id,
  s.id as session_id,
  s.session_date,
  s.athlete_id,
  a.id_no,
  a.aai_no,
  a.full_name as athlete_name,
  a.gender,
  s.category_id,
  c.name as category_name,
  s.event_id,
  ev.name as event_name,
  s.session_type,
  s.venue,
  s.title,
  s.status,
  s.scorer_id,
  p.full_name as scorer_name,
  r.round_no,
  r.distance_id,
  d.meters,
  r.target_face_id,
  tf.name as target_face_name,
  e.end_no,
  ar.arrow_no,
  ar.value,
  ar.points,
  ar.is_x,
  ar.is_ten_plus_x
from public.arrows ar
join public.ends e on e.id = ar.end_id
join public.rounds r on r.id = e.round_id
join public.sessions s on s.id = r.session_id
join public.athletes a on a.id = s.athlete_id
join public.categories c on c.id = s.category_id
join public.events ev on ev.id = s.event_id
join public.distances d on d.id = r.distance_id
join public.target_faces tf on tf.id = r.target_face_id
left join public.profiles p on p.id = s.scorer_id
where s.status <> 'cancelled';

-- ---------------------------------------------------------------------------
-- 2. Log corrections, not scoring
-- ---------------------------------------------------------------------------

-- A scorer fixing an arrow before submitting is ordinary entry. After
-- submission only an admin (or the service role) can change a value, and
-- that is always logged. Added and removed arrows stay admin-only, because
-- the seed inserts arrows into sessions it has already marked completed.
create or replace function private.log_arrow_correction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end_id uuid;
  v_arrow_id uuid;
  v_arrow_no smallint;
  v_old text;
  v_new text;
  v_session_id uuid;
  v_status public.session_status;
  v_round_no smallint;
  v_end_no smallint;
begin
  if tg_op = 'UPDATE' then
    if new.value is not distinct from old.value then
      return null;
    end if;
    v_end_id := new.end_id; v_arrow_id := new.id; v_arrow_no := new.arrow_no;
    v_old := old.value; v_new := new.value;
  elsif tg_op = 'INSERT' then
    v_end_id := new.end_id; v_arrow_id := new.id; v_arrow_no := new.arrow_no;
    v_new := new.value;
  else
    -- The arrow is gone, so the entry cannot reference it.
    v_end_id := old.end_id; v_arrow_no := old.arrow_no;
    v_old := old.value;
  end if;

  select r.session_id, s.status, r.round_no, e.end_no
    into v_session_id, v_status, v_round_no, v_end_no
  from public.ends e
  join public.rounds r on r.id = e.round_id
  join public.sessions s on s.id = r.session_id
  where e.id = v_end_id;

  -- A whole end or session being deleted is not an arrow correction.
  if v_session_id is null then
    return null;
  end if;

  if not (select private.is_admin())
     and not (tg_op = 'UPDATE' and v_status = 'completed') then
    return null;
  end if;

  insert into public.arrow_corrections (
    arrow_id, session_id, round_no, end_no, arrow_no,
    old_value, new_value, reason, corrected_by
  )
  values (
    v_arrow_id, v_session_id, v_round_no, v_end_no, v_arrow_no,
    v_old, v_new,
    nullif(current_setting('quiver.correction_reason', true), ''),
    (select auth.uid())
  );
  return null;
end;
$$;

revoke execute on function private.log_arrow_correction() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. A session stays with its athlete and scorer
-- ---------------------------------------------------------------------------

-- RLS sees only the new row, so it cannot tell a changed athlete from an
-- unchanged one; this trigger compares both. The category and event are the
-- athlete snapshot taken at the start, so they are locked with it. Only API
-- callers are checked: foreign-key actions (a removed scorer's profile) and
-- maintenance run as the table owner.
create function private.guard_session_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and (new.athlete_id, new.scorer_id, new.category_id, new.event_id)
       is distinct from (old.athlete_id, old.scorer_id, old.category_id, old.event_id)
     and not (select private.is_admin()) then
    raise exception 'Only an admin can change the athlete or scorer of a session'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

revoke execute on function private.guard_session_owner() from public, anon, authenticated;

create trigger sessions_guard_owner
  before update of athlete_id, scorer_id, category_id, event_id on public.sessions
  for each row execute function private.guard_session_owner();
