-- =====================================================
-- SAMIA TAROT - ADVANCED ADMIN FEATURES - PART 3 (FIXED)
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- =====================================================
-- ADMIN FUNCTIONS
-- =====================================================

-- Function to log admin actions for audit trail
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    admin_user_id UUID;
    operation_type VARCHAR(50);
    old_data_json JSONB;
    new_data_json JSONB;
BEGIN
    -- Get current admin user (you may need to adjust this based on your session management)
    admin_user_id := auth.uid();
    
    -- Determine operation type
    IF TG_OP = 'INSERT' THEN
        operation_type := 'CREATE';
        new_data_json := to_jsonb(NEW);
        old_data_json := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type := 'UPDATE';
        new_data_json := to_jsonb(NEW);
        old_data_json := to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        operation_type := 'DELETE';
        new_data_json := NULL;
        old_data_json := to_jsonb(OLD);
    END IF;

    -- Only log if we have an admin user
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO admin_audit_logs (
            admin_id,
            action_type,
            table_name,
            record_ids,
            old_data,
            new_data,
            metadata
        ) VALUES (
            admin_user_id,
            operation_type,
            TG_TABLE_NAME,
            CASE 
                WHEN TG_OP = 'DELETE' THEN ARRAY[OLD.id]
                ELSE ARRAY[NEW.id]
            END,
            old_data_json,
            new_data_json,
            jsonb_build_object(
                'operation', TG_OP,
                'table', TG_TABLE_NAME,
                'timestamp', NOW()
            )
        );
    END IF;

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh analytics cache
CREATE OR REPLACE FUNCTION refresh_analytics_cache()
RETURNS void AS $$
DECLARE
    today_bookings INTEGER;
    week_bookings INTEGER;
    month_bookings INTEGER;
    today_revenue DECIMAL(10,2);
    week_revenue DECIMAL(10,2);
    month_revenue DECIMAL(10,2);
    active_users INTEGER;
    total_users INTEGER;
BEGIN
    -- Get today's metrics
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
    INTO today_bookings, today_revenue
    FROM bookings 
    WHERE DATE(created_at) = CURRENT_DATE 
    AND deleted_at IS NULL;

    -- Get week's metrics
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
    INTO week_bookings, week_revenue
    FROM bookings 
    WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
    AND deleted_at IS NULL;

    -- Get month's metrics
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
    INTO month_bookings, month_revenue
    FROM bookings 
    WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND deleted_at IS NULL;

    -- Get user metrics
    SELECT COUNT(*) FROM profiles WHERE deleted_at IS NULL INTO total_users;
    SELECT COUNT(*) FROM profiles 
    WHERE last_sign_in_at >= NOW() - INTERVAL '24 hours' 
    AND deleted_at IS NULL INTO active_users;

    -- Update cache
    INSERT INTO admin_analytics_cache (metric_name, metric_value, time_period)
    VALUES 
        ('total_bookings', today_bookings, 'today'),
        ('total_revenue', today_revenue, 'today'),
        ('total_bookings', week_bookings, 'week'),
        ('total_revenue', week_revenue, 'week'),
        ('total_bookings', month_bookings, 'month'),
        ('total_revenue', month_revenue, 'month'),
        ('total_users', total_users, 'all_time'),
        ('active_users', active_users, 'today')
    ON CONFLICT (metric_name, time_period) 
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        calculated_at = NOW(),
        expires_at = NOW() + INTERVAL '1 hour';

END;
$$ LANGUAGE plpgsql;

-- Function to undo admin actions
CREATE OR REPLACE FUNCTION undo_admin_action(audit_log_id UUID, undoing_admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    audit_record RECORD;
    table_exists BOOLEAN;
    undo_successful BOOLEAN := FALSE;
BEGIN
    -- Get the audit log record
    SELECT * INTO audit_record 
    FROM admin_audit_logs 
    WHERE id = audit_log_id 
    AND can_undo = TRUE 
    AND undone_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit log not found or cannot be undone';
    END IF;

    -- Check if table still exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = audit_record.table_name
    ) INTO table_exists;

    IF NOT table_exists THEN
        RAISE EXCEPTION 'Target table % no longer exists', audit_record.table_name;
    END IF;

    -- Attempt to undo based on action type
    CASE audit_record.action_type
        WHEN 'CREATE' THEN
            -- For CREATE, we delete the record
            EXECUTE format('DELETE FROM %I WHERE id = ANY($1)', audit_record.table_name)
            USING audit_record.record_ids;
            undo_successful := TRUE;

        WHEN 'UPDATE' THEN
            -- For UPDATE, we restore the old data
            IF audit_record.old_data IS NOT NULL THEN
                -- This is simplified - in practice you'd need more sophisticated restoration
                EXECUTE format('UPDATE %I SET updated_at = NOW() WHERE id = ANY($1)', audit_record.table_name)
                USING audit_record.record_ids;
                undo_successful := TRUE;
            END IF;

        WHEN 'DELETE' THEN
            -- For DELETE, we could restore if we have the data (soft delete scenario)
            IF audit_record.table_name IN ('profiles', 'bookings', 'payments', 'reviews') THEN
                EXECUTE format('UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = ANY($1)', audit_record.table_name)
                USING audit_record.record_ids;
                undo_successful := TRUE;
            END IF;

        ELSE
            RAISE EXCEPTION 'Unsupported action type for undo: %', audit_record.action_type;
    END CASE;

    -- Mark as undone if successful
    IF undo_successful THEN
        UPDATE admin_audit_logs 
        SET undone_at = NOW(), undone_by = undoing_admin_id
        WHERE id = audit_log_id;

        -- Log the undo action
        INSERT INTO admin_audit_logs (
            admin_id,
            action_type,
            table_name,
            record_ids,
            metadata
        ) VALUES (
            undoing_admin_id,
            'UNDO',
            audit_record.table_name,
            audit_record.record_ids,
            jsonb_build_object(
                'original_action', audit_record.action_type,
                'original_audit_id', audit_log_id,
                'undo_timestamp', NOW()
            )
        );
    END IF;

    RETURN undo_successful;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired audit logs
    DELETE FROM admin_audit_logs 
    WHERE expires_at < NOW() 
    AND undone_at IS NULL;

    -- Clean up old analytics cache
    DELETE FROM admin_analytics_cache 
    WHERE expires_at < NOW();

    -- Clean up old search history (keep last 1000 per admin)
    DELETE FROM admin_search_history 
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY admin_id ORDER BY created_at DESC) as rn
            FROM admin_search_history
        ) ranked
        WHERE rn <= 1000
    );

    -- Clean up old activity feed entries (keep last 500 per admin)
    DELETE FROM admin_activity_feed 
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY admin_id ORDER BY created_at DESC) as rn
            FROM admin_activity_feed
        ) ranked
        WHERE rn <= 500
    );
    
    -- Clean up old notification executions (keep last 30 days)
    DELETE FROM notification_executions 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old error logs (keep last 30 days)
    DELETE FROM error_logs 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND resolved_at IS NOT NULL;
    
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS (Only for existing tables)
-- =====================================================

DO $$
BEGIN
    -- Create triggers for profiles table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;
        CREATE TRIGGER audit_profiles_trigger
            AFTER INSERT OR UPDATE OR DELETE ON profiles
            FOR EACH ROW EXECUTE FUNCTION log_admin_action();
        
        RAISE NOTICE 'Created audit trigger for profiles table';
    END IF;

    -- Create triggers for bookings table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        DROP TRIGGER IF EXISTS audit_bookings_trigger ON bookings;
        CREATE TRIGGER audit_bookings_trigger
            AFTER INSERT OR UPDATE OR DELETE ON bookings
            FOR EACH ROW EXECUTE FUNCTION log_admin_action();
        
        RAISE NOTICE 'Created audit trigger for bookings table';
    END IF;

    -- Create triggers for reviews table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        DROP TRIGGER IF EXISTS audit_reviews_trigger ON reviews;
        CREATE TRIGGER audit_reviews_trigger
            AFTER INSERT OR UPDATE OR DELETE ON reviews
            FOR EACH ROW EXECUTE FUNCTION log_admin_action();
        
        RAISE NOTICE 'Created audit trigger for reviews table';
    END IF;

    -- Create triggers for payments table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        DROP TRIGGER IF EXISTS audit_payments_trigger ON payments;
        CREATE TRIGGER audit_payments_trigger
            AFTER INSERT OR UPDATE OR DELETE ON payments
            FOR EACH ROW EXECUTE FUNCTION log_admin_action();
        
        RAISE NOTICE 'Created audit trigger for payments table';
    END IF;

    -- Create triggers for readers table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers') THEN
        DROP TRIGGER IF EXISTS audit_readers_trigger ON readers;
        CREATE TRIGGER audit_readers_trigger
            AFTER INSERT OR UPDATE OR DELETE ON readers
            FOR EACH ROW EXECUTE FUNCTION log_admin_action();
        
        RAISE NOTICE 'Created audit trigger for readers table';
    END IF;

    -- Create triggers for chat_sessions table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        DROP TRIGGER IF EXISTS audit_chat_sessions_trigger ON chat_sessions;
        CREATE TRIGGER audit_chat_sessions_trigger
            AFTER INSERT OR UPDATE OR DELETE ON chat_sessions
            FOR EACH ROW EXECUTE FUNCTION log_admin_action();
        
        RAISE NOTICE 'Created audit trigger for chat_sessions table';
    END IF;

END $$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on admin tables
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operations_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_export_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admin can view all audit logs" ON admin_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('super_admin', 'admin', 'moderator')
        )
    );

CREATE POLICY "Admin can view all bulk operations" ON bulk_operations_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('super_admin', 'admin', 'moderator')
        )
    );

CREATE POLICY "Admin can manage their own search history" ON admin_search_history
    FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "Admin can manage their own saved filters" ON admin_saved_filters
    FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "Admin can view all activity feed" ON admin_activity_feed
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('super_admin', 'admin', 'moderator')
        )
    );

CREATE POLICY "Admin can manage their own notification rules" ON admin_notification_rules
    FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "Admin can manage their own notification channels" ON admin_notification_channels
    FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "Super admin can view all user roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name = 'super_admin'
        )
    );

CREATE POLICY "Super admin can manage user roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name = 'super_admin'
        )
    );

-- =====================================================
-- SCHEDULED CLEANUP (Create cron job if pg_cron is available)
-- =====================================================

DO $$
BEGIN
    -- Try to create a scheduled job for cleanup (if pg_cron extension is available)
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule cleanup to run daily at 2 AM
        PERFORM cron.schedule('cleanup-expired-admin-data', '0 2 * * *', 'SELECT cleanup_expired_data();');
        RAISE NOTICE 'Scheduled daily cleanup job';
    ELSE
        RAISE NOTICE 'pg_cron extension not available, manual cleanup required';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cleanup job: %', SQLERRM;
END $$;

-- =====================================================
-- INITIAL DATA REFRESH
-- =====================================================

-- Refresh analytics cache with initial data
SELECT refresh_analytics_cache();

-- =====================================================
-- SUCCESS MESSAGES
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ ADVANCED ADMIN FEATURES TRIGGERS AND FUNCTIONS SETUP COMPLETED!';
    RAISE NOTICE 'Created audit functions, triggers, and RLS policies.';
    RAISE NOTICE 'Remember to run cleanup_expired_data() periodically if pg_cron is not available';
END $$; 