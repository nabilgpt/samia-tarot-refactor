-- ============================================================
-- FIX: chat_messages.session_id Column Error
-- Resolves "column chat_messages.session_id does not exist" error
-- ============================================================

-- STEP 1: Diagnose the issue
DO $$
BEGIN
    RAISE NOTICE '🔍 DIAGNOSING CHAT_MESSAGES SESSION_ID ERROR...';
    
    -- Check if chat_messages table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        RAISE NOTICE '❌ chat_messages table does not exist - will create it';
    ELSE
        RAISE NOTICE '✅ chat_messages table exists';
        
        -- Check if session_id column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'chat_messages' AND column_name = 'session_id') THEN
            RAISE NOTICE '❌ session_id column missing from chat_messages - will add it';
        ELSE
            RAISE NOTICE '✅ session_id column exists in chat_messages';
        END IF;
    END IF;
END $$;

-- STEP 2: Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'file', 'system')),
    content TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    duration_seconds INTEGER,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- STEP 3: Add session_id column if table exists but column is missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'chat_messages' AND column_name = 'session_id') THEN
        
        -- Check if it's using booking_id instead (old structure)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'chat_messages' AND column_name = 'booking_id') THEN
            
            RAISE NOTICE '🔄 Found booking_id, will migrate to session_id structure...';
            
            -- Add session_id column
            ALTER TABLE chat_messages ADD COLUMN session_id UUID;
            
            -- Create chat_sessions if needed and migrate data
            INSERT INTO chat_sessions (id, client_id, reader_id, session_type, status, participants)
            SELECT 
                gen_random_uuid(),
                b.user_id,
                b.reader_id,
                'one_on_one',
                'active',
                ARRAY[b.user_id, b.reader_id]
            FROM bookings b
            WHERE b.id IN (SELECT DISTINCT booking_id FROM chat_messages WHERE booking_id IS NOT NULL)
            ON CONFLICT DO NOTHING;
            
            -- Update chat_messages to reference chat_sessions
            UPDATE chat_messages cm
            SET session_id = cs.id
            FROM chat_sessions cs, bookings b
            WHERE cm.booking_id = b.id
            AND cs.client_id = b.user_id
            AND cs.reader_id = b.reader_id;
            
            RAISE NOTICE '✅ Migrated from booking_id to session_id structure';
            
        ELSE
            -- Just add the column with NULL values
            ALTER TABLE chat_messages ADD COLUMN session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added session_id column to chat_messages';
        END IF;
    END IF;
END $$;

-- STEP 4: Handle case where messages table exists instead of chat_messages
DO $$
BEGIN
    -- If we have 'messages' table but no 'chat_messages', might need to migrate
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        
        RAISE NOTICE '🔄 Found old messages table, creating chat_messages with session support...';
        
        -- Create the new chat_messages table
        CREATE TABLE chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            message_type VARCHAR(50) DEFAULT 'text',
            content TEXT,
            file_url TEXT,
            is_edited BOOLEAN DEFAULT false,
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
        
        -- Migrate data from messages to chat_messages if possible
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'booking_id') THEN
            
            -- Create chat sessions for each booking
            INSERT INTO chat_sessions (id, client_id, reader_id, session_type, status, participants)
            SELECT DISTINCT
                gen_random_uuid(),
                b.user_id,
                b.reader_id,
                'one_on_one',
                'active',
                ARRAY[b.user_id, b.reader_id]
            FROM messages m
            JOIN bookings b ON m.booking_id = b.id
            ON CONFLICT DO NOTHING;
            
            -- Migrate messages
            INSERT INTO chat_messages (id, session_id, sender_id, message_type, content, file_url, created_at)
            SELECT 
                m.id,
                cs.id,
                m.sender_id,
                COALESCE(m.type, 'text'),
                m.content,
                m.file_url,
                m.created_at
            FROM messages m
            JOIN bookings b ON m.booking_id = b.id
            JOIN chat_sessions cs ON cs.client_id = b.user_id AND cs.reader_id = b.reader_id;
            
            RAISE NOTICE '✅ Migrated data from messages to chat_messages';
        END IF;
        
    END IF;
END $$;

-- STEP 5: Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON chat_messages(message_type);

-- STEP 6: Set up RLS policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;

-- Create new RLS policies
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

-- STEP 7: Verify the fix
DO $$
BEGIN
    -- Test that we can query session_id
    PERFORM session_id FROM chat_messages LIMIT 1;
    RAISE NOTICE '✅ session_id column is now working in chat_messages';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Still having issues with session_id: %', SQLERRM;
END $$;

-- STEP 8: Final verification
SELECT '🔍 FINAL VERIFICATION' as check_type;

-- Show the current structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
AND column_name IN ('id', 'session_id', 'sender_id', 'message_type', 'content')
ORDER BY ordinal_position;

-- Test the relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'chat_messages' 
            AND kcu.column_name = 'session_id'
            AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN '✅ session_id foreign key constraint exists'
        ELSE '⚠️ session_id foreign key constraint missing'
    END as fk_check;

-- Success message
SELECT '🎉 chat_messages.session_id error should now be fixed!' as result; 