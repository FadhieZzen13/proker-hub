-- Add school visit detail fields for Humas/response ongoing entries
ALTER TABLE public.berkelanjutan_entries
  ADD COLUMN IF NOT EXISTS school_visited TEXT,
  ADD COLUMN IF NOT EXISTS participants_count INTEGER,
  ADD COLUMN IF NOT EXISTS ppi_members_attendance INTEGER,
  ADD COLUMN IF NOT EXISTS visit_datetime TIMESTAMPTZ;

-- Standalone comments for ongoing prokers (no rating required)
CREATE TABLE IF NOT EXISTS public.ongoing_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  commenter_name TEXT NOT NULL,
  commenter_division TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ongoing_comments_proker_id_idx ON public.ongoing_comments(proker_id);
CREATE INDEX IF NOT EXISTS ongoing_comments_created_at_idx ON public.ongoing_comments(created_at DESC);

ALTER TABLE public.ongoing_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ongoing_comments_select" ON public.ongoing_comments FOR SELECT USING (true);
CREATE POLICY "ongoing_comments_insert" ON public.ongoing_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "ongoing_comments_update" ON public.ongoing_comments FOR UPDATE USING (true);
CREATE POLICY "ongoing_comments_delete" ON public.ongoing_comments FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_ongoing_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ongoing_comments_updated_at ON public.ongoing_comments;
CREATE TRIGGER trg_ongoing_comments_updated_at
BEFORE UPDATE ON public.ongoing_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_ongoing_comments_updated_at();
