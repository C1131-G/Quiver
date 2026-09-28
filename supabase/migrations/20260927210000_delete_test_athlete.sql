-- Requested one-off cleanup: permanently remove a test athlete and every
-- session recorded against them. Sessions cascade to rounds, ends, arrows
-- and arrow_corrections; the athlete row is deleted last.

delete from public.sessions
where athlete_id = 'cb1e6af3-8cf7-40d2-b1c4-5113f54b48d7';

delete from public.athletes
where id = 'cb1e6af3-8cf7-40d2-b1c4-5113f54b48d7';
