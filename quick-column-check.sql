-- QUICK COLUMN CHECK FOR COMMON ISSUES
-- This will help identify the exact column naming problems

-- Check specific tables mentioned in errors
SELECT 'VOICE_NOTES TABLE COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'voice_notes' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'AI_READING_RESULTS TABLE COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_reading_results' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'READER_APPLICATIONS TABLE COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reader_applications' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'WALLET_TRANSACTIONS TABLE COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallet_transactions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for user reference patterns across all tables
SELECT 'USER REFERENCE COLUMNS ACROSS ALL TABLES:' as info;
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    column_name IN ('user_id', 'client_id', 'sender_id', 'applicant_id', 'reader_id', 'customer_id') 
    OR column_name LIKE '%_user_id'
    OR column_name LIKE 'user_%'
)
ORDER BY table_name, column_name;

-- Check if tables exist at all
SELECT 'TABLE EXISTENCE CHECK:' as info;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_notes' AND table_schema = 'public')
        THEN 'voice_notes EXISTS'
        ELSE 'voice_notes MISSING'
    END as voice_notes_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_reading_results' AND table_schema = 'public')
        THEN 'ai_reading_results EXISTS'
        ELSE 'ai_reading_results MISSING'
    END as ai_reading_results_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reader_applications' AND table_schema = 'public')
        THEN 'reader_applications EXISTS'
        ELSE 'reader_applications MISSING'
    END as reader_applications_status; 