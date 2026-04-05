-- Add structured progress zones to each proker
-- Each zone stores: current_status, current_problem, way_out, action_needed, deadline

ALTER TABLE public.prokers
ADD COLUMN IF NOT EXISTS red_zone JSONB NOT NULL DEFAULT jsonb_build_object(
  'current_status', '',
  'current_problem', '',
  'way_out', '',
  'action_needed', '',
  'deadline', null
);

ALTER TABLE public.prokers
ADD COLUMN IF NOT EXISTS medium_zone JSONB NOT NULL DEFAULT jsonb_build_object(
  'current_status', '',
  'current_problem', '',
  'way_out', '',
  'action_needed', '',
  'deadline', null
);

ALTER TABLE public.prokers
ADD COLUMN IF NOT EXISTS green_zone JSONB NOT NULL DEFAULT jsonb_build_object(
  'current_status', '',
  'current_problem', '',
  'way_out', '',
  'action_needed', '',
  'deadline', null
);
