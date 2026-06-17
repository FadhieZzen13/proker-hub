-- Centralize System round 3: Lapak Kerja proker timeline.
-- The timeline view combines Pembagian Tugas deadlines (read-only, from
-- lapak_tasks) with these manually-added milestones.
CREATE TABLE IF NOT EXISTS public.lapak_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  event_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lapak_timeline_proker ON public.lapak_timeline(proker_id);

ALTER TABLE public.lapak_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view lapak_timeline" ON public.lapak_timeline;
DROP POLICY IF EXISTS "Anyone can insert lapak_timeline" ON public.lapak_timeline;
DROP POLICY IF EXISTS "Anyone can update lapak_timeline" ON public.lapak_timeline;
DROP POLICY IF EXISTS "Anyone can delete lapak_timeline" ON public.lapak_timeline;
CREATE POLICY "Anyone can view lapak_timeline" ON public.lapak_timeline FOR SELECT USING (true);
CREATE POLICY "Anyone can insert lapak_timeline" ON public.lapak_timeline FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update lapak_timeline" ON public.lapak_timeline FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete lapak_timeline" ON public.lapak_timeline FOR DELETE USING (true);
