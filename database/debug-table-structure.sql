-- Debug script to check current table structure
-- Run this to see what columns actually exist in your database

-- Check if system_secrets table exists
SELECT 
    'system_secrets' AS table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_secrets') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS table_status;

-- Show all columns in system_secrets table (if it exists)
SELECT 
    'system_secrets_columns' AS info_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'system_secrets'
ORDER BY ordinal_position;

-- Check for specific columns that the migration needs
SELECT 
    'required_columns_check' AS info_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_secrets' AND column_name = 'secret_key') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS secret_key_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_secrets' AND column_name = 'secret_category') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS secret_category_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_secrets' AND column_name = 'secret_subcategory') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS secret_subcategory_status;

-- Check other required tables
SELECT 
    'other_tables_check' AS info_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS providers_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'translation_settings') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS translation_settings_status;

-- Show record count if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_secrets') THEN
        RAISE NOTICE 'system_secrets table exists with records';
    ELSE
        RAISE NOTICE 'system_secrets table does not exist - run new-refactored-schema.sql first';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers') THEN
        RAISE NOTICE 'providers table exists';
    ELSE
        RAISE NOTICE 'providers table does not exist - run new-refactored-schema.sql first';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'translation_settings') THEN
        RAISE NOTICE 'translation_settings table exists';
    ELSE
        RAISE NOTICE 'translation_settings table does not exist - run new-refactored-schema.sql first';
    END IF;
END
$$; 