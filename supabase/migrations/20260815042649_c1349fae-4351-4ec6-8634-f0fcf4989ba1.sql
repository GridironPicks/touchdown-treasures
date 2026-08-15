REVOKE EXECUTE ON FUNCTION public.survivor_board(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.survivor_board(integer) TO authenticated;