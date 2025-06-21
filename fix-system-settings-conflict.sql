-- =====================================================
-- FIX SYSTEM SETTINGS CONFLICT ERROR
-- =====================================================
-- This script resolves the 409 Conflict error when inserting into system_settings

-- Step 1: Check if system_settings table exists and its structure
DO $$
BEGIN
    -- Create system_settings table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        CREATE TABLE system_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key VARCHAR(255) NOT NULL UNIQUE,
            value TEXT,
            category VARCHAR(100) DEFAULT 'general',
            description TEXT,
            updated_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created system_settings table';
    ELSE
        RAISE NOTICE 'system_settings table already exists';
    END IF;
END $$;

-- Step 2: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add category column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'system_settings' AND column_name = 'category') THEN
        ALTER TABLE system_settings ADD COLUMN category VARCHAR(100) DEFAULT 'general';
        RAISE NOTICE 'Added category column to system_settings';
    END IF;
    
    -- Add description column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'system_settings' AND column_name = 'description') THEN
        ALTER TABLE system_settings ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to system_settings';
    END IF;
    
    -- Add updated_by column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'system_settings' AND column_name = 'updated_by') THEN
        ALTER TABLE system_settings ADD COLUMN updated_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added updated_by column to system_settings';
    END IF;
    
    -- Add updated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'system_settings' AND column_name = 'updated_at') THEN
        ALTER TABLE system_settings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to system_settings';
    END IF;
END $$;

-- Step 3: Ensure unique constraint exists on key column
DO $$
BEGIN
    -- Check if unique constraint exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'system_settings' 
                   AND constraint_type = 'UNIQUE' 
                   AND constraint_name LIKE '%key%') THEN
        -- Add unique constraint if it doesn't exist
        ALTER TABLE system_settings ADD CONSTRAINT system_settings_key_unique UNIQUE (key);
        RAISE NOTICE 'Added unique constraint on key column';
    ELSE
        RAISE NOTICE 'Unique constraint on key column already exists';
    END IF;
END $$;

-- Step 4: Enable RLS if not already enabled
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
DROP POLICY IF EXISTS "Super admins can manage system settings" ON system_settings;
CREATE POLICY "Super admins can manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
CREATE POLICY "Admins can view system settings" ON system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Step 6: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_updated_at();

-- Step 7: Remove any duplicate entries that might be causing conflicts
WITH duplicates AS (
    SELECT key, MIN(created_at) as first_created
    FROM system_settings
    GROUP BY key
    HAVING COUNT(*) > 1
)
DELETE FROM system_settings 
WHERE key IN (SELECT key FROM duplicates)
  AND created_at NOT IN (SELECT first_created FROM duplicates);

-- Step 8: Insert default system settings if they don't exist
INSERT INTO system_settings (key, value, category, description) VALUES
    ('maintenance_mode', 'false', 'system', 'Enable/disable maintenance mode')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, category, description) VALUES
    ('new_registrations_enabled', 'true', 'system', 'Allow new user registrations')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, category, description) VALUES
    ('ai_features_enabled', 'true', 'system', 'Enable AI-powered features')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, category, description) VALUES
    ('max_concurrent_sessions', '1000', 'system', 'Maximum concurrent user sessions')
ON CONFLICT (key) DO NOTHING;

-- Step 9: Verification
SELECT 
    'System Settings Table Status' as check_type,
    COUNT(*) as total_settings,
    COUNT(DISTINCT key) as unique_keys,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT key) THEN '✅ No duplicates'
        ELSE '❌ Duplicates found'
    END as duplicate_status
FROM system_settings;

-- Show current settings
SELECT key, category, description, created_at 
FROM system_settings 
ORDER BY category, key; 