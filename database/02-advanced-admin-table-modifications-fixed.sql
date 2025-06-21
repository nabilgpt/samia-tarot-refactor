-- =====================================================
-- SAMIA TAROT - ADVANCED ADMIN FEATURES - PART 2 (FIXED)
-- TABLE MODIFICATIONS (RUN AFTER MAIN TABLES EXIST)
-- =====================================================

-- This script adds soft delete columns and other enhancements to existing tables
-- Run this AFTER your main database schema is in place

-- =====================================================
-- SOFT DELETE COLUMNS
-- =====================================================

-- Add soft delete columns to main tables (only if tables exist)
DO $$
BEGIN
    -- Profiles table modifications (main user table in Supabase)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
        
        -- Add search index
        CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING gin(
            to_tsvector('english', 
                coalesce(first_name, '') || ' ' || 
                coalesce(last_name, '') || ' ' || 
                coalesce(bio, '') || ' ' ||
                coalesce(role, '')
            )
        );
        
        RAISE NOTICE 'Added soft delete columns to profiles table';
    ELSE
        RAISE NOTICE 'Profiles table does not exist, skipping modifications';
    END IF;

    -- Bookings table modifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at) WHERE deleted_at IS NULL;
        
        -- Add search index
        CREATE INDEX IF NOT EXISTS idx_bookings_search ON bookings USING gin(
            to_tsvector('english', 
                coalesce(booking_code, '') || ' ' || 
                coalesce(service_type, '') || ' ' ||
                coalesce(status, '')
            )
        );
        
        RAISE NOTICE 'Added soft delete columns to bookings table';
    ELSE
        RAISE NOTICE 'Bookings table does not exist, skipping modifications';
    END IF;

    -- Reviews table modifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at) WHERE deleted_at IS NULL;
        
        -- Add search index
        CREATE INDEX IF NOT EXISTS idx_reviews_search ON reviews USING gin(
            to_tsvector('english', coalesce(comment, '') || ' ' || coalesce(response, ''))
        );
        
        RAISE NOTICE 'Added soft delete columns to reviews table';
    ELSE
        RAISE NOTICE 'Reviews table does not exist, skipping modifications';
    END IF;

    -- Payments table modifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NULL;
        
        -- Add search index for payment reference numbers
        CREATE INDEX IF NOT EXISTS idx_payments_search ON payments USING gin(
            to_tsvector('english', 
                coalesce(payment_reference, '') || ' ' || 
                coalesce(payment_method, '') || ' ' ||
                coalesce(status, '')
            )
        );
        
        RAISE NOTICE 'Added soft delete columns to payments table';
    ELSE
        RAISE NOTICE 'Payments table does not exist, skipping modifications';
    END IF;

    -- Readers table modifications (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers') THEN
        ALTER TABLE readers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE readers ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_readers_deleted_at ON readers(deleted_at) WHERE deleted_at IS NULL;
        
        RAISE NOTICE 'Added soft delete columns to readers table';
    ELSE
        RAISE NOTICE 'Readers table does not exist, skipping modifications';
    END IF;

    -- Chat sessions modifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_deleted_at ON chat_sessions(deleted_at) WHERE deleted_at IS NULL;
        
        RAISE NOTICE 'Added soft delete columns to chat_sessions table';
    ELSE
        RAISE NOTICE 'Chat_sessions table does not exist, skipping modifications';
    END IF;

    -- Chat messages modifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted_at ON chat_messages(deleted_at) WHERE deleted_at IS NULL;
        
        RAISE NOTICE 'Added soft delete columns to chat_messages table';
    ELSE
        RAISE NOTICE 'Chat_messages table does not exist, skipping modifications';
    END IF;

END $$;

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS (After auth.users exists)
-- =====================================================

DO $$
BEGIN
    -- Add foreign key constraints to admin_audit_logs if auth.users exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- Add foreign key for admin_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'admin_audit_logs_admin_id_fkey'
        ) THEN
            ALTER TABLE admin_audit_logs 
            ADD CONSTRAINT admin_audit_logs_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        -- Add foreign key for undone_by
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'admin_audit_logs_undone_by_fkey'
        ) THEN
            ALTER TABLE admin_audit_logs 
            ADD CONSTRAINT admin_audit_logs_undone_by_fkey 
            FOREIGN KEY (undone_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Added foreign key constraints to admin_audit_logs';
    END IF;

    -- Add foreign key constraints to bulk_operations_log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'bulk_operations_log_admin_id_fkey'
        ) THEN
            ALTER TABLE bulk_operations_log 
            ADD CONSTRAINT bulk_operations_log_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Added foreign key constraints to bulk_operations_log';
    END IF;

    -- Add foreign key constraints to other admin tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- admin_search_history
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'admin_search_history_admin_id_fkey'
        ) THEN
            ALTER TABLE admin_search_history 
            ADD CONSTRAINT admin_search_history_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- admin_saved_filters
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'admin_saved_filters_admin_id_fkey'
        ) THEN
            ALTER TABLE admin_saved_filters 
            ADD CONSTRAINT admin_saved_filters_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- admin_activity_feed
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'admin_activity_feed_admin_id_fkey'
        ) THEN
            ALTER TABLE admin_activity_feed 
            ADD CONSTRAINT admin_activity_feed_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- admin_notification_rules
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'admin_notification_rules_admin_id_fkey'
        ) THEN
            ALTER TABLE admin_notification_rules 
            ADD CONSTRAINT admin_notification_rules_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- admin_notification_channels
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'admin_notification_channels_admin_id_fkey'
        ) THEN
            ALTER TABLE admin_notification_channels 
            ADD CONSTRAINT admin_notification_channels_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- notification_executions
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'notification_executions_admin_id_fkey'
        ) THEN
            ALTER TABLE notification_executions 
            ADD CONSTRAINT notification_executions_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- user_roles
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_roles_user_id_fkey'
        ) THEN
            ALTER TABLE user_roles 
            ADD CONSTRAINT user_roles_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- user_roles assigned_by
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_roles_assigned_by_fkey'
        ) THEN
            ALTER TABLE user_roles 
            ADD CONSTRAINT user_roles_assigned_by_fkey 
            FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;

        -- user_permission_overrides
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_permission_overrides_user_id_fkey'
        ) THEN
            ALTER TABLE user_permission_overrides 
            ADD CONSTRAINT user_permission_overrides_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- user_permission_overrides granted_by
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_permission_overrides_granted_by_fkey'
        ) THEN
            ALTER TABLE user_permission_overrides 
            ADD CONSTRAINT user_permission_overrides_granted_by_fkey 
            FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;

        RAISE NOTICE 'Added all foreign key constraints to admin tables';
    END IF;

END $$;

-- =====================================================
-- ENHANCED INDEXES FOR SEARCH AND PERFORMANCE
-- =====================================================

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON profiles(role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status_amount ON payments(status, amount) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_rating_date ON reviews(rating, created_at) WHERE deleted_at IS NULL;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_bookings_analytics ON bookings(status, created_at, total_amount) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_analytics ON payments(status, amount, created_at, payment_method) WHERE deleted_at IS NULL;

-- Search optimization indexes
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON profiles(first_name, last_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_code_search ON bookings(booking_code) WHERE deleted_at IS NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ ADVANCED ADMIN TABLE MODIFICATIONS COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'Added soft delete columns, foreign keys, and enhanced indexes.';
    RAISE NOTICE 'Tables are now ready for advanced admin operations.';
END $$; 