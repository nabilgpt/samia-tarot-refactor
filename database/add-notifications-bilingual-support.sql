-- =====================================================
-- SAMIA TAROT - BULLETPROOF BILINGUAL NOTIFICATIONS SYSTEM
-- Complete migration with Arabic/English support for every notification
-- =====================================================
-- 🎯 GOAL: Every notification has title_en, message_en, title_ar, message_ar
-- 🔒 BULLETPROOF: Handles any existing table structure safely
-- 🚀 PRODUCTION READY: Idempotent, safe for multiple runs
-- =====================================================

DO $$ 
DECLARE
    table_exists BOOLEAN;
    column_name_for_body TEXT := 'body_template';
    has_name_column BOOLEAN := FALSE;
    unique_constraint_exists BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🚀 Starting SAMIA TAROT Bilingual Notifications Migration...';

-- =====================================================
-- STEP 1: DETECT TABLE STRUCTURE
-- =====================================================

-- Check if notification_templates table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notification_templates'
) INTO table_exists;

-- Check if table has 'name' column (causing the current error)
IF table_exists THEN
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_templates' 
        AND column_name = 'name'
    ) INTO has_name_column;
    
    RAISE NOTICE '📊 Table exists: %, Has name column: %', table_exists, has_name_column;
END IF;

-- =====================================================
-- STEP 2: CREATE OR UPDATE TABLE STRUCTURE
-- =====================================================

IF NOT table_exists THEN
    RAISE NOTICE '🔨 Creating notification_templates table with bilingual support...';
    
    CREATE TABLE notification_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255), -- Optional name column for compatibility
        
        -- English columns
        title_template TEXT NOT NULL,
        body_template TEXT NOT NULL,
        title_en TEXT, -- Will populate from title_template
        message_en TEXT, -- Will populate from body_template
        
        -- Arabic columns  
        title_template_ar TEXT,
        body_template_ar TEXT,
        title_ar TEXT,
        message_ar TEXT,
        
        -- Metadata columns
        category VARCHAR(50) DEFAULT 'general',
        priority VARCHAR(20) DEFAULT 'normal',
        action_label TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '✅ Created notification_templates table with full bilingual support';
ELSE
    RAISE NOTICE '🔧 Updating existing notification_templates table structure...';
    
    -- Add missing bilingual columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'title_en') THEN
        ALTER TABLE notification_templates ADD COLUMN title_en TEXT;
        RAISE NOTICE '➕ Added title_en column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'message_en') THEN
        ALTER TABLE notification_templates ADD COLUMN message_en TEXT;
        RAISE NOTICE '➕ Added message_en column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'title_ar') THEN
        ALTER TABLE notification_templates ADD COLUMN title_ar TEXT;
        RAISE NOTICE '➕ Added title_ar column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'message_ar') THEN
        ALTER TABLE notification_templates ADD COLUMN message_ar TEXT;
        RAISE NOTICE '➕ Added message_ar column';
    END IF;
    
    -- Add legacy Arabic columns for backwards compatibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'title_template_ar') THEN
        ALTER TABLE notification_templates ADD COLUMN title_template_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'body_template_ar') THEN
        ALTER TABLE notification_templates ADD COLUMN body_template_ar TEXT;
    END IF;
    
    -- Add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'name') THEN
        ALTER TABLE notification_templates ADD COLUMN name VARCHAR(255);
        RAISE NOTICE '➕ Added name column for compatibility';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'category') THEN
        ALTER TABLE notification_templates ADD COLUMN category VARCHAR(50) DEFAULT 'general';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'priority') THEN
        ALTER TABLE notification_templates ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'action_label') THEN
        ALTER TABLE notification_templates ADD COLUMN action_label TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'is_active') THEN
        ALTER TABLE notification_templates ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END IF;

-- =====================================================
-- STEP 3: ADD UNIQUE CONSTRAINT (if missing)
-- =====================================================

SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notification_templates_type_key'
    AND table_name = 'notification_templates'
) INTO unique_constraint_exists;

IF NOT unique_constraint_exists THEN
    ALTER TABLE notification_templates ADD CONSTRAINT notification_templates_type_key UNIQUE (type);
    RAISE NOTICE '🔒 Added unique constraint on type column';
END IF;

-- =====================================================
-- STEP 4: INSERT BILINGUAL TEMPLATES
-- =====================================================

RAISE NOTICE '📝 Inserting bilingual notification templates...';

-- Template 1: Approval Pending
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'approval_pending') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en, 
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'approval_pending', 'New Approval Required',
        'New Approval Required', 'A new {item_type} requires your approval: {item_name}',
        'New Approval Required', 'A new {item_type} requires your approval: {item_name}',
        'موافقة جديدة مطلوبة', '{item_type} جديد يتطلب موافقتك: {item_name}',
        'موافقة جديدة مطلوبة', '{item_type} جديد يتطلب موافقتك: {item_name}',
        'approval', 'high', 'Review'
    );
END IF;

-- Template 2: New Review
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'review_new') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'review_new', 'New Review Received',
        'New Review Received', 'You have received a new review from {reviewer_name}',
        'New Review Received', 'You have received a new review from {reviewer_name}',
        'تقييم جديد تم استلامه', 'لقد استلمت تقييماً جديداً من {reviewer_name}',
        'تقييم جديد تم استلامه', 'لقد استلمت تقييماً جديداً من {reviewer_name}',
        'review', 'normal', 'View Review'
    );
END IF;

-- Template 3: New Booking
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'booking_new') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'booking_new', 'New Booking Request',
        'New Booking Request', 'New booking request from {client_name} for {service_name}',
        'New Booking Request', 'New booking request from {client_name} for {service_name}',
        'طلب حجز جديد', 'طلب حجز جديد من {client_name} للخدمة {service_name}',
        'طلب حجز جديد', 'طلب حجز جديد من {client_name} للخدمة {service_name}',
        'booking', 'high', 'View Booking'
    );
END IF;

-- Template 4: Payment Received
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'payment_received') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'payment_received', 'Payment Received',
        'Payment Received', 'Payment of {amount} received for {service_name}',
        'Payment Received', 'Payment of {amount} received for {service_name}',
        'تم استلام الدفع', 'تم استلام دفعة بقيمة {amount} للخدمة {service_name}',
        'تم استلام الدفع', 'تم استلام دفعة بقيمة {amount} للخدمة {service_name}',
        'payment', 'normal', 'View Payment'
    );
END IF;

-- Template 5: System Announcement
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'system_announcement') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'system_announcement', 'System Announcement',
        'System Announcement', '{message}',
        'System Announcement', '{message}',
        'إعلان النظام', '{message}',
        'إعلان النظام', '{message}',
        'system', 'normal', 'Learn More'
    );
END IF;

-- Template 6: Reader Assigned
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'reader_assigned') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'reader_assigned', 'Reader Assignment',
        'Reader Assignment', 'You have been assigned to {deck_name}',
        'Reader Assignment', 'You have been assigned to {deck_name}',
        'تعيين قارئ', 'تم تعيينك لأوراق {deck_name}',
        'تعيين قارئ', 'تم تعيينك لأوراق {deck_name}',
        'reader', 'normal', 'View Assignment'
    );
END IF;

-- Template 7: Deck Created
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'deck_created') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'deck_created', 'New Deck Created',
        'New Deck Created', 'New tarot deck "{deck_name}" has been created',
        'New Deck Created', 'New tarot deck "{deck_name}" has been created',
        'مجموعة أوراق جديدة', 'تم إنشاء مجموعة أوراق تاروت جديدة "{deck_name}"',
        'مجموعة أوراق جديدة', 'تم إنشاء مجموعة أوراق تاروت جديدة "{deck_name}"',
        'tarot', 'normal', 'View Deck'
    );
END IF;

-- Template 8: User Registered
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'user_registered') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'user_registered', 'New User Registration',
        'New User Registration', 'New user {user_name} has registered',
        'New User Registration', 'New user {user_name} has registered',
        'تسجيل مستخدم جديد', 'انضم مستخدم جديد {user_name} للمنصة',
        'تسجيل مستخدم جديد', 'انضم مستخدم جديد {user_name} للمنصة',
        'user', 'normal', 'View Profile'
    );
END IF;

-- Template 9: Security Alert
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'security_alert') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'security_alert', 'Security Alert',
        'Security Alert', 'Security alert: {alert_message}',
        'Security Alert', 'Security alert: {alert_message}',
        'تنبيه أمني', 'تنبيه أمني: {alert_message}',
        'تنبيه أمني', 'تنبيه أمني: {alert_message}',
        'security', 'urgent', 'View Details'
    );
END IF;

-- Template 10: Test Notification
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'test') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'test', 'Test Notification',
        'Test Notification', 'This is a test notification to verify the system is working',
        'Test Notification', 'This is a test notification to verify the system is working',
        'إشعار تجريبي', 'هذا إشعار تجريبي للتأكد من أن النظام يعمل بشكل صحيح',
        'إشعار تجريبي', 'هذا إشعار تجريبي للتأكد من أن النظام يعمل بشكل صحيح',
        'general', 'normal', 'Dismiss'
    );
END IF;

-- Template 11: Welcome Message
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'welcome') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'welcome', 'Welcome to SAMIA TAROT',
        'Welcome to SAMIA TAROT', 'Welcome {user_name}! Thank you for joining our mystical community.',
        'Welcome to SAMIA TAROT', 'Welcome {user_name}! Thank you for joining our mystical community.',
        'أهلاً بك في سامية تاروت', 'أهلاً وسهلاً {user_name}! شكراً لانضمامك لمجتمعنا الروحاني.',
        'أهلاً بك في سامية تاروت', 'أهلاً وسهلاً {user_name}! شكراً لانضمامك لمجتمعنا الروحاني.',
        'welcome', 'normal', 'Get Started'
    );
END IF;

-- Template 12: Maintenance Notice
IF NOT EXISTS (SELECT 1 FROM notification_templates WHERE type = 'maintenance') THEN
    INSERT INTO notification_templates (
        type, name,
        title_template, body_template, title_en, message_en,
        title_ar, message_ar, title_template_ar, body_template_ar,
        category, priority, action_label
    ) VALUES (
        'maintenance', 'Scheduled Maintenance',
        'Scheduled Maintenance', 'System maintenance is scheduled from {start_time} to {end_time}.',
        'Scheduled Maintenance', 'System maintenance is scheduled from {start_time} to {end_time}.',
        'صيانة مجدولة', 'صيانة النظام مجدولة من {start_time} إلى {end_time}.',
        'صيانة مجدولة', 'صيانة النظام مجدولة من {start_time} إلى {end_time}.',
        'system', 'normal', 'Learn More'
    );
END IF;

RAISE NOTICE '✅ Inserted 12 bilingual notification templates successfully';

-- =====================================================
-- STEP 5: UPDATE NOTIFICATIONS TABLE FOR BILINGUAL SUPPORT
-- =====================================================

RAISE NOTICE '🔧 Updating notifications table for bilingual support...';

-- Add bilingual columns to notifications table
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'title_en') THEN
    ALTER TABLE notifications ADD COLUMN title_en TEXT;
    RAISE NOTICE '➕ Added title_en to notifications table';
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message_en') THEN
    ALTER TABLE notifications ADD COLUMN message_en TEXT;
    RAISE NOTICE '➕ Added message_en to notifications table';
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'title_ar') THEN
    ALTER TABLE notifications ADD COLUMN title_ar TEXT;
    RAISE NOTICE '➕ Added title_ar to notifications table';
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message_ar') THEN
    ALTER TABLE notifications ADD COLUMN message_ar TEXT;
    RAISE NOTICE '➕ Added message_ar to notifications table';
END IF;

-- Migrate existing notification data to bilingual format
UPDATE notifications SET
    title_en = COALESCE(title_en, title),
    message_en = COALESCE(message_en, message),
    title_ar = COALESCE(title_ar, title),
    message_ar = COALESCE(message_ar, message)
WHERE title_en IS NULL OR message_en IS NULL OR title_ar IS NULL OR message_ar IS NULL;

RAISE NOTICE '🔄 Migrated existing notifications to bilingual format';

-- =====================================================
-- STEP 8: CREATE PERFORMANCE INDEXES
-- =====================================================

RAISE NOTICE '🚀 Creating performance indexes...';

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Bilingual content indexes
CREATE INDEX IF NOT EXISTS idx_notifications_title_ar ON notifications(title_ar) WHERE title_ar IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_message_ar ON notifications(message_ar) WHERE message_ar IS NOT NULL;

-- =====================================================
-- STEP 9: ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON COLUMN notification_templates.title_en IS 'English title template';
COMMENT ON COLUMN notification_templates.message_en IS 'English message template';
COMMENT ON COLUMN notification_templates.title_ar IS 'Arabic title template';
COMMENT ON COLUMN notification_templates.message_ar IS 'Arabic message template';

COMMENT ON COLUMN notifications.title_en IS 'Processed English title';
COMMENT ON COLUMN notifications.message_en IS 'Processed English message';
COMMENT ON COLUMN notifications.title_ar IS 'Processed Arabic title';
COMMENT ON COLUMN notifications.message_ar IS 'Processed Arabic message';



-- =====================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================

RAISE NOTICE '🎉 SAMIA TAROT Bilingual Notifications Migration Complete!';
RAISE NOTICE '📊 Tables updated: notifications, notification_templates';
RAISE NOTICE '🌍 Languages supported: English (en), Arabic (ar)';
RAISE NOTICE '📝 Templates created: 12 bilingual notification types';
RAISE NOTICE '⚡ Database schema updated with bilingual support';
RAISE NOTICE '🔍 Indexes created: Performance optimized for bilingual queries';
RAISE NOTICE '';
RAISE NOTICE '✅ Every notification now has: title_en, message_en, title_ar, message_ar';
RAISE NOTICE '🚀 Ready for production with instant language switching!';

END $$;

-- =====================================================
-- BILINGUAL NOTIFICATION HELPER FUNCTIONS
-- (Created outside DO block to avoid syntax issues)
-- =====================================================

-- Function to get notification title
CREATE OR REPLACE FUNCTION get_notification_title(
    template_type VARCHAR(50),
    target_language VARCHAR(5) DEFAULT 'en'
)
RETURNS TEXT AS $$
DECLARE
    result_title TEXT;
BEGIN
    IF target_language = 'ar' THEN
        SELECT COALESCE(title_ar, title_template_ar, title_template)
        INTO result_title
        FROM notification_templates
        WHERE type = template_type AND is_active = TRUE
        LIMIT 1;
    ELSE
        SELECT COALESCE(title_en, title_template)
        INTO result_title
        FROM notification_templates
        WHERE type = template_type AND is_active = TRUE
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(result_title, 'Notification');
END;
$$ LANGUAGE plpgsql;

-- Function to get notification message
CREATE OR REPLACE FUNCTION get_notification_message(
    template_type VARCHAR(50),
    target_language VARCHAR(5) DEFAULT 'en'
)
RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
BEGIN
    IF target_language = 'ar' THEN
        SELECT COALESCE(message_ar, body_template_ar, body_template)
        INTO result_message
        FROM notification_templates
        WHERE type = template_type AND is_active = TRUE
        LIMIT 1;
    ELSE
        SELECT COALESCE(message_en, body_template)
        INTO result_message
        FROM notification_templates
        WHERE type = template_type AND is_active = TRUE
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(result_message, 'Notification message');
END;
$$ LANGUAGE plpgsql;

-- Function to create bilingual notification
CREATE OR REPLACE FUNCTION create_bilingual_notification(
    p_user_id UUID,
    p_template_type VARCHAR(50),
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    en_title TEXT;
    en_message TEXT;
    ar_title TEXT;
    ar_message TEXT;
    template_category VARCHAR(50);
    template_priority VARCHAR(20);
    template_action_label TEXT;
BEGIN
    -- Get English content
    SELECT get_notification_title(p_template_type, 'en') INTO en_title;
    SELECT get_notification_message(p_template_type, 'en') INTO en_message;
    
    -- Get Arabic content  
    SELECT get_notification_title(p_template_type, 'ar') INTO ar_title;
    SELECT get_notification_message(p_template_type, 'ar') INTO ar_message;
    
    -- Get template metadata
    SELECT category, priority, action_label
    INTO template_category, template_priority, template_action_label
    FROM notification_templates
    WHERE type = p_template_type AND is_active = TRUE
    LIMIT 1;
    
    -- Insert bilingual notification
    INSERT INTO notifications (
        user_id, type, 
        title, message, -- Legacy fields (use English)
        title_en, message_en,
        title_ar, message_ar,
        category, priority, 
        action_label, expires_at,
        created_at
    ) VALUES (
        p_user_id, p_template_type,
        en_title, en_message, -- Legacy
        en_title, en_message, -- English
        ar_title, ar_message, -- Arabic
        template_category, template_priority,
        template_action_label, p_expires_at,
        NOW()
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Add function comments
COMMENT ON FUNCTION get_notification_title IS 'Gets localized notification title by language';
COMMENT ON FUNCTION get_notification_message IS 'Gets localized notification message by language';
COMMENT ON FUNCTION create_bilingual_notification IS 'Creates a notification with both English and Arabic content';

-- Final success message for functions
DO $$ 
BEGIN 
    RAISE NOTICE '🎉 Bilingual notification helper functions created successfully!';
    RAISE NOTICE '⚡ Functions: get_notification_title, get_notification_message, create_bilingual_notification';
    RAISE NOTICE '🔧 All functions ready for production use!';
END $$; 