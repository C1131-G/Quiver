-- Local development seed. Runs on `supabase db reset` only — never in
-- production. Passwords here are for local use only.
--
--   admin   / admin12345   (desktop admin)
--   scorer1 / scorer12345  (QuiverScore)
--   scorer2 / scorer12345  (QuiverScore)

-- ---------------------------------------------------------------------------
-- Lookups
-- ---------------------------------------------------------------------------

insert into public.categories (name, sort_order) values
  ('Sub Junior (U15)', 1),
  ('Cadet (U18)', 2),
  ('Junior (U21)', 3),
  ('Senior', 4),
  ('Master (50+)', 5);

insert into public.events (name, sort_order) values
  ('Recurve', 1),
  ('Compound', 2),
  ('Indian Round', 3),
  ('Barebow', 4);

insert into public.distances (meters) values
  (18), (20), (25), (30), (40), (50), (60), (70), (90);

insert into public.target_faces (name, diameter_cm, lowest_score, sort_order) values
  ('122 cm', 122, 1, 1),
  ('80 cm', 80, 1, 2),
  ('80 cm 6-ring', 80, 5, 3),
  ('60 cm', 60, 1, 4),
  ('40 cm', 40, 1, 5),
  ('40 cm triple spot', 40, 6, 6);

-- ---------------------------------------------------------------------------
-- Accounts (login ID → <id>@quiver.local, matching the app's mapping)
-- ---------------------------------------------------------------------------

create function pg_temp.create_account(
  p_id uuid, p_login text, p_name text, p_role public.app_role, p_password text
) returns void language plpgsql as $$
declare
  email text := p_login || '@quiver.local';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token, phone_change, phone_change_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', p_role),
    '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), p_id, p_id::text, 'email',
    jsonb_build_object('sub', p_id::text, 'email', email, 'email_verified', true),
    now(), now(), now()
  );

  insert into public.profiles (id, login_id, full_name, role)
  values (p_id, p_login, p_name, p_role);
end;
$$;

select pg_temp.create_account('00000000-0000-4000-8000-000000000001', 'admin', 'Head Coach', 'admin', 'admin12345');
select pg_temp.create_account('00000000-0000-4000-8000-000000000002', 'scorer1', 'Range Scorer One', 'scorer', 'scorer12345');
select pg_temp.create_account('00000000-0000-4000-8000-000000000003', 'scorer2', 'Range Scorer Two', 'scorer', 'scorer12345');

-- ---------------------------------------------------------------------------
-- Athletes
-- ---------------------------------------------------------------------------

insert into public.athletes (id_no, aai_no, full_name, gender, category_id, event_id, distance_id, target_face_id)
select v.id_no, v.aai_no, v.full_name, v.gender::public.gender,
  (select id from public.categories where name = v.category),
  (select id from public.events where name = v.event),
  (select id from public.distances where meters = v.meters),
  (select id from public.target_faces where name = v.face)
from (values
  ('ATH-001', 'AAI-10231', 'Aarav Sharma',   'male',   'Senior',           'Recurve',      70, '122 cm'),
  ('ATH-002', 'AAI-10232', 'Diya Patel',     'female', 'Senior',           'Recurve',      70, '122 cm'),
  ('ATH-003', 'AAI-10233', 'Kabir Singh',    'male',   'Junior (U21)',     'Compound',     50, '80 cm 6-ring'),
  ('ATH-004', 'AAI-10234', 'Ananya Reddy',   'female', 'Junior (U21)',     'Compound',     50, '80 cm 6-ring'),
  ('ATH-005', 'AAI-10235', 'Vihaan Nair',    'male',   'Cadet (U18)',      'Recurve',      60, '122 cm'),
  ('ATH-006', 'AAI-10236', 'Ishita Das',     'female', 'Cadet (U18)',      'Recurve',      60, '122 cm'),
  ('ATH-007', 'AAI-10237', 'Arjun Mehta',    'male',   'Sub Junior (U15)', 'Indian Round', 30, '80 cm'),
  ('ATH-008', 'AAI-10238', 'Saanvi Iyer',    'female', 'Sub Junior (U15)', 'Indian Round', 30, '80 cm'),
  ('ATH-009', 'AAI-10239', 'Rohan Gupta',    'male',   'Senior',           'Compound',     50, '80 cm 6-ring'),
  ('ATH-010', null,        'Meera Joshi',    'female', 'Master (50+)',     'Barebow',      30, '122 cm')
) as v (id_no, aai_no, full_name, gender, category, event, meters, face);

-- ---------------------------------------------------------------------------
-- Six weeks of scored sessions
-- ---------------------------------------------------------------------------

-- Each athlete gets a skill level (their average arrow). Outdoor sessions
-- shoot their own distance and face in 6-arrow ends; indoor sessions shoot
-- 18 m on a 40 cm face (triple spot for compound) in 3-arrow ends.
do $$
declare
  athlete record;
  skill numeric;
  day date;
  is_indoor boolean;
  is_competition boolean;
  session_id uuid;
  round_id uuid;
  end_id uuid;
  round_count int;
  ends_per_round int;
  per_end int;
  face_id smallint;
  face_lowest smallint;
  dist_id smallint;
  raw numeric;
  arrow_value text;
  scorers uuid[] := array[
    '00000000-0000-4000-8000-000000000002'::uuid,
    '00000000-0000-4000-8000-000000000003'::uuid
  ];
begin
  perform setseed(0.42);

  for athlete in
    select a.*, e.name as event_name from public.athletes a
    join public.events e on e.id = a.event_id
    order by a.id_no
  loop
    skill := 7.4 + random() * 1.9;

    for day in select generate_series(current_date - 41, current_date - 1, interval '1 day')::date loop
      is_competition := extract(isodow from day) = 7 and random() < 0.5;
      continue when not is_competition and random() > 0.45;

      is_indoor := not is_competition and random() < 0.3;

      insert into public.sessions (
        athlete_id, scorer_id, session_type, venue, session_date, title,
        status, started_at, completed_at
      ) values (
        athlete.id,
        scorers[1 + floor(random() * 2)::int],
        case when is_competition then 'competition' else 'training' end::public.session_type,
        case when is_indoor then 'indoor' else 'outdoor' end::public.venue,
        day,
        case when is_competition then 'Weekend ranking round' else null end,
        'completed',
        day + time '07:30',
        day + time '09:45'
      ) returning id into session_id;

      if is_indoor then
        dist_id := (select id from public.distances where meters = 18);
        face_id := (select id from public.target_faces
                    where name = case when athlete.event_name = 'Compound'
                                      then '40 cm triple spot' else '40 cm' end);
        per_end := 3;
        ends_per_round := 10;
      else
        dist_id := athlete.distance_id;
        face_id := athlete.target_face_id;
        per_end := 6;
        ends_per_round := 6;
      end if;

      select lowest_score into face_lowest from public.target_faces where id = face_id;
      round_count := case when is_competition then 2 else 1 + floor(random() * 2)::int end;

      for r in 1..round_count loop
        insert into public.rounds (session_id, round_no, distance_id, target_face_id, arrows_per_end, planned_ends)
        values (session_id, r, dist_id, face_id, per_end, ends_per_round)
        returning id into round_id;

        for e in 1..ends_per_round loop
          insert into public.ends (round_id, end_no) values (round_id, e) returning id into end_id;

          for a in 1..per_end loop
            -- Roughly normal spread around the athlete's skill, a little
            -- tighter in competition.
            raw := skill + (random() + random() + random() - 1.5)
                   * case when is_competition then 1.9 else 2.2 end;
            arrow_value := case
              when raw >= 10.35 then 'X'
              when raw >= 9.5 then '10'
              when round(raw) < face_lowest or raw < 0.5 then 'M'
              else round(raw)::int::text
            end;
            insert into public.arrows (end_id, arrow_no, value) values (end_id, a, arrow_value);
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
end;
$$;

-- A few admin corrections, so the audit trail has history to show.
do $$
declare
  target record;
begin
  perform set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}',
    true
  );
  for target in
    select ar.id, ar.value from public.arrows ar
    where ar.value in ('8', '9') order by ar.id limit 3
  loop
    perform set_config('quiver.correction_reason', 'Scorer entered the wrong ring; confirmed on target', true);
    update public.arrows
    set value = (target.value::int + 1)::text
    where id = target.id;
  end loop;
end;
$$;
