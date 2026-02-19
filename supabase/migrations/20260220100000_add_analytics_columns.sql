-- Add analytics columns to prokers table
ALTER TABLE public.prokers ADD COLUMN IF NOT EXISTS promotion_data JSONB DEFAULT '{}';
ALTER TABLE public.prokers ADD COLUMN IF NOT EXISTS engagement_data JSONB DEFAULT '{}';
ALTER TABLE public.prokers ADD COLUMN IF NOT EXISTS rating_data JSONB DEFAULT '{}';

-- promotion_data structure:
-- {
--   "views": number,
--   "groups_shared": ["group1", "group2", ...],
--   "platforms": ["Instagram", "WhatsApp", ...]
-- }

-- engagement_data structure:
-- {
--   "attendance_rate": number (0-100),
--   "feedback_score": number (0-5),
--   "social_media_reach": number,
--   "other_notes": string
-- }

-- rating_data structure:
-- {
--   "planning": number (1-5),
--   "execution": number (1-5),
--   "impact": number (1-5),
--   "creativity": number (1-5),
--   "teamwork": number (1-5),
--   "overall": number (computed average)
-- }
