-- Centralize System: Personal Tracker — per-member, per-month org contribution.
-- Mirrors the "Monthly Tracker Kerjaan" sheet: each member logs work items per
-- month, each with a progress status.
CREATE TABLE IF NOT EXISTS public.tracker_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  division TEXT NOT NULL CHECK (division IN ('BPH', 'AKSI', 'POSDM', 'ROMAS', 'HUMAS', 'DANUS', 'SEBURA', 'MEDIFO')),
  month TEXT NOT NULL,                 -- 'YYYY-MM'
  description TEXT NOT NULL DEFAULT '',
  progress TEXT NOT NULL DEFAULT 'On Progress'
    CHECK (progress IN ('Not Started', 'On Progress', 'On Going', 'Negotiation', 'Cancelled', 'Done')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracker_member_month ON public.tracker_entries(member_id, month);
CREATE INDEX IF NOT EXISTS idx_tracker_division_month ON public.tracker_entries(division, month);

ALTER TABLE public.tracker_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view tracker_entries" ON public.tracker_entries;
DROP POLICY IF EXISTS "Anyone can insert tracker_entries" ON public.tracker_entries;
DROP POLICY IF EXISTS "Anyone can update tracker_entries" ON public.tracker_entries;
DROP POLICY IF EXISTS "Anyone can delete tracker_entries" ON public.tracker_entries;
CREATE POLICY "Anyone can view tracker_entries" ON public.tracker_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tracker_entries" ON public.tracker_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tracker_entries" ON public.tracker_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tracker_entries" ON public.tracker_entries FOR DELETE USING (true);

-- reuse the shared updated_at trigger function from the prokers migration
DROP TRIGGER IF EXISTS update_tracker_entries_updated_at ON public.tracker_entries;
CREATE TRIGGER update_tracker_entries_updated_at
BEFORE UPDATE ON public.tracker_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
