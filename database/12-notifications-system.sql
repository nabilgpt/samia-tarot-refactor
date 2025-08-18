-- =====================================================
-- NOTIFICATIONS SYSTEM DATABASE SCHEMA
-- =====================================================
-- Comprehensive notifications system for SAMIA TAROT platform
-- Supports multiple notification types with proper indexing and security

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'approval_pending', 'approval_approved', 'approval_rejected',
        'review_new', 'review_reply', 'review_moderated',
        'booking_new', 'booking_confirmed', 'booking_cancelled',
        'payment_received', 'payment_refunded', 'payment_failed',
        'reader_assigned', 'reader_unassigned', 'reader_activated',
        'system_announcement', 'system_maintenance', 'system_alert',
        'deck_created', 'deck_updated', 'deck_deleted',
        'spread_created', 'spread_updated', 'spread_deleted',
        'user_registered', 'user_verified', 'user_suspended',
        'admin_message', 'security_alert', 'backup_completed',
        'test', 'general'
    )),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN (
        'approval', 'review', 'booking', 'payment', 'reader', 
        'system', 'tarot', 'user', 'admin', 'security', 'general'
    )),
    action_url TEXT,
    action_label TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_category_read ON notifications(user_id, category, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_priority_read ON notifications(user_id, priority, is_read);

-- Create notification templates table for system-wide templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL UNIQUE,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    action_label TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default notification templates
INSERT INTO notification_templates (type, title_template, body_template, category, priority, action_label) VALUES
('approval_pending', 'New Approval Required', 'A new {item_type} requires your approval: {item_name}', 'approval', 'high', 'Review'),
('review_new', 'New Review Received', 'You have received a new review from {reviewer_name}', 'review', 'normal', 'View Review'),
('booking_new', 'New Booking Request', 'New booking request from {client_name} for {service_name}', 'booking', 'high', 'View Booking'),
('payment_received', 'Payment Received', 'Payment of {amount} received for {service_name}', 'payment', 'normal', 'View Payment'),
('system_announcement', 'System Announcement', '{message}', 'system', 'normal', 'Learn More'),
('reader_assigned', 'Reader Assignment', 'You have been assigned to {deck_name}', 'reader', 'normal', 'View Assignment'),
('deck_created', 'New Deck Created', 'New tarot deck "{deck_name}" has been created', 'tarot', 'normal', 'View Deck'),
('user_registered', 'New User Registration', 'New user {user_name} has registered', 'user', 'normal', 'View Profile'),
('security_alert', 'Security Alert', 'Security alert: {alert_message}', 'security', 'urgent', 'View Details'),
('test', 'Test Notification', 'This is a test notification to verify the system is working', 'general', 'normal', 'Dismiss')
ON CONFLICT (type) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    body_template = EXCLUDED.body_template,
    category = EXCLUDED.category,
    priority = EXCLUDED.priority,
    action_label = EXCLUDED.action_label,
    updated_at = NOW();

-- Create notification settings table for user preferences
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Create updated_at trigger for notifications
CREATE OR REPLACE FUNCTION update_notifications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_timestamp();

-- Create updated_at trigger for notification_templates
CREATE OR REPLACE FUNCTION update_notification_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_templates_timestamp();

-- Create updated_at trigger for notification_settings
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_settings_timestamp();

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all notifications"
    ON notifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can manage all notifications"
    ON notifications FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for notification_templates
CREATE POLICY "Everyone can view notification templates"
    ON notification_templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage notification templates"
    ON notification_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for notification_settings
CREATE POLICY "Users can manage their own notification settings"
    ON notification_settings FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all notification settings"
    ON notification_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

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
        -- Create test notifications
        INSERT INTO notifications (user_id, type, title, body, category, priority, data) VALUES
        (super_admin_id, 'test', 'Test Notification', 'This is a test notification to verify the system is working properly.', 'general', 'normal', '{"source": "system_initialization"}'),
        (super_admin_id, 'approval_pending', 'New Reader Approval Required', 'A new reader application requires your approval.', 'approval', 'high', '{"reader_name": "John Doe", "application_id": "12345"}'),
        (super_admin_id, 'review_new', 'New Review Received', 'You have received a new 5-star review.', 'review', 'normal', '{"reviewer": "Sarah Ahmed", "rating": 5}'),
        (super_admin_id, 'system_announcement', 'System Maintenance Scheduled', 'System maintenance is scheduled for tonight at 2:00 AM.', 'system', 'normal', '{"maintenance_time": "2025-07-12T02:00:00Z"}'),
        (super_admin_id, 'deck_created', 'New Tarot Deck Added', 'A new tarot deck "Cosmic Dreams" has been added to the system.', 'tarot', 'normal', '{"deck_name": "Cosmic Dreams", "deck_id": "cosmic-dreams-001"}');
        
        RAISE NOTICE 'Created sample notifications for super admin';
    ELSE
        RAISE NOTICE 'Super admin not found, skipping sample notifications';
    END IF;
END $$;

-- Create cleanup job information
COMMENT ON FUNCTION cleanup_expired_notifications() IS 'Cleans up expired notifications. Should be run periodically via cron job.';

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Notifications system schema created successfully';
    RAISE NOTICE 'Tables created: notifications, notification_templates, notification_settings';
    RAISE NOTICE 'Functions created: cleanup_expired_notifications, get_unread_notifications_count, mark_all_notifications_read, create_notification_from_template';
    RAISE NOTICE 'RLS policies enabled for all tables';
    RAISE NOTICE 'Sample notifications created for testing';
END $$; 