-- Fix Access Type Constraint for Configuration Access Log
-- This script checks and fixes the access_type constraint to allow 'system_read' value

-- Step 1: Check current constraint (PostgreSQL 12+ compatible)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'configuration_access_log'::regclass 
    AND conname LIKE '%access_type%';

-- Step 2: Check what values are currently in the table
SELECT DISTINCT access_type, COUNT(*) 
FROM configuration_access_log 
GROUP BY access_type;

-- Step 3: Drop the old constraint if it exists
ALTER TABLE configuration_access_log 
DROP CONSTRAINT IF EXISTS configuration_access_log_access_type_check;

-- Step 4: Add new constraint that allows all necessary values
ALTER TABLE configuration_access_log 
ADD CONSTRAINT configuration_access_log_access_type_check 
CHECK (access_type IN ('read', 'write', 'test', 'system_read', 'system_write', 'admin_read', 'admin_write'));

-- Step 5: Verify the new constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'configuration_access_log'::regclass 
    AND conname LIKE '%access_type%';

-- Step 6: Test insert to make sure it works (get actual config_id)
DO $$
DECLARE
    test_config_id uuid;
BEGIN
    -- Get an existing config_id (preferably OPENAI_API_KEY)
    SELECT id INTO test_config_id 
    FROM system_configurations 
    WHERE config_key = 'OPENAI_API_KEY' 
    LIMIT 1;
    
    -- If not found, get any config_id
    IF test_config_id IS NULL THEN
        SELECT id INTO test_config_id 
        FROM system_configurations 
        LIMIT 1;
    END IF;
    
    -- Insert test record with proper config_id
    IF test_config_id IS NOT NULL THEN
        INSERT INTO configuration_access_log 
        (id, config_id, accessed_by, config_key, access_type, is_system_access, created_at) 
        VALUES 
        (gen_random_uuid(), test_config_id, null, 'TEST_KEY', 'system_read', true, NOW())
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Test insert successful with config_id: %', test_config_id;
    ELSE
        RAISE NOTICE 'No configurations found in system_configurations table';
    END IF;
END $$;

-- Step 7: Clean up test data
DELETE FROM configuration_access_log WHERE config_key = 'TEST_KEY';

SELECT 'Access type constraint fixed successfully!' as result; 