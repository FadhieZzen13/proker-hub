-- Centralize System round 2.

-- 1. Custom ongoing (berkelanjutan) parameters.
--    prokers.custom_params: definition list [{key,label,type:'number'|'text'}]
--    berkelanjutan_entries.custom_data: per-entry values keyed by param key.
ALTER TABLE public.prokers
  ADD COLUMN IF NOT EXISTS custom_params JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.berkelanjutan_entries
  ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Split the leader assessment into Best Kadep and Best Wakadep.
--    Keep 'best_leader' allowed for any legacy rows; new submissions use the split types.
ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_type_check;
ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_type_check
  CHECK (type IN ('best_member', 'best_leader', 'best_kadep', 'best_wakadep'));

-- One score per BPH rater → target per period, for each split type.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_best_kadep_per_rater_target_period
  ON public.evaluations(period, rater_member_id, target_member_id)
  WHERE type = 'best_kadep' AND rater_member_id IS NOT NULL AND target_member_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_best_wakadep_per_rater_target_period
  ON public.evaluations(period, rater_member_id, target_member_id)
  WHERE type = 'best_wakadep' AND rater_member_id IS NOT NULL AND target_member_id IS NOT NULL;
