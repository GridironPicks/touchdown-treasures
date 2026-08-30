-- 1. Postseason slate type
ALTER TYPE public.season_type ADD VALUE IF NOT EXISTS 'post';

-- 2. Commissioner-visible alert history
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;

CREATE POLICY "Managers read their own alerts"
ON public.notification_log FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "League owners read alerts for their members"
ON public.notification_log FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.league_memberships lm
  JOIN public.leagues l ON l.id = lm.league_id
  WHERE lm.user_id = notification_log.user_id
    AND l.owner_id = auth.uid()
));

-- 3. Lock down internal-only routines
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_pick_lock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_survivor_lock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_fantasy_lock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_league_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_join_code() FROM PUBLIC, anon, authenticated;

-- Signed-out visitors never need these
REVOKE EXECUTE ON FUNCTION public.create_league(text, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_league_by_code(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.regenerate_join_code(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_league_ownership(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_league_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_league_owner(uuid, uuid) FROM anon;

-- 4. Playoff bracket
CREATE TABLE public.bracket_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season integer NOT NULL,
  champion text NOT NULL,
  tiebreak_total integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id, season)
);

CREATE TABLE public.bracket_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.bracket_entries(id) ON DELETE CASCADE,
  round integer NOT NULL CHECK (round BETWEEN 1 AND 4),
  slot integer NOT NULL CHECK (slot BETWEEN 0 AND 5),
  team text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, round, slot)
);

CREATE INDEX bracket_picks_entry_idx ON public.bracket_picks(entry_id);

GRANT SELECT, INSERT ON public.bracket_entries TO authenticated;
GRANT SELECT, INSERT ON public.bracket_picks TO authenticated;
GRANT ALL ON public.bracket_entries TO service_role;
GRANT ALL ON public.bracket_picks TO service_role;

ALTER TABLE public.bracket_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read brackets in their league"
ON public.bracket_entries FOR SELECT TO authenticated
USING (public.is_league_member(league_id, auth.uid()));

CREATE POLICY "Members create their own bracket"
ON public.bracket_entries FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_league_member(league_id, auth.uid()));

CREATE POLICY "Members read bracket picks in their league"
ON public.bracket_picks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bracket_entries be
  WHERE be.id = bracket_picks.entry_id
    AND public.is_league_member(be.league_id, auth.uid())
));

CREATE POLICY "Members create their own bracket picks"
ON public.bracket_picks FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bracket_entries be
  WHERE be.id = bracket_picks.entry_id AND be.user_id = auth.uid()
));

-- Bracket lock: one shot, final, closed at the first playoff kickoff
CREATE OR REPLACE FUNCTION public.enforce_bracket_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _season integer; _first timestamptz;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Brackets are final once submitted';
  END IF;

  IF TG_TABLE_NAME = 'bracket_entries' THEN
    _season := NEW.season;
  ELSE
    SELECT be.season INTO _season FROM public.bracket_entries be WHERE be.id = NEW.entry_id;
  END IF;

  SELECT min(g.kickoff) INTO _first
  FROM public.games g
  WHERE g.season = _season AND g.season_type = 'post'::public.season_type;

  IF _first IS NOT NULL AND now() >= _first THEN
    RAISE EXCEPTION 'Brackets are locked — the playoffs have kicked off';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_bracket_lock() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER bracket_entries_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.bracket_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_bracket_lock();

CREATE TRIGGER bracket_picks_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.bracket_picks
FOR EACH ROW EXECUTE FUNCTION public.enforce_bracket_lock();