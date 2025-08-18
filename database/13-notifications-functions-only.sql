-- =====================================================
-- NOTIFICATIONS FUNCTIONS ONLY
-- =====================================================
-- Add only the missing functions for notifications system
-- Tables already exist, so just need the functions

-- Create function to get unread count for user
CREATE OR REPLACE FUNCTION get_unread_notifications_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM notifications
    WHERE user_id = target_user_id
    AND is_read = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to mark all notifications as read for user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = TRUE,
        read_at = NOW(),
        updated_at = NOW()
    WHERE user_id = target_user_id
    AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to create notification from template
CREATE OR REPLACE FUNCTION create_notification_from_template(
    template_type VARCHAR(50),
    target_user_id UUID,
    template_data JSONB DEFAULT '{}'::jsonb,
    custom_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    template_record notification_templates%ROWTYPE;
    notification_id UUID;
    processed_title TEXT;
    processed_body TEXT;
BEGIN
    -- Get template
    SELECT * INTO template_record
    FROM notification_templates
    WHERE type = template_type
    AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Notification template % not found or not active', template_type;
    END IF;
    
    -- Process template variables (simple string replacement)
    processed_title := template_record.title_template;
    processed_body := template_record.body_template;
    
    -- Replace common variables
    IF template_data ? 'item_name' THEN
        processed_title := REPLACE(processed_title, '{item_name}', template_data->>'item_name');
        processed_body := REPLACE(processed_body, '{item_name}', template_data->>'item_name');
    END IF;
    
    IF template_data ? 'item_type' THEN
        processed_title := REPLACE(processed_title, '{item_type}', template_data->>'item_type');
        processed_body := REPLACE(processed_body, '{item_type}', template_data->>'item_type');
    END IF;
    
    IF template_data ? 'user_name' THEN
        processed_title := REPLACE(processed_title, '{user_name}', template_data->>'user_name');
        processed_body := REPLACE(processed_body, '{user_name}', template_data->>'user_name');
    END IF;
    
    IF template_data ? 'client_name' THEN
        processed_title := REPLACE(processed_title, '{client_name}', template_data->>'client_name');
        processed_body := REPLACE(processed_body, '{client_name}', template_data->>'client_name');
    END IF;
    
    IF template_data ? 'service_name' THEN
        processed_title := REPLACE(processed_title, '{service_name}', template_data->>'service_name');
        processed_body := REPLACE(processed_body, '{service_name}', template_data->>'service_name');
    END IF;
    
    IF template_data ? 'deck_name' THEN
        processed_title := REPLACE(processed_title, '{deck_name}', template_data->>'deck_name');
        processed_body := REPLACE(processed_body, '{deck_name}', template_data->>'deck_name');
    END IF;
    
    IF template_data ? 'amount' THEN
        processed_title := REPLACE(processed_title, '{amount}', template_data->>'amount');
        processed_body := REPLACE(processed_body, '{amount}', template_data->>'amount');
    END IF;
    
    IF template_data ? 'message' THEN
        processed_title := REPLACE(processed_title, '{message}', template_data->>'message');
        processed_body := REPLACE(processed_body, '{message}', template_data->>'message');
    END IF;
    
    IF template_data ? 'reviewer_name' THEN
        processed_title := REPLACE(processed_title, '{reviewer_name}', template_data->>'reviewer_name');
        processed_body := REPLACE(processed_body, '{reviewer_name}', template_data->>'reviewer_name');
    END IF;
    
    IF template_data ? 'alert_message' THEN
        processed_title := REPLACE(processed_title, '{alert_message}', template_data->>'alert_message');
        processed_body := REPLACE(processed_body, '{alert_message}', template_data->>'alert_message');
    END IF;
    
    -- Create notification
    INSERT INTO notifications (
        user_id, type, title, body, data, priority, category, 
        action_url, action_label, created_by
    ) VALUES (
        target_user_id, template_type, processed_title, processed_body, 
        template_data, template_record.priority, template_record.category,
        custom_action_url, template_record.action_label, auth.uid()
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create some sample test notifications for super admin
DO $$
DECLARE
    super_admin_id UUID;
BEGIN
    -- Get super admin ID
    SELECT id INTO super_admin_id 
    FROM profiles 
    WHERE email = 'info@samiatarot.com' 
    AND role = 'super_admin' 
    LIMIT 1;
    
    -- Only create if super admin exists
    IF super_admin_id IS NOT NULL THEN
        -- Create test notifications
        INSERT INTO notifications (user_id, type, title, body, category, priority, data, is_read) VALUES
        (super_admin_id, 'test', 'Test Notification', 'This is a test notification to verify the system is working properly.', 'general', 'normal', '{"source": "system_initialization"}', FALSE),
        (super_admin_id, 'approval_pending', 'New Reader Approval Required', 'A new reader application requires your approval.', 'approval', 'high', '{"reader_name": "John Doe", "application_id": "12345"}', FALSE),
        (super_admin_id, 'review_new', 'New Review Received', 'You have received a new 5-star review.', 'review', 'normal', '{"reviewer": "Sarah Ahmed", "rating": 5}', FALSE),
        (super_admin_id, 'system_announcement', 'System Maintenance Scheduled', 'System maintenance is scheduled for tonight at 2:00 AM.', 'system', 'normal', '{"maintenance_time": "2025-07-12T02:00:00Z"}', FALSE),
        (super_admin_id, 'deck_created', 'New Tarot Deck Added', 'A new tarot deck "Cosmic Dreams" has been added to the system.', 'tarot', 'normal', '{"deck_name": "Cosmic Dreams", "deck_id": "cosmic-dreams-001"}', FALSE)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Created sample notifications for super admin';
    ELSE
        RAISE NOTICE 'Super admin not found, skipping sample notifications';
    END IF;
END $$;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Notification functions created successfully';
    RAISE NOTICE 'Functions: get_unread_notifications_count, mark_all_notifications_read, cleanup_expired_notifications, create_notification_from_template';
    RAISE NOTICE 'Sample notifications created for testing';
END $$; 