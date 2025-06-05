-- =====================================================
-- ENHANCED NOTIFICATION SYSTEM WITH SCHEDULING
-- =====================================================

-- First, add scheduled_at column to notification_logs table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_logs' 
        AND column_name = 'scheduled_at'
    ) THEN
        ALTER TABLE notification_logs 
        ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN is_scheduled BOOLEAN DEFAULT false,
        ADD COLUMN schedule_status VARCHAR(50) DEFAULT 'draft' 
            CHECK (schedule_status IN ('draft', 'scheduled', 'sent', 'failed', 'cancelled')),
        ADD COLUMN last_edit_allowed_until TIMESTAMP WITH TIME ZONE,
        ADD COLUMN notification_type VARCHAR(50) DEFAULT 'immediate' 
            CHECK (notification_type IN ('immediate', 'scheduled'));
    END IF;
END $$;

-- Add indexes for scheduled notifications
CREATE INDEX IF NOT EXISTS idx_notification_logs_scheduled_at ON notification_logs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_schedule_status ON notification_logs(schedule_status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_is_scheduled ON notification_logs(is_scheduled);

-- Update the delivery_status constraint to include new statuses
ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS valid_delivery_status;
ALTER TABLE notification_logs ADD CONSTRAINT valid_delivery_status 
    CHECK (delivery_status IN ('pending', 'sent', 'failed', 'partial', 'scheduled', 'cancelled'));

-- Update the schedule_status constraint
ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS valid_schedule_status;
ALTER TABLE notification_logs ADD CONSTRAINT valid_schedule_status 
    CHECK (schedule_status IN ('draft', 'scheduled', 'sent', 'failed', 'cancelled'));

-- Create function to automatically set last_edit_allowed_until
CREATE OR REPLACE FUNCTION set_edit_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- If scheduled_at is set, calculate the edit deadline (5 minutes before)
    IF NEW.scheduled_at IS NOT NULL THEN
        NEW.last_edit_allowed_until = NEW.scheduled_at - INTERVAL '5 minutes';
        NEW.is_scheduled = true;
        NEW.schedule_status = 'scheduled';
        NEW.notification_type = 'scheduled';
    ELSE
        NEW.is_scheduled = false;
        NEW.notification_type = 'immediate';
        NEW.schedule_status = 'draft';
        NEW.last_edit_allowed_until = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for the edit deadline function
DROP TRIGGER IF EXISTS set_notification_edit_deadline ON notification_logs;
CREATE TRIGGER set_notification_edit_deadline
    BEFORE INSERT OR UPDATE ON notification_logs
    FOR EACH ROW EXECUTE FUNCTION set_edit_deadline();

-- Create function to get pending scheduled notifications
CREATE OR REPLACE FUNCTION get_pending_scheduled_notifications()
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    message TEXT,
    target_audience VARCHAR(100),
    priority VARCHAR(50),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.message,
        n.target_audience,
        n.priority,
        n.scheduled_at,
        n.created_by
    FROM notification_logs n
    WHERE n.is_scheduled = true
      AND n.schedule_status = 'scheduled'
      AND n.scheduled_at <= NOW()
      AND n.delivery_status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Create function to mark notification as sent
CREATE OR REPLACE FUNCTION mark_notification_sent(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notification_logs 
    SET 
        delivery_status = 'sent',
        schedule_status = 'sent',
        sent_at = NOW()
    WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if notification can be edited
CREATE OR REPLACE FUNCTION can_edit_notification(notification_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    notification_record RECORD;
BEGIN
    SELECT * INTO notification_record 
    FROM notification_logs 
    WHERE id = notification_id;
    
    -- If not found, return false
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- If not scheduled, can always edit
    IF NOT notification_record.is_scheduled THEN
        RETURN true;
    END IF;
    
    -- If already sent, cancelled, or failed, cannot edit
    IF notification_record.schedule_status IN ('sent', 'cancelled', 'failed') THEN
        RETURN false;
    END IF;
    
    -- If scheduled and past edit deadline, cannot edit
    IF notification_record.last_edit_allowed_until IS NOT NULL 
       AND NOW() > notification_record.last_edit_allowed_until THEN
        RETURN false;
    END IF;
    
    -- Otherwise, can edit
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_pending_scheduled_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_sent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_notification(UUID) TO authenticated;

-- Insert sample data for testing (optional - remove in production)
-- This creates a few test scheduled notifications
/*
INSERT INTO notification_logs (title, message, target_audience, priority, scheduled_at, created_by)
VALUES 
    ('Test Scheduled Notification', 'This is a test scheduled notification', 'clients', 'normal', NOW() + INTERVAL '1 hour', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
    ('Maintenance Notice', 'System maintenance scheduled for tonight', 'all', 'high', NOW() + INTERVAL '2 hours', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));
*/

COMMENT ON COLUMN notification_logs.scheduled_at IS 'When the notification should be sent (NULL for immediate)';
COMMENT ON COLUMN notification_logs.is_scheduled IS 'Whether this notification is scheduled for future delivery';
COMMENT ON COLUMN notification_logs.schedule_status IS 'Status of the scheduled notification';
COMMENT ON COLUMN notification_logs.last_edit_allowed_until IS 'Latest time when notification can be edited (5 min before scheduled_at)';
COMMENT ON COLUMN notification_logs.notification_type IS 'Type of notification: immediate or scheduled';

COMMENT ON FUNCTION get_pending_scheduled_notifications() IS 'Returns all notifications ready to be sent';
COMMENT ON FUNCTION mark_notification_sent(UUID) IS 'Marks a notification as sent and updates timestamps';
COMMENT ON FUNCTION can_edit_notification(UUID) IS 'Checks if a notification can still be edited based on schedule rules'; 