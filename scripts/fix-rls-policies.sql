-- SAMIA TAROT - Fix RLS Policies for Admin Access
-- =============================================================================
-- This script fixes Row Level Security policies to allow service_role access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS system_secrets_service_role_policy ON system_secrets;
DROP POLICY IF EXISTS super_admin_audit_logs_service_role_policy ON super_admin_audit_logs;
DROP POLICY IF EXISTS payment_settings_service_role_policy ON payment_settings;

-- Create service_role policies for system_secrets
CREATE POLICY system_secrets_service_role_policy ON system_secrets
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Create service_role policies for super_admin_audit_logs
CREATE POLICY super_admin_audit_logs_service_role_policy ON super_admin_audit_logs
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Create service_role policies for payment_settings (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_settings') THEN
        EXECUTE 'CREATE POLICY payment_settings_service_role_policy ON payment_settings
                 FOR ALL TO service_role
                 USING (true)
                 WITH CHECK (true)';
    END IF;
END $$;

-- Grant necessary permissions to service_role
GRANT ALL ON system_secrets TO service_role;
GRANT ALL ON super_admin_audit_logs TO service_role;

-- Grant permissions to payment_settings if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_settings') THEN
        EXECUTE 'GRANT ALL ON payment_settings TO service_role';
    END IF;
END $$;

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('system_secrets', 'super_admin_audit_logs', 'payment_settings')
AND policyname LIKE '%service_role%'
ORDER BY tablename, policyname; 