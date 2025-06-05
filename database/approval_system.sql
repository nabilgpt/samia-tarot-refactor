-- ===================================
-- SAMIA TAROT - READER APPROVAL SYSTEM
-- ===================================

-- 1. Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('add', 'edit', 'delete')),
    target TEXT NOT NULL CHECK (target IN ('profile', 'service', 'schedule', 'working_hours', 'calendar', 'price', 'bio', 'specialties', 'media')),
    target_id UUID, -- References the specific row being changed (nullable for new additions)
    old_value JSONB, -- Previous data (null for additions)
    new_value JSONB NOT NULL, -- Proposed changes
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    admin_id UUID REFERENCES auth.users(id), -- Who reviewed the request
    review_reason TEXT, -- Reason for approval/rejection
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}', -- Additional metadata (IP, browser, etc.)
    
    -- Constraints
    CONSTRAINT approval_requests_reviewer_check CHECK (
        (status = 'pending' AND admin_id IS NULL AND reviewed_at IS NULL) OR
        (status IN ('approved', 'rejected') AND admin_id IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_user_id ON approval_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_target ON approval_requests(target);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_admin_id ON approval_requests(admin_id);

-- 2. Enable RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Policy for readers to see only their own requests
CREATE POLICY "readers_own_requests" ON approval_requests
    FOR SELECT
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'reader'
        )
    );

-- Policy for readers to insert their own requests
CREATE POLICY "readers_insert_requests" ON approval_requests
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        status = 'pending' AND
        admin_id IS NULL AND
        reviewed_at IS NULL AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'reader'
        )
    );

-- Policy for readers to update their own pending requests (only to cancel)
CREATE POLICY "readers_cancel_requests" ON approval_requests
    FOR UPDATE
    USING (
        auth.uid() = user_id AND
        status = 'pending' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'reader'
        )
    )
    WITH CHECK (
        status = 'cancelled' AND
        admin_id IS NULL AND
        reviewed_at IS NULL
    );

-- Policy for admins/superadmins to see all requests
CREATE POLICY "admins_view_all_requests" ON approval_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policy for admins/superadmins to approve/reject requests
CREATE POLICY "admins_review_requests" ON approval_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        status IN ('approved', 'rejected') AND
        admin_id = auth.uid() AND
        reviewed_at IS NOT NULL
    );

-- 4. Create audit log for approval actions
CREATE TABLE IF NOT EXISTS approval_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'cancelled', 'applied')),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_approval_audit_log_request_id ON approval_audit_log(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_performed_by ON approval_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_performed_at ON approval_audit_log(performed_at DESC);

-- Enable RLS for audit log
ALTER TABLE approval_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for admins to see all audit logs
CREATE POLICY "admins_view_audit_logs" ON approval_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policy for users to see audit logs for their own requests
CREATE POLICY "users_view_own_audit_logs" ON approval_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM approval_requests ar
            JOIN profiles p ON p.user_id = auth.uid()
            WHERE ar.id = approval_audit_log.approval_request_id
            AND ar.user_id = auth.uid()
        )
    );

-- Policy for system to insert audit logs
CREATE POLICY "system_insert_audit_logs" ON approval_audit_log
    FOR INSERT
    WITH CHECK (performed_by = auth.uid());

-- 5. Functions for approval workflow

-- Function to submit approval request
CREATE OR REPLACE FUNCTION submit_approval_request(
    p_action_type TEXT,
    p_target TEXT,
    p_target_id UUID DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    request_id UUID;
    user_role TEXT;
BEGIN
    -- Verify user is a reader
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = auth.uid();
    
    IF user_role != 'reader' THEN
        RAISE EXCEPTION 'Only readers can submit approval requests';
    END IF;
    
    -- Insert approval request
    INSERT INTO approval_requests (
        user_id, action_type, target, target_id, 
        old_value, new_value, metadata
    ) VALUES (
        auth.uid(), p_action_type, p_target, p_target_id,
        p_old_value, p_new_value, p_metadata
    ) RETURNING id INTO request_id;
    
    -- Log the action
    INSERT INTO approval_audit_log (
        approval_request_id, action, performed_by, details
    ) VALUES (
        request_id, 'submitted', auth.uid(), 
        jsonb_build_object('target', p_target, 'action_type', p_action_type)
    );
    
    RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve/reject request
CREATE OR REPLACE FUNCTION review_approval_request(
    p_request_id UUID,
    p_action TEXT, -- 'approved' or 'rejected'
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    request_record approval_requests%ROWTYPE;
    user_role TEXT;
BEGIN
    -- Verify user is admin/superadmin
    SELECT role INTO user_role
    FROM profiles
    WHERE user_id = auth.uid();
    
    IF user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Only admins can review approval requests';
    END IF;
    
    -- Get the request
    SELECT * INTO request_record
    FROM approval_requests
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already reviewed';
    END IF;
    
    -- Update the request
    UPDATE approval_requests
    SET 
        status = p_action,
        admin_id = auth.uid(),
        review_reason = p_reason,
        reviewed_at = NOW()
    WHERE id = p_request_id;
    
    -- Log the action
    INSERT INTO approval_audit_log (
        approval_request_id, action, performed_by, details
    ) VALUES (
        p_request_id, p_action, auth.uid(),
        jsonb_build_object('reason', p_reason)
    );
    
    -- If approved, apply the changes
    IF p_action = 'approved' THEN
        PERFORM apply_approved_changes(p_request_id);
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply approved changes to main tables
CREATE OR REPLACE FUNCTION apply_approved_changes(p_request_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    request_record approval_requests%ROWTYPE;
    target_table TEXT;
    update_query TEXT;
BEGIN
    -- Get the approved request
    SELECT * INTO request_record
    FROM approval_requests
    WHERE id = p_request_id AND status = 'approved';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or not approved';
    END IF;
    
    -- Apply changes based on target type
    CASE request_record.target
        WHEN 'profile' THEN
            -- Update profiles table
            IF request_record.action_type = 'edit' THEN
                UPDATE profiles 
                SET 
                    first_name = COALESCE((request_record.new_value->>'first_name')::TEXT, first_name),
                    last_name = COALESCE((request_record.new_value->>'last_name')::TEXT, last_name),
                    bio = COALESCE((request_record.new_value->>'bio')::TEXT, bio),
                    phone = COALESCE((request_record.new_value->>'phone')::TEXT, phone),
                    date_of_birth = COALESCE((request_record.new_value->>'date_of_birth')::DATE, date_of_birth),
                    location = COALESCE((request_record.new_value->>'location')::TEXT, location),
                    updated_at = NOW()
                WHERE user_id = request_record.user_id;
            END IF;
            
        WHEN 'service' THEN
            -- Handle service changes
            IF request_record.action_type = 'add' THEN
                INSERT INTO reader_services (
                    reader_id, service_id, price, duration_minutes, is_active
                ) VALUES (
                    request_record.user_id,
                    (request_record.new_value->>'service_id')::UUID,
                    (request_record.new_value->>'price')::DECIMAL,
                    (request_record.new_value->>'duration_minutes')::INTEGER,
                    COALESCE((request_record.new_value->>'is_active')::BOOLEAN, TRUE)
                );
            ELSIF request_record.action_type = 'edit' THEN
                UPDATE reader_services
                SET 
                    price = COALESCE((request_record.new_value->>'price')::DECIMAL, price),
                    duration_minutes = COALESCE((request_record.new_value->>'duration_minutes')::INTEGER, duration_minutes),
                    is_active = COALESCE((request_record.new_value->>'is_active')::BOOLEAN, is_active),
                    updated_at = NOW()
                WHERE id = request_record.target_id AND reader_id = request_record.user_id;
            ELSIF request_record.action_type = 'delete' THEN
                DELETE FROM reader_services
                WHERE id = request_record.target_id AND reader_id = request_record.user_id;
            END IF;
            
        WHEN 'schedule' THEN
            -- Handle schedule changes
            IF request_record.action_type = 'add' THEN
                INSERT INTO reader_availability (
                    reader_id, day_of_week, start_time, end_time, is_available
                ) VALUES (
                    request_record.user_id,
                    (request_record.new_value->>'day_of_week')::INTEGER,
                    (request_record.new_value->>'start_time')::TIME,
                    (request_record.new_value->>'end_time')::TIME,
                    COALESCE((request_record.new_value->>'is_available')::BOOLEAN, TRUE)
                );
            ELSIF request_record.action_type = 'edit' THEN
                UPDATE reader_availability
                SET 
                    start_time = COALESCE((request_record.new_value->>'start_time')::TIME, start_time),
                    end_time = COALESCE((request_record.new_value->>'end_time')::TIME, end_time),
                    is_available = COALESCE((request_record.new_value->>'is_available')::BOOLEAN, is_available),
                    updated_at = NOW()
                WHERE id = request_record.target_id AND reader_id = request_record.user_id;
            ELSIF request_record.action_type = 'delete' THEN
                DELETE FROM reader_availability
                WHERE id = request_record.target_id AND reader_id = request_record.user_id;
            END IF;
    END CASE;
    
    -- Log that changes were applied
    INSERT INTO approval_audit_log (
        approval_request_id, action, performed_by, details
    ) VALUES (
        p_request_id, 'applied', auth.uid(),
        jsonb_build_object('target', request_record.target, 'action_type', request_record.action_type)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel pending request (by reader)
CREATE OR REPLACE FUNCTION cancel_approval_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    request_record approval_requests%ROWTYPE;
BEGIN
    -- Get the request and verify ownership
    SELECT * INTO request_record
    FROM approval_requests
    WHERE id = p_request_id AND user_id = auth.uid() AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found, not owned by user, or already reviewed';
    END IF;
    
    -- Update status to cancelled
    UPDATE approval_requests
    SET status = 'cancelled'
    WHERE id = p_request_id;
    
    -- Log the action
    INSERT INTO approval_audit_log (
        approval_request_id, action, performed_by
    ) VALUES (
        p_request_id, 'cancelled', auth.uid()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Views for easier querying

-- View for pending requests with user details
CREATE OR REPLACE VIEW pending_approval_requests AS
SELECT 
    ar.*,
    p.first_name,
    p.last_name,
    p.email,
    p.avatar_url,
    admin_p.first_name as admin_first_name,
    admin_p.last_name as admin_last_name
FROM approval_requests ar
JOIN profiles p ON p.user_id = ar.user_id
LEFT JOIN profiles admin_p ON admin_p.user_id = ar.admin_id
WHERE ar.status = 'pending'
ORDER BY ar.created_at DESC;

-- View for reader's own requests
CREATE OR REPLACE VIEW my_approval_requests AS
SELECT 
    ar.*,
    admin_p.first_name as admin_first_name,
    admin_p.last_name as admin_last_name
FROM approval_requests ar
LEFT JOIN profiles admin_p ON admin_p.user_id = ar.admin_id
WHERE ar.user_id = auth.uid()
ORDER BY ar.created_at DESC;

-- 7. Triggers for automatic notifications (optional)

-- Trigger function to send notifications
CREATE OR REPLACE FUNCTION notify_approval_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for status changes
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
        INSERT INTO notifications (
            user_id, type, title, message, metadata
        ) VALUES (
            NEW.user_id,
            'approval_status',
            CASE 
                WHEN NEW.status = 'approved' THEN 'Request Approved'
                ELSE 'Request Rejected'
            END,
            CASE 
                WHEN NEW.status = 'approved' THEN 'Your ' || NEW.target || ' change has been approved.'
                ELSE 'Your ' || NEW.target || ' change has been rejected. Reason: ' || COALESCE(NEW.review_reason, 'No reason provided.')
            END,
            jsonb_build_object(
                'approval_request_id', NEW.id,
                'target', NEW.target,
                'action_type', NEW.action_type
            )
        );
        
        -- Notify admins of new pending requests
        INSERT INTO notifications (
            user_id, type, title, message, metadata
        )
        SELECT 
            p.user_id,
            'new_approval_request',
            'New Approval Request',
            'A reader has submitted a new ' || NEW.target || ' change request.',
            jsonb_build_object(
                'approval_request_id', NEW.id,
                'target', NEW.target,
                'action_type', NEW.action_type,
                'requester_name', req_p.first_name || ' ' || req_p.last_name
            )
        FROM profiles p
        CROSS JOIN profiles req_p
        WHERE p.role IN ('admin', 'super_admin')
        AND req_p.user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_approval_status_notification
    AFTER UPDATE ON approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_approval_status_change();

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION submit_approval_request TO authenticated;
GRANT EXECUTE ON FUNCTION review_approval_request TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_approval_request TO authenticated;
GRANT SELECT ON pending_approval_requests TO authenticated;
GRANT SELECT ON my_approval_requests TO authenticated; 