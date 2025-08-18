-- ============================================================================
-- MIGRATION: Create the core `audit` schema
-- This schema will contain generic auditing functions and tables.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS audit;

COMMENT ON SCHEMA audit IS 'Schema for generic, reusable audit trail functionality.'; 