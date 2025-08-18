-- ================================================================
-- SAMIA TAROT: COMPLETE AUDIT_LOGS TABLE FIX
-- ================================================================
-- This fixes ALL missing columns including user_id, new_data, metadata, created_at

BEGIN;

-- ================================================================
-- 1. SAFELY BACKUP AND RECREATE AUDIT_LOGS TABLE
-- ================================================================

-- Create backup of existing data if any
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- Create backup table with existing data
        EXECUTE 'CREATE TABLE audit_logs_backup_' || to_char(NOW(), 'YYYYMMDD_HH24MISS') || ' AS SELECT * FROM audit_logs';
        RAISE NOTICE '✅ Backup created for existing audit_logs data';
        
        -- Drop the incomplete table
        DROP TABLE audit_logs CASCADE;
        RAISE NOTICE '✅ Dropped incomplete audit_logs table';
    END IF;
END $$;

-- ================================================================
-- 2. CREATE COMPLETE AUDIT_LOGS TABLE WITH ALL COLUMNS
-- ================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    record_id UUID,
    user_id UUID,                          -- This was missing!
    old_data JSONB,
    new_data JSONB,                        -- This was missing!
    metadata JSONB DEFAULT '{}'::jsonb,    -- This was missing!
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),  -- This was missing!
    session_id VARCHAR(255),
    
    -- Constraints for data integrity
    CONSTRAINT audit_logs_action_check CHECK (action IN (
        'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS',
        'phase4_infrastructure_setup', 'language_added', 'migration_applied',
        'system_restart', 'config_changed', 'schema_fix_migration',
        'complete_table_recreation'
    )),
    
    -- Foreign key to profiles table for user_id
    CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ================================================================
-- 3. CREATE PERFORMANCE INDEXES
-- ================================================================

CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);

-- GIN index for JSONB columns for fast queries
CREATE INDEX idx_audit_logs_new_data_gin ON audit_logs USING GIN (new_data);
CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);

-- ================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 5. CREATE RLS POLICIES
-- ================================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "audit_logs_admin_access" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_service_role" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_user_own_records" ON audit_logs;

-- Admin and super_admin can view all audit logs
CREATE POLICY "audit_logs_admin_access" ON audit_logs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Users can view their own audit records
CREATE POLICY "audit_logs_user_own_records" ON audit_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Service role can do everything (for system operations)
CREATE POLICY "audit_logs_service_role" ON audit_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ================================================================
-- 6. GRANT PERMISSIONS
-- ================================================================

GRANT ALL ON audit_logs TO service_role;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- ================================================================
-- 7. TEST THE COMPLETE SCHEMA
-- ================================================================

-- Test 1: Basic insert with all columns
INSERT INTO audit_logs (
    table_name, 
    action, 
    record_id, 
    user_id, 
    old_data, 
    new_data, 
    metadata, 
    ip_address, 
    user_agent, 
    session_id,
    created_at
) VALUES (
    'audit_logs_table', 
    'complete_table_recreation',
    gen_random_uuid(),
    NULL,  -- No specific user for system operation
    NULL,  -- No old data for creation
    '{"operation": "complete_schema_recreation", "columns_added": ["user_id", "new_data", "metadata", "created_at"], "missing_columns_fixed": true}'::jsonb,
    '{
        "fix_type": "complete_table_recreation",
        "description": "Recreated audit_logs table with ALL required columns",
        "phase": "5_automation",
        "urgency": "critical",
        "compatibility": ["phase4_dynamic_language", "phase5_automation"]
    }'::jsonb,
    '127.0.0.1'::inet,
    'SAMIA-TAROT-Phase5-DatabaseMigrator/1.0',
    'system_migration_session',
    NOW()
);

-- Test 2: Phase 4 compatible insert (the one that was failing)
INSERT INTO audit_logs (
    table_name, action, new_data, metadata, created_at
) VALUES (
    'dynamic_languages', 
    'phase4_infrastructure_setup',
    '{"tables_created": ["dynamic_languages", "multilingual_field_registry", "translation_providers", "tts_providers"]}'::jsonb,
    '{
        "phase": "4",
        "component": "dynamic_language_infrastructure",
        "description": "Foundation for unlimited multilingual support established"
    }'::jsonb,
    NOW()
);

COMMIT;

-- ================================================================
-- 8. VERIFICATION QUERIES
-- ================================================================

-- Verify table structure
DO $$
DECLARE
    column_count INTEGER;
    required_columns TEXT[] := ARRAY['id', 'table_name', 'action', 'record_id', 'user_id', 'old_data', 'new_data', 'metadata', 'ip_address', 'user_agent', 'created_at', 'session_id'];
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    col TEXT;
BEGIN
    -- Check each required column
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            AND column_name = col
            AND table_schema = 'public'
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing columns in audit_logs: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ ALL required columns present in audit_logs table';
    END IF;
    
    -- Count total columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND table_schema = 'public';
    
    RAISE NOTICE '✅ audit_logs table has % columns', column_count;
END $$;

-- Verify test data insertion
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count
    FROM audit_logs 
    WHERE action IN ('complete_table_recreation', 'phase4_infrastructure_setup');
    
    IF test_count >= 2 THEN
        RAISE NOTICE '✅ Test data inserted successfully (% records)', test_count;
    ELSE
        RAISE EXCEPTION 'Test data insertion failed. Expected 2+ records, found %', test_count;
    END IF;
END $$;

-- ================================================================
-- 9. COMPLETION MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 AUDIT_LOGS TABLE COMPLETELY FIXED!';
    RAISE NOTICE '✅ user_id column added and configured';
    RAISE NOTICE '✅ new_data column added and configured';
    RAISE NOTICE '✅ metadata column added and configured';
    RAISE NOTICE '✅ created_at column added and configured';
    RAISE NOTICE '✅ All 12 required columns present';
    RAISE NOTICE '✅ Performance indexes created';
    RAISE NOTICE '✅ RLS policies configured';
    RAISE NOTICE '✅ Foreign key constraints added';
    RAISE NOTICE '✅ Phase 4 compatibility confirmed';
    RAISE NOTICE '✅ Phase 5 automation ready';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next: Fix environment variables and start servers!';
    RAISE NOTICE '';
END $$; 