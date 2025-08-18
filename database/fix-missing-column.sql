-- ============================================================================
-- FIX MISSING COLUMN: is_system_access in configuration_access_log
-- ============================================================================
-- This script adds the missing is_system_access column that's causing the test endpoint to fail

BEGIN;

-- Check if column exists and add it if missing
DO $$ 
BEGIN
    -- Try to add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'configuration_access_log' 
        AND column_name = 'is_system_access'
    ) THEN
        RAISE NOTICE '⚠️ Adding missing column is_system_access to configuration_access_log table';
        
        ALTER TABLE configuration_access_log 
        ADD COLUMN is_system_access BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✅ Column is_system_access added successfully';
    ELSE
        RAISE NOTICE '✅ Column is_system_access already exists';
    END IF;
END $$;

-- Update existing records to set is_system_access = false for safety
UPDATE configuration_access_log 
SET is_system_access = false 
WHERE is_system_access IS NULL;

-- Create index for the new column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_configuration_access_log_system_access 
ON configuration_access_log(is_system_access);

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎯 DATABASE FIX COMPLETED SUCCESSFULLY';
    RAISE NOTICE '📋 Column is_system_access is now available in configuration_access_log';
    RAISE NOTICE '🔧 Configuration test endpoint should now work properly';
    RAISE NOTICE '🚀 Next step: Test the OPENAI_API_KEY configuration from the dashboard';
END $$; 