-- Check System Configurations Table Schema
-- This script shows the actual column structure of system_configurations table

-- Step 1: Show table structure
\d+ system_configurations;

-- Step 2: Show all columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'system_configurations'
ORDER BY ordinal_position;

-- Step 3: Show sample data to understand structure
SELECT * FROM system_configurations LIMIT 3; 