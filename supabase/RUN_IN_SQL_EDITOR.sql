-- ============================================================================
-- PPI UPM Dashboard — Centralize System setup
-- Paste this whole file into the Supabase SQL editor and Run.
-- Safe to run more than once (idempotent): IF NOT EXISTS + DROP guards.
-- Creates: members.position; Lapak Kerja tables; tracker_entries; evaluations;
--          prokers.lapak_ready; custom ongoing params; split kadep/wakadep eval.
-- ============================================================================


-- >>> 20260615000001_add_member_position.sql <<<
-- Centralize System: add Position role to members (admin-assignable).
-- Position + Division together drive evaluation access:
--   * Best Member  -> scored by a division's Kadep/Wakadep
--   * Best Kadep/Wakadep -> scored by BPH
--   * Results visible only to POSDM Kadep/Wakadep + BPH (enforced in the UI).
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS position TEXT NOT NULL DEFAULT 'Staff'
  CHECK (position IN ('Kadep', 'Wakadep', 'Staff'));

-- >>> 20260615000002_create_lapak_kerja.sql <<<
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

-- >>> 20260615000003_create_tracker_entries.sql <<<
-- Centralize System: Personal Tracker — per-member, per-month org contribution.
-- Mirrors the "Monthly Tracker Kerjaan" sheet: each member logs work items per
-- month, each with a progress status.
CREATE TABLE IF NOT EXISTS public.tracker_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  division TEXT NOT NULL CHECK (division IN ('BPH', 'AKSI', 'POSDM', 'ROMAS', 'HUMAS', 'DANUS', 'SEBURA', 'MEDIFO')),
  month TEXT NOT NULL,                 -- 'YYYY-MM'
  description TEXT NOT NULL DEFAULT '',
  progress TEXT NOT NULL DEFAULT 'On Progress'
    CHECK (progress IN ('Not Started', 'On Progress', 'On Going', 'Negotiation', 'Cancelled', 'Done')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracker_member_month ON public.tracker_entries(member_id, month);
CREATE INDEX IF NOT EXISTS idx_tracker_division_month ON public.tracker_entries(division, month);

ALTER TABLE public.tracker_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view tracker_entries" ON public.tracker_entries;
DROP POLICY IF EXISTS "Anyone can insert tracker_entries" ON public.tracker_entries;
DROP POLICY IF EXISTS "Anyone can update tracker_entries" ON public.tracker_entries;
DROP POLICY IF EXISTS "Anyone can delete tracker_entries" ON public.tracker_entries;
CREATE POLICY "Anyone can view tracker_entries" ON public.tracker_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tracker_entries" ON public.tracker_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tracker_entries" ON public.tracker_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tracker_entries" ON public.tracker_entries FOR DELETE USING (true);

-- reuse the shared updated_at trigger function from the prokers migration
DROP TRIGGER IF EXISTS update_tracker_entries_updated_at ON public.tracker_entries;
CREATE TRIGGER update_tracker_entries_updated_at
BEFORE UPDATE ON public.tracker_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- >>> 20260615000004_create_evaluations.sql <<<
-- Centralize System: Evaluations (Penilaian Kinerja).
--   type 'best_member'  -> a Kadep/Wakadep scores a Staff in their own division
--   type 'best_leader'  -> a BPH member scores a Kadep/Wakadep
-- Three criteria (1-5 each): discipline, contribution, responsibility.
-- Results are aggregated per (type, period, target) and shown only to
-- POSDM Kadep/Wakadep + BPH (UI-enforced).
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('best_member', 'best_leader')),
  period TEXT NOT NULL,                          -- 'YYYY-MM'
  rater_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  rater_name TEXT NOT NULL DEFAULT '',
  rater_email TEXT NOT NULL DEFAULT '',
  rater_division TEXT NOT NULL DEFAULT '',
  target_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  target_name TEXT NOT NULL DEFAULT '',
  target_division TEXT NOT NULL DEFAULT '',
  score_discipline INTEGER NOT NULL CHECK (score_discipline BETWEEN 1 AND 5),
  score_contribution INTEGER NOT NULL CHECK (score_contribution BETWEEN 1 AND 5),
  score_responsibility INTEGER NOT NULL CHECK (score_responsibility BETWEEN 1 AND 5),
  reason TEXT NOT NULL DEFAULT '',
  future_eval TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_type_period ON public.evaluations(type, period);
CREATE INDEX IF NOT EXISTS idx_evaluations_target ON public.evaluations(target_member_id);

-- A Kadep nominates exactly 1 best member per period (one submission per rater).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_best_member_per_rater_period
  ON public.evaluations(period, rater_member_id)
  WHERE type = 'best_member' AND rater_member_id IS NOT NULL;

-- A BPH member scores each Kadep/Wakadep at most once per period.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_best_leader_per_rater_target_period
  ON public.evaluations(period, rater_member_id, target_member_id)
  WHERE type = 'best_leader' AND rater_member_id IS NOT NULL AND target_member_id IS NOT NULL;

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Anyone can insert evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Anyone can update evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Anyone can delete evaluations" ON public.evaluations;
CREATE POLICY "Anyone can view evaluations" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert evaluations" ON public.evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update evaluations" ON public.evaluations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete evaluations" ON public.evaluations FOR DELETE USING (true);

-- >>> 20260616000001_add_proker_lapak_ready.sql <<<
-- Centralize System: activation gate.
-- A proker stays a DRAFT (hidden from dashboards/analytics, not rateable/completable)
-- until its Lapak Kerja has at least 1 task and 1 link. The app sets lapak_ready=false
-- on newly created prokers and flips it to true once that minimum is met.
--
-- DEFAULT true grandfathers all existing prokers so they stay visible; only NEW
-- prokers (which the app inserts with lapak_ready=false) start as drafts.
ALTER TABLE public.prokers
  ADD COLUMN IF NOT EXISTS lapak_ready BOOLEAN NOT NULL DEFAULT true;

-- >>> 20260616000002_custom_ongoing_and_eval_split.sql <<<
-- Centralize System round 2.

-- 1. Custom ongoing (berkelanjutan) parameters.
--    prokers.custom_params: definition list [{key,label,type:'number'|'text'}]
--    berkelanjutan_entries.custom_data: per-entry values keyed by param key.
ALTER TABLE public.prokers
  ADD COLUMN IF NOT EXISTS custom_params JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.berkelanjutan_entries
  ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Split the leader assessment into Best Kadep and Best Wakadep.
--    Keep 'best_leader' allowed for any legacy rows; new submissions use the split types.
ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_type_check;
ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_type_check
  CHECK (type IN ('best_member', 'best_leader', 'best_kadep', 'best_wakadep'));

-- One score per BPH rater → target per period, for each split type.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_best_kadep_per_rater_target_period
  ON public.evaluations(period, rater_member_id, target_member_id)
  WHERE type = 'best_kadep' AND rater_member_id IS NOT NULL AND target_member_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_best_wakadep_per_rater_target_period
  ON public.evaluations(period, rater_member_id, target_member_id)
  WHERE type = 'best_wakadep' AND rater_member_id IS NOT NULL AND target_member_id IS NOT NULL;

-- >>> 20260616000003_create_evaluation_winners.sql <<<
-- Manually-chosen evaluation winners. POSDM Kadep/Wakadep + BPH review all
-- submissions for a month (the "Entries" view) and pick one winner per category.
CREATE TABLE IF NOT EXISTS public.evaluation_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('best_member', 'best_kadep', 'best_wakadep')),
  winner_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  winner_name TEXT NOT NULL DEFAULT '',
  winner_division TEXT NOT NULL DEFAULT '',
  chosen_by_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  chosen_by_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_eval_winner_period_category
  ON public.evaluation_winners(period, category);
ALTER TABLE public.evaluation_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view evaluation_winners" ON public.evaluation_winners;
DROP POLICY IF EXISTS "Anyone can insert evaluation_winners" ON public.evaluation_winners;
DROP POLICY IF EXISTS "Anyone can update evaluation_winners" ON public.evaluation_winners;
DROP POLICY IF EXISTS "Anyone can delete evaluation_winners" ON public.evaluation_winners;
CREATE POLICY "Anyone can view evaluation_winners" ON public.evaluation_winners FOR SELECT USING (true);
CREATE POLICY "Anyone can insert evaluation_winners" ON public.evaluation_winners FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update evaluation_winners" ON public.evaluation_winners FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete evaluation_winners" ON public.evaluation_winners FOR DELETE USING (true);

-- >>> 20260617000001_secretary_and_links.sql <<<
-- 1. New 'Secretary' position.
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_position_check;
ALTER TABLE public.members
  ADD CONSTRAINT members_position_check
  CHECK (position IN ('Kadep', 'Wakadep', 'Staff', 'Secretary'));

-- 2. Shared Links page (restricted flag is UI-enforced for Secretary/BPH/Admin).
CREATE TABLE IF NOT EXISTS public.app_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  restricted BOOLEAN NOT NULL DEFAULT false,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.app_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view app_links" ON public.app_links;
DROP POLICY IF EXISTS "Anyone can insert app_links" ON public.app_links;
DROP POLICY IF EXISTS "Anyone can update app_links" ON public.app_links;
DROP POLICY IF EXISTS "Anyone can delete app_links" ON public.app_links;
CREATE POLICY "Anyone can view app_links" ON public.app_links FOR SELECT USING (true);
CREATE POLICY "Anyone can insert app_links" ON public.app_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update app_links" ON public.app_links FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete app_links" ON public.app_links FOR DELETE USING (true);

-- >>> 20260617000002_add_member_password.sql <<<
-- Simple per-member password gate. Nullable so existing members set one on next
-- login. Stores a salted SHA-256 hash (UI-enforced; not real auth).
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS password_hash TEXT;
