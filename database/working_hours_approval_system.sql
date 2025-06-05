-- =====================================================
-- SAMIA TAROT - WORKING HOURS APPROVAL SYSTEM
-- Database Schema for Reader Schedule Management with Approval Workflow
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- READER SCHEDULE TABLE (Approved Working Hours)
-- =====================================================
CREATE TABLE IF NOT EXISTS reader_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Date and Time Information
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- Availability Details
    is_available BOOLEAN DEFAULT TRUE,
    max_bookings INTEGER DEFAULT 1, -- How many bookings can be taken in this slot
    buffer_minutes INTEGER DEFAULT 15, -- Buffer between bookings
    
    -- Recurring Pattern (for future use)
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern JSONB, -- {'type': 'weekly', 'days': [1,2,3]} etc.
    recurring_until DATE,
    
    -- Status and Metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'blocked')),
    notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT future_or_today CHECK (date >= CURRENT_DATE),
    CONSTRAINT one_year_limit CHECK (date <= CURRENT_DATE + INTERVAL '1 year'),
    CONSTRAINT no_overlap UNIQUE (reader_id, date, start_time, end_time)
);

-- =====================================================
-- WORKING HOURS APPROVAL REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS working_hours_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Request Type
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('add', 'edit', 'delete', 'bulk_add')),
    target_schedule_id UUID REFERENCES reader_schedule(id), -- For edit/delete operations
    
    -- Request Data
    requested_changes JSONB NOT NULL, -- The proposed schedule changes
    old_values JSONB, -- Previous values for edit operations
    
    -- Approval Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    admin_id UUID REFERENCES profiles(id), -- Who reviewed the request
    review_reason TEXT, -- Reason for approval/rejection
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    request_notes TEXT, -- Reader's notes about the request
    metadata JSONB DEFAULT '{}', -- Additional data (IP, browser, etc.)
    
    -- Constraints
    CONSTRAINT valid_reviewer CHECK (
        (status = 'pending' AND admin_id IS NULL AND reviewed_at IS NULL) OR
        (status IN ('approved', 'rejected') AND admin_id IS NOT NULL AND reviewed_at IS NOT NULL) OR
        (status = 'cancelled' AND reviewed_at IS NULL)
    )
);

-- =====================================================
-- WORKING HOURS AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS working_hours_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES working_hours_requests(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES reader_schedule(id), -- If changes were applied
    
    -- Action Details
    action VARCHAR(30) NOT NULL CHECK (action IN (
        'request_submitted', 'request_approved', 'request_rejected', 
        'request_cancelled', 'changes_applied', 'schedule_created',
        'schedule_updated', 'schedule_deleted'
    )),
    performed_by UUID NOT NULL REFERENCES profiles(id),
    
    -- Additional Information
    details JSONB DEFAULT '{}',
    old_data JSONB,
    new_data JSONB,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BOOKING WINDOW ENFORCEMENT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_window_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Global Settings
    client_booking_window_days INTEGER DEFAULT 31, -- Clients can book up to 31 days ahead
    reader_planning_window_days INTEGER DEFAULT 365, -- Readers can plan up to 1 year ahead
    minimum_notice_hours INTEGER DEFAULT 2, -- Minimum notice for bookings
    
    -- VIP Settings
    vip_booking_window_days INTEGER DEFAULT 90, -- VIP clients can book further ahead
    emergency_booking_window_hours INTEGER DEFAULT 0, -- Emergency bookings (immediate)
    
    -- System Settings
    auto_approve_recurring BOOLEAN DEFAULT FALSE, -- Auto-approve recurring schedule requests
    require_admin_approval BOOLEAN DEFAULT TRUE, -- All schedule changes need approval
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Reader Schedule Indexes
CREATE INDEX IF NOT EXISTS idx_reader_schedule_reader_id ON reader_schedule(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_schedule_date ON reader_schedule(date);
CREATE INDEX IF NOT EXISTS idx_reader_schedule_reader_date ON reader_schedule(reader_id, date);
CREATE INDEX IF NOT EXISTS idx_reader_schedule_status ON reader_schedule(status);
CREATE INDEX IF NOT EXISTS idx_reader_schedule_available ON reader_schedule(is_available);

-- Working Hours Requests Indexes
CREATE INDEX IF NOT EXISTS idx_working_hours_requests_reader_id ON working_hours_requests(reader_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_requests_status ON working_hours_requests(status);
CREATE INDEX IF NOT EXISTS idx_working_hours_requests_admin_id ON working_hours_requests(admin_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_requests_created_at ON working_hours_requests(created_at DESC);

-- Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_working_hours_audit_request_id ON working_hours_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_audit_schedule_id ON working_hours_audit(schedule_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_audit_performed_by ON working_hours_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_working_hours_audit_created_at ON working_hours_audit(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE reader_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_window_settings ENABLE ROW LEVEL SECURITY;

-- Reader Schedule Policies
CREATE POLICY "readers_view_own_schedule" ON reader_schedule
    FOR SELECT USING (reader_id = auth.uid());

CREATE POLICY "admins_view_all_schedules" ON reader_schedule
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'monitor')
        )
    );

-- Clients can view approved schedules for booking (within 31 days)
CREATE POLICY "clients_view_bookable_schedules" ON reader_schedule
    FOR SELECT USING (
        status = 'active' 
        AND is_available = TRUE 
        AND date >= CURRENT_DATE 
        AND date <= CURRENT_DATE + INTERVAL '31 days'
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'client'
        )
    );

-- Working Hours Requests Policies
CREATE POLICY "readers_view_own_requests" ON working_hours_requests
    FOR SELECT USING (reader_id = auth.uid());

CREATE POLICY "readers_submit_requests" ON working_hours_requests
    FOR INSERT WITH CHECK (
        reader_id = auth.uid() 
        AND status = 'pending'
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'reader'
        )
    );

CREATE POLICY "readers_cancel_own_requests" ON working_hours_requests
    FOR UPDATE USING (
        reader_id = auth.uid() 
        AND status = 'pending'
    ) WITH CHECK (
        status = 'cancelled'
    );

CREATE POLICY "admins_view_all_requests" ON working_hours_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "admins_review_requests" ON working_hours_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    ) WITH CHECK (
        status IN ('approved', 'rejected') 
        AND admin_id = auth.uid()
    );

-- Audit Log Policies
CREATE POLICY "users_view_own_audit" ON working_hours_audit
    FOR SELECT USING (
        performed_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM working_hours_requests whr 
            WHERE whr.id = working_hours_audit.request_id 
            AND whr.reader_id = auth.uid()
        )
    );

CREATE POLICY "admins_view_all_audit" ON working_hours_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'monitor')
        )
    );

-- Booking Window Settings Policies
CREATE POLICY "admins_manage_settings" ON booking_window_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "all_view_settings" ON booking_window_settings
    FOR SELECT USING (TRUE);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to submit working hours request
CREATE OR REPLACE FUNCTION submit_working_hours_request(
    p_action_type TEXT,
    p_target_schedule_id UUID DEFAULT NULL,
    p_requested_changes JSONB,
    p_old_values JSONB DEFAULT NULL,
    p_request_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    request_id UUID;
    user_role TEXT;
BEGIN
    -- Verify user is a reader
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid();
    
    IF user_role != 'reader' THEN
        RAISE EXCEPTION 'Only readers can submit working hours requests';
    END IF;
    
    -- Validate the requested changes based on business rules
    PERFORM validate_working_hours_request(p_action_type, p_requested_changes);
    
    -- Insert the request
    INSERT INTO working_hours_requests (
        reader_id, action_type, target_schedule_id, 
        requested_changes, old_values, request_notes,
        metadata
    ) VALUES (
        auth.uid(), p_action_type, p_target_schedule_id,
        p_requested_changes, p_old_values, p_request_notes,
        jsonb_build_object(
            'user_agent', current_setting('request.headers', true)::json->>'user-agent',
            'timestamp', NOW()
        )
    ) RETURNING id INTO request_id;
    
    -- Log the action
    INSERT INTO working_hours_audit (
        request_id, action, performed_by, details, new_data
    ) VALUES (
        request_id, 'request_submitted', auth.uid(),
        jsonb_build_object('action_type', p_action_type),
        p_requested_changes
    );
    
    RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate working hours request
CREATE OR REPLACE FUNCTION validate_working_hours_request(
    p_action_type TEXT,
    p_requested_changes JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    schedule_date DATE;
    start_time TIME;
    end_time TIME;
BEGIN
    -- Extract date and time information
    schedule_date := (p_requested_changes->>'date')::DATE;
    start_time := (p_requested_changes->>'start_time')::TIME;
    end_time := (p_requested_changes->>'end_time')::TIME;
    
    -- Validate date is not in the past
    IF schedule_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot schedule working hours in the past';
    END IF;
    
    -- Validate date is within 1 year
    IF schedule_date > CURRENT_DATE + INTERVAL '1 year' THEN
        RAISE EXCEPTION 'Cannot schedule working hours more than 1 year in advance';
    END IF;
    
    -- Validate time range
    IF start_time >= end_time THEN
        RAISE EXCEPTION 'Start time must be before end time';
    END IF;
    
    -- For add/edit operations, check for conflicts (excluding the current record for edits)
    IF p_action_type IN ('add', 'edit') THEN
        IF EXISTS (
            SELECT 1 FROM reader_schedule rs
            WHERE rs.reader_id = auth.uid()
            AND rs.date = schedule_date
            AND rs.status = 'active'
            AND (
                (start_time >= rs.start_time AND start_time < rs.end_time) OR
                (end_time > rs.start_time AND end_time <= rs.end_time) OR
                (start_time <= rs.start_time AND end_time >= rs.end_time)
            )
            -- For edit operations, exclude the current record
            AND (p_action_type = 'add' OR rs.id != (p_requested_changes->>'id')::UUID)
        ) THEN
            RAISE EXCEPTION 'Schedule conflict: overlapping time slots detected';
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to review working hours request (admin only)
CREATE OR REPLACE FUNCTION review_working_hours_request(
    p_request_id UUID,
    p_action TEXT, -- 'approved' or 'rejected'
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    request_record working_hours_requests%ROWTYPE;
    user_role TEXT;
BEGIN
    -- Verify user is admin/super_admin
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid();
    
    IF user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Only administrators can review working hours requests';
    END IF;
    
    -- Get the request
    SELECT * INTO request_record
    FROM working_hours_requests
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already reviewed';
    END IF;
    
    -- Update the request
    UPDATE working_hours_requests
    SET 
        status = p_action,
        admin_id = auth.uid(),
        review_reason = p_reason,
        reviewed_at = NOW()
    WHERE id = p_request_id;
    
    -- Log the action
    INSERT INTO working_hours_audit (
        request_id, action, performed_by, details
    ) VALUES (
        p_request_id, 
        CASE WHEN p_action = 'approved' THEN 'request_approved' ELSE 'request_rejected' END,
        auth.uid(),
        jsonb_build_object('reason', p_reason)
    );
    
    -- If approved, apply the changes
    IF p_action = 'approved' THEN
        PERFORM apply_working_hours_changes(p_request_id);
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply approved working hours changes
CREATE OR REPLACE FUNCTION apply_working_hours_changes(p_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    request_record working_hours_requests%ROWTYPE;
    schedule_id UUID;
    changes JSONB;
BEGIN
    -- Get the approved request
    SELECT * INTO request_record
    FROM working_hours_requests
    WHERE id = p_request_id AND status = 'approved';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or not approved';
    END IF;
    
    changes := request_record.requested_changes;
    
    -- Apply changes based on action type
    CASE request_record.action_type
        WHEN 'add', 'bulk_add' THEN
            -- Add new schedule slots
            IF request_record.action_type = 'bulk_add' THEN
                -- Handle bulk addition (multiple slots)
                INSERT INTO reader_schedule (
                    reader_id, date, start_time, end_time, timezone,
                    is_available, max_bookings, buffer_minutes, notes, created_by
                )
                SELECT 
                    request_record.reader_id,
                    (slot->>'date')::DATE,
                    (slot->>'start_time')::TIME,
                    (slot->>'end_time')::TIME,
                    COALESCE((slot->>'timezone')::TEXT, 'UTC'),
                    COALESCE((slot->>'is_available')::BOOLEAN, TRUE),
                    COALESCE((slot->>'max_bookings')::INTEGER, 1),
                    COALESCE((slot->>'buffer_minutes')::INTEGER, 15),
                    (slot->>'notes')::TEXT,
                    auth.uid()
                FROM jsonb_array_elements(changes->'slots') AS slot;
            ELSE
                -- Single slot addition
                INSERT INTO reader_schedule (
                    reader_id, date, start_time, end_time, timezone,
                    is_available, max_bookings, buffer_minutes, notes, created_by
                ) VALUES (
                    request_record.reader_id,
                    (changes->>'date')::DATE,
                    (changes->>'start_time')::TIME,
                    (changes->>'end_time')::TIME,
                    COALESCE((changes->>'timezone')::TEXT, 'UTC'),
                    COALESCE((changes->>'is_available')::BOOLEAN, TRUE),
                    COALESCE((changes->>'max_bookings')::INTEGER, 1),
                    COALESCE((changes->>'buffer_minutes')::INTEGER, 15),
                    (changes->>'notes')::TEXT,
                    auth.uid()
                ) RETURNING id INTO schedule_id;
            END IF;
            
        WHEN 'edit' THEN
            -- Update existing schedule slot
            UPDATE reader_schedule
            SET 
                date = COALESCE((changes->>'date')::DATE, date),
                start_time = COALESCE((changes->>'start_time')::TIME, start_time),
                end_time = COALESCE((changes->>'end_time')::TIME, end_time),
                timezone = COALESCE((changes->>'timezone')::TEXT, timezone),
                is_available = COALESCE((changes->>'is_available')::BOOLEAN, is_available),
                max_bookings = COALESCE((changes->>'max_bookings')::INTEGER, max_bookings),
                buffer_minutes = COALESCE((changes->>'buffer_minutes')::INTEGER, buffer_minutes),
                notes = COALESCE((changes->>'notes')::TEXT, notes),
                updated_at = NOW()
            WHERE id = request_record.target_schedule_id 
            AND reader_id = request_record.reader_id
            RETURNING id INTO schedule_id;
            
        WHEN 'delete' THEN
            -- Delete schedule slot (soft delete by changing status)
            UPDATE reader_schedule
            SET 
                status = 'cancelled',
                updated_at = NOW()
            WHERE id = request_record.target_schedule_id 
            AND reader_id = request_record.reader_id
            RETURNING id INTO schedule_id;
    END CASE;
    
    -- Log that changes were applied
    INSERT INTO working_hours_audit (
        request_id, schedule_id, action, performed_by, details, new_data
    ) VALUES (
        p_request_id, schedule_id, 'changes_applied', auth.uid(),
        jsonb_build_object('action_type', request_record.action_type),
        changes
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel pending request (by reader)
CREATE OR REPLACE FUNCTION cancel_working_hours_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify ownership and status
    IF NOT EXISTS (
        SELECT 1 FROM working_hours_requests 
        WHERE id = p_request_id 
        AND reader_id = auth.uid() 
        AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Request not found, not owned by user, or already reviewed';
    END IF;
    
    -- Update status to cancelled
    UPDATE working_hours_requests
    SET status = 'cancelled'
    WHERE id = p_request_id;
    
    -- Log the action
    INSERT INTO working_hours_audit (
        request_id, action, performed_by
    ) VALUES (
        p_request_id, 'request_cancelled', auth.uid()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available slots for booking (clients)
CREATE OR REPLACE FUNCTION get_available_booking_slots(
    p_reader_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
    schedule_id UUID,
    reader_id UUID,
    reader_name TEXT,
    date DATE,
    start_time TIME,
    end_time TIME,
    timezone TEXT,
    max_bookings INTEGER,
    current_bookings INTEGER,
    available_slots INTEGER
) AS $$
BEGIN
    -- Set default end date if not provided (31 days for clients)
    IF p_end_date IS NULL THEN
        p_end_date := CURRENT_DATE + INTERVAL '31 days';
    END IF;
    
    RETURN QUERY
    SELECT 
        rs.id,
        rs.reader_id,
        CONCAT(p.first_name, ' ', p.last_name) as reader_name,
        rs.date,
        rs.start_time,
        rs.end_time,
        rs.timezone,
        rs.max_bookings,
        COALESCE(booking_counts.current_bookings, 0) as current_bookings,
        GREATEST(0, rs.max_bookings - COALESCE(booking_counts.current_bookings, 0)) as available_slots
    FROM reader_schedule rs
    JOIN profiles p ON p.id = rs.reader_id
    LEFT JOIN (
        SELECT 
            b.reader_id,
            b.scheduled_at::DATE as booking_date,
            EXTRACT(HOUR FROM b.scheduled_at)::INTEGER as booking_hour,
            COUNT(*) as current_bookings
        FROM bookings b
        WHERE b.status IN ('confirmed', 'in_progress')
        GROUP BY b.reader_id, b.scheduled_at::DATE, EXTRACT(HOUR FROM b.scheduled_at)
    ) booking_counts ON (
        booking_counts.reader_id = rs.reader_id 
        AND booking_counts.booking_date = rs.date 
        AND booking_counts.booking_hour = EXTRACT(HOUR FROM rs.start_time)
    )
    WHERE rs.status = 'active'
    AND rs.is_available = TRUE
    AND rs.date >= p_start_date
    AND rs.date <= p_end_date
    AND (p_reader_id IS NULL OR rs.reader_id = p_reader_id)
    AND p.role = 'reader'
    AND p.is_active = TRUE
    ORDER BY rs.date, rs.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS FOR EASIER QUERYING
-- =====================================================

-- View for reader's working hours requests
CREATE OR REPLACE VIEW my_working_hours_requests AS
SELECT 
    whr.*,
    admin_p.first_name as admin_first_name,
    admin_p.last_name as admin_last_name,
    admin_p.email as admin_email
FROM working_hours_requests whr
LEFT JOIN profiles admin_p ON admin_p.id = whr.admin_id
WHERE whr.reader_id = auth.uid()
ORDER BY whr.created_at DESC;

-- View for admin approval queue
CREATE OR REPLACE VIEW pending_working_hours_requests AS
SELECT 
    whr.*,
    reader_p.first_name as reader_first_name,
    reader_p.last_name as reader_last_name,
    reader_p.email as reader_email,
    reader_p.avatar_url as reader_avatar
FROM working_hours_requests whr
JOIN profiles reader_p ON reader_p.id = whr.reader_id
WHERE whr.status = 'pending'
ORDER BY whr.created_at ASC;

-- View for reader's current schedule
CREATE OR REPLACE VIEW my_schedule AS
SELECT 
    rs.*,
    CASE 
        WHEN rs.date < CURRENT_DATE THEN 'past'
        WHEN rs.date = CURRENT_DATE THEN 'today'
        ELSE 'future'
    END as schedule_period
FROM reader_schedule rs
WHERE rs.reader_id = auth.uid()
AND rs.status = 'active'
ORDER BY rs.date, rs.start_time;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default booking window settings
INSERT INTO booking_window_settings (
    client_booking_window_days,
    reader_planning_window_days,
    minimum_notice_hours,
    vip_booking_window_days,
    emergency_booking_window_hours,
    auto_approve_recurring,
    require_admin_approval
) VALUES (
    31,    -- Clients can book 31 days ahead
    365,   -- Readers can plan 1 year ahead
    2,     -- Minimum 2 hours notice
    90,    -- VIP clients can book 90 days ahead
    0,     -- Emergency bookings are immediate
    FALSE, -- Don't auto-approve recurring schedules
    TRUE   -- Require admin approval for all changes
) ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION submit_working_hours_request TO authenticated;
GRANT EXECUTE ON FUNCTION review_working_hours_request TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_working_hours_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_booking_slots TO authenticated;
GRANT EXECUTE ON FUNCTION validate_working_hours_request TO authenticated;

-- Grant access to views
GRANT SELECT ON my_working_hours_requests TO authenticated;
GRANT SELECT ON pending_working_hours_requests TO authenticated;
GRANT SELECT ON my_schedule TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE reader_schedule IS 'Stores approved working hours for readers';
COMMENT ON TABLE working_hours_requests IS 'Approval requests for working hours changes';
COMMENT ON TABLE working_hours_audit IS 'Audit trail for all working hours related actions';
COMMENT ON TABLE booking_window_settings IS 'Global settings for booking windows and restrictions';

COMMENT ON FUNCTION submit_working_hours_request IS 'Submit a new working hours change request';
COMMENT ON FUNCTION review_working_hours_request IS 'Approve or reject working hours requests (admin only)';
COMMENT ON FUNCTION apply_working_hours_changes IS 'Apply approved changes to reader schedule';
COMMENT ON FUNCTION get_available_booking_slots IS 'Get available booking slots for clients'; 