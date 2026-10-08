-- AI assistant (Edge Function `ppi-assistant`).
-- These tables are private: RLS on with NO policies and anon/authenticated revoked,
-- so only the Edge Function (service role) can read or write them.

-- Delete requests: during the first week after launch the assistant may not delete
-- prokers directly. It files a request here; an admin approves or rejects it on the
-- AI Monitor page.
CREATE TABLE IF NOT EXISTS public.ai_delete_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proker_id UUID NOT NULL,                 -- no FK: the row must survive the delete it describes
  proker_snapshot JSONB NOT NULL,          -- the proker as it was when requested
  requested_by UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  requested_by_name TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_delete_requests_status ON public.ai_delete_requests(status, created_at DESC);

-- Every change the assistant makes (or is refused), for the admin's activity log.
CREATE TABLE IF NOT EXISTS public.ai_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL DEFAULT '',
  tool TEXT NOT NULL,
  args JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome TEXT NOT NULL CHECK (outcome IN ('done', 'requested', 'denied', 'error')),
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_created ON public.ai_action_log(created_at DESC);

-- One row per chat message, for per-member rate limiting (protects the API key's budget).
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id BIGSERIAL PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  blocked BOOLEAN NOT NULL DEFAULT false,  -- true = stopped by the topic guardrail
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_member_time ON public.ai_usage(member_id, created_at DESC);

ALTER TABLE public.ai_delete_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_delete_requests, public.ai_action_log, public.ai_usage FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.ai_usage_id_seq FROM anon, authenticated;
