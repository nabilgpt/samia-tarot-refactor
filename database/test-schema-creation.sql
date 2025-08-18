-- Test script to verify schema creation
-- Run this first to ensure tables are created properly

\echo 'Testing new schema creation...'

-- Check if tables exist
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name IN (
    'system_secrets',
    'providers', 
    'translation_settings',
    'provider_usage_analytics'
)
ORDER BY table_name;

-- Check system_secrets table structure
\echo 'System Secrets table columns:'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'system_secrets'
ORDER BY ordinal_position;

-- Check if specific columns exist
\echo 'Checking for secret_key column:'
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_secrets' 
    AND column_name = 'secret_key'
) as secret_key_exists;

-- Test a simple insert (will fail if table structure is wrong)
\echo 'Testing minimal insert...'
INSERT INTO system_secrets (
    secret_key,
    secret_category,
    secret_value_encrypted,
    secret_salt,
    display_name,
    description
) VALUES (
    'TEST_KEY',
    'infrastructure',
    'test_encrypted_value',
    'test_salt',
    'Test Configuration',
    'Test description'
) ON CONFLICT (secret_key) DO NOTHING;

-- Clean up test data
DELETE FROM system_secrets WHERE secret_key = 'TEST_KEY';

\echo 'Schema test completed successfully!' 