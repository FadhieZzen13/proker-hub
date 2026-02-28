-- Add berkelanjutan_category to prokers
ALTER TABLE public.prokers
  ADD COLUMN IF NOT EXISTS berkelanjutan_category TEXT
    CHECK (berkelanjutan_category IN ('finance','response','outreach','people'));

-- Berkelanjutan tracking entries (periodic log entries per proker)
CREATE TABLE IF NOT EXISTS public.berkelanjutan_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proker_id     UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  -- finance (Danus)
  targeted_income        NUMERIC,
  actual_income          NUMERIC,
  -- response (Humas)
  messages_per_day       NUMERIC,
  messages_replied_per_day NUMERIC,
  response_time_minutes  NUMERIC,
  -- outreach (social media)
  posts_count            INTEGER,
  total_reach            INTEGER,
  new_followers          INTEGER,
  content_notes          TEXT,
  -- people (Romas)
  meals_bought           INTEGER,
  meals_given_out        INTEGER,
  attendees              INTEGER,
  location               TEXT,
  -- shared
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS berkelanjutan_entries_proker_id_idx ON public.berkelanjutan_entries(proker_id);
CREATE INDEX IF NOT EXISTS berkelanjutan_entries_date_idx ON public.berkelanjutan_entries(entry_date DESC);

-- RLS
ALTER TABLE public.berkelanjutan_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "berkelanjutan_select" ON public.berkelanjutan_entries FOR SELECT USING (true);
CREATE POLICY "berkelanjutan_insert" ON public.berkelanjutan_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "berkelanjutan_update" ON public.berkelanjutan_entries FOR UPDATE USING (true);
CREATE POLICY "berkelanjutan_delete" ON public.berkelanjutan_entries FOR DELETE USING (true);
