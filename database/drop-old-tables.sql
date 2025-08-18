-- Drop old tables script
-- Run this BEFORE running new-refactored-schema.sql
-- This ensures the new schema creates tables with the correct structure

-- Drop tables in reverse dependency order to avoid foreign key conflicts
DROP TABLE IF EXISTS system_audit_log CASCADE;
DROP TABLE IF EXISTS system_health_checks CASCADE;
DROP TABLE IF EXISTS provider_usage_analytics CASCADE;
DROP TABLE IF EXISTS feature_provider_assignments CASCADE;
DROP TABLE IF EXISTS translation_provider_assignments CASCADE;
DROP TABLE IF EXISTS provider_configurations CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS secrets_access_log CASCADE;
DROP TABLE IF EXISTS system_secrets CASCADE;

-- Note: We need to drop translation_settings too since it has old structure
DROP TABLE IF EXISTS translation_settings CASCADE;

-- Verify tables are dropped
SELECT 
    'Tables dropped successfully' AS status,
    COUNT(*) AS remaining_tables
FROM information_schema.tables 
WHERE table_name IN (
    'system_secrets', 
    'providers', 
    'system_audit_log', 
    'system_health_checks', 
    'provider_usage_analytics',
    'feature_provider_assignments',
    'translation_provider_assignments',
    'provider_configurations',
    'secrets_access_log'
);

-- Show remaining tables
SELECT 
    table_name,
    'Still exists' AS status
FROM information_schema.tables 
WHERE table_name IN (
    'system_secrets', 
    'providers', 
    'system_audit_log', 
    'system_health_checks', 
    'provider_usage_analytics',
    'feature_provider_assignments',
    'translation_provider_assignments',
    'provider_configurations',
    'secrets_access_log'
)
ORDER BY table_name; 