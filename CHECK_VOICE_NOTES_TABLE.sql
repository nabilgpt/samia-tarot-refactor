-- ============================================================
-- CHECK VOICE NOTES TABLE STRUCTURE
-- Diagnostic script to understand the current voice_notes table
-- ============================================================

DO $$
DECLARE
    col_rec RECORD;
    col_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 VOICE NOTES TABLE DIAGNOSTIC';
    RAISE NOTICE '================================';
    
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_notes') THEN
        RAISE NOTICE '✅ voice_notes table exists';
        RAISE NOTICE '';
        
        -- Show all columns
        RAISE NOTICE '📋 Current columns in voice_notes:';
        FOR col_rec IN (
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'voice_notes' 
            ORDER BY ordinal_position
        )
        LOOP
            col_count := col_count + 1;
            RAISE NOTICE '  %: % (%) - Nullable: %', 
                col_count, 
                col_rec.column_name, 
                col_rec.data_type, 
                col_rec.is_nullable;
        END LOOP;
        
        RAISE NOTICE '';
        RAISE NOTICE '📊 Total columns: %', col_count;
        
        -- Check for expected columns
        RAISE NOTICE '';
        RAISE NOTICE '🔍 Expected column check:';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'id') THEN
            RAISE NOTICE '✅ id column exists';
        ELSE
            RAISE NOTICE '❌ id column missing';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'user_id') THEN
            RAISE NOTICE '✅ user_id column exists';
        ELSE
            RAISE NOTICE '❌ user_id column missing - THIS IS THE PROBLEM!';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'message_id') THEN
            RAISE NOTICE '✅ message_id column exists';
        ELSE
            RAISE NOTICE '❌ message_id column missing';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'file_url') THEN
            RAISE NOTICE '✅ file_url column exists';
        ELSE
            RAISE NOTICE '❌ file_url column missing';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'created_at') THEN
            RAISE NOTICE '✅ created_at column exists';
        ELSE
            RAISE NOTICE '❌ created_at column missing';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ voice_notes table does NOT exist';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================';
    
END $$; 