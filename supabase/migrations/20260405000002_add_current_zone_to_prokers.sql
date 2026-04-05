-- Add selected current zone so users only manage one zone at a time
ALTER TABLE public.prokers
ADD COLUMN IF NOT EXISTS current_zone TEXT NOT NULL DEFAULT 'green';

ALTER TABLE public.prokers
DROP CONSTRAINT IF EXISTS prokers_current_zone_check;

ALTER TABLE public.prokers
ADD CONSTRAINT prokers_current_zone_check
CHECK (current_zone IN ('red', 'medium', 'green'));
