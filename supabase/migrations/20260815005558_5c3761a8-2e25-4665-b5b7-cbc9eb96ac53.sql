DROP TRIGGER IF EXISTS picks_require_paid ON public.picks;
DROP TRIGGER IF EXISTS tb_require_paid ON public.tiebreakers;
DROP FUNCTION IF EXISTS public.enforce_entry_paid();
DROP VIEW IF EXISTS public.weekly_results;
DROP TABLE IF EXISTS public.entries;