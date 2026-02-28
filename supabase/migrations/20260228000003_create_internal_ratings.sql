-- Create proker internal ratings table
-- Allows divisions to rate each other's prokers with a footmark
CREATE TABLE IF NOT EXISTS public.proker_internal_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  rater_name TEXT NOT NULL,           -- e.g. "Haryo"
  rater_division TEXT NOT NULL,       -- e.g. "AKSI"
  overall_rating NUMERIC(3,1) NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proker_internal_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view internal ratings" ON public.proker_internal_ratings FOR SELECT USING (true);
CREATE POLICY "Anyone can create internal ratings" ON public.proker_internal_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete internal ratings" ON public.proker_internal_ratings FOR DELETE USING (true);

-- Index for proker lookups
CREATE INDEX IF NOT EXISTS proker_internal_ratings_proker_id_idx ON public.proker_internal_ratings(proker_id);
