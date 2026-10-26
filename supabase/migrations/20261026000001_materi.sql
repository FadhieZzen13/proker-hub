-- Materi library for the public site: alumni / kating submit a file or a link, it waits in the
-- dashboard until an admin or AKSI member approves it, then it shows on /materi.
--
-- Writes only go through the `materi` Edge Function (service role). The public can read
-- approved rows, and only the columns the site shows, through public_materi.
CREATE TABLE IF NOT EXISTS public.materi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  faculty text NOT NULL DEFAULT '',
  course text NOT NULL DEFAULT '',
  category text NOT NULL,
  uploader_name text NOT NULL,
  intake text NOT NULL DEFAULT '',
  link_url text,
  file_path text,
  file_name text,
  file_size bigint,
  uploaded boolean NOT NULL DEFAULT false, -- file has actually landed in storage (links: true)
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  CHECK ((link_url IS NULL) <> (file_path IS NULL))
);

CREATE INDEX IF NOT EXISTS materi_status_idx ON public.materi (status, created_at DESC);

ALTER TABLE public.materi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.materi FROM anon, authenticated;
GRANT SELECT (id, title, faculty, course, category, uploader_name, intake, link_url, file_path, file_name, file_size, status, reviewed_at)
  ON public.materi TO anon, authenticated;
DROP POLICY IF EXISTS "approved materi is public" ON public.materi;
CREATE POLICY "approved materi is public" ON public.materi FOR SELECT TO anon, authenticated USING (status = 'approved');

CREATE OR REPLACE VIEW public.public_materi WITH (security_invoker = true) AS
  SELECT id, title, faculty, course, category, uploader_name, intake, link_url, file_path, file_name, file_size, reviewed_at AS approved_at
  FROM public.materi
  WHERE status = 'approved';
GRANT SELECT ON public.public_materi TO anon, authenticated;

-- Files: public to read (paths are random), no upload policies. The Edge Function hands out
-- one-time signed upload URLs; the bucket enforces size and type.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('materi', 'materi', true, 20971520, ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
