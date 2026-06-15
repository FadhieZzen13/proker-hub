-- Centralize System: add Position role to members (admin-assignable).
-- Position + Division together drive evaluation access:
--   * Best Member  -> scored by a division's Kadep/Wakadep
--   * Best Kadep/Wakadep -> scored by BPH
--   * Results visible only to POSDM Kadep/Wakadep + BPH (enforced in the UI).
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS position TEXT NOT NULL DEFAULT 'Staff'
  CHECK (position IN ('Kadep', 'Wakadep', 'Staff'));
