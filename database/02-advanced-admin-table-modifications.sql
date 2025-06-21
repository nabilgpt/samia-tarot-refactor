-- =====================================================
-- SAMIA TAROT - ADVANCED ADMIN FEATURES - PART 2
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
    -- Users table modifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID;
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
        
        -- Add search index
        CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(
            to_tsvector('english', 
                coalesce(first_name, '') || ' ' || 
                coalesce(last_name, '') || ' ' || 
                coalesce(email, '') || ' ' || 
                coalesce(phone, '')
            )
        );
        
        RAISE NOTICE 'Added soft delete columns to users table';
    ELSE
        RAISE NOTICE 'Users table does not exist, skipping modifications';
    END IF;

    -- Bookings table modifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_by UUID;
        
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
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_by UUID;
        
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
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by UUID;
        
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
        ALTER TABLE readers ADD COLUMN IF NOT EXISTS deleted_by UUID;
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_readers_deleted_at ON readers(deleted_at) WHERE deleted_at IS NULL;
        
        RAISE NOTICE 'Added soft delete columns to readers table';
    ELSE
        RAISE NOTICE 'Readers table does not exist, skipping modifications';
    END IF;

    -- Profiles table modifications (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_by UUID;
        
        -- Add index for soft delete
        CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
        
        -- Add search index
        CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING gin(
            to_tsvector('english', 
                coalesce(first_name, '') || ' ' || 
                coalesce(last_name, '') || ' ' || 
                coalesce(bio, '')
            )
        );
        
        RAISE NOTICE 'Added soft delete columns to profiles table';
    ELSE
        RAISE NOTICE 'Profiles table does not exist, skipping modifications';
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

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_permission_overrides_granted_by_fkey'
        ) THEN
            ALTER TABLE user_permission_overrides 
            ADD CONSTRAINT user_permission_overrides_granted_by_fkey 
            FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;

        -- documentation_entries
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'documentation_entries_created_by_fkey'
        ) THEN
            ALTER TABLE documentation_entries 
            ADD CONSTRAINT documentation_entries_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;

        -- user_onboarding_progress
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_onboarding_progress_user_id_fkey'
        ) THEN
            ALTER TABLE user_onboarding_progress 
            ADD CONSTRAINT user_onboarding_progress_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- error_logs
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'error_logs_user_id_fkey'
        ) THEN
            ALTER TABLE error_logs 
            ADD CONSTRAINT error_logs_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'error_logs_resolved_by_fkey'
        ) THEN
            ALTER TABLE error_logs 
            ADD CONSTRAINT error_logs_resolved_by_fkey 
            FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;

        -- import_export_jobs
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'import_export_jobs_admin_id_fkey'
        ) THEN
            ALTER TABLE import_export_jobs 
            ADD CONSTRAINT import_export_jobs_admin_id_fkey 
            FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- tenant_users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'tenant_users_user_id_fkey'
        ) THEN
            ALTER TABLE tenant_users 
            ADD CONSTRAINT tenant_users_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        RAISE NOTICE 'Added all foreign key constraints to admin tables';
    ELSE
        RAISE NOTICE 'auth.users table does not exist, skipping foreign key constraints';
    END IF;

END $$;

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS TO EXISTING TABLES
-- =====================================================

DO $$
BEGIN
    -- Add foreign key constraints to existing tables for deleted_by columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        
        -- Users table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'users_deleted_by_fkey'
            ) THEN
                ALTER TABLE users 
                ADD CONSTRAINT users_deleted_by_fkey 
                FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
            END IF;
        END IF;

        -- Bookings table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'bookings_deleted_by_fkey'
            ) THEN
                ALTER TABLE bookings 
                ADD CONSTRAINT bookings_deleted_by_fkey 
                FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
            END IF;
        END IF;

        -- Reviews table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'reviews_deleted_by_fkey'
            ) THEN
                ALTER TABLE reviews 
                ADD CONSTRAINT reviews_deleted_by_fkey 
                FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
            END IF;
        END IF;

        -- Payments table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'payments_deleted_by_fkey'
            ) THEN
                ALTER TABLE payments 
                ADD CONSTRAINT payments_deleted_by_fkey 
                FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
            END IF;
        END IF;

        -- Readers table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'readers_deleted_by_fkey'
            ) THEN
                ALTER TABLE readers 
                ADD CONSTRAINT readers_deleted_by_fkey 
                FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
            END IF;
        END IF;

        -- Profiles table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'profiles_deleted_by_fkey'
            ) THEN
                ALTER TABLE profiles 
                ADD CONSTRAINT profiles_deleted_by_fkey 
                FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
            END IF;
        END IF;

        RAISE NOTICE 'Added foreign key constraints for deleted_by columns';
    END IF;

END $$; 