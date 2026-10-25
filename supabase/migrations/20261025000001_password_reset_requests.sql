-- Admin-approved password resets: a member asks from the login screen, an admin generates a
-- one-time link and sends it over WhatsApp, the member sets a new password from that link.
-- Private table (RLS on, no policies): only the password-reset Edge Function touches it.
-- Only a SHA-256 of the link token is stored, never the token itself.
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  contact text,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'link_sent', 'done', 'dismissed')),
  token_hash text UNIQUE,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS password_reset_requests_status_idx ON public.password_reset_requests (status, created_at DESC);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_reset_requests FROM anon, authenticated;
