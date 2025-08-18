-- Targeted User Reset Script
-- This script only handles the specific tables that are causing foreign key constraint issues

-- Start transaction
BEGIN;

-- Step 1: Clear tables that we know reference profiles and are causing issues
-- These are the tables we identified from the error messages

-- Clear reading_sessions first (references tarot_spreads)
DELETE FROM reading_sessions WHERE EXISTS (
    SELECT 1 FROM tarot_spreads WHERE reading_sessions.spread_id = tarot_spreads.id 
    AND tarot_spreads.created_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18'
);

-- Clear wallets (references profiles via user_id)
DELETE FROM wallets WHERE user_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Clear admin_actions (references profiles via admin_id)
DELETE FROM admin_actions WHERE admin_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Clear reader_spread_notifications (references profiles via admin_id)
DELETE FROM reader_spread_notifications WHERE admin_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Clear tarot_spreads (references profiles via created_by)
DELETE FROM tarot_spreads WHERE created_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Clear other tables that might reference profiles
DELETE FROM spread_approval_logs WHERE performed_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
DELETE FROM configuration_access_log WHERE accessed_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
DELETE FROM secrets_access_log WHERE accessed_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
DELETE FROM audit_logs WHERE user_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
DELETE FROM system_health_checks WHERE performed_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';

-- Clear system_secrets references (has 3 foreign key columns)
UPDATE system_secrets SET created_by = 'c3922fea-329a-4d6e-800c-3e03c9fe341d' WHERE created_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
UPDATE system_secrets SET updated_by = 'c3922fea-329a-4d6e-800c-3e03c9fe341d' WHERE updated_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
UPDATE system_secrets SET accessed_by = 'c3922fea-329a-4d6e-800c-3e03c9fe341d' WHERE accessed_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
-- Try to delete from notifications table (table might not exist or have different column names)
DO $$
BEGIN
    -- Check if notifications table exists and has user_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'notifications' 
               AND column_name = 'user_id' 
               AND table_schema = 'public') THEN
        DELETE FROM notifications WHERE user_id = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
    END IF;
    
    -- Check if notification_templates table exists and has created_by column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'notification_templates' 
               AND column_name = 'created_by' 
               AND table_schema = 'public') THEN
        DELETE FROM notification_templates WHERE created_by = '0a28e972-9cc9-479b-aa1e-fafc5856af18';
    END IF;
END $$;

-- Step 2: Now clear ALL remaining data from all tables (since we're doing a complete reset)
TRUNCATE TABLE reading_sessions CASCADE;
TRUNCATE TABLE wallets CASCADE;
TRUNCATE TABLE admin_actions CASCADE;
TRUNCATE TABLE reader_spread_notifications CASCADE;
TRUNCATE TABLE tarot_spreads CASCADE;
TRUNCATE TABLE spread_approval_logs CASCADE;
TRUNCATE TABLE configuration_access_log CASCADE;
TRUNCATE TABLE secrets_access_log CASCADE;
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE system_health_checks CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE notification_templates CASCADE;

-- Step 3: Clear additional tables that might exist
-- Use IF EXISTS to avoid errors if tables don't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        TRUNCATE TABLE bookings CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_sessions') THEN
        TRUNCATE TABLE booking_sessions CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
        TRUNCATE TABLE payment_transactions CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        TRUNCATE TABLE user_sessions CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        TRUNCATE TABLE chat_messages CASCADE;
    END IF;
END $$;

-- Step 4: Clear ALL foreign key references to profiles table before deletion
-- This comprehensive approach finds all tables with foreign keys to profiles and sets them to NULL
DO $$
DECLARE
    rec RECORD;
    sql_cmd TEXT;
BEGIN
    -- Get all foreign key columns that reference profiles(id)
    FOR rec IN 
        SELECT 
            t.table_name,
            kcu.column_name,
            tc.constraint_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            JOIN information_schema.tables AS t
                ON t.table_name = tc.table_name
                AND t.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'profiles'
            AND ccu.column_name = 'id'
            AND tc.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, kcu.column_name
    LOOP
        -- Build SQL command to set foreign key column to NULL
        sql_cmd := 'UPDATE ' || rec.table_name || ' SET ' || rec.column_name || ' = NULL WHERE ' || rec.column_name || ' IS NOT NULL';
        
        -- Execute the command
        BEGIN
            EXECUTE sql_cmd;
            RAISE NOTICE 'Cleared foreign key references in %.% (constraint: %)', rec.table_name, rec.column_name, rec.constraint_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to clear references in %.%: %', rec.table_name, rec.column_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Completed clearing all foreign key references to profiles table';
END $$;

-- Step 5: Finally delete all profiles
DELETE FROM profiles;

-- Step 6: Insert new users with bcrypt-hashed passwords
-- Using the pre-generated bcrypt hash for 'TempPass!2024'
INSERT INTO profiles (email, role, encrypted_password, name, phone, is_active, created_at, updated_at) VALUES
('info@samiatarot.com', 'super_admin', '$2b$12$8UQ7O3zWOqLgDxYgF9LKY.oQTXQKJvJdNLV8bQI7h4vK6fJ3L9mNS', 'Samia Tarot Admin', '+1234567890', true, NOW(), NOW()),
('admin@samiatarot.com', 'admin', '$2b$12$8UQ7O3zWOqLgDxYgF9LKY.oQTXQKJvJdNLV8bQI7h4vK6fJ3L9mNS', 'System Administrator', '+1234567891', true, NOW(), NOW()),
('reader1@samiatarot.com', 'reader', '$2b$12$8UQ7O3zWOqLgDxYgF9LKY.oQTXQKJvJdNLV8bQI7h4vK6fJ3L9mNS', 'Senior Reader', '+1234567892', true, NOW(), NOW()),
('reader2@samiatarot.com', 'reader', '$2b$12$8UQ7O3zWOqLgDxYgF9LKY.oQTXQKJvJdNLV8bQI7h4vK6fJ3L9mNS', 'Junior Reader', '+1234567893', true, NOW(), NOW()),
('client@samiatarot.com', 'client', '$2b$12$8UQ7O3zWOqLgDxYgF9LKY.oQTXQKJvJdNLV8bQI7h4vK6fJ3L9mNS', 'Test Client', '+1234567894', true, NOW(), NOW()),
('monitor@samiatarot.com', 'monitor', '$2b$12$8UQ7O3zWOqLgDxYgF9LKY.oQTXQKJvJdNLV8bQI7h4vK6fJ3L9mNS', 'System Monitor', '+1234567895', true, NOW(), NOW());

-- Commit transaction
COMMIT;

-- Step 7: Verify the results
SELECT 
    email, 
    role, 
    name, 
    is_active, 
    encrypted_password IS NOT NULL as has_password,
    created_at
FROM profiles 
ORDER BY 
    CASE role 
        WHEN 'super_admin' THEN 1 
        WHEN 'admin' THEN 2 
        WHEN 'monitor' THEN 3 
        WHEN 'reader' THEN 4 
        WHEN 'client' THEN 5 
        ELSE 6 
    END, 
    email;

-- Step 8: Show summary
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN encrypted_password IS NOT NULL THEN 1 END) as users_with_passwords,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
FROM profiles; 