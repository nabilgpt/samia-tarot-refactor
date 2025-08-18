-- ============================================================================
-- FIX ACCESSED_BY NOT NULL CONSTRAINT ISSUE
-- ============================================================================
-- This script fixes the "null value in column accessed_by violates not-null constraint" error

BEGIN;

-- Step 1: Make accessed_by column nullable for system access
-- This allows system calls to work without requiring a user ID
ALTER TABLE configuration_access_log 
ALTER COLUMN accessed_by DROP NOT NULL;

-- Step 2: Add a comment to document the change
COMMENT ON COLUMN configuration_access_log.accessed_by IS 
'User ID who accessed the configuration. NULL for system access.';

-- Step 3: Update the RLS policy to handle NULL accessed_by for system access
DROP POLICY IF EXISTS "Users can view their own access logs" ON configuration_access_log;

CREATE POLICY "Users can view their own access logs" ON configuration_access_log
    FOR SELECT USING (
        accessed_by = auth.uid() 
        AND accessed_by IS NOT NULL
    );

-- Step 4: Create a new policy for system access logs (viewable by super admin only)
CREATE POLICY "Super Admin can view system access logs" ON configuration_access_log
    FOR SELECT USING (
        accessed_by IS NULL 
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎯 ACCESSED_BY CONSTRAINT FIX COMPLETED';
    RAISE NOTICE '✅ Column accessed_by is now nullable for system access';
    RAISE NOTICE '🔐 RLS policies updated to handle NULL values properly';
    RAISE NOTICE '🚀 Configuration test endpoint should now work without constraint errors';
END $$; 