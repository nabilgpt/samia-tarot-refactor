-- Fix RLS policies for super_admin_audit_logs table
-- This script resolves the 403 Forbidden errors when logging to audit table

-- First, check if the table exists and enable RLS
DO $$
BEGIN
    -- Enable RLS on super_admin_audit_logs if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'super_admin_audit_logs') THEN
        ALTER TABLE super_admin_audit_logs ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "super_admin_audit_logs_insert_policy" ON super_admin_audit_logs;
        DROP POLICY IF EXISTS "super_admin_audit_logs_select_policy" ON super_admin_audit_logs;
        DROP POLICY IF EXISTS "super_admin_audit_logs_service_role_policy" ON super_admin_audit_logs;
        
        -- Create policy for super_admin users to insert audit logs
        CREATE POLICY "super_admin_audit_logs_insert_policy" ON super_admin_audit_logs
            FOR INSERT
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'super_admin'
                )
            );
        
        -- Create policy for super_admin users to select audit logs
        CREATE POLICY "super_admin_audit_logs_select_policy" ON super_admin_audit_logs
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'super_admin'
                )
            );
        
        -- Create service_role policy for backend operations
        CREATE POLICY "super_admin_audit_logs_service_role_policy" ON super_admin_audit_logs
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
        
        -- Grant necessary permissions
        GRANT ALL ON super_admin_audit_logs TO service_role;
        GRANT SELECT, INSERT ON super_admin_audit_logs TO authenticated;
        
        RAISE NOTICE 'Successfully updated RLS policies for super_admin_audit_logs table';
    ELSE
        RAISE NOTICE 'Table super_admin_audit_logs does not exist - skipping RLS policy creation';
    END IF;
END $$;

-- Also check and fix the system_secrets table RLS policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_secrets') THEN
        ALTER TABLE system_secrets ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "system_secrets_super_admin_policy" ON system_secrets;
        DROP POLICY IF EXISTS "system_secrets_service_role_policy" ON system_secrets;
        
        -- Create policy for super_admin users
        CREATE POLICY "system_secrets_super_admin_policy" ON system_secrets
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'super_admin'
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'super_admin'
                )
            );
        
        -- Create service_role policy
        CREATE POLICY "system_secrets_service_role_policy" ON system_secrets
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
        
        -- Grant permissions
        GRANT ALL ON system_secrets TO service_role;
        GRANT ALL ON system_secrets TO authenticated;
        
        RAISE NOTICE 'Successfully updated RLS policies for system_secrets table';
    ELSE
        RAISE NOTICE 'Table system_secrets does not exist - skipping RLS policy creation';
    END IF;
END $$;

-- Verify the policies were created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename IN ('super_admin_audit_logs', 'system_secrets')
ORDER BY tablename, policyname; 