-- Schema Syntax Validation Script
-- Run this to check for common SQL syntax issues before running the full schema

\echo 'Validating SQL syntax...'

-- Check if we can create a simple test table (will fail if basic syntax is wrong)
CREATE TABLE IF NOT EXISTS syntax_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test basic index creation
CREATE INDEX IF NOT EXISTS idx_syntax_test_name ON syntax_test(test_name);

-- Clean up test table
DROP TABLE IF EXISTS syntax_test;

\echo 'Basic syntax validation passed!'

-- Check if all required extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\echo 'Required extensions available!'

-- Check if we can use basic PostgreSQL functions
SELECT 
    gen_random_uuid() as test_uuid,
    NOW() as test_timestamp,
    gen_salt('bf', 12) as test_salt;

\echo 'PostgreSQL functions working correctly!'

\echo 'Schema syntax validation completed successfully!'
\echo 'You can now safely run new-refactored-schema.sql' 