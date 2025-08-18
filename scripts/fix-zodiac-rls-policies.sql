-- ============================================================================
-- FIX ZODIAC RLS POLICIES FOR SYSTEM OPERATIONS
-- Allows backend system to update configurations and create logs
-- ============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "daily_zodiac_system_write" ON daily_zodiac;
DROP POLICY IF EXISTS "daily_zodiac_system_update" ON daily_zodiac;
DROP POLICY IF EXISTS "zodiac_config_system_access" ON zodiac_system_config;
DROP POLICY IF EXISTS "zodiac_logs_system_access" ON zodiac_generation_logs;

-- System write access for daily zodiac (for automated generation)
CREATE POLICY "daily_zodiac_system_write" ON daily_zodiac
    FOR INSERT WITH CHECK (true);

CREATE POLICY "daily_zodiac_system_update" ON daily_zodiac
    FOR UPDATE USING (true);

-- System access for config updates (for automated operations)
CREATE POLICY "zodiac_config_system_access" ON zodiac_system_config
    FOR ALL WITH CHECK (true);

-- System access for generation logs (for automated logging)
CREATE POLICY "zodiac_logs_system_access" ON zodiac_generation_logs
    FOR INSERT WITH CHECK (true);

RAISE NOTICE '✅ Zodiac RLS policies updated for system operations'; 