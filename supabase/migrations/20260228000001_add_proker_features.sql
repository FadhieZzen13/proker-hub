-- Add collaboration divisions support (array of additional division names)
ALTER TABLE public.prokers ADD COLUMN IF NOT EXISTS collab_divisions TEXT[] DEFAULT '{}';

-- Add berkelanjutan (ongoing) proker support
ALTER TABLE public.prokers ADD COLUMN IF NOT EXISTS is_berkelanjutan BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.prokers ADD COLUMN IF NOT EXISTS berkelanjutan_notes TEXT;

-- Individual analytics columns were already added in 20260220100000
-- Ensure they exist (idempotent)
ALTER TABLE public.prokers ADD COLUMN IF NOT EXISTS promotion_data JSONB DEFAULT '{}';
ALTER TABLE public.prokers ADD COLUMN IF NOT EXISTS engagement_data JSONB DEFAULT '{}';
ALTER TABLE public.prokers ADD COLUMN IF NOT EXISTS rating_data JSONB DEFAULT '{}';

-- Remove overly restrictive division CHECK constraint so collab works correctly
-- (primary division is still one of the listed values)
ALTER TABLE public.prokers DROP CONSTRAINT IF EXISTS prokers_division_check;
ALTER TABLE public.prokers ADD CONSTRAINT prokers_division_check
  CHECK (division IN ('BPH', 'AKSI', 'POSDM', 'ROMAS', 'HUMAS', 'DANUS', 'SEBURA', 'MEDIFO'));
