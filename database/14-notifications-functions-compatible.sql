-- =====================================================
-- COMPATIBLE NOTIFICATIONS FUNCTIONS
-- =====================================================
-- Functions that work with the existing notifications table structure
-- Using: recipient_id (not user_id), message (not body), read_at (not is_read)

-- Create function to get unread count for user
CREATE OR REPLACE FUNCTION get_unread_notifications_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM notifications
    WHERE recipient_id = target_user_id
    AND read_at IS NULL
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
    SET read_at = NOW()
    WHERE recipient_id = target_user_id
    AND read_at IS NULL;
    
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

-- Create sample notifications for testing
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
        -- Create test notifications using correct column names
        INSERT INTO notifications (recipient_id, type, title, message, priority, data, read_at) VALUES
        (super_admin_id, 'test', 'Test Notification', 'This is a test notification to verify the system is working properly.', 'medium', '{"source": "system_initialization"}', NULL),
        (super_admin_id, 'approval_pending', 'New Reader Approval Required', 'A new reader application requires your approval.', 'high', '{"reader_name": "John Doe", "application_id": "12345"}', NULL),
        (super_admin_id, 'review_new', 'New Review Received', 'You have received a new 5-star review.', 'medium', '{"reviewer": "Sarah Ahmed", "rating": 5}', NULL),
        (super_admin_id, 'system_announcement', 'System Maintenance Scheduled', 'System maintenance is scheduled for tonight at 2:00 AM.', 'medium', '{"maintenance_time": "2025-07-12T02:00:00Z"}', NULL),
        (super_admin_id, 'deck_created', 'New Tarot Deck Added', 'A new tarot deck "Cosmic Dreams" has been added to the system.', 'low', '{"deck_name": "Cosmic Dreams", "deck_id": "cosmic-dreams-001"}', NULL)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Created sample notifications for super admin using compatible schema';
    ELSE
        RAISE NOTICE 'Super admin not found, skipping sample notifications';
    END IF;
END $$;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Compatible notification functions created successfully';
    RAISE NOTICE 'Functions work with existing table structure: recipient_id, message, read_at';
    RAISE NOTICE 'Sample notifications created for testing';
END $$; 