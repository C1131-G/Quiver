-- Superseded by public.admin_save_scores, which edits any number of arrows
-- in one transaction with one reason. Neither app calls correct_arrow any
-- more, and an unused callable function is attack surface.
drop function public.correct_arrow(uuid, text, text);
