-- SAMIA TAROT: Step 4 - Create Bilingual Notification Helper Functions
-- This script creates convenient PostgreSQL functions for easy bilingual notification management
-- Functions for getting notifications in correct language and creating bilingual notifications
-- Safe to run multiple times (uses CREATE OR REPLACE)

-- ============================================================================
-- STEP 4: CREATE BILINGUAL NOTIFICATION HELPER FUNCTIONS
-- ============================================================================

-- Function 1: Get notification title in specified language
CREATE OR REPLACE FUNCTION get_notification_title(notification_id UUID, language_code TEXT DEFAULT 'en')
RETURNS TEXT AS $$
DECLARE
    result_title TEXT;
BEGIN
    -- Validate language code
    IF language_code NOT IN ('en', 'ar') THEN
        language_code := 'en'; -- Default to English for invalid codes
    END IF;
    
    -- Get title based on language preference
    IF language_code = 'ar' THEN
        SELECT title_ar INTO result_title FROM notifications WHERE id = notification_id;
        -- Fallback to English if Arabic is null
        IF result_title IS NULL OR result_title = '' THEN
            SELECT title_en INTO result_title FROM notifications WHERE id = notification_id;
        END IF;
    ELSE
        SELECT title_en INTO result_title FROM notifications WHERE id = notification_id;
        -- Fallback to Arabic if English is null
        IF result_title IS NULL OR result_title = '' THEN
            SELECT title_ar INTO result_title FROM notifications WHERE id = notification_id;
        END IF;
    END IF;
    
    RETURN COALESCE(result_title, 'Notification');
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get notification message in specified language
CREATE OR REPLACE FUNCTION get_notification_message(notification_id UUID, language_code TEXT DEFAULT 'en')
RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
BEGIN
    -- Validate language code
    IF language_code NOT IN ('en', 'ar') THEN
        language_code := 'en'; -- Default to English for invalid codes
    END IF;
    
    -- Get message based on language preference
    IF language_code = 'ar' THEN
        SELECT message_ar INTO result_message FROM notifications WHERE id = notification_id;
        -- Fallback to English if Arabic is null
        IF result_message IS NULL OR result_message = '' THEN
            SELECT message_en INTO result_message FROM notifications WHERE id = notification_id;
        END IF;
    ELSE
        SELECT message_en INTO result_message FROM notifications WHERE id = notification_id;
        -- Fallback to Arabic if English is null
        IF result_message IS NULL OR result_message = '' THEN
            SELECT message_ar INTO result_message FROM notifications WHERE id = notification_id;
        END IF;
    END IF;
    
    RETURN COALESCE(result_message, 'No message available');
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get template title in specified language
CREATE OR REPLACE FUNCTION get_template_title(template_name TEXT, language_code TEXT DEFAULT 'en')
RETURNS TEXT AS $$
DECLARE
    result_title TEXT;
BEGIN
    -- Validate language code
    IF language_code NOT IN ('en', 'ar') THEN
        language_code := 'en'; -- Default to English for invalid codes
    END IF;
    
    -- Get title based on language preference
    IF language_code = 'ar' THEN
        SELECT title_ar INTO result_title FROM notification_templates WHERE name = template_name;
        -- Fallback to English if Arabic is null
        IF result_title IS NULL OR result_title = '' THEN
            SELECT title_en INTO result_title FROM notification_templates WHERE name = template_name;
        END IF;
    ELSE
        SELECT title_en INTO result_title FROM notification_templates WHERE name = template_name;
        -- Fallback to Arabic if English is null
        IF result_title IS NULL OR result_title = '' THEN
            SELECT title_ar INTO result_title FROM notification_templates WHERE name = template_name;
        END IF;
    END IF;
    
    RETURN COALESCE(result_title, 'Notification');
END;
$$ LANGUAGE plpgsql;

-- Function 4: Get template message in specified language
CREATE OR REPLACE FUNCTION get_template_message(template_name TEXT, language_code TEXT DEFAULT 'en')
RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
BEGIN
    -- Validate language code
    IF language_code NOT IN ('en', 'ar') THEN
        language_code := 'en'; -- Default to English for invalid codes
    END IF;
    
    -- Get message based on language preference
    IF language_code = 'ar' THEN
        SELECT message_ar INTO result_message FROM notification_templates WHERE name = template_name;
        -- Fallback to English if Arabic is null
        IF result_message IS NULL OR result_message = '' THEN
            SELECT message_en INTO result_message FROM notification_templates WHERE name = template_name;
        END IF;
    ELSE
        SELECT message_en INTO result_message FROM notification_templates WHERE name = template_name;
        -- Fallback to Arabic if English is null
        IF result_message IS NULL OR result_message = '' THEN
            SELECT message_ar INTO result_message FROM notification_templates WHERE name = template_name;
        END IF;
    END IF;
    
    RETURN COALESCE(result_message, 'No message available');
END;
$$ LANGUAGE plpgsql;

-- Function 5: Create bilingual notification from template
CREATE OR REPLACE FUNCTION create_bilingual_notification(
    template_name TEXT,
    user_id UUID,
    custom_title_en TEXT DEFAULT NULL,
    custom_message_en TEXT DEFAULT NULL,
    custom_title_ar TEXT DEFAULT NULL,
    custom_message_ar TEXT DEFAULT NULL,
    notification_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    template_record RECORD;
    new_notification_id UUID;
    final_title_en TEXT;
    final_message_en TEXT;
    final_title_ar TEXT;
    final_message_ar TEXT;
    user_ref_column TEXT := 'user_id'; -- Default user reference column
BEGIN
    -- Get template data
    SELECT * INTO template_record FROM notification_templates WHERE name = template_name AND is_active = true;
    
    IF template_record IS NULL THEN
        RAISE EXCEPTION 'Template % not found or not active', template_name;
    END IF;
    
    -- Use custom content if provided, otherwise use template content
    final_title_en := COALESCE(custom_title_en, template_record.title_en);
    final_message_en := COALESCE(custom_message_en, template_record.message_en);
    final_title_ar := COALESCE(custom_title_ar, template_record.title_ar);
    final_message_ar := COALESCE(custom_message_ar, template_record.message_ar);
    
    -- Check if notifications table has user_id column, otherwise try auth_user_id or profile_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        user_ref_column := 'user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'auth_user_id') THEN
        user_ref_column := 'auth_user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'profile_id') THEN
        user_ref_column := 'profile_id';
    END IF;
    
    -- Generate new UUID for notification
    new_notification_id := gen_random_uuid();
    
    -- Insert notification with dynamic user reference column
    EXECUTE format('
        INSERT INTO notifications (
            id, type, %I, title_en, message_en, title_ar, message_ar, 
            is_read, created_at, data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), $8)',
        user_ref_column
    ) USING 
        new_notification_id,
        template_record.type,
        user_id,
        final_title_en,
        final_message_en,
        final_title_ar,
        final_message_ar,
        notification_data;
    
    RETURN new_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function 6: Get user notifications in specified language with pagination
CREATE OR REPLACE FUNCTION get_user_notifications_bilingual(
    user_id UUID,
    language_code TEXT DEFAULT 'en',
    page_limit INTEGER DEFAULT 20,
    page_offset INTEGER DEFAULT 0,
    unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    data JSONB
) AS $$
DECLARE
    user_ref_column TEXT := 'user_id'; -- Default user reference column
    where_clause TEXT := '';
    order_clause TEXT := 'ORDER BY created_at DESC';
    sql_query TEXT;
BEGIN
    -- Validate language code
    IF language_code NOT IN ('en', 'ar') THEN
        language_code := 'en';
    END IF;
    
    -- Check which user reference column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        user_ref_column := 'user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'auth_user_id') THEN
        user_ref_column := 'auth_user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'profile_id') THEN
        user_ref_column := 'profile_id';
    END IF;
    
    -- Build WHERE clause
    where_clause := format('WHERE %I = $1', user_ref_column);
    IF unread_only THEN
        where_clause := where_clause || ' AND is_read = false';
    END IF;
    
    -- Build complete query with language-specific title/message selection
    IF language_code = 'ar' THEN
        sql_query := format('
            SELECT n.id, n.type,
                   COALESCE(NULLIF(n.title_ar, ''''), n.title_en) as title,
                   COALESCE(NULLIF(n.message_ar, ''''), n.message_en) as message,
                   n.is_read, n.created_at, 
                   COALESCE(n.data, ''{}''::jsonb) as data
            FROM notifications n
            %s
            %s
            LIMIT $2 OFFSET $3',
            where_clause, order_clause
        );
    ELSE
        sql_query := format('
            SELECT n.id, n.type,
                   COALESCE(NULLIF(n.title_en, ''''), n.title_ar) as title,
                   COALESCE(NULLIF(n.message_en, ''''), n.message_ar) as message,
                   n.is_read, n.created_at,
                   COALESCE(n.data, ''{}''::jsonb) as data
            FROM notifications n
            %s
            %s
            LIMIT $2 OFFSET $3',
            where_clause, order_clause
        );
    END IF;
    
    -- Execute query and return results
    RETURN QUERY EXECUTE sql_query USING user_id, page_limit, page_offset;
END;
$$ LANGUAGE plpgsql;

-- Function 7: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE notifications 
    SET is_read = true, updated_at = NOW() 
    WHERE id = notification_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- Function 8: Get unread notification count for user
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
    user_ref_column TEXT := 'user_id';
    sql_query TEXT;
BEGIN
    -- Check which user reference column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        user_ref_column := 'user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'auth_user_id') THEN
        user_ref_column := 'auth_user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'profile_id') THEN
        user_ref_column := 'profile_id';
    END IF;
    
    sql_query := format('SELECT COUNT(*) FROM notifications WHERE %I = $1 AND is_read = false', user_ref_column);
    EXECUTE sql_query INTO unread_count USING user_id;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function 9: Bulk mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read_bulk(notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE notifications 
    SET is_read = true, updated_at = NOW() 
    WHERE id = ANY(notification_ids);
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Function 10: Clean old read notifications (older than specified days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE is_read = true 
    AND created_at < (NOW() - INTERVAL '1 day' * days_old);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create helpful comments on functions
COMMENT ON FUNCTION get_notification_title(UUID, TEXT) IS 'Get notification title in specified language (en/ar) with automatic fallback';
COMMENT ON FUNCTION get_notification_message(UUID, TEXT) IS 'Get notification message in specified language (en/ar) with automatic fallback';
COMMENT ON FUNCTION get_template_title(TEXT, TEXT) IS 'Get template title in specified language (en/ar) with automatic fallback';
COMMENT ON FUNCTION get_template_message(TEXT, TEXT) IS 'Get template message in specified language (en/ar) with automatic fallback';
COMMENT ON FUNCTION create_bilingual_notification IS 'Create new bilingual notification from template with custom content support';
COMMENT ON FUNCTION get_user_notifications_bilingual IS 'Get user notifications in specified language with pagination and filtering';
COMMENT ON FUNCTION mark_notification_read(UUID) IS 'Mark single notification as read';
COMMENT ON FUNCTION get_unread_notification_count(UUID) IS 'Get count of unread notifications for user';
COMMENT ON FUNCTION mark_notifications_read_bulk(UUID[]) IS 'Mark multiple notifications as read in bulk';
COMMENT ON FUNCTION cleanup_old_notifications(INTEGER) IS 'Clean up old read notifications older than specified days';

-- Create index for better performance on bilingual queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_auth_user_read ON notifications(auth_user_id, is_read) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_profile_read ON notifications(profile_id, is_read) WHERE profile_id IS NOT NULL;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 4 COMPLETED SUCCESSFULLY';
    RAISE NOTICE 'Created 10 bilingual notification helper functions:';
    RAISE NOTICE '';
    RAISE NOTICE 'Language Functions:';
    RAISE NOTICE '- get_notification_title(id, lang)';
    RAISE NOTICE '- get_notification_message(id, lang)';
    RAISE NOTICE '- get_template_title(name, lang)';
    RAISE NOTICE '- get_template_message(name, lang)';
    RAISE NOTICE '';
    RAISE NOTICE 'Notification Management:';
    RAISE NOTICE '- create_bilingual_notification(template, user, ...)';
    RAISE NOTICE '- get_user_notifications_bilingual(user, lang, limit, offset)';
    RAISE NOTICE '- mark_notification_read(id)';
    RAISE NOTICE '- get_unread_notification_count(user)';
    RAISE NOTICE '- mark_notifications_read_bulk(ids[])';
    RAISE NOTICE '- cleanup_old_notifications(days)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '✓ Automatic language fallback (AR ↔ EN)';
    RAISE NOTICE '✓ Flexible user reference columns';
    RAISE NOTICE '✓ Pagination support';
    RAISE NOTICE '✓ Bulk operations';
    RAISE NOTICE '✓ Performance indexes';
    RAISE NOTICE '✓ Template-based creation';
    RAISE NOTICE '';
    RAISE NOTICE 'BILINGUAL NOTIFICATION SYSTEM READY!';
    RAISE NOTICE 'Use these functions in your React frontend APIs';
    RAISE NOTICE '========================================';
END $$; 