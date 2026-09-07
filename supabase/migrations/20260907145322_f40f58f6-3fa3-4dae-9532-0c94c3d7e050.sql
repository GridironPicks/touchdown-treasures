UPDATE public.league_memberships m
SET role = 'owner'
FROM public.leagues l
WHERE m.league_id = l.id
  AND m.user_id = l.owner_id
  AND m.role <> 'owner';