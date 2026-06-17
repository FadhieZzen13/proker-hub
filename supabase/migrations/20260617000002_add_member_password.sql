-- Centralize System round 3: simple per-member password gate.
-- Nullable so existing members are prompted to set one on their next login
-- ("claim account"). Stores a salted SHA-256 hash (UI-enforced; not real auth).
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS password_hash TEXT;
