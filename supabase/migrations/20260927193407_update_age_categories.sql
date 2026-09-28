-- Replace the age-category lookups with the federation's exact age-group list.
-- Categories not in the new list are only removed if no athlete or session
-- still references them; a reference blocks the delete instead of orphaning data.

delete from public.categories
where name not in (
  'Mini (U13)',
  'Mini Sub Junior (U15)',
  'Sub Junior (U17)',
  'Junior (U19)',
  'Senior (19+)',
  'Master (45+)'
)
and not exists (select 1 from public.athletes where athletes.category_id = categories.id)
and not exists (select 1 from public.sessions where sessions.category_id = categories.id);

insert into public.categories (name, sort_order) values
  ('Mini (U13)', 1),
  ('Mini Sub Junior (U15)', 2),
  ('Sub Junior (U17)', 3),
  ('Junior (U19)', 4),
  ('Senior (19+)', 5),
  ('Master (45+)', 6)
on conflict (name) do update set sort_order = excluded.sort_order;
