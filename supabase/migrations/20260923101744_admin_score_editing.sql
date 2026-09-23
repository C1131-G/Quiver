-- Admin score editing: an admin can fix any arrow in any round, fill in
-- missing arrows and ends, and remove wrong ones, the way the mobile scorer
-- does, but for any session. Every such change is audited.

-- ---------------------------------------------------------------------------
-- Audit log: record added and removed arrows too, not only changed values
-- ---------------------------------------------------------------------------

-- Each entry now names its place on the scorecard directly, so it survives
-- the arrow being deleted. old_value is null for an added arrow, new_value
-- for a removed one.
alter table public.arrow_corrections
  add column session_id uuid references public.sessions (id) on delete cascade,
  add column round_no smallint,
  add column end_no smallint,
  add column arrow_no smallint;

update public.arrow_corrections ac
set session_id = r.session_id,
    round_no = r.round_no,
    end_no = e.end_no,
    arrow_no = a.arrow_no
from public.arrows a
join public.ends e on e.id = a.end_id
join public.rounds r on r.id = e.round_id
where a.id = ac.arrow_id;

alter table public.arrow_corrections
  alter column session_id set not null,
  alter column round_no set not null,
  alter column end_no set not null,
  alter column arrow_no set not null,
  alter column arrow_id drop not null,
  alter column old_value drop not null,
  alter column new_value drop not null,
  add constraint arrow_corrections_has_value
    check (old_value is not null or new_value is not null);

alter table public.arrow_corrections
  drop constraint arrow_corrections_arrow_id_fkey,
  add constraint arrow_corrections_arrow_id_fkey
    foreign key (arrow_id) references public.arrows (id) on delete set null;

create index arrow_corrections_session_id_idx on public.arrow_corrections (session_id);

-- Value changes are logged whoever makes them. Added and removed arrows are
-- only logged when an admin makes them: a scorer adding and deleting arrows
-- during an end is ordinary entry, not a correction.
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
  v_round_no smallint;
  v_end_no smallint;
begin
  if tg_op = 'UPDATE' then
    if new.value is not distinct from old.value then
      return null;
    end if;
    v_end_id := new.end_id; v_arrow_id := new.id; v_arrow_no := new.arrow_no;
    v_old := old.value; v_new := new.value;
  elsif not (select private.is_admin()) then
    return null;
  elsif tg_op = 'INSERT' then
    v_end_id := new.end_id; v_arrow_id := new.id; v_arrow_no := new.arrow_no;
    v_new := new.value;
  else
    -- The arrow is gone, so the entry cannot reference it.
    v_end_id := old.end_id; v_arrow_no := old.arrow_no;
    v_old := old.value;
  end if;

  select r.session_id, r.round_no, e.end_no
    into v_session_id, v_round_no, v_end_no
  from public.ends e
  join public.rounds r on r.id = e.round_id
  where e.id = v_end_id;

  -- A whole end or session being deleted is not an arrow correction.
  if v_session_id is null then
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

revoke execute on function private.log_arrow_correction() from public;

drop trigger arrows_log_correction on public.arrows;
create trigger arrows_log_correction
  after insert or delete or update of value on public.arrows
  for each row execute function private.log_arrow_correction();

-- Renumbering ends after a removal updates them; until now ends were only
-- ever inserted or deleted, so there was no update policy.
create policy "Update ends of editable sessions" on public.ends
  for update to authenticated
  using ((select private.can_edit_session(private.session_of_round(round_id))))
  with check ((select private.can_edit_session(private.session_of_round(round_id))));

-- ---------------------------------------------------------------------------
-- Save an admin's edits to a session in one transaction
-- ---------------------------------------------------------------------------

-- p_changes: [{ "round_id", "end_no", "arrow_no", "value" }], where a null
-- value clears that arrow. Ends are created as needed; ends left empty are
-- removed and the round's ends renumbered 1, 2, 3… SECURITY INVOKER, so the
-- arrows and ends policies still apply.
create function public.admin_save_scores(
  p_session_id uuid,
  p_changes jsonb,
  p_reason text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  change record;
  v_round public.rounds;
  v_end_id uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'Only an admin can edit scores' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(length(trim(p_reason)), 0) = 0 then
    raise exception 'A reason is required' using errcode = 'check_violation';
  end if;

  perform set_config('quiver.correction_reason', left(trim(p_reason), 500), true);

  for change in
    select * from jsonb_to_recordset(p_changes)
      as x(round_id uuid, end_no smallint, arrow_no smallint, value text)
  loop
    select * into v_round
    from public.rounds
    where id = change.round_id and session_id = p_session_id;

    if v_round.id is null then
      raise exception 'That round is not part of this session'
        using errcode = 'foreign_key_violation';
    end if;
    if change.end_no not between 1 and v_round.planned_ends then
      raise exception 'End % is outside this round''s % ends',
        change.end_no, v_round.planned_ends
        using errcode = 'check_violation';
    end if;

    v_end_id := null;
    select id into v_end_id
    from public.ends
    where round_id = change.round_id and end_no = change.end_no;

    if change.value is null then
      if v_end_id is not null then
        delete from public.arrows
        where end_id = v_end_id and arrow_no = change.arrow_no;
      end if;
    else
      if v_end_id is null then
        insert into public.ends (round_id, end_no)
        values (change.round_id, change.end_no)
        returning id into v_end_id;
      end if;
      insert into public.arrows (end_id, arrow_no, value)
      values (v_end_id, change.arrow_no, change.value)
      on conflict (end_id, arrow_no) do update
        set value = excluded.value
        where public.arrows.value is distinct from excluded.value;
    end if;
  end loop;

  delete from public.ends e
  using public.rounds r
  where e.round_id = r.id
    and r.session_id = p_session_id
    and not exists (select 1 from public.arrows a where a.end_id = e.id);

  -- Renumber only when a removed end left a gap. Two steps, because the
  -- (round_id, end_no) key must stay unique after every row update.
  if exists (
    select 1
    from public.ends e
    join public.rounds r on r.id = e.round_id
    where r.session_id = p_session_id
    group by e.round_id
    having max(e.end_no) <> count(*)
  ) then
    update public.ends e
    set end_no = e.end_no + 1000
    from public.rounds r
    where e.round_id = r.id and r.session_id = p_session_id;

    update public.ends e
    set end_no = numbered.position
    from (
      select e2.id, row_number() over (partition by e2.round_id order by e2.end_no) as position
      from public.ends e2
      join public.rounds r on r.id = e2.round_id
      where r.session_id = p_session_id
    ) numbered
    where e.id = numbered.id;
  end if;
end;
$$;

revoke all on function public.admin_save_scores(uuid, jsonb, text) from anon, public;
grant execute on function public.admin_save_scores(uuid, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Session list: count corrections by session, including removed arrows
-- ---------------------------------------------------------------------------

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
) corrections;
