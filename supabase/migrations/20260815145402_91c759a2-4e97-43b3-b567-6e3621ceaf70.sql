-- Cascade child rows when a league is deleted
ALTER TABLE public.league_memberships DROP CONSTRAINT IF EXISTS league_memberships_league_id_fkey;
ALTER TABLE public.league_memberships ADD CONSTRAINT league_memberships_league_id_fkey
  FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;

ALTER TABLE public.picks DROP CONSTRAINT IF EXISTS picks_league_id_fkey;
ALTER TABLE public.picks ADD CONSTRAINT picks_league_id_fkey
  FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;

ALTER TABLE public.survivor_picks DROP CONSTRAINT IF EXISTS survivor_picks_league_id_fkey;
ALTER TABLE public.survivor_picks ADD CONSTRAINT survivor_picks_league_id_fkey
  FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;

ALTER TABLE public.tiebreakers DROP CONSTRAINT IF EXISTS tiebreakers_league_id_fkey;
ALTER TABLE public.tiebreakers ADD CONSTRAINT tiebreakers_league_id_fkey
  FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_league_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_league_id_fkey
  FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;

-- Owners may delete their own non-global leagues
DROP POLICY IF EXISTS "League owners can delete their league" ON public.leagues;
CREATE POLICY "League owners can delete their league"
ON public.leagues FOR DELETE TO authenticated
USING (owner_id = auth.uid() AND is_global_pool = false);