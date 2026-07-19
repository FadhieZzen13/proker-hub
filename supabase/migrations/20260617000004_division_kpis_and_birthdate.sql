-- 6-revision plan: F3 (Division KPI targets) + F6 (member birth dates).
-- 1. Add 'Bendahara' to the members position check (F1).
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_position_check;
ALTER TABLE public.members
  ADD CONSTRAINT members_position_check
  CHECK (position IN ('Kadep', 'Wakadep', 'Staff', 'Secretary', 'Bendahara'));

-- 2. Birth date for birthday notifications (F6). Nullable — existing members
--    are prompted to add it on their profile; optional field.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 3. Division KPI targets (F3). Per-division measurable targets shown on the
--    dashboard. proker_id is nullable so a KPI may be division-wide rather than
--    tied to a single proker.
CREATE TABLE IF NOT EXISTS public.division_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  division TEXT NOT NULL CHECK (division IN ('BPH', 'AKSI', 'POSDM', 'ROMAS', 'HUMAS', 'DANUS', 'SEBURA', 'MEDIFO')),
  proker_id UUID,
  label TEXT NOT NULL DEFAULT '',
  target NUMERIC NOT NULL DEFAULT 0,
  current NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.division_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view division_kpis" ON public.division_kpis;
DROP POLICY IF EXISTS "Anyone can insert division_kpis" ON public.division_kpis;
DROP POLICY IF EXISTS "Anyone can update division_kpis" ON public.division_kpis;
DROP POLICY IF EXISTS "Anyone can delete division_kpis" ON public.division_kpis;
CREATE POLICY "Anyone can view division_kpis" ON public.division_kpis FOR SELECT USING (true);
CREATE POLICY "Anyone can insert division_kpis" ON public.division_kpis FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update division_kpis" ON public.division_kpis FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete division_kpis" ON public.division_kpis FOR DELETE USING (true);
