-- Public website: a page per proker (/proker/:id on ppi-upm-site).
--
-- Extra page content lives in site_prokers.details (JSONB), written only through
-- site_admin_set_proker_details (website-admin password, like the other site_admin_* functions):
--   { "cover": url, "body": text, "gallery": [url, ...], "location": text, "link": url, "linkLabel": text }

ALTER TABLE public.site_prokers ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.site_admin_set_proker_details(secret TEXT, p_proker_id UUID, p_details JSONB)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.site_admin_ok(secret) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(coalesce(p_details, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'details must be an object' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.site_prokers (proker_id, details, updated_at)
  VALUES (p_proker_id, coalesce(p_details, '{}'::jsonb), now())
  ON CONFLICT (proker_id) DO UPDATE SET details = EXCLUDED.details, updated_at = now();
END $$;

GRANT EXECUTE ON FUNCTION public.site_admin_set_proker_details(TEXT, UUID, JSONB) TO anon, authenticated;

-- Same view as before, plus the page details (new columns go last).
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
  END AS status,
  sp.details
FROM public.prokers p
JOIN public.site_prokers sp ON sp.proker_id = p.id
WHERE sp.published AND p.lapak_ready;

GRANT SELECT ON public.public_prokers TO anon, authenticated;
