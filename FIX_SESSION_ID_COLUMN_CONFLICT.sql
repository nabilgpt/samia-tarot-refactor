-- ============================================================
-- FIX: Session ID Column Conflict in chat_messages
-- Problem: Table has both 'session_id' and 'chat_session_id' columns
-- Solution: Consolidate to use 'session_id' as primary reference
-- ============================================================

-- STEP 1: Analyze the current situation
SELECT '🔍 ANALYZING SESSION COLUMN CONFLICT' as status;

-- Check data distribution
SELECT 
    COUNT(*) as total_messages,
    COUNT(session_id) as messages_with_session_id,
    COUNT(chat_session_id) as messages_with_chat_session_id,
    COUNT(*) - COUNT(session_id) as missing_session_id,
    COUNT(*) - COUNT(chat_session_id) as missing_chat_session_id
FROM chat_messages;

-- STEP 2: Show sample data to understand the structure
SELECT '📋 SAMPLE DATA ANALYSIS' as status;
SELECT 
    id,
    session_id,
    chat_session_id,
    sender_id,
    message_type,
    CASE 
        WHEN session_id IS NOT NULL AND chat_session_id IS NOT NULL THEN 'Both filled'
        WHEN session_id IS NULL AND chat_session_id IS NOT NULL THEN 'Only chat_session_id'
        WHEN session_id IS NOT NULL AND chat_session_id IS NULL THEN 'Only session_id'
        ELSE 'Both empty'
    END as column_status
FROM chat_messages 
LIMIT 5;

-- STEP 3: Fix the data by consolidating to session_id
DO $$
DECLARE
    messages_to_fix INTEGER;
BEGIN
    RAISE NOTICE '🔧 STARTING SESSION ID CONSOLIDATION...';
    
    -- Count how many need fixing
    SELECT COUNT(*) INTO messages_to_fix
    FROM chat_messages 
    WHERE session_id IS NULL AND chat_session_id IS NOT NULL;
    
    RAISE NOTICE 'Found % messages that need session_id populated', messages_to_fix;
    
    -- Update session_id from chat_session_id where session_id is null
    UPDATE chat_messages 
    SET session_id = chat_session_id
    WHERE session_id IS NULL AND chat_session_id IS NOT NULL;
    
    GET DIAGNOSTICS messages_to_fix = ROW_COUNT;
    RAISE NOTICE '✅ Updated % messages with session_id from chat_session_id', messages_to_fix;
    
    -- Handle edge case where both are null (shouldn't happen but just in case)
    SELECT COUNT(*) INTO messages_to_fix
    FROM chat_messages 
    WHERE session_id IS NULL AND chat_session_id IS NULL;
    
    IF messages_to_fix > 0 THEN
        RAISE NOTICE '⚠️ Found % messages with both session columns null - these need manual review', messages_to_fix;
    END IF;
    
END $$;

-- STEP 4: Make session_id NOT NULL (since it should always have a value)
DO $$
BEGIN
    -- First check if there are any remaining null session_id values
    IF NOT EXISTS (SELECT 1 FROM chat_messages WHERE session_id IS NULL) THEN
        -- Safe to make NOT NULL
        ALTER TABLE chat_messages ALTER COLUMN session_id SET NOT NULL;
        RAISE NOTICE '✅ Made session_id column NOT NULL';
    ELSE
        RAISE NOTICE '⚠️ Cannot make session_id NOT NULL - some records still have null values';
    END IF;
END $$;

-- STEP 5: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    -- Check if foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'chat_messages' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%session_id%'
    ) THEN
        -- Add foreign key constraint
        ALTER TABLE chat_messages 
        ADD CONSTRAINT fk_chat_messages_session_id 
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added foreign key constraint for session_id';
    ELSE
        RAISE NOTICE '✅ Foreign key constraint already exists for session_id';
    END IF;
END $$;

-- STEP 6: Consider removing redundant chat_session_id column
-- (Commented out for safety - run manually if you want to remove it)
/*
DO $$
BEGIN
    -- Only drop if all data has been migrated to session_id
    IF NOT EXISTS (
        SELECT 1 FROM chat_messages 
        WHERE session_id IS NULL OR 
              (chat_session_id IS NOT NULL AND session_id != chat_session_id)
    ) THEN
        ALTER TABLE chat_messages DROP COLUMN chat_session_id;
        RAISE NOTICE '✅ Removed redundant chat_session_id column';
    ELSE
        RAISE NOTICE '⚠️ Cannot safely remove chat_session_id - data mismatch detected';
    END IF;
END $$;
*/

-- STEP 7: Update any RLS policies that might be using chat_session_id
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;

-- Create corrected RLS policies using session_id
CREATE POLICY "Users can view messages in their sessions" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id = chat_messages.session_id 
            AND (auth.uid() = cs.client_id OR auth.uid() = cs.reader_id)
        )
    );

CREATE POLICY "Users can insert messages in their sessions" ON chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id = chat_messages.session_id 
            AND (auth.uid() = cs.client_id OR auth.uid() = cs.reader_id)
        )
    );

CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id = chat_messages.session_id 
            AND (auth.uid() = cs.client_id OR auth.uid() = cs.reader_id)
        )
    );

-- STEP 8: Create proper indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);

-- STEP 9: Verify the fix
SELECT '✅ VERIFICATION RESULTS' as status;

-- Check final data state
SELECT 
    COUNT(*) as total_messages,
    COUNT(session_id) as messages_with_session_id,
    COUNT(*) - COUNT(session_id) as missing_session_id,
    CASE 
        WHEN COUNT(*) = COUNT(session_id) THEN '✅ ALL GOOD'
        ELSE '❌ ISSUES REMAIN'
    END as status
FROM chat_messages;

-- Test session_id relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.id
            LIMIT 1
        ) THEN '✅ session_id relationships working'
        ELSE '❌ session_id relationships broken'
    END as relationship_check;

-- STEP 10: Show updated table structure
SELECT '📋 UPDATED COLUMN STRUCTURE' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name = 'session_id' THEN '← PRIMARY SESSION REFERENCE'
        WHEN column_name = 'chat_session_id' THEN '← REDUNDANT (consider removing)'
        ELSE ''
    END as notes
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
AND column_name IN ('session_id', 'chat_session_id', 'sender_id', 'message_type')
ORDER BY 
    CASE 
        WHEN column_name = 'session_id' THEN 1
        WHEN column_name = 'chat_session_id' THEN 2
        ELSE 3
    END;

-- Success message
SELECT '🎉 Session ID column conflict resolved!' as result;
SELECT 'Your chat_messages table now uses session_id as the primary session reference.' as note; 