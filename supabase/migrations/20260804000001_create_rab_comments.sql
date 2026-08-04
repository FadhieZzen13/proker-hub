-- RAB (budget) review comments.
-- The divisions running a proker own their RAB rows; the Bendahara oversees
-- budgets by commenting on them rather than editing. This table backs that
-- review thread. Mirrors the shape of public.ongoing_comments.
CREATE TABLE IF NOT EXISTS public.lapak_rab_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  -- Nullable: NULL is a comment on the RAB as a whole. Reserved so per-line
  -- comments become a UI change later rather than another migration.
  rab_id UUID REFERENCES public.lapak_rab(id) ON DELETE CASCADE,
  commenter_name TEXT NOT NULL,
  commenter_division TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lapak_rab_comments_proker_id_idx ON public.lapak_rab_comments(proker_id);
CREATE INDEX IF NOT EXISTS lapak_rab_comments_rab_id_idx ON public.lapak_rab_comments(rab_id);
CREATE INDEX IF NOT EXISTS lapak_rab_comments_created_at_idx ON public.lapak_rab_comments(created_at DESC);

ALTER TABLE public.lapak_rab_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lapak_rab_comments_select" ON public.lapak_rab_comments;
DROP POLICY IF EXISTS "lapak_rab_comments_insert" ON public.lapak_rab_comments;
DROP POLICY IF EXISTS "lapak_rab_comments_update" ON public.lapak_rab_comments;
DROP POLICY IF EXISTS "lapak_rab_comments_delete" ON public.lapak_rab_comments;
CREATE POLICY "lapak_rab_comments_select" ON public.lapak_rab_comments FOR SELECT USING (true);
CREATE POLICY "lapak_rab_comments_insert" ON public.lapak_rab_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "lapak_rab_comments_update" ON public.lapak_rab_comments FOR UPDATE USING (true);
CREATE POLICY "lapak_rab_comments_delete" ON public.lapak_rab_comments FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_lapak_rab_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lapak_rab_comments_updated_at ON public.lapak_rab_comments;
CREATE TRIGGER trg_lapak_rab_comments_updated_at
BEFORE UPDATE ON public.lapak_rab_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_lapak_rab_comments_updated_at();
