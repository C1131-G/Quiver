-- Reference lookups every athlete needs. Idempotent: safe to re-run.

insert into public.categories (name, sort_order) values
  ('Mini (U13)', 1),
  ('Mini Sub Junior (U15)', 2),
  ('Sub Junior (U17)', 3),
  ('Junior (U19)', 4),
  ('Senior (19+)', 5),
  ('Master (45+)', 6)
on conflict (name) do nothing;

insert into public.events (name, sort_order) values
  ('Recurve', 1),
  ('Compound', 2),
  ('Indian Round', 3),
  ('Barebow', 4)
on conflict (name) do nothing;

insert into public.distances (meters) values
  (18), (20), (25), (30), (40), (50), (60), (70), (90)
on conflict (meters) do nothing;

insert into public.target_faces (name, diameter_cm, lowest_score, sort_order) values
  ('122 cm', 122, 1, 1),
  ('80 cm', 80, 1, 2),
  ('80 cm 6-ring', 80, 5, 3),
  ('60 cm', 60, 1, 4),
  ('40 cm', 40, 1, 5),
  ('40 cm triple spot', 40, 6, 6)
on conflict (name) do nothing;
