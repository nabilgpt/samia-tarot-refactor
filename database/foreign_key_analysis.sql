-- =============================================
-- FOREIGN KEY RELATIONSHIP ANALYSIS
-- SAMIA TAROT Database Schema Verification
-- =============================================

-- 1. LIST ALL FOREIGN KEY CONSTRAINTS IN PUBLIC SCHEMA
-- =============================================

SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =============================================
-- 2. DETECT ORPHANED/BROKEN FOREIGN KEY REFERENCES
-- =============================================

-- Check profiles table for orphaned references to auth.users
SELECT 'profiles->auth.users' as check_type, COUNT(*) as orphaned_count
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Check bookings for orphaned user_id references
SELECT 'bookings->profiles(user_id)' as check_type, COUNT(*) as orphaned_count
FROM bookings b
LEFT JOIN profiles p ON b.user_id = p.id
WHERE p.id IS NULL;

-- Check bookings for orphaned reader_id references
SELECT 'bookings->profiles(reader_id)' as check_type, COUNT(*) as orphaned_count
FROM bookings b
LEFT JOIN profiles p ON b.reader_id = p.id
WHERE b.reader_id IS NOT NULL AND p.id IS NULL;

-- Check bookings for orphaned service_id references
SELECT 'bookings->services' as check_type, COUNT(*) as orphaned_count
FROM bookings b
LEFT JOIN services s ON b.service_id = s.id
WHERE s.id IS NULL;

-- Check payments for orphaned booking_id references
SELECT 'payments->bookings' as check_type, COUNT(*) as orphaned_count
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
WHERE p.booking_id IS NOT NULL AND b.id IS NULL;

-- Check payments for orphaned user_id references
SELECT 'payments->profiles(user_id)' as check_type, COUNT(*) as orphaned_count
FROM payments p
LEFT JOIN profiles pr ON p.user_id = pr.id
WHERE pr.id IS NULL;

-- Check wallets for orphaned user_id references
SELECT 'wallets->profiles' as check_type, COUNT(*) as orphaned_count
FROM wallets w
LEFT JOIN profiles p ON w.user_id = p.id
WHERE p.id IS NULL;

-- Check transactions for orphaned wallet_id references
SELECT 'transactions->wallets' as check_type, COUNT(*) as orphaned_count
FROM transactions t
LEFT JOIN wallets w ON t.wallet_id = w.id
WHERE w.id IS NULL;

-- Check transactions for orphaned user_id references
SELECT 'transactions->profiles' as check_type, COUNT(*) as orphaned_count
FROM transactions t
LEFT JOIN profiles p ON t.user_id = p.id
WHERE p.id IS NULL;

-- Check receipt_uploads for orphaned payment_id references
SELECT 'receipt_uploads->payments' as check_type, COUNT(*) as orphaned_count
FROM receipt_uploads r
LEFT JOIN payments p ON r.payment_id = p.id
WHERE p.id IS NULL;

-- Check receipt_uploads for orphaned user_id references
SELECT 'receipt_uploads->profiles' as check_type, COUNT(*) as orphaned_count
FROM receipt_uploads r
LEFT JOIN profiles p ON r.user_id = p.id
WHERE p.id IS NULL;

-- Check messages for orphaned booking_id references
SELECT 'messages->bookings' as check_type, COUNT(*) as orphaned_count
FROM messages m
LEFT JOIN bookings b ON m.booking_id = b.id
WHERE b.id IS NULL;

-- Check messages for orphaned sender_id references
SELECT 'messages->profiles(sender_id)' as check_type, COUNT(*) as orphaned_count
FROM messages m
LEFT JOIN profiles p ON m.sender_id = p.id
WHERE p.id IS NULL;

-- Check reviews for orphaned booking_id references
SELECT 'reviews->bookings' as check_type, COUNT(*) as orphaned_count
FROM reviews r
LEFT JOIN bookings b ON r.booking_id = b.id
WHERE b.id IS NULL;

-- Check reviews for orphaned client_id references
SELECT 'reviews->profiles(client_id)' as check_type, COUNT(*) as orphaned_count
FROM reviews r
LEFT JOIN profiles p ON r.client_id = p.id
WHERE p.id IS NULL;

-- Check reviews for orphaned reader_id references
SELECT 'reviews->profiles(reader_id)' as check_type, COUNT(*) as orphaned_count
FROM reviews r
LEFT JOIN profiles p ON r.reader_id = p.id
WHERE p.id IS NULL;

-- Check notifications for orphaned user_id references
SELECT 'notifications->profiles' as check_type, COUNT(*) as orphaned_count
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE p.id IS NULL;

-- =============================================
-- 3. CHECK FOR MISSING FOREIGN KEY CONSTRAINTS
-- =============================================

-- Check if all expected foreign key constraints exist
WITH expected_fks AS (
    SELECT 'profiles' as table_name, 'id' as column_name, 'auth.users' as ref_table, 'id' as ref_column
    UNION ALL SELECT 'bookings', 'user_id', 'profiles', 'id'
    UNION ALL SELECT 'bookings', 'reader_id', 'profiles', 'id'
    UNION ALL SELECT 'bookings', 'service_id', 'services', 'id'
    UNION ALL SELECT 'payments', 'booking_id', 'bookings', 'id'
    UNION ALL SELECT 'payments', 'user_id', 'profiles', 'id'
    UNION ALL SELECT 'wallets', 'user_id', 'profiles', 'id'
    UNION ALL SELECT 'transactions', 'wallet_id', 'wallets', 'id'
    UNION ALL SELECT 'transactions', 'user_id', 'profiles', 'id'
    UNION ALL SELECT 'receipt_uploads', 'payment_id', 'payments', 'id'
    UNION ALL SELECT 'receipt_uploads', 'user_id', 'profiles', 'id'
    UNION ALL SELECT 'messages', 'booking_id', 'bookings', 'id'
    UNION ALL SELECT 'messages', 'sender_id', 'profiles', 'id'
    UNION ALL SELECT 'reviews', 'booking_id', 'bookings', 'id'
    UNION ALL SELECT 'reviews', 'client_id', 'profiles', 'id'
    UNION ALL SELECT 'reviews', 'reader_id', 'profiles', 'id'
    UNION ALL SELECT 'notifications', 'user_id', 'profiles', 'id'
    -- AI System tables
    UNION ALL SELECT 'ai_prompts', 'ai_model_id', 'ai_models', 'id'
    UNION ALL SELECT 'ai_sessions', 'user_id', 'profiles', 'id'
    UNION ALL SELECT 'ai_sessions', 'reader_id', 'profiles', 'id'
    UNION ALL SELECT 'ai_sessions', 'ai_model_id', 'ai_models', 'id'
    UNION ALL SELECT 'ai_feedback', 'ai_session_id', 'ai_sessions', 'id'
    UNION ALL SELECT 'ai_feedback', 'user_id', 'profiles', 'id'
    UNION ALL SELECT 'course_content', 'learning_path_id', 'learning_paths', 'id'
    UNION ALL SELECT 'course_enrollments', 'user_id', 'profiles', 'id'
    UNION ALL SELECT 'course_enrollments', 'learning_path_id', 'learning_paths', 'id'
    UNION ALL SELECT 'course_enrollments', 'current_content_id', 'course_content', 'id'
    UNION ALL SELECT 'user_content_progress', 'enrollment_id', 'course_enrollments', 'id'
    UNION ALL SELECT 'user_content_progress', 'content_id', 'course_content', 'id'
)
SELECT 
    e.table_name,
    e.column_name,
    e.ref_table,
    e.ref_column,
    CASE 
        WHEN tc.constraint_name IS NULL THEN 'MISSING'
        ELSE 'EXISTS'
    END as fk_status
FROM expected_fks e
LEFT JOIN information_schema.table_constraints tc ON tc.table_name = e.table_name
LEFT JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name 
    AND kcu.column_name = e.column_name
LEFT JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_name = e.ref_table
    AND ccu.column_name = e.ref_column
WHERE tc.constraint_type = 'FOREIGN KEY' OR tc.constraint_name IS NULL
ORDER BY e.table_name, e.column_name;

-- =============================================
-- 4. GENERATE ALTER TABLE STATEMENTS FOR MISSING FOREIGN KEYS
-- =============================================

-- Note: Execute these only after reviewing the orphaned data checks above
-- If orphaned data exists, it must be cleaned up first

/*
-- Example foreign key additions (uncomment and execute as needed):

-- Add foreign key for bookings.user_id if missing
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for bookings.reader_id if missing
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_reader_id 
FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add foreign key for bookings.service_id if missing
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_service_id 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT;

-- Add foreign key for payments.booking_id if missing
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_booking_id 
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- Add foreign key for payments.user_id if missing
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for wallets.user_id if missing
ALTER TABLE wallets 
ADD CONSTRAINT fk_wallets_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for transactions.wallet_id if missing
ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_wallet_id 
FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;

-- Add foreign key for transactions.user_id if missing
ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for receipt_uploads.payment_id if missing
ALTER TABLE receipt_uploads 
ADD CONSTRAINT fk_receipt_uploads_payment_id 
FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;

-- Add foreign key for receipt_uploads.user_id if missing
ALTER TABLE receipt_uploads 
ADD CONSTRAINT fk_receipt_uploads_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for messages.booking_id if missing
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_booking_id 
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- Add foreign key for messages.sender_id if missing
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_sender_id 
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for reviews.booking_id if missing
ALTER TABLE reviews 
ADD CONSTRAINT fk_reviews_booking_id 
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- Add foreign key for reviews.client_id if missing
ALTER TABLE reviews 
ADD CONSTRAINT fk_reviews_client_id 
FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for reviews.reader_id if missing
ALTER TABLE reviews 
ADD CONSTRAINT fk_reviews_reader_id 
FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for notifications.user_id if missing
ALTER TABLE notifications 
ADD CONSTRAINT fk_notifications_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

*/

-- =============================================
-- 5. DATA INTEGRITY VERIFICATION QUERIES
-- =============================================

-- Check for duplicate entries that might cause constraint violations
SELECT 'Duplicate wallet users' as check_type, COUNT(*) as count
FROM (
    SELECT user_id, COUNT(*) as dup_count
    FROM wallets 
    GROUP BY user_id 
    HAVING COUNT(*) > 1
) duplicates;

-- Check for invalid profile roles
SELECT 'Invalid profile roles' as check_type, COUNT(*) as count
FROM profiles 
WHERE role NOT IN ('client', 'reader', 'admin', 'monitor', 'super_admin');

-- Check for invalid payment methods
SELECT 'Invalid payment methods' as check_type, COUNT(*) as count
FROM payments 
WHERE method NOT IN ('stripe', 'square', 'usdt', 'western_union', 'moneygram', 'ria', 'omt', 'whish', 'bob', 'wallet');

-- Check for invalid service types
SELECT 'Invalid service types' as check_type, COUNT(*) as count
FROM services 
WHERE type NOT IN ('tarot', 'coffee', 'palm', 'dream', 'call');

-- Check for negative wallet balances
SELECT 'Negative wallet balances' as check_type, COUNT(*) as count
FROM wallets 
WHERE balance < 0;

-- Check for inconsistent transaction balances
SELECT 'Inconsistent transaction balances' as check_type, COUNT(*) as count
FROM transactions 
WHERE balance_after != balance_before + CASE WHEN type IN ('credit', 'topup', 'refund') THEN amount ELSE -amount END;

-- =============================================
-- 6. PERFORMANCE INDEX VERIFICATION
-- =============================================

-- Check if all recommended indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check for missing recommended indexes
WITH expected_indexes AS (
    SELECT 'idx_profiles_role' as index_name, 'profiles' as table_name, 'role' as column_name
    UNION ALL SELECT 'idx_profiles_active', 'profiles', 'is_active'
    UNION ALL SELECT 'idx_services_type', 'services', 'type'
    UNION ALL SELECT 'idx_services_active', 'services', 'is_active'
    UNION ALL SELECT 'idx_bookings_user', 'bookings', 'user_id'
    UNION ALL SELECT 'idx_bookings_reader', 'bookings', 'reader_id'
    UNION ALL SELECT 'idx_bookings_status', 'bookings', 'status'
    UNION ALL SELECT 'idx_bookings_scheduled', 'bookings', 'scheduled_at'
    UNION ALL SELECT 'idx_payments_booking', 'payments', 'booking_id'
    UNION ALL SELECT 'idx_payments_status', 'payments', 'status'
    UNION ALL SELECT 'idx_payments_method', 'payments', 'method'
    UNION ALL SELECT 'idx_wallets_user', 'wallets', 'user_id'
    UNION ALL SELECT 'idx_transactions_wallet', 'transactions', 'wallet_id'
    UNION ALL SELECT 'idx_transactions_user', 'transactions', 'user_id'
    UNION ALL SELECT 'idx_transactions_type', 'transactions', 'type'
    UNION ALL SELECT 'idx_receipt_uploads_payment', 'receipt_uploads', 'payment_id'
    UNION ALL SELECT 'idx_receipt_uploads_status', 'receipt_uploads', 'upload_status'
    UNION ALL SELECT 'idx_messages_booking', 'messages', 'booking_id'
    UNION ALL SELECT 'idx_messages_created', 'messages', 'created_at'
    UNION ALL SELECT 'idx_notifications_user', 'notifications', 'user_id'
)
SELECT 
    e.index_name,
    e.table_name,
    e.column_name,
    CASE 
        WHEN pi.indexname IS NULL THEN 'MISSING'
        ELSE 'EXISTS'
    END as index_status
FROM expected_indexes e
LEFT JOIN pg_indexes pi ON pi.indexname = e.index_name AND pi.tablename = e.table_name
ORDER BY e.table_name, e.index_name; 