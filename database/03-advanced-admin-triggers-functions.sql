-- =====================================================
-- SAMIA TAROT - ADVANCED ADMIN FEATURES - PART 3
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- This script creates triggers and functions for the advanced admin system
-- Run this AFTER parts 1 and 2 are completed

-- =====================================================
-- AUDIT LOGGING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    admin_user_id UUID;
    action_type_val VARCHAR(100);
    old_data_val JSONB;
    new_data_val JSONB;
BEGIN
    -- Get the current admin user ID from the context
    -- This should be set by the application before making changes
    admin_user_id := current_setting('app.current_admin_id', true)::UUID;
    
    -- If no admin ID is set, skip logging (for system operations)
    IF admin_user_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type_val := 'create';
        old_data_val := NULL;
        new_data_val := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type_val := 'update';
        old_data_val := to_jsonb(OLD);
        new_data_val := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type_val := 'delete';
        old_data_val := to_jsonb(OLD);
        new_data_val := NULL;
    END IF;
    
    -- Insert audit log
    INSERT INTO admin_audit_logs (
        admin_id,
        action_type,
        table_name,
        record_ids,
        old_data,
        new_data,
        can_undo,
        metadata
    ) VALUES (
        admin_user_id,
        action_type_val,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN ARRAY[OLD.id]
            ELSE ARRAY[NEW.id]
        END,
        old_data_val,
        new_data_val,
        true, -- Can undo by default
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', NOW()
        )
    );
    
    -- Insert activity feed entry
    INSERT INTO admin_activity_feed (
        admin_id,
        activity_type,
        title,
        description,
        entity_type,
        entity_id,
        priority
    ) VALUES (
        admin_user_id,
        action_type_val || '_' || TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Created new ' || TG_TABLE_NAME
            WHEN TG_OP = 'UPDATE' THEN 'Updated ' || TG_TABLE_NAME
            WHEN TG_OP = 'DELETE' THEN 'Deleted ' || TG_TABLE_NAME
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'A new ' || TG_TABLE_NAME || ' record was created'
            WHEN TG_OP = 'UPDATE' THEN 'A ' || TG_TABLE_NAME || ' record was updated'
            WHEN TG_OP = 'DELETE' THEN 'A ' || TG_TABLE_NAME || ' record was deleted'
        END,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN 'high'
            ELSE 'normal'
        END
    );
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ANALYTICS CACHE REFRESH FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_analytics_cache()
RETURNS void AS $$
DECLARE
    total_users INTEGER;
    total_bookings INTEGER;
    total_payments DECIMAL(15,2);
    total_reviews INTEGER;
    active_users INTEGER;
    pending_bookings INTEGER;
    failed_payments INTEGER;
    avg_rating DECIMAL(3,2);
BEGIN
    -- Calculate metrics (with error handling for missing tables)
    
    -- Total users
    BEGIN
        SELECT COUNT(*) INTO total_users 
        FROM users 
        WHERE deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        total_users := 0;
    END;
    
    -- Total bookings
    BEGIN
        SELECT COUNT(*) INTO total_bookings 
        FROM bookings 
        WHERE deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        total_bookings := 0;
    END;
    
    -- Total payment amount
    BEGIN
        SELECT COALESCE(SUM(amount), 0) INTO total_payments 
        FROM payments 
        WHERE status = 'completed' AND deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        total_payments := 0;
    END;
    
    -- Total reviews
    BEGIN
        SELECT COUNT(*) INTO total_reviews 
        FROM reviews 
        WHERE deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        total_reviews := 0;
    END;
    
    -- Active users (logged in within last 30 days)
    BEGIN
        SELECT COUNT(*) INTO active_users 
        FROM users 
        WHERE last_seen > NOW() - INTERVAL '30 days' 
        AND deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        active_users := 0;
    END;
    
    -- Pending bookings
    BEGIN
        SELECT COUNT(*) INTO pending_bookings 
        FROM bookings 
        WHERE status = 'pending' AND deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        pending_bookings := 0;
    END;
    
    -- Failed payments
    BEGIN
        SELECT COUNT(*) INTO failed_payments 
        FROM payments 
        WHERE status = 'failed' AND deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        failed_payments := 0;
    END;
    
    -- Average rating
    BEGIN
        SELECT COALESCE(AVG(rating), 0) INTO avg_rating 
        FROM reviews 
        WHERE deleted_at IS NULL;
    EXCEPTION WHEN undefined_table THEN
        avg_rating := 0;
    END;
    
    -- Clear old cache entries
    DELETE FROM admin_analytics_cache 
    WHERE expires_at < NOW();
    
    -- Insert/update cache entries
    INSERT INTO admin_analytics_cache (metric_name, metric_value, time_period, expires_at)
    VALUES 
        ('total_users', total_users, 'current', NOW() + INTERVAL '1 hour'),
        ('total_bookings', total_bookings, 'current', NOW() + INTERVAL '1 hour'),
        ('total_payments', total_payments, 'current', NOW() + INTERVAL '1 hour'),
        ('total_reviews', total_reviews, 'current', NOW() + INTERVAL '1 hour'),
        ('active_users', active_users, 'current', NOW() + INTERVAL '1 hour'),
        ('pending_bookings', pending_bookings, 'current', NOW() + INTERVAL '1 hour'),
        ('failed_payments', failed_payments, 'current', NOW() + INTERVAL '1 hour'),
        ('avg_rating', avg_rating, 'current', NOW() + INTERVAL '1 hour')
    ON CONFLICT (metric_name, time_period) 
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        calculated_at = NOW(),
        expires_at = EXCLUDED.expires_at;
        
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UNDO FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION undo_admin_action(audit_log_id UUID, undoing_admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    audit_record admin_audit_logs%ROWTYPE;
    table_name_val VARCHAR(100);
    old_data_val JSONB;
    record_id UUID;
    sql_statement TEXT;
    result BOOLEAN := false;
BEGIN
    -- Get the audit log record
    SELECT * INTO audit_record 
    FROM admin_audit_logs 
    WHERE id = audit_log_id 
    AND can_undo = true 
    AND undone_at IS NULL
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit log not found or cannot be undone';
    END IF;
    
    table_name_val := audit_record.table_name;
    old_data_val := audit_record.old_data;
    
    -- Set the admin context for logging
    PERFORM set_config('app.current_admin_id', undoing_admin_id::TEXT, true);
    
    -- Handle different action types
    CASE audit_record.action_type
        WHEN 'delete' THEN
            -- Restore deleted record
            IF old_data_val IS NOT NULL THEN
                -- Build INSERT statement dynamically
                sql_statement := format(
                    'INSERT INTO %I SELECT * FROM jsonb_populate_record(null::%I, %L)',
                    table_name_val,
                    table_name_val,
                    old_data_val
                );
                
                EXECUTE sql_statement;
                result := true;
            END IF;
            
        WHEN 'update' THEN
            -- Restore previous values
            IF old_data_val IS NOT NULL AND array_length(audit_record.record_ids, 1) > 0 THEN
                record_id := audit_record.record_ids[1];
                
                -- Build UPDATE statement dynamically
                sql_statement := format(
                    'UPDATE %I SET (%s) = (%s) WHERE id = %L',
                    table_name_val,
                    (SELECT string_agg(key, ', ') FROM jsonb_object_keys(old_data_val) AS key),
                    (SELECT string_agg(quote_literal(value), ', ') FROM jsonb_each_text(old_data_val) AS kv(key, value)),
                    record_id
                );
                
                EXECUTE sql_statement;
                result := true;
            END IF;
            
        WHEN 'create' THEN
            -- Delete the created record
            IF array_length(audit_record.record_ids, 1) > 0 THEN
                record_id := audit_record.record_ids[1];
                
                sql_statement := format(
                    'DELETE FROM %I WHERE id = %L',
                    table_name_val,
                    record_id
                );
                
                EXECUTE sql_statement;
                result := true;
            END IF;
    END CASE;
    
    -- Mark the audit log as undone
    UPDATE admin_audit_logs 
    SET undone_at = NOW(), undone_by = undoing_admin_id, can_undo = false
    WHERE id = audit_log_id;
    
    -- Log the undo action
    INSERT INTO admin_activity_feed (
        admin_id,
        activity_type,
        title,
        description,
        entity_type,
        priority
    ) VALUES (
        undoing_admin_id,
        'undo_action',
        'Action Undone',
        format('Undid %s action on %s', audit_record.action_type, table_name_val),
        'audit',
        'normal'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BULK OPERATION CLEANUP FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired audit logs
    DELETE FROM admin_audit_logs 
    WHERE expires_at < NOW();
    
    -- Clean up expired analytics cache
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
    
    -- Clean up completed bulk operations older than 90 days
    DELETE FROM bulk_operations_log 
    WHERE status IN ('completed', 'failed') 
    AND started_at < NOW() - INTERVAL '90 days';
    
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
    -- Create triggers for users table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        DROP TRIGGER IF EXISTS audit_users_trigger ON users;
        CREATE TRIGGER audit_users_trigger
            AFTER INSERT OR UPDATE OR DELETE ON users
            FOR EACH ROW EXECUTE FUNCTION log_admin_action();
        
        RAISE NOTICE 'Created audit trigger for users table';
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

    -- Create triggers for profiles table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;
        CREATE TRIGGER audit_profiles_trigger
            AFTER INSERT OR UPDATE OR DELETE ON profiles
            FOR EACH ROW EXECUTE FUNCTION log_admin_action();
        
        RAISE NOTICE 'Created audit trigger for profiles table';
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

RAISE NOTICE 'Advanced admin features triggers and functions setup complete!';
RAISE NOTICE 'Remember to run cleanup_expired_data() periodically if pg_cron is not available'; 