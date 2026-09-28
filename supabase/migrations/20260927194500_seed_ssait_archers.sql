-- SSAIT archer roster import. Age category is derived from each archer's
-- age against the federation's age-group cutoffs (Mini U13, Mini Sub Junior
-- U15, Sub Junior U17, Junior U19, Senior 19+, Master 45+). Distance and
-- target face default to 70 m / 122 cm and can be edited per athlete in
-- Quiver Dashboard. Idempotent: safe to re-run.

insert into public.athletes (id_no, aai_no, full_name, gender, category_id, event_id, distance_id, target_face_id)
select
  v.id_no,
  v.aai_no,
  initcap(v.full_name),
  v.gender::public.gender,
  (select id from public.categories where name = c.category),
  (select id from public.events where name = v.event),
  (select id from public.distances where meters = 70),
  (select id from public.target_faces where name = '122 cm')
from (values
  ('SS1',  'O14551', 'TANMAY THAPA',         'male',   15, 'Recurve'),
  ('SS2',  'O976',   'JATIN GULATI',         'male',   14, 'Recurve'),
  ('SS3',  'O13829', 'YUGANK',               'male',   17, 'Recurve'),
  ('SS4',  'O9109',  'SURYANSH',             'male',   15, 'Recurve'),
  ('SS5',  null,     'PRIYANSHU',            'male',   15, 'Recurve'),
  ('SS6',  'O11569', 'ARYAN',                'male',   19, 'Recurve'),
  ('SS7',  null,     'E.SAI RADHA KRISHAN',  'male',   17, 'Compound'),
  ('SS8',  'O14805', 'RADHE SHYAM',          'male',   16, 'Compound'),
  ('SS9',  'O12665', 'KAVYA',                'female', 14, 'Compound'),
  ('SS10', 'O18642', 'MANASVI',              'female', 15, 'Recurve'),
  ('SS11', '7138',   'NIKITA',               'female', 18, 'Recurve'),
  ('SS12', 'O16099', 'PRAGYA SINGH',         'female', 12, 'Recurve'),
  ('SS13', '1695',   'AMRITA',               'female', 15, 'Recurve'),
  ('SS14', 'O15402', 'MANMEET',              'female', 14, 'Recurve'),
  ('SS15', 'O15392', 'ARSHDEEP',             'female', 14, 'Recurve'),
  ('SS16', '4378',   'SHWETA',               'female', 20, 'Recurve')
) as v (id_no, aai_no, full_name, gender, age, event)
cross join lateral (
  select case
    when v.age <= 12 then 'Mini (U13)'
    when v.age <= 14 then 'Mini Sub Junior (U15)'
    when v.age <= 16 then 'Sub Junior (U17)'
    when v.age <= 18 then 'Junior (U19)'
    when v.age <= 44 then 'Senior (19+)'
    else 'Master (45+)'
  end as category
) c
on conflict (id_no) do nothing;
