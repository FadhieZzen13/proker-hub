-- Add 'training' to berkelanjutan_category CHECK constraint
ALTER TABLE public.prokers
  DROP CONSTRAINT IF EXISTS prokers_berkelanjutan_category_check;

ALTER TABLE public.prokers
  ADD CONSTRAINT prokers_berkelanjutan_category_check
    CHECK (berkelanjutan_category IN ('finance','response','outreach','people','training'));

-- Add training/seminar columns to berkelanjutan_entries
ALTER TABLE public.berkelanjutan_entries
  ADD COLUMN IF NOT EXISTS topic              TEXT,
  ADD COLUMN IF NOT EXISTS speaker            TEXT,
  ADD COLUMN IF NOT EXISTS target_audience    INTEGER,
  ADD COLUMN IF NOT EXISTS actual_audience    INTEGER,
  ADD COLUMN IF NOT EXISTS duration_minutes   INTEGER,
  ADD COLUMN IF NOT EXISTS satisfaction_score NUMERIC,
  ADD COLUMN IF NOT EXISTS training_notes     TEXT;
