-- Index to speed up per-proker KPI lookups (F-custom-proker-KPI).
CREATE INDEX IF NOT EXISTS idx_division_kpis_proker
  ON public.division_kpis (proker_id);
