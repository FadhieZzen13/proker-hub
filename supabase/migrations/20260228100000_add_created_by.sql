-- Add created_by_member_id to track who created each proker
ALTER TABLE prokers ADD COLUMN IF NOT EXISTS created_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL;
