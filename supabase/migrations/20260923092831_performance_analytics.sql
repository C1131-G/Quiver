-- Performance analytics for the desktop dashboard.
--
-- Everything here runs as the caller (security_invoker views, SECURITY
-- INVOKER functions), so RLS still decides what anyone sees: admins every
-- session, scorers only their own. Nothing is stored; all numbers come from
-- arrow rows at query time.

-- ---------------------------------------------------------------------------
-- Session list: one row per session with its totals
-- ---------------------------------------------------------------------------

create view public.session_summaries
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
  join public.arrows ar on ar.id = ac.arrow_id
  join public.ends e on e.id = ar.end_id
  join public.rounds r on r.id = e.round_id
  where r.session_id = s.id
) corrections;

-- ---------------------------------------------------------------------------
-- Athlete performance, overall or per ISO week
-- ---------------------------------------------------------------------------

-- Averages are only comparable on the same distance and face, so each row is
-- one athlete on one round format. Category and event filter on the session
-- snapshot, so history stays where it was scored. Null filters match all.
create function public.athlete_performance(
  p_from date default null,
  p_to date default null,
  p_by_week boolean default false,
  p_athlete_ids uuid[] default null,
  p_category_ids smallint[] default null,
  p_event_ids smallint[] default null,
  p_distance_ids smallint[] default null,
  p_target_face_ids smallint[] default null,
  p_session_types public.session_type[] default null,
  p_venues public.venue[] default null,
  p_genders public.gender[] default null
)
returns table (
  athlete_id uuid,
  id_no text,
  athlete_name text,
  gender public.gender,
  category_name text,
  event_name text,
  distance_id smallint,
  meters smallint,
  target_face_id smallint,
  target_face_name text,
  week_start date,
  sessions integer,
  arrows integer,
  total_points integer,
  avg_arrow numeric,
  x_count integer,
  ten_plus_x_count integer,
  miss_count integer,
  best_session_avg numeric,
  last_session_date date
)
language sql
stable
security invoker
set search_path = ''
as $$
  with per_session as (
    select
      s.athlete_id,
      r.distance_id,
      r.target_face_id,
      s.id as session_id,
      s.session_date,
      case when p_by_week then date_trunc('week', s.session_date)::date end as week_start,
      count(*) as arrows,
      sum(ar.points) as total_points,
      count(*) filter (where ar.is_x) as x_count,
      count(*) filter (where ar.is_ten_plus_x) as ten_plus_x_count,
      count(*) filter (where ar.value = 'M') as miss_count
    from public.sessions s
    join public.athletes a on a.id = s.athlete_id
    join public.rounds r on r.session_id = s.id
    join public.ends e on e.round_id = r.id
    join public.arrows ar on ar.end_id = e.id
    where (p_from is null or s.session_date >= p_from)
      and (p_to is null or s.session_date <= p_to)
      and (p_athlete_ids is null or s.athlete_id = any (p_athlete_ids))
      and (p_category_ids is null or s.category_id = any (p_category_ids))
      and (p_event_ids is null or s.event_id = any (p_event_ids))
      and (p_distance_ids is null or r.distance_id = any (p_distance_ids))
      and (p_target_face_ids is null or r.target_face_id = any (p_target_face_ids))
      and (p_session_types is null or s.session_type = any (p_session_types))
      and (p_venues is null or s.venue = any (p_venues))
      and (p_genders is null or a.gender = any (p_genders))
    group by s.athlete_id, r.distance_id, r.target_face_id, s.id, s.session_date
  )
  select
    ps.athlete_id,
    a.id_no,
    a.full_name,
    a.gender,
    c.name,
    ev.name,
    ps.distance_id,
    d.meters,
    ps.target_face_id,
    tf.name,
    ps.week_start,
    count(*)::int,
    sum(ps.arrows)::int,
    sum(ps.total_points)::int,
    round(sum(ps.total_points)::numeric / sum(ps.arrows), 2),
    sum(ps.x_count)::int,
    sum(ps.ten_plus_x_count)::int,
    sum(ps.miss_count)::int,
    round(max(ps.total_points::numeric / ps.arrows), 2),
    max(ps.session_date)
  from per_session ps
  join public.athletes a on a.id = ps.athlete_id
  join public.categories c on c.id = a.category_id
  join public.events ev on ev.id = a.event_id
  join public.distances d on d.id = ps.distance_id
  join public.target_faces tf on tf.id = ps.target_face_id
  group by ps.athlete_id, a.id, c.id, ev.id, ps.distance_id, d.id, ps.target_face_id, tf.id, ps.week_start
  order by a.full_name, d.meters desc, tf.name, ps.week_start;
$$;

-- ---------------------------------------------------------------------------
-- Grants: signed-in users only (RLS narrows further)
-- ---------------------------------------------------------------------------

revoke all on public.session_summaries from anon, public;
grant select on public.session_summaries to authenticated;

revoke all on function public.athlete_performance(
  date, date, boolean, uuid[], smallint[], smallint[], smallint[], smallint[],
  public.session_type[], public.venue[], public.gender[]
) from anon, public;
grant execute on function public.athlete_performance(
  date, date, boolean, uuid[], smallint[], smallint[], smallint[], smallint[],
  public.session_type[], public.venue[], public.gender[]
) to authenticated;
