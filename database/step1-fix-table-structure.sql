-- =====================================================
-- SAMIA TAROT - STEP 1: TABLE STRUCTURE EXAMINATION & FIX
-- This script examines current structure and fixes missing columns
-- =====================================================

-- Display current table structures
DO $$ 
DECLARE
    rec RECORD;
BEGIN 
    RAISE NOTICE '🔍 STEP 1: Examining current table structures...';
    
    -- Check notifications table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE '✅ notifications table exists';
        RAISE NOTICE '📋 Current columns in notifications:';
        FOR rec IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - %: %', rec.column_name, rec.data_type;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ notifications table does not exist';
    END IF;
    
    RAISE NOTICE '';
    
    -- Check notification_templates table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_templates') THEN
        RAISE NOTICE '✅ notification_templates table exists';
        RAISE NOTICE '📋 Current columns in notification_templates:';
        FOR rec IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notification_templates' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - %: %', rec.column_name, rec.data_type;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ notification_templates table does not exist';
    END IF;
END $$;

-- Add missing columns to notifications table (if it exists)
DO $$
BEGIN
    -- Only add columns if notifications table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE '🔧 Updating existing notifications table...';
        
        -- Add missing columns one by one
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category') THEN
            ALTER TABLE notifications ADD COLUMN category TEXT DEFAULT 'general';
            RAISE NOTICE '➕ Added category column to notifications';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
            ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'normal';
            RAISE NOTICE '➕ Added priority column to notifications';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_label') THEN
            ALTER TABLE notifications ADD COLUMN action_label TEXT;
            RAISE NOTICE '➕ Added action_label column to notifications';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
            ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE '➕ Added expires_at column to notifications';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ notifications table does not exist - will be created in next step';
    END IF;
END $$;

-- Create notification_templates table with standard structure
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    priority VARCHAR(20) DEFAULT 'normal',
    action_label TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on type if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notification_templates_type_key' 
        AND table_name = 'notification_templates'
    ) THEN
        ALTER TABLE notification_templates ADD CONSTRAINT notification_templates_type_key UNIQUE (type);
        RAISE NOTICE '🔒 Added unique constraint on type column';
    ELSE
        RAISE NOTICE '✅ Unique constraint on type already exists';
    END IF;
END $$;

-- Ensure all required columns exist
DO $$
BEGIN
    -- Add missing columns to notification_templates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'name') THEN
        ALTER TABLE notification_templates ADD COLUMN name VARCHAR(255);
        RAISE NOTICE '➕ Added name column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'body_template') THEN
        ALTER TABLE notification_templates ADD COLUMN body_template TEXT;
        RAISE NOTICE '➕ Added body_template column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'category') THEN
        ALTER TABLE notification_templates ADD COLUMN category VARCHAR(50) DEFAULT 'general';
        RAISE NOTICE '➕ Added category column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'priority') THEN
        ALTER TABLE notification_templates ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
        RAISE NOTICE '➕ Added priority column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'action_label') THEN
        ALTER TABLE notification_templates ADD COLUMN action_label TEXT;
        RAISE NOTICE '➕ Added action_label column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'is_active') THEN
        ALTER TABLE notification_templates ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE '➕ Added is_active column';
    END IF;
END $$;

-- Add basic indexes for performance (only for existing columns)
DO $$
BEGIN
    -- Only create indexes if the table and columns exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- Try to find the user reference column (could be user_id, auth_user_id, profile_id, etc.)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            RAISE NOTICE '📊 Created index on user_id';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'auth_user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_auth_user_id ON notifications(auth_user_id);
            RAISE NOTICE '📊 Created index on auth_user_id';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'profile_id') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON notifications(profile_id);
            RAISE NOTICE '📊 Created index on profile_id';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
            RAISE NOTICE '📊 Created index on type';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
            RAISE NOTICE '📊 Created index on is_read';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
            RAISE NOTICE '📊 Created index on created_at';
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- Final status check
DO $$ 
BEGIN 
    RAISE NOTICE '🎉 STEP 1 COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '✅ Tables created/updated: notifications, notification_templates';
    RAISE NOTICE '🔒 Constraints added: unique type constraint';
    RAISE NOTICE '📊 Indexes created: performance optimized';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for STEP 2: Adding bilingual columns';
    RAISE NOTICE '📝 Next: Run step2-add-bilingual-columns.sql';
END $$; 