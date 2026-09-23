-- Comparison and export support.
--
-- private.filtered_arrows is the one filter every analytics call shares, so
-- the performance table, the score distribution and any export always agree
-- on which arrows a filter selects. Everything runs as the caller, so RLS
-- still limits scorers to their own sessions.

-- ---------------------------------------------------------------------------
-- Shared arrow filter
-- ---------------------------------------------------------------------------

-- Category and event filter on the session snapshot; distance and face on the
-- round, so a mixed-format session contributes each round to its own format.
-- Null filters match all.
create function private.filtered_arrows(
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
  where (p_from is null or s.session_date >= p_from)
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

revoke all on function private.filtered_arrows(
  date, date, uuid[], smallint[], smallint[], smallint[], smallint[],
  public.session_type[], public.venue[], public.gender[]
) from anon, public;
grant execute on function private.filtered_arrows(
  date, date, uuid[], smallint[], smallint[], smallint[], smallint[],
  public.session_type[], public.venue[], public.gender[]
) to authenticated;

-- Same signature and result as before; only the filter moved.
create or replace function public.athlete_performance(
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
      fa.athlete_id,
      fa.distance_id,
      fa.target_face_id,
      fa.session_id,
      fa.session_date,
      case when p_by_week then date_trunc('week', fa.session_date)::date end as week_start,
      count(*) as arrows,
      sum(fa.points) as total_points,
      count(*) filter (where fa.is_x) as x_count,
      count(*) filter (where fa.is_ten_plus_x) as ten_plus_x_count,
      count(*) filter (where fa.value = 'M') as miss_count
    from private.filtered_arrows(
      p_from, p_to, p_athlete_ids, p_category_ids, p_event_ids,
      p_distance_ids, p_target_face_ids, p_session_types, p_venues, p_genders
    ) fa
    group by fa.athlete_id, fa.distance_id, fa.target_face_id, fa.session_id, fa.session_date
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
-- Score distribution: how often each athlete hits each ring
-- ---------------------------------------------------------------------------

create function public.score_distribution(
  p_from date default null,
  p_to date default null,
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
  distance_id smallint,
  target_face_id smallint,
  value text,
  arrows integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select fa.athlete_id, fa.distance_id, fa.target_face_id, fa.value, count(*)::int
  from private.filtered_arrows(
    p_from, p_to, p_athlete_ids, p_category_ids, p_event_ids,
    p_distance_ids, p_target_face_ids, p_session_types, p_venues, p_genders
  ) fa
  group by fa.athlete_id, fa.distance_id, fa.target_face_id, fa.value;
$$;

revoke all on function public.score_distribution(
  date, date, uuid[], smallint[], smallint[], smallint[], smallint[],
  public.session_type[], public.venue[], public.gender[]
) from anon, public;
grant execute on function public.score_distribution(
  date, date, uuid[], smallint[], smallint[], smallint[], smallint[],
  public.session_type[], public.venue[], public.gender[]
) to authenticated;

-- ---------------------------------------------------------------------------
-- Arrow-level export: one flat row per arrow
-- ---------------------------------------------------------------------------

create view public.arrow_details
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
left join public.profiles p on p.id = s.scorer_id;

revoke all on public.arrow_details from anon, public;
grant select on public.arrow_details to authenticated;
