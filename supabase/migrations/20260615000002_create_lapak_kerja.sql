-- Centralize System: Lapak Kerja — a per-proker workspace.
-- Tabs: All Links, Pembagian Tugas, Juknis detail, RAB, Notes, Form Responses.
-- Each table references an existing proker (public.prokers) and cascades on delete.

-- 1. All Links
CREATE TABLE IF NOT EXISTS public.lapak_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Pembagian Tugas (task division)
CREATE TABLE IF NOT EXISTS public.lapak_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  tugas TEXT NOT NULL DEFAULT '',
  pic TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  deadline DATE,
  done BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Juknis detail (run-of-show)
CREATE TABLE IF NOT EXISTS public.lapak_juknis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  waktu TEXT NOT NULL DEFAULT '',
  durasi TEXT NOT NULL DEFAULT '',
  keterangan TEXT NOT NULL DEFAULT '',
  deskripsi TEXT NOT NULL DEFAULT '',
  pengisi TEXT NOT NULL DEFAULT '',
  penanggung_jawab TEXT NOT NULL DEFAULT '',
  properti TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. RAB (budget). total = quantity * harga_satuan, computed in the UI.
CREATE TABLE IF NOT EXISTS public.lapak_rab (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  kebutuhan TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 0,
  satuan TEXT NOT NULL DEFAULT '',
  harga_satuan NUMERIC NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Notes (one free-text note per proker)
CREATE TABLE IF NOT EXISTS public.lapak_notes (
  proker_id UUID NOT NULL PRIMARY KEY REFERENCES public.prokers(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Form Responses (spreadsheet-like). A set holds dynamic columns; rows hold keyed data.
CREATE TABLE IF NOT EXISTS public.lapak_response_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Form Responses',
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lapak_response_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.lapak_response_sets(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for proker-scoped lookups
CREATE INDEX IF NOT EXISTS idx_lapak_links_proker ON public.lapak_links(proker_id);
CREATE INDEX IF NOT EXISTS idx_lapak_tasks_proker ON public.lapak_tasks(proker_id);
CREATE INDEX IF NOT EXISTS idx_lapak_juknis_proker ON public.lapak_juknis(proker_id);
CREATE INDEX IF NOT EXISTS idx_lapak_rab_proker ON public.lapak_rab(proker_id);
CREATE INDEX IF NOT EXISTS idx_lapak_response_sets_proker ON public.lapak_response_sets(proker_id);
CREATE INDEX IF NOT EXISTS idx_lapak_response_rows_set ON public.lapak_response_rows(set_id);

-- Enable RLS + open policies (no auth, consistent with the rest of this tool)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lapak_links','lapak_tasks','lapak_juknis','lapak_rab',
    'lapak_notes','lapak_response_sets','lapak_response_rows'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can view %1$s" ON public.%1$I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can insert %1$s" ON public.%1$I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can update %1$s" ON public.%1$I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can delete %1$s" ON public.%1$I;', t);
    EXECUTE format('CREATE POLICY "Anyone can view %1$s" ON public.%1$I FOR SELECT USING (true);', t);
    EXECUTE format('CREATE POLICY "Anyone can insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "Anyone can update %1$s" ON public.%1$I FOR UPDATE USING (true);', t);
    EXECUTE format('CREATE POLICY "Anyone can delete %1$s" ON public.%1$I FOR DELETE USING (true);', t);
  END LOOP;
END $$;
