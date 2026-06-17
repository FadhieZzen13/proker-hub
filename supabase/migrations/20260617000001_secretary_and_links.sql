-- Centralize System round 3.
-- 1. New 'Secretary' position — curates the shared Links page.
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_position_check;
ALTER TABLE public.members
  ADD CONSTRAINT members_position_check
  CHECK (position IN ('Kadep', 'Wakadep', 'Staff', 'Secretary'));

-- 2. Shared Links page. Everyone can view non-restricted links; the Secretary +
--    Admin edit them; restricted links are shown only to Secretary + BPH + Admin
--    (visibility is UI-enforced, like the rest of the app's role gating).
CREATE TABLE IF NOT EXISTS public.app_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  restricted BOOLEAN NOT NULL DEFAULT false,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view app_links" ON public.app_links;
DROP POLICY IF EXISTS "Anyone can insert app_links" ON public.app_links;
DROP POLICY IF EXISTS "Anyone can update app_links" ON public.app_links;
DROP POLICY IF EXISTS "Anyone can delete app_links" ON public.app_links;
CREATE POLICY "Anyone can view app_links" ON public.app_links FOR SELECT USING (true);
CREATE POLICY "Anyone can insert app_links" ON public.app_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update app_links" ON public.app_links FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete app_links" ON public.app_links FOR DELETE USING (true);
