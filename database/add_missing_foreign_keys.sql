-- =============================================
-- ADD MISSING FOREIGN KEY CONSTRAINTS
-- SAMIA TAROT Database Schema Migration
-- =============================================

-- Execute these statements only after verifying no orphaned data exists
-- Run the foreign_key_analysis.sql queries first to check for orphaned records

-- =============================================
-- 1. ADD CORE TABLE FOREIGN KEYS
-- =============================================

-- Profiles table - Already has FK to auth.users, verify it exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Bookings table foreign keys
DO $$ 
BEGIN
    -- user_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_bookings_user_id' 
        AND table_name = 'bookings'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT fk_bookings_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- reader_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_bookings_reader_id' 
        AND table_name = 'bookings'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT fk_bookings_reader_id 
        FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;

    -- service_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_bookings_service_id' 
        AND table_name = 'bookings'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT fk_bookings_service_id 
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Services table foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_services_created_by' 
        AND table_name = 'services'
    ) THEN
        ALTER TABLE services 
        ADD CONSTRAINT fk_services_created_by 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================
-- 2. PAYMENT SYSTEM FOREIGN KEYS
-- =============================================

-- Payments table foreign keys
DO $$ 
BEGIN
    -- booking_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payments_booking_id' 
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments 
        ADD CONSTRAINT fk_payments_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
    END IF;

    -- user_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payments_user_id' 
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments 
        ADD CONSTRAINT fk_payments_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Wallets table foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_wallets_user_id' 
        AND table_name = 'wallets'
    ) THEN
        ALTER TABLE wallets 
        ADD CONSTRAINT fk_wallets_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Transactions table foreign keys
DO $$ 
BEGIN
    -- wallet_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_transactions_wallet_id' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT fk_transactions_wallet_id 
        FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;
    END IF;

    -- user_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_transactions_user_id' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT fk_transactions_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Receipt uploads table foreign keys
DO $$ 
BEGIN
    -- payment_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_receipt_uploads_payment_id' 
        AND table_name = 'receipt_uploads'
    ) THEN
        ALTER TABLE receipt_uploads 
        ADD CONSTRAINT fk_receipt_uploads_payment_id 
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;
    END IF;

    -- user_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_receipt_uploads_user_id' 
        AND table_name = 'receipt_uploads'
    ) THEN
        ALTER TABLE receipt_uploads 
        ADD CONSTRAINT fk_receipt_uploads_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- 3. COMMUNICATION SYSTEM FOREIGN KEYS
-- =============================================

-- Messages table foreign keys
DO $$ 
BEGIN
    -- booking_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_messages_booking_id' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT fk_messages_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;

    -- sender_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_messages_sender_id' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT fk_messages_sender_id 
        FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Reviews table foreign keys
DO $$ 
BEGIN
    -- booking_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_reviews_booking_id' 
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE reviews 
        ADD CONSTRAINT fk_reviews_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;

    -- client_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_reviews_client_id' 
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE reviews 
        ADD CONSTRAINT fk_reviews_client_id 
        FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- reader_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_reviews_reader_id' 
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE reviews 
        ADD CONSTRAINT fk_reviews_reader_id 
        FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Notifications table foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_notifications_user_id' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT fk_notifications_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- 4. CALL SYSTEM FOREIGN KEYS
-- =============================================

-- Call sessions table foreign keys
DO $$ 
BEGIN
    -- client_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_sessions_client_id' 
        AND table_name = 'call_sessions'
    ) THEN
        ALTER TABLE call_sessions 
        ADD CONSTRAINT fk_call_sessions_client_id 
        FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- reader_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_sessions_reader_id' 
        AND table_name = 'call_sessions'
    ) THEN
        ALTER TABLE call_sessions 
        ADD CONSTRAINT fk_call_sessions_reader_id 
        FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- booking_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_sessions_booking_id' 
        AND table_name = 'call_sessions'
    ) THEN
        ALTER TABLE call_sessions 
        ADD CONSTRAINT fk_call_sessions_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Call recordings table foreign keys
DO $$ 
BEGIN
    -- call_session_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_recordings_call_session_id' 
        AND table_name = 'call_recordings'
    ) THEN
        ALTER TABLE call_recordings 
        ADD CONSTRAINT fk_call_recordings_call_session_id 
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE CASCADE;
    END IF;

    -- created_by FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_recordings_created_by' 
        AND table_name = 'call_recordings'
    ) THEN
        ALTER TABLE call_recordings 
        ADD CONSTRAINT fk_call_recordings_created_by 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Emergency call logs foreign keys
DO $$ 
BEGIN
    -- client_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_emergency_call_logs_client_id' 
        AND table_name = 'emergency_call_logs'
    ) THEN
        ALTER TABLE emergency_call_logs 
        ADD CONSTRAINT fk_emergency_call_logs_client_id 
        FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- reader_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_emergency_call_logs_reader_id' 
        AND table_name = 'emergency_call_logs'
    ) THEN
        ALTER TABLE emergency_call_logs 
        ADD CONSTRAINT fk_emergency_call_logs_reader_id 
        FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;

    -- call_session_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_emergency_call_logs_call_session_id' 
        AND table_name = 'emergency_call_logs'
    ) THEN
        ALTER TABLE emergency_call_logs 
        ADD CONSTRAINT fk_emergency_call_logs_call_session_id 
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE SET NULL;
    END IF;

    -- escalated_to FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_emergency_call_logs_escalated_to' 
        AND table_name = 'emergency_call_logs'
    ) THEN
        ALTER TABLE emergency_call_logs 
        ADD CONSTRAINT fk_emergency_call_logs_escalated_to 
        FOREIGN KEY (escalated_to) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Call participants foreign keys
DO $$ 
BEGIN
    -- call_session_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_participants_call_session_id' 
        AND table_name = 'call_participants'
    ) THEN
        ALTER TABLE call_participants 
        ADD CONSTRAINT fk_call_participants_call_session_id 
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE CASCADE;
    END IF;

    -- participant_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_participants_participant_id' 
        AND table_name = 'call_participants'
    ) THEN
        ALTER TABLE call_participants 
        ADD CONSTRAINT fk_call_participants_participant_id 
        FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Call escalations foreign keys
DO $$ 
BEGIN
    -- call_session_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_escalations_call_session_id' 
        AND table_name = 'call_escalations'
    ) THEN
        ALTER TABLE call_escalations 
        ADD CONSTRAINT fk_call_escalations_call_session_id 
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE CASCADE;
    END IF;

    -- emergency_call_log_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_escalations_emergency_call_log_id' 
        AND table_name = 'call_escalations'
    ) THEN
        ALTER TABLE call_escalations 
        ADD CONSTRAINT fk_call_escalations_emergency_call_log_id 
        FOREIGN KEY (emergency_call_log_id) REFERENCES emergency_call_logs(id) ON DELETE SET NULL;
    END IF;

    -- escalated_from FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_escalations_escalated_from' 
        AND table_name = 'call_escalations'
    ) THEN
        ALTER TABLE call_escalations 
        ADD CONSTRAINT fk_call_escalations_escalated_from 
        FOREIGN KEY (escalated_from) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- escalated_to FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_escalations_escalated_to' 
        AND table_name = 'call_escalations'
    ) THEN
        ALTER TABLE call_escalations 
        ADD CONSTRAINT fk_call_escalations_escalated_to 
        FOREIGN KEY (escalated_to) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Call quality metrics foreign keys
DO $$ 
BEGIN
    -- call_session_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_quality_metrics_call_session_id' 
        AND table_name = 'call_quality_metrics'
    ) THEN
        ALTER TABLE call_quality_metrics 
        ADD CONSTRAINT fk_call_quality_metrics_call_session_id 
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE CASCADE;
    END IF;

    -- participant_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_quality_metrics_participant_id' 
        AND table_name = 'call_quality_metrics'
    ) THEN
        ALTER TABLE call_quality_metrics 
        ADD CONSTRAINT fk_call_quality_metrics_participant_id 
        FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Reader availability foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_reader_availability_reader_id' 
        AND table_name = 'reader_availability'
    ) THEN
        ALTER TABLE reader_availability 
        ADD CONSTRAINT fk_reader_availability_reader_id 
        FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Call notifications foreign keys
DO $$ 
BEGIN
    -- call_session_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_notifications_call_session_id' 
        AND table_name = 'call_notifications'
    ) THEN
        ALTER TABLE call_notifications 
        ADD CONSTRAINT fk_call_notifications_call_session_id 
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE CASCADE;
    END IF;

    -- recipient_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_notifications_recipient_id' 
        AND table_name = 'call_notifications'
    ) THEN
        ALTER TABLE call_notifications 
        ADD CONSTRAINT fk_call_notifications_recipient_id 
        FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- 5. AI SYSTEM FOREIGN KEYS
-- =============================================

-- AI prompts foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ai_prompts_ai_model_id' 
        AND table_name = 'ai_prompts'
    ) THEN
        ALTER TABLE ai_prompts 
        ADD CONSTRAINT fk_ai_prompts_ai_model_id 
        FOREIGN KEY (ai_model_id) REFERENCES ai_models(id) ON DELETE CASCADE;
    END IF;
END $$;

-- AI sessions foreign keys
DO $$ 
BEGIN
    -- user_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ai_sessions_user_id' 
        AND table_name = 'ai_sessions'
    ) THEN
        ALTER TABLE ai_sessions 
        ADD CONSTRAINT fk_ai_sessions_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- reader_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ai_sessions_reader_id' 
        AND table_name = 'ai_sessions'
    ) THEN
        ALTER TABLE ai_sessions 
        ADD CONSTRAINT fk_ai_sessions_reader_id 
        FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;

    -- ai_model_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ai_sessions_ai_model_id' 
        AND table_name = 'ai_sessions'
    ) THEN
        ALTER TABLE ai_sessions 
        ADD CONSTRAINT fk_ai_sessions_ai_model_id 
        FOREIGN KEY (ai_model_id) REFERENCES ai_models(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- AI feedback foreign keys
DO $$ 
BEGIN
    -- ai_session_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ai_feedback_ai_session_id' 
        AND table_name = 'ai_feedback'
    ) THEN
        ALTER TABLE ai_feedback 
        ADD CONSTRAINT fk_ai_feedback_ai_session_id 
        FOREIGN KEY (ai_session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE;
    END IF;

    -- user_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ai_feedback_user_id' 
        AND table_name = 'ai_feedback'
    ) THEN
        ALTER TABLE ai_feedback 
        ADD CONSTRAINT fk_ai_feedback_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Learning paths foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_learning_paths_created_by' 
        AND table_name = 'learning_paths'
    ) THEN
        ALTER TABLE learning_paths 
        ADD CONSTRAINT fk_learning_paths_created_by 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Course content foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_course_content_learning_path_id' 
        AND table_name = 'course_content'
    ) THEN
        ALTER TABLE course_content 
        ADD CONSTRAINT fk_course_content_learning_path_id 
        FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Course enrollments foreign keys
DO $$ 
BEGIN
    -- user_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_course_enrollments_user_id' 
        AND table_name = 'course_enrollments'
    ) THEN
        ALTER TABLE course_enrollments 
        ADD CONSTRAINT fk_course_enrollments_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- learning_path_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_course_enrollments_learning_path_id' 
        AND table_name = 'course_enrollments'
    ) THEN
        ALTER TABLE course_enrollments 
        ADD CONSTRAINT fk_course_enrollments_learning_path_id 
        FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE;
    END IF;

    -- current_content_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_course_enrollments_current_content_id' 
        AND table_name = 'course_enrollments'
    ) THEN
        ALTER TABLE course_enrollments 
        ADD CONSTRAINT fk_course_enrollments_current_content_id 
        FOREIGN KEY (current_content_id) REFERENCES course_content(id) ON DELETE SET NULL;
    END IF;
END $$;

-- User content progress foreign keys
DO $$ 
BEGIN
    -- enrollment_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_content_progress_enrollment_id' 
        AND table_name = 'user_content_progress'
    ) THEN
        ALTER TABLE user_content_progress 
        ADD CONSTRAINT fk_user_content_progress_enrollment_id 
        FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE;
    END IF;

    -- content_id FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_content_progress_content_id' 
        AND table_name = 'user_content_progress'
    ) THEN
        ALTER TABLE user_content_progress 
        ADD CONSTRAINT fk_user_content_progress_content_id 
        FOREIGN KEY (content_id) REFERENCES course_content(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- 6. VERIFY FOREIGN KEY CREATION
-- =============================================

-- Query to verify all foreign keys have been created
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =============================================
-- 7. SUCCESS MESSAGE
-- =============================================

DO $$ 
BEGIN
    RAISE NOTICE 'Foreign key constraints migration completed successfully!';
    RAISE NOTICE 'Please run the foreign_key_analysis.sql queries again to verify all constraints are in place.';
END $$; 