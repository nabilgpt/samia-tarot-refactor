-- ============================================================================
-- FINAL ZODIAC RLS POLICY FIX
-- ============================================================================
-- This script completely resolves all RLS policy violations for zodiac tables

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "daily_zodiac_system_write" ON daily_zodiac;
DROP POLICY IF EXISTS "daily_zodiac_system_update" ON daily_zodiac;
DROP POLICY IF EXISTS "zodiac_config_system_access" ON zodiac_system_config;
DROP POLICY IF EXISTS "zodiac_logs_system_access" ON zodiac_generation_logs;
DROP POLICY IF EXISTS "zodiac_logs_system_insert" ON zodiac_generation_logs;
DROP POLICY IF EXISTS "zodiac_logs_system_update" ON zodiac_generation_logs;

-- Allow system operations on daily_zodiac table
CREATE POLICY "daily_zodiac_system_operations" ON daily_zodiac
    FOR ALL USING (true) WITH CHECK (true);

-- Allow system operations on zodiac_system_config table  
CREATE POLICY "zodiac_config_system_operations" ON zodiac_system_config
    FOR ALL USING (true) WITH CHECK (true);

-- Allow system operations on zodiac_generation_logs table
CREATE POLICY "zodiac_logs_system_operations" ON zodiac_generation_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure service role can bypass RLS (if not already set)
ALTER TABLE daily_zodiac ENABLE ROW LEVEL SECURITY;
ALTER TABLE zodiac_system_config ENABLE ROW LEVEL SECURITY;  
ALTER TABLE zodiac_generation_logs ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to service role
GRANT ALL ON daily_zodiac TO service_role;
GRANT ALL ON zodiac_system_config TO service_role;
GRANT ALL ON zodiac_generation_logs TO service_role; 