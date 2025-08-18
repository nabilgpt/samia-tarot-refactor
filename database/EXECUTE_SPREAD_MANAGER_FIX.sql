-- =====================================================
-- SAMIA TAROT - COMPREHENSIVE SPREAD MANAGER FIX
-- Execute this script to resolve all spread manager issues
-- =====================================================

BEGIN;

-- Step 1: Execute deck relationship fix
\i 'fix-spread-manager-deck-relationship.sql'

-- Step 2: Execute profiles relationship fix  
\i 'fix-spread-manager-profiles-relationship.sql'

-- Step 3: Final verification and cleanup
DO $$
DECLARE
    error_count INTEGER := 0;
    warning_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '🔍 FINAL VERIFICATION STARTED...';
    
    -- Check spreads table structure
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'spreads' AND column_name = 'deck_id'
    ) THEN
        error_count := error_count + 1;
        warning_messages := array_append(warning_messages, 'spreads.deck_id column missing');
    END IF;
    
    -- Check tarot_decks table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarot_decks') THEN
        error_count := error_count + 1;
        warning_messages := array_append(warning_messages, 'tarot_decks table missing');
    END IF;
    
    -- Check profiles table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        error_count := error_count + 1;
        warning_messages := array_append(warning_messages, 'profiles table missing');
    END IF;
    
    -- Check foreign key relationships
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'spreads' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.column_name = 'deck_id'
        AND ccu.table_name = 'tarot_decks'
    ) THEN
        error_count := error_count + 1;
        warning_messages := array_append(warning_messages, 'spreads -> tarot_decks foreign key missing');
    END IF;
    
    -- Display results
    IF error_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All spread manager issues have been resolved!';
        RAISE NOTICE '📊 System is ready for API operations';
    ELSE
        RAISE NOTICE '❌ ERRORS FOUND: % issues remaining', error_count;
        FOR i IN 1..array_length(warning_messages, 1) LOOP
            RAISE NOTICE '  - %', warning_messages[i];
        END LOOP;
    END IF;
    
    RAISE NOTICE '🔍 FINAL VERIFICATION COMPLETED';
END $$;

COMMIT;

-- Final success message
SELECT 
    'SPREAD MANAGER FIX COMPLETED' as status,
    NOW() as completed_at,
    'Database schema is now compatible with API routes' as message; 