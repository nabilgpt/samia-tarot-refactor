-- ============================================================
-- MANUAL USER_ID COLUMN FIXES - Run in Supabase SQL Editor
-- Copy and paste this into Supabase Dashboard > SQL Editor
-- ============================================================

-- Fix voice_notes table
ALTER TABLE voice_notes ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);

-- Fix emergency_escalations table  
ALTER TABLE emergency_escalations ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_user_id ON emergency_escalations(user_id);

-- Fix emergency_alerts table
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON emergency_alerts(user_id);

-- Optional: Add foreign key constraints (uncomment if needed)
-- ALTER TABLE voice_notes ADD CONSTRAINT fk_voice_notes_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- ALTER TABLE emergency_escalations ADD CONSTRAINT fk_emergency_escalations_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- ALTER TABLE emergency_alerts ADD CONSTRAINT fk_emergency_alerts_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the fixes
SELECT 'voice_notes' as table_name, COUNT(*) as row_count FROM voice_notes;
SELECT 'emergency_escalations' as table_name, COUNT(*) as row_count FROM emergency_escalations;
SELECT 'emergency_alerts' as table_name, COUNT(*) as row_count FROM emergency_alerts;
