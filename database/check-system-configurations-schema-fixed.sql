-- Check System Configurations Table Schema (SQL Compatible)
-- This script shows the actual column structure of system_configurations table

-- Step 1: Show all columns with details
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'system_configurations'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Show sample data to understand structure (first 3 rows)
SELECT * FROM system_configurations LIMIT 3;

-- Step 3: Show table constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'system_configurations'
    AND tc.table_schema = 'public'; 