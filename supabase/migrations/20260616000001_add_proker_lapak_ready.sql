-- Centralize System: activation gate.
-- A proker stays a DRAFT (hidden from dashboards/analytics, not rateable/completable)
-- until its Lapak Kerja has at least 1 task and 1 link. The app sets lapak_ready=false
-- on newly created prokers and flips it to true once that minimum is met.
--
-- DEFAULT true grandfathers all existing prokers so they stay visible; only NEW
-- prokers (which the app inserts with lapak_ready=false) start as drafts.
ALTER TABLE public.prokers
  ADD COLUMN IF NOT EXISTS lapak_ready BOOLEAN NOT NULL DEFAULT true;
