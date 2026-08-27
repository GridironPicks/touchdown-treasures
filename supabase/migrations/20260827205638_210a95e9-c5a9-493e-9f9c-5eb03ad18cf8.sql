CREATE TABLE public.league_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  decided_at timestamp with time zone,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (league_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_join_requests TO authenticated;
GRANT ALL ON public.league_join_requests TO service_role;

ALTER TABLE public.league_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own join requests"
  ON public.league_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users create their own join requests"
  ON public.league_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners read join requests for their league"
  ON public.league_join_requests FOR SELECT TO authenticated
  USING (public.is_league_owner(league_id, auth.uid()));

CREATE POLICY "Owners update join requests for their league"
  ON public.league_join_requests FOR UPDATE TO authenticated
  USING (public.is_league_owner(league_id, auth.uid()))
  WITH CHECK (public.is_league_owner(league_id, auth.uid()));

CREATE POLICY "Owners delete join requests for their league"
  ON public.league_join_requests FOR DELETE TO authenticated
  USING (public.is_league_owner(league_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_league_join_requests_updated_at
  BEFORE UPDATE ON public.league_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;