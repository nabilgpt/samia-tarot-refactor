-- ============================================================
-- FIX: Participants Column Error
-- Resolves "column participants does not exist" error
-- ============================================================

-- Check if chat_sessions table exists and what columns it has
DO $$
BEGIN
    -- First, let's see what tables exist
    RAISE NOTICE 'Checking existing table structure...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        RAISE NOTICE '✅ chat_sessions table exists';
        
        -- Check if participants column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'chat_sessions' AND column_name = 'participants') THEN
            RAISE NOTICE '✅ participants column exists in chat_sessions';
        ELSE
            RAISE NOTICE '❌ participants column MISSING in chat_sessions - will add it';
        END IF;
    ELSE
        RAISE NOTICE '❌ chat_sessions table does not exist - will create it';
    END IF;
END $$;

-- ============================================================
-- SOLUTION 1: Add missing participants column if table exists
-- ============================================================

-- Add participants column to existing chat_sessions table if missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'chat_sessions' AND column_name = 'participants') THEN
        
        ALTER TABLE chat_sessions ADD COLUMN participants UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
        RAISE NOTICE '✅ Added participants column to existing chat_sessions table';
        
        -- Update existing records to populate participants array
        UPDATE chat_sessions 
        SET participants = ARRAY[client_id, reader_id]
        WHERE participants = ARRAY[]::UUID[];
        
        RAISE NOTICE '✅ Updated existing chat_sessions records with participants';
        
    END IF;
END $$;

-- ============================================================
-- SOLUTION 2: Create complete chat_sessions table if missing
-- ============================================================

-- Create chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) DEFAULT 'one_on_one',
    status VARCHAR(50) DEFAULT 'active',
    participants UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- SOLUTION 3: Fix any existing policies that reference participants
-- ============================================================

-- Drop and recreate RLS policies that might be causing the error
DROP POLICY IF EXISTS "Users can view their chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their chat sessions" ON chat_sessions;

-- Enable RLS if not already enabled
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create corrected RLS policies
CREATE POLICY "Users can view their chat sessions" ON chat_sessions
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = reader_id OR 
        (participants IS NOT NULL AND auth.uid() = ANY(participants))
    );

CREATE POLICY "Users can insert chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = client_id OR 
        auth.uid() = reader_id
    );

CREATE POLICY "Users can update their chat sessions" ON chat_sessions
    FOR UPDATE USING (
        auth.uid() = client_id OR 
        auth.uid() = reader_id OR 
        (participants IS NOT NULL AND auth.uid() = ANY(participants))
    );

-- ============================================================
-- SOLUTION 4: Create indexes for performance
-- ============================================================

-- Create indexes for the participants column
CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants 
ON chat_sessions USING GIN(participants);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_client_id 
ON chat_sessions(client_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_reader_id 
ON chat_sessions(reader_id);

-- ============================================================
-- SOLUTION 5: Verify the fix
-- ============================================================

-- Test query to verify participants column works
DO $$
BEGIN
    -- Try to query the participants column
    PERFORM participants FROM chat_sessions LIMIT 1;
    RAISE NOTICE '✅ participants column is now working correctly';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Still having issues with participants column: %', SQLERRM;
END $$;

-- ============================================================
-- ALTERNATIVE: If you want to remove participants dependency
-- ============================================================

-- If you prefer not to use participants array, you can use this alternative policy:
/*
DROP POLICY IF EXISTS "Users can view their chat sessions" ON chat_sessions;
CREATE POLICY "Users can view their chat sessions" ON chat_sessions
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = reader_id
    );
*/

-- ============================================================
-- SUCCESS VERIFICATION
-- ============================================================

-- Final check
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_sessions' 
AND column_name IN ('participants', 'client_id', 'reader_id')
ORDER BY column_name;

-- Success message
SELECT '🎉 Participants column error should now be fixed!' as result;

-- Instructions for next steps
SELECT 'Next: Try running your original query again' as next_step; 