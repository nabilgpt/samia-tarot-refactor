-- Fix Foreign Key Constraint Issue for User Reset
-- This script resolves the foreign key constraint violation by cleaning up references

-- Step 1: Check what records are referencing the problematic profile
SELECT 'reader_spread_notifications' as table_name, COUNT(*) as reference_count
FROM reader_spread_notifications 
WHERE admin_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Step 2: Update all references to point to the main admin profile
UPDATE reader_spread_notifications 
SET admin_id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d'
WHERE admin_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Step 3: Check and update other common tables that might reference this profile
-- (Run each of these only if the table exists and has the referenced columns)

-- Update audit_logs if it references the problematic profile
UPDATE audit_logs 
SET user_id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d'
WHERE user_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Update configuration_access_log if it references the problematic profile
UPDATE configuration_access_log 
SET accessed_by = 'c3922fea-329a-4d6e-800c-3e03c9fe341d'
WHERE accessed_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Update secrets_access_log if it references the problematic profile
UPDATE secrets_access_log 
SET accessed_by = 'c3922fea-329a-4d6e-800c-3e03c9fe341d'
WHERE accessed_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Update notifications if it references the problematic profile
UPDATE notifications 
SET user_id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d'
WHERE user_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Step 4: Deactivate the problematic profile (safer than deletion)
UPDATE profiles 
SET is_active = false, 
    email = null,
    updated_at = NOW()
WHERE id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Step 5: Verify the fix worked
SELECT 'Verification - reader_spread_notifications' as check_name, COUNT(*) as remaining_references
FROM reader_spread_notifications 
WHERE admin_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Step 6: Show the profile status
SELECT id, email, is_active, role, created_at, updated_at
FROM profiles 
WHERE id IN ('0a28e972-9cc9-479b-aa1e-fafc5856af18', 'c3922fea-329a-4d6e-800c-3e03c9fe341d')
ORDER BY created_at; 