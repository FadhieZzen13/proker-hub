-- Meetings table with scheduled and complete phases
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  division TEXT NOT NULL CHECK (division IN ('BPH', 'AKSI', 'POSDM', 'ROMAS', 'HUMAS', 'DANUS', 'SEBURA', 'MEDIFO')),
  topic TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  planned_participants INTEGER NOT NULL DEFAULT 0 CHECK (planned_participants >= 0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'complete')),
  actual_participants INTEGER CHECK (actual_participants IS NULL OR actual_participants >= 0),
  meeting_notes TEXT,
  created_by_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view meetings" ON public.meetings FOR SELECT USING (true);
CREATE POLICY "Anyone can create meetings" ON public.meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update meetings" ON public.meetings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete meetings" ON public.meetings FOR DELETE USING (true);

DROP TRIGGER IF EXISTS update_meetings_updated_at ON public.meetings;
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
