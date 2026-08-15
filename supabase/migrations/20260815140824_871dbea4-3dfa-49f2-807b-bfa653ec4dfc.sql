DROP POLICY IF EXISTS "Members can read memberships in their leagues" ON public.league_memberships;
CREATE POLICY "Users can read their own memberships"
  ON public.league_memberships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave a league or owners can remove members" ON public.league_memberships;
CREATE POLICY "Users can leave a league or owners can remove members"
  ON public.league_memberships
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.leagues
      WHERE leagues.id = league_memberships.league_id
        AND leagues.owner_id = auth.uid()
    )
  );