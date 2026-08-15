DROP POLICY IF EXISTS picks_select ON public.picks;
CREATE POLICY picks_select_own_or_started ON public.picks
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = picks.game_id AND now() >= g.kickoff
  )
);

DROP POLICY IF EXISTS tb_select ON public.tiebreakers;
CREATE POLICY tb_select_own_or_started ON public.tiebreakers
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.season = tiebreakers.season
      AND g.season_type = tiebreakers.season_type
      AND g.week = tiebreakers.week
      AND now() >= g.kickoff
  )
);