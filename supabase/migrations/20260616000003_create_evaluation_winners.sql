-- Centralize System: manually-chosen evaluation winners.
-- POSDM Kadep/Wakadep + BPH review all submissions for a month (the "Entries"
-- view) and pick one winner per category. Auto-aggregated scores stay available
-- as guidance, but the winner here is a deliberate human choice.
CREATE TABLE IF NOT EXISTS public.evaluation_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period TEXT NOT NULL,                       -- 'YYYY-MM'
  category TEXT NOT NULL CHECK (category IN ('best_member', 'best_kadep', 'best_wakadep')),
  winner_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  winner_name TEXT NOT NULL DEFAULT '',
  winner_division TEXT NOT NULL DEFAULT '',
  chosen_by_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  chosen_by_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exactly one winner per category per month (upsert target).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_eval_winner_period_category
  ON public.evaluation_winners(period, category);

ALTER TABLE public.evaluation_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view evaluation_winners" ON public.evaluation_winners;
DROP POLICY IF EXISTS "Anyone can insert evaluation_winners" ON public.evaluation_winners;
DROP POLICY IF EXISTS "Anyone can update evaluation_winners" ON public.evaluation_winners;
DROP POLICY IF EXISTS "Anyone can delete evaluation_winners" ON public.evaluation_winners;
CREATE POLICY "Anyone can view evaluation_winners" ON public.evaluation_winners FOR SELECT USING (true);
CREATE POLICY "Anyone can insert evaluation_winners" ON public.evaluation_winners FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update evaluation_winners" ON public.evaluation_winners FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete evaluation_winners" ON public.evaluation_winners FOR DELETE USING (true);
