-- Fix secrets_access_log constraint to include missing access types
-- SAMIA TAROT - Database Fix

-- Problem: The secrets_access_log table constraint is missing 'create' and other access types
-- that are being used in the application, causing audit logging failures

-- Drop the existing constraint
ALTER TABLE secrets_access_log 
DROP CONSTRAINT IF EXISTS secrets_access_log_access_type_check;

-- Add the updated constraint with all required access types
ALTER TABLE secrets_access_log 
ADD CONSTRAINT secrets_access_log_access_type_check 
CHECK (access_type IN (
    'read', 
    'decrypt', 
    'update', 
    'delete', 
    'test', 
    'export', 
    'import',
    'create',      -- Missing: for secret creation
    'view',        -- Missing: for secret viewing
    'list',        -- Missing: for listing secrets
    'search',      -- Missing: for searching secrets
    'bulk_export', -- Missing: for bulk operations
    'bulk_import', -- Missing: for bulk operations
    'system_decrypt', -- Missing: for system decryption
    'api_test',    -- Missing: for API testing
    'health_check' -- Missing: for health checks
));

-- Verify the constraint was applied correctly
SELECT 
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'secrets_access_log' 
    AND tc.constraint_type = 'CHECK'
    AND tc.constraint_name = 'secrets_access_log_access_type_check';

-- Test the constraint with a sample insert (will be rolled back)
BEGIN;
INSERT INTO secrets_access_log (
    secret_id,
    accessed_by,
    access_type,
    access_method,
    ip_address,
    success
) VALUES (
    (SELECT id FROM system_secrets LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1),
    'create',
    'api',
    '127.0.0.1',
    true
);
ROLLBACK;

-- Show success message
SELECT 'secrets_access_log constraint updated successfully! All access types now supported.' AS status; 