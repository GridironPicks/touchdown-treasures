CREATE TABLE public.league_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX league_rules_league_idx ON public.league_rules (league_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_rules TO authenticated;
GRANT ALL ON public.league_rules TO service_role;

ALTER TABLE public.league_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read league rules"
ON public.league_rules FOR SELECT TO authenticated
USING (public.is_league_member(league_id, auth.uid()));

CREATE POLICY "Owners can add league rules"
ON public.league_rules FOR INSERT TO authenticated
WITH CHECK (public.is_league_owner(league_id, auth.uid()));

CREATE POLICY "Owners can edit league rules"
ON public.league_rules FOR UPDATE TO authenticated
USING (public.is_league_owner(league_id, auth.uid()))
WITH CHECK (public.is_league_owner(league_id, auth.uid()));

CREATE POLICY "Owners can delete league rules"
ON public.league_rules FOR DELETE TO authenticated
USING (public.is_league_owner(league_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_league_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER league_rules_touch
BEFORE UPDATE ON public.league_rules
FOR EACH ROW EXECUTE FUNCTION public.touch_league_rules();