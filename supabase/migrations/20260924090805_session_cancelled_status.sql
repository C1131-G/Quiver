-- A scorer can call off a session that was already sent from QuiverScore.
-- It keeps its arrows for the record, but no statistics count it.
--
-- On its own because a new enum value cannot be used in the transaction
-- that adds it; 20260924090813_scorer_session_rules uses it.
alter type public.session_status add value if not exists 'cancelled';
