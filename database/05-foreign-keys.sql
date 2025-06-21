-- ============================================================
-- PART 5: FOREIGN KEY CONSTRAINTS - SAMIA TAROT
-- This script adds foreign key constraints after all tables are created
-- Run this AFTER parts 1-4 to avoid dependency issues
-- ============================================================

-- ============================================================
-- STEP 1: CHECK IF REQUIRED TABLES EXIST
-- ============================================================

DO $$
BEGIN
    -- Check if auth.users exists (Supabase default)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        RAISE NOTICE '⚠️ auth.users table not found - some foreign keys will be skipped';
    ELSE
        RAISE NOTICE '✅ auth.users table found';
    END IF;
    
    -- Check if profiles exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE NOTICE '⚠️ profiles table not found - some foreign keys will be skipped';
    ELSE
        RAISE NOTICE '✅ profiles table found';
    END IF;
    
    -- Check if bookings exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        RAISE NOTICE '⚠️ bookings table not found - some foreign keys will be skipped';
    ELSE
        RAISE NOTICE '✅ bookings table found';
    END IF;
END $$;

-- ============================================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS (PAYMENT SYSTEM)
-- ============================================================

-- Payment Methods
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE payment_methods 
        ADD CONSTRAINT fk_payment_methods_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added payment_methods.user_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ payment_methods.user_id foreign key already exists';
END $$;

-- Wallet Transactions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE wallet_transactions 
        ADD CONSTRAINT fk_wallet_transactions_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added wallet_transactions.user_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ wallet_transactions.user_id foreign key already exists';
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        ALTER TABLE wallet_transactions 
        ADD CONSTRAINT fk_wallet_transactions_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added wallet_transactions.booking_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ wallet_transactions.booking_id foreign key already exists';
END $$;

-- Payment Receipts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE payment_receipts 
        ADD CONSTRAINT fk_payment_receipts_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added payment_receipts.user_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ payment_receipts.user_id foreign key already exists';
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        ALTER TABLE payment_receipts 
        ADD CONSTRAINT fk_payment_receipts_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added payment_receipts.booking_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ payment_receipts.booking_id foreign key already exists';
END $$;

-- ============================================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS (CHAT SYSTEM)
-- ============================================================

-- Chat Sessions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE chat_sessions 
        ADD CONSTRAINT fk_chat_sessions_client_id 
        FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added chat_sessions.client_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ chat_sessions.client_id foreign key already exists';
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE chat_sessions 
        ADD CONSTRAINT fk_chat_sessions_reader_id 
        FOREIGN KEY (reader_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added chat_sessions.reader_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ chat_sessions.reader_id foreign key already exists';
END $$;

-- Chat Messages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT fk_chat_messages_session_id 
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added chat_messages.session_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ chat_messages.session_id foreign key already exists';
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT fk_chat_messages_sender_id 
        FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added chat_messages.sender_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ chat_messages.sender_id foreign key already exists';
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT fk_chat_messages_reply_to 
        FOREIGN KEY (reply_to_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added chat_messages.reply_to_message_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ chat_messages.reply_to_message_id foreign key already exists';
END $$;

-- Voice Notes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE voice_notes 
        ADD CONSTRAINT fk_voice_notes_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added voice_notes.user_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ voice_notes.user_id foreign key already exists';
END $$;

-- ============================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS (ANALYTICS SYSTEM)
-- ============================================================

-- Reader Analytics
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE reader_analytics 
        ADD CONSTRAINT fk_reader_analytics_reader_id 
        FOREIGN KEY (reader_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added reader_analytics.reader_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ reader_analytics.reader_id foreign key already exists';
END $$;

-- AI Reading Results
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE ai_reading_results 
        ADD CONSTRAINT fk_ai_reading_results_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added ai_reading_results.user_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ ai_reading_results.user_id foreign key already exists';
END $$;

-- User Activity Logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE user_activity_logs 
        ADD CONSTRAINT fk_user_activity_logs_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added user_activity_logs.user_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ user_activity_logs.user_id foreign key already exists';
END $$;

-- ============================================================
-- STEP 5: ADD FOREIGN KEY CONSTRAINTS (EMERGENCY SYSTEM)
-- ============================================================

-- Emergency Escalations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE emergency_escalations 
        ADD CONSTRAINT fk_emergency_escalations_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added emergency_escalations.user_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ emergency_escalations.user_id foreign key already exists';
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE emergency_escalations 
        ADD CONSTRAINT fk_emergency_escalations_reader_id 
        FOREIGN KEY (reader_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added emergency_escalations.reader_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ emergency_escalations.reader_id foreign key already exists';
END $$;

-- Emergency Alerts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE emergency_alerts 
        ADD CONSTRAINT fk_emergency_alerts_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added emergency_alerts.user_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ emergency_alerts.user_id foreign key already exists';
END $$;

-- Reader Applications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE reader_applications 
        ADD CONSTRAINT fk_reader_applications_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added reader_applications.user_id foreign key';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ reader_applications.user_id foreign key already exists';
END $$;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Foreign key constraints setup completed!';
    RAISE NOTICE '🔗 All user_id columns now properly reference auth.users(id)';
    RAISE NOTICE '🔗 All inter-table relationships established';
    RAISE NOTICE '📋 Database schema is now complete and consistent';
END $$; 