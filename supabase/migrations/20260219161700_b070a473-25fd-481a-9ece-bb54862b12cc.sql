
-- Create prokers table
CREATE TABLE public.prokers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_proker TEXT NOT NULL,
  division TEXT NOT NULL CHECK (division IN ('BPH', 'AKSI', 'POSDM', 'ROMAS', 'HUMAS', 'DANUS', 'SEBURA', 'MEDIFO')),
  tanggal DATE NOT NULL,
  target_peserta INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('Internal', 'External')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress IN (0, 25, 50, 75, 100)),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'complete')),
  -- Report fields (nullable, filled on completion)
  actual_peserta INTEGER,
  success_factors TEXT,
  improvements TEXT,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prokers ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required for this org tool)
CREATE POLICY "Anyone can view prokers" ON public.prokers FOR SELECT USING (true);
CREATE POLICY "Anyone can create prokers" ON public.prokers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update prokers" ON public.prokers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete prokers" ON public.prokers FOR DELETE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_prokers_updated_at
BEFORE UPDATE ON public.prokers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
