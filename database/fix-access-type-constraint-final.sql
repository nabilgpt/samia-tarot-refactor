-- Final Fix for Access Type Constraint - Add All System Values
-- This script adds all necessary access_type values including system_decrypt

-- Step 1: Drop the old constraint
ALTER TABLE configuration_access_log 
DROP CONSTRAINT IF EXISTS configuration_access_log_access_type_check;

-- Step 2: Add comprehensive constraint with ALL necessary values
ALTER TABLE configuration_access_log 
ADD CONSTRAINT configuration_access_log_access_type_check 
CHECK (access_type IN (
    'read', 'write', 'test', 
    'system_read', 'system_write', 'system_decrypt', 'system_encrypt',
    'admin_read', 'admin_write', 'admin_test',
    'api_test', 'config_test', 'validation'
));

-- Step 3: Verify the new constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'configuration_access_log'::regclass 
    AND conname LIKE '%access_type%';

SELECT 'All access types constraint updated successfully! Now supports system_decrypt and all other operations.' as result; 