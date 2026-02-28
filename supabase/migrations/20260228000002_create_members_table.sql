-- Create members table (migrating from localStorage to Supabase)
CREATE TABLE IF NOT EXISTS public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  faculty TEXT NOT NULL,
  intake INTEGER NOT NULL,
  phone TEXT NOT NULL,
  division TEXT NOT NULL CHECK (division IN ('BPH', 'AKSI', 'POSDM', 'ROMAS', 'HUMAS', 'DANUS', 'SEBURA', 'MEDIFO')),
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Public policies (no auth required)
CREATE POLICY "Anyone can view members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Anyone can create members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update members" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete members" ON public.members FOR DELETE USING (true);
