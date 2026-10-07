-- Public website (ppi-upm-site) support.
--
-- The rest of this database is open to anon writes, so everything the public
-- site shows lives in its own tables that anon can only READ. Changes go
-- through site_admin_* functions, which check a website-admin password stored
-- as a bcrypt hash that anon cannot read.
--
-- After running this file, set the password once in the SQL editor:
--   select public.site_set_admin_password('<choose a strong password>');

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Per-proker publishing (separate from prokers, which anon can write).
CREATE TABLE IF NOT EXISTS public.site_prokers (
  proker_id UUID PRIMARY KEY REFERENCES public.prokers(id) ON DELETE CASCADE,
  published BOOLEAN NOT NULL DEFAULT false,
  public_title TEXT NOT NULL DEFAULT '',
  public_description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_prokers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_prokers_read" ON public.site_prokers;
CREATE POLICY "site_prokers_read" ON public.site_prokers FOR SELECT USING (true);

-- 2. Site-wide content (hero copy, about, visi/misi, contact, section toggles...).
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_settings_read" ON public.site_settings;
CREATE POLICY "site_settings_read" ON public.site_settings FOR SELECT USING (true);

-- 3. Website-admin password hash. RLS on with no policies = unreadable via the API.
CREATE TABLE IF NOT EXISTS public.site_admin_secret (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash TEXT NOT NULL
);
ALTER TABLE public.site_admin_secret ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_admin_secret FROM anon, authenticated;

-- Only callable from the SQL editor / service role.
CREATE OR REPLACE FUNCTION public.site_set_admin_password(new_password TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  INSERT INTO public.site_admin_secret (id, password_hash)
  VALUES (1, crypt(new_password, gen_salt('bf', 10)))
  ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
$$;
REVOKE EXECUTE ON FUNCTION public.site_set_admin_password(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.site_admin_ok(secret TEXT)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_admin_secret
    WHERE id = 1 AND password_hash = crypt(secret, password_hash)
  );
$$;

CREATE OR REPLACE FUNCTION public.site_admin_save_content(secret TEXT, new_content JSONB)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.site_admin_ok(secret) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.site_settings SET content = new_content, updated_at = now() WHERE id = 1;
END $$;

CREATE OR REPLACE FUNCTION public.site_admin_set_proker(
  secret TEXT, p_proker_id UUID, p_published BOOLEAN, p_title TEXT, p_description TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.site_admin_ok(secret) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.site_prokers (proker_id, published, public_title, public_description, updated_at)
  VALUES (p_proker_id, p_published, coalesce(p_title, ''), coalesce(p_description, ''), now())
  ON CONFLICT (proker_id) DO UPDATE SET
    published = EXCLUDED.published,
    public_title = EXCLUDED.public_title,
    public_description = EXCLUDED.public_description,
    updated_at = now();
END $$;

GRANT EXECUTE ON FUNCTION public.site_admin_ok(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.site_admin_save_content(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.site_admin_set_proker(TEXT, UUID, BOOLEAN, TEXT, TEXT) TO anon, authenticated;

-- 4. What the public site reads. Only safe columns, only published + non-draft prokers.
CREATE OR REPLACE VIEW public.public_prokers WITH (security_invoker = true) AS
SELECT
  p.id,
  coalesce(nullif(sp.public_title, ''), p.nama_proker) AS name,
  coalesce(nullif(sp.public_description, ''), '') AS description,
  p.division,
  coalesce(p.collab_divisions, '{}') AS collab_divisions,
  p.type,
  p.tanggal AS date,
  CASE
    WHEN p.status = 'complete' THEN 'done'
    WHEN p.tanggal > current_date THEN 'upcoming'
    ELSE 'ongoing'
  END AS status
FROM public.prokers p
JOIN public.site_prokers sp ON sp.proker_id = p.id
WHERE sp.published AND p.lapak_ready;

CREATE OR REPLACE VIEW public.public_pengurus WITH (security_invoker = true) AS
SELECT name, division, position
FROM public.members
WHERE position IN ('Kadep', 'Wakadep');

GRANT SELECT ON public.public_prokers, public.public_pengurus TO anon, authenticated;
