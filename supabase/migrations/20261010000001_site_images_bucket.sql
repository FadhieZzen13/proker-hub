-- Storage for images uploaded from the dashboard's Public Website page
-- (Kabinet image, division photos, latest-update images, member photos).
--
-- Public bucket: anyone can VIEW the files (the public site needs that).
-- No upload policies: anon cannot upload. Admins upload through the `site-upload`
-- Edge Function, which checks the website-admin password and hands out a one-time
-- signed upload URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-images', 'site-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
