-- SAMIA TAROT: Step 2 - Add Bilingual Columns to Notifications System
-- This script adds Arabic and English language support columns
-- Safe to run multiple times (idempotent)

-- ============================================================================
-- STEP 2: ADD BILINGUAL COLUMNS
-- ============================================================================

DO $$
DECLARE
    table_exists boolean;
    column_exists boolean;
BEGIN
    -- Check if notifications table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Adding bilingual columns to notifications table...';
        
        -- Add title_en column if not exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'title_en'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE notifications ADD COLUMN title_en TEXT;
            RAISE NOTICE 'Added title_en column to notifications';
        ELSE
            RAISE NOTICE 'title_en column already exists in notifications';
        END IF;
        
        -- Add message_en column if not exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'message_en'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE notifications ADD COLUMN message_en TEXT;
            RAISE NOTICE 'Added message_en column to notifications';
        ELSE
            RAISE NOTICE 'message_en column already exists in notifications';
        END IF;
        
        -- Add title_ar column if not exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'title_ar'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE notifications ADD COLUMN title_ar TEXT;
            RAISE NOTICE 'Added title_ar column to notifications';
        ELSE
            RAISE NOTICE 'title_ar column already exists in notifications';
        END IF;
        
        -- Add message_ar column if not exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'message_ar'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE notifications ADD COLUMN message_ar TEXT;
            RAISE NOTICE 'Added message_ar column to notifications';
        ELSE
            RAISE NOTICE 'message_ar column already exists in notifications';
        END IF;
        
    ELSE
        RAISE NOTICE 'notifications table does not exist, skipping...';
    END IF;
    
    -- ========================================================================
    -- Add bilingual columns to notification_templates table
    -- ========================================================================
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_templates'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Adding bilingual columns to notification_templates table...';
        
        -- Add title_en column if not exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notification_templates' 
            AND column_name = 'title_en'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE notification_templates ADD COLUMN title_en TEXT;
            RAISE NOTICE 'Added title_en column to notification_templates';
        ELSE
            RAISE NOTICE 'title_en column already exists in notification_templates';
        END IF;
        
        -- Add message_en column if not exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notification_templates' 
            AND column_name = 'message_en'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE notification_templates ADD COLUMN message_en TEXT;
            RAISE NOTICE 'Added message_en column to notification_templates';
        ELSE
            RAISE NOTICE 'message_en column already exists in notification_templates';
        END IF;
        
        -- Add title_ar column if not exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notification_templates' 
            AND column_name = 'title_ar'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE notification_templates ADD COLUMN title_ar TEXT;
            RAISE NOTICE 'Added title_ar column to notification_templates';
        ELSE
            RAISE NOTICE 'title_ar column already exists in notification_templates';
        END IF;
        
        -- Add message_ar column if not exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notification_templates' 
            AND column_name = 'message_ar'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE notification_templates ADD COLUMN message_ar TEXT;
            RAISE NOTICE 'Added message_ar column to notification_templates';
        ELSE
            RAISE NOTICE 'message_ar column already exists in notification_templates';
        END IF;
        
    ELSE
        RAISE NOTICE 'notification_templates table does not exist, skipping...';
    END IF;
    
    -- ========================================================================
    -- Add indexes for better performance on bilingual queries
    -- ========================================================================
    
    -- Index for notifications title searches
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'notifications' 
        AND indexname = 'idx_notifications_title_en'
    ) THEN
        CREATE INDEX idx_notifications_title_en ON notifications(title_en);
        RAISE NOTICE 'Created index idx_notifications_title_en';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'notifications' 
        AND indexname = 'idx_notifications_title_ar'
    ) THEN
        CREATE INDEX idx_notifications_title_ar ON notifications(title_ar);
        RAISE NOTICE 'Created index idx_notifications_title_ar';
    END IF;
    
    -- Index for notification_templates searches
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'notification_templates' 
        AND indexname = 'idx_notification_templates_title_en'
    ) THEN
        CREATE INDEX idx_notification_templates_title_en ON notification_templates(title_en);
        RAISE NOTICE 'Created index idx_notification_templates_title_en';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'notification_templates' 
        AND indexname = 'idx_notification_templates_title_ar'
    ) THEN
        CREATE INDEX idx_notification_templates_title_ar ON notification_templates(title_ar);
        RAISE NOTICE 'Created index idx_notification_templates_title_ar';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 2 COMPLETED SUCCESSFULLY';
    RAISE NOTICE 'Added bilingual columns to both tables';
    RAISE NOTICE 'Added performance indexes';
    RAISE NOTICE 'Ready for Step 3: Bilingual Templates';
    RAISE NOTICE '========================================';
    
END $$; 