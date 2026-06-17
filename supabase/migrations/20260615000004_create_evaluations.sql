-- Centralize System: Evaluations (Penilaian Kinerja).
--   type 'best_member'  -> a Kadep/Wakadep scores a Staff in their own division
--   type 'best_leader'  -> a BPH member scores a Kadep/Wakadep
-- Three criteria (1-5 each): discipline, contribution, responsibility.
-- Results are aggregated per (type, period, target) and shown only to
-- POSDM Kadep/Wakadep + BPH (UI-enforced).
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('best_member', 'best_leader')),
  period TEXT NOT NULL,                          -- 'YYYY-MM'
  rater_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  rater_name TEXT NOT NULL DEFAULT '',
  rater_email TEXT NOT NULL DEFAULT '',
  rater_division TEXT NOT NULL DEFAULT '',
  target_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  target_name TEXT NOT NULL DEFAULT '',
  target_division TEXT NOT NULL DEFAULT '',
  score_discipline INTEGER NOT NULL CHECK (score_discipline BETWEEN 1 AND 5),
  score_contribution INTEGER NOT NULL CHECK (score_contribution BETWEEN 1 AND 5),
  score_responsibility INTEGER NOT NULL CHECK (score_responsibility BETWEEN 1 AND 5),
  reason TEXT NOT NULL DEFAULT '',
  future_eval TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_type_period ON public.evaluations(type, period);
CREATE INDEX IF NOT EXISTS idx_evaluations_target ON public.evaluations(target_member_id);

-- A Kadep nominates exactly 1 best member per period (one submission per rater).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_best_member_per_rater_period
  ON public.evaluations(period, rater_member_id)
  WHERE type = 'best_member' AND rater_member_id IS NOT NULL;

-- A BPH member scores each Kadep/Wakadep at most once per period.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_best_leader_per_rater_target_period
  ON public.evaluations(period, rater_member_id, target_member_id)
  WHERE type = 'best_leader' AND rater_member_id IS NOT NULL AND target_member_id IS NOT NULL;

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Anyone can insert evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Anyone can update evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Anyone can delete evaluations" ON public.evaluations;
CREATE POLICY "Anyone can view evaluations" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert evaluations" ON public.evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update evaluations" ON public.evaluations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete evaluations" ON public.evaluations FOR DELETE USING (true);
