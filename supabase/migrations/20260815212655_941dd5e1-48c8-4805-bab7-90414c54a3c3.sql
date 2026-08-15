CREATE OR REPLACE FUNCTION public.is_league_member(_league_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.league_memberships lm WHERE lm.league_id = _league_id AND lm.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_league_owner(_league_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.leagues l WHERE l.id = _league_id AND l.owner_id = _user_id)
$$;

GRANT EXECUTE ON FUNCTION public.is_league_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_league_owner(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "League members can read their leagues" ON public.leagues;
CREATE POLICY "League members can read their leagues" ON public.leagues
FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_league_member(id, auth.uid()));

DROP POLICY IF EXISTS "League owners can read memberships of their league" ON public.league_memberships;
CREATE POLICY "League owners can read memberships of their league" ON public.league_memberships
FOR SELECT TO authenticated
USING (public.is_league_owner(league_id, auth.uid()));

DROP POLICY IF EXISTS "League owners can update memberships" ON public.league_memberships;
CREATE POLICY "League owners can update memberships" ON public.league_memberships
FOR UPDATE TO authenticated
USING (public.is_league_owner(league_id, auth.uid()))
WITH CHECK (public.is_league_owner(league_id, auth.uid()));

DROP POLICY IF EXISTS "Users can leave a league or owners can remove members" ON public.league_memberships;
CREATE POLICY "Users can leave a league or owners can remove members" ON public.league_memberships
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_league_owner(league_id, auth.uid()));