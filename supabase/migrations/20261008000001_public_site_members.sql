  -- Public website: member cards on division pages (photo, name, batch, faculty).
  -- Requires 20261007000001_public_site.sql. Same model: anon can only READ the
  -- site_* table; changes go through a password-checked function.
  
  CREATE TABLE IF NOT EXISTS public.site_members (
    member_id UUID PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
    visible BOOLEAN NOT NULL DEFAULT true,
    photo_url TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.site_members ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "site_members_read" ON public.site_members;
  CREATE POLICY "site_members_read" ON public.site_members FOR SELECT USING (true);
  
  CREATE OR REPLACE FUNCTION public.site_admin_set_member(
    secret TEXT, p_member_id UUID, p_visible BOOLEAN, p_photo_url TEXT
  )
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
  BEGIN
    IF NOT public.site_admin_ok(secret) THEN
      RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.site_members (member_id, visible, photo_url, updated_at)
    VALUES (p_member_id, p_visible, coalesce(p_photo_url, ''), now())
    ON CONFLICT (member_id) DO UPDATE SET
      visible = EXCLUDED.visible,
      photo_url = EXCLUDED.photo_url,
      updated_at = now();
  END $$;
  GRANT EXECUTE ON FUNCTION public.site_admin_set_member(TEXT, UUID, BOOLEAN, TEXT) TO anon, authenticated;
  
  -- Only public-safe columns: no phone, birth date or password hash.
  -- Members are shown unless an admin hides them; the site also has a global on/off toggle.
  CREATE OR REPLACE VIEW public.public_members WITH (security_invoker = true) AS
  SELECT
    m.id,
    m.name,
    m.division,
    m.position,
    m.intake,
    m.faculty,
    coalesce(sm.photo_url, '') AS photo_url
  FROM public.members m
  LEFT JOIN public.site_members sm ON sm.member_id = m.id
  WHERE coalesce(sm.visible, true);
  
  GRANT SELECT ON public.public_members TO anon, authenticated;
