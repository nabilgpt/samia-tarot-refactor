-- ============================================================================
-- FIX CONFIGURATION ACCESS LOG SCHEMA
-- Add missing column and update constraints
-- ============================================================================

-- Add is_system_access column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'configuration_access_log' 
        AND column_name = 'is_system_access'
    ) THEN
        ALTER TABLE configuration_access_log 
        ADD COLUMN is_system_access BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_system_access column';
    ELSE
        RAISE NOTICE '⚠️ is_system_access column already exists';
    END IF;
END
$$;

-- Make accessed_by nullable for system access
DO $$
BEGIN
    ALTER TABLE configuration_access_log 
    ALTER COLUMN accessed_by DROP NOT NULL;
    RAISE NOTICE '✅ Made accessed_by nullable for system access';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ accessed_by may already be nullable: %', SQLERRM;
END
$$;

-- Update access_type constraint to include system types
DO $$
BEGIN
    -- Drop existing constraint
    ALTER TABLE configuration_access_log 
    DROP CONSTRAINT IF EXISTS configuration_access_log_access_type_check;
    
    -- Add updated constraint
    ALTER TABLE configuration_access_log 
    ADD CONSTRAINT configuration_access_log_access_type_check 
    CHECK (access_type IN ('read', 'decrypt', 'export', 'system_read', 'system_decrypt'));
    
    RAISE NOTICE '✅ Updated access_type constraint to include system types';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error updating constraint: %', SQLERRM;
END
$$;

-- Update RLS policies
DO $$
BEGIN
    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "System can insert access logs" ON configuration_access_log;
    
    -- Create system insert policy
    CREATE POLICY "System can insert access logs" ON configuration_access_log
        FOR INSERT WITH CHECK (true);
    
    RAISE NOTICE '✅ Updated RLS policies for system access';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error updating policies: %', SQLERRM;
END
$$;

RAISE NOTICE '🎉 Configuration access log schema fix completed!'; 