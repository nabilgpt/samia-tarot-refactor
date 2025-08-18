-- =====================================================
-- SAMIA TAROT - CHAT SYSTEM CONSOLIDATION MIGRATION
-- =====================================================
-- This script unifies the fragmented chat system into a single, robust schema
-- CRITICAL: Execute in Supabase SQL Editor with careful monitoring

-- =====================================================
-- STEP 1: CREATE BACKUP TABLES
-- =====================================================

-- Backup existing messages table (only if backup doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages_backup') THEN
        EXECUTE 'CREATE TABLE messages_backup AS SELECT * FROM messages';
    END IF;
END $$;

-- Backup existing chat_messages table if it exists (only if backup doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages_backup') THEN
        EXECUTE 'CREATE TABLE chat_messages_backup AS SELECT * FROM chat_messages';
    END IF;
END $$;

-- Backup existing voice_notes table if it exists (only if backup doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_notes') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_notes_backup') THEN
        EXECUTE 'CREATE TABLE voice_notes_backup AS SELECT * FROM voice_notes';
    END IF;
END $$;

-- Backup existing chat_sessions table if it exists (only if backup doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions_backup') THEN
        EXECUTE 'CREATE TABLE chat_sessions_backup AS SELECT * FROM chat_sessions';
    END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE UNIFIED CHAT_MESSAGES TABLE
-- =====================================================

-- Drop existing chat_messages table if it exists (we have backup)
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Create the new unified chat_messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    
    -- Message content and type
    type VARCHAR(50) DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image', 'file', 'video', 'system', 'emergency')),
    content TEXT,
    
    -- File attachments
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    
    -- Audio message specific fields
    duration_seconds INTEGER,
    waveform_data JSONB,
    
    -- Message threading and relationships
    reply_to_message_id UUID,
    
    -- Message status and approval (for voice messages)
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'pending_approval', 'approved', 'rejected', 'deleted')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery and read tracking
    delivered_to UUID[] DEFAULT '{}',
    read_by UUID[] DEFAULT '{}',
    
    -- Message editing and deletion
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata and timestamps
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: ENSURE CHAT_SESSIONS TABLE EXISTS WITH PROPER SCHEMA
-- =====================================================

-- Drop existing chat_sessions table if it exists (we'll recreate with proper schema)
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Create the new unified chat_sessions table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session participants and context
    participants UUID[] NOT NULL DEFAULT '{}',
    type VARCHAR(50) DEFAULT 'booking' CHECK (type IN ('booking', 'emergency', 'general', 'support')),
    
    -- Session metadata
    booking_id UUID, -- Link to booking if applicable
    emergency_call_id UUID, -- Link to emergency call if applicable
    
    -- Session status and timing
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended', 'locked')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    
    -- Session metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 4: DATA MIGRATION FROM MESSAGES TABLE
-- =====================================================

-- Migrate data from messages table to unified chat_messages (defensive approach)
DO $$
DECLARE
    messages_exists BOOLEAN;
BEGIN
    -- Check if messages table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'messages'
    ) INTO messages_exists;
    
    IF messages_exists THEN
        INSERT INTO chat_messages (
            session_id,
            sender_id,
            type,
            content,
            file_url,
            file_name,
            file_size,
            duration_seconds,
            created_at
        )
        SELECT 
            -- Create session_id based on booking_id (we'll create sessions for each booking)
            COALESCE(booking_id, gen_random_uuid()),
            sender_id,
            CASE 
                WHEN type = 'voice' THEN 'audio'
                WHEN type IN ('text', 'image', 'file', 'system') THEN type
                ELSE 'text'
            END,
            COALESCE(content, ''),
            COALESCE(file_url, ''),
            COALESCE(file_name, ''),
            COALESCE(file_size, 0),
            COALESCE(duration_seconds, 0),
            created_at
        FROM messages
        WHERE messages.id IS NOT NULL;
    END IF;
END $$;

-- =====================================================
-- STEP 5: CREATE CHAT SESSIONS FROM BOOKINGS
-- =====================================================

-- Create chat sessions for each booking that has messages (defensive approach)
DO $$
DECLARE
    bookings_exists BOOLEAN;
    messages_exists BOOLEAN;
BEGIN
    -- Check if required tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'bookings'
    ) INTO bookings_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'messages'
    ) INTO messages_exists;
    
    IF bookings_exists AND messages_exists THEN
        INSERT INTO chat_sessions (
            id,
            participants,
            type,
            booking_id,
            status,
            started_at,
            last_message_at,
            created_at
        )
        SELECT DISTINCT
            booking_id as id,
            ARRAY[user_id, reader_id] as participants,
            'booking' as type,
            booking_id,
            CASE 
                WHEN b.status = 'completed' THEN 'ended'
                WHEN b.status = 'cancelled' THEN 'ended'
                ELSE 'active'
            END as status,
            b.created_at as started_at,
            (SELECT MAX(created_at) FROM messages WHERE booking_id = b.id) as last_message_at,
            b.created_at
        FROM bookings b
        WHERE EXISTS (
            SELECT 1 FROM messages WHERE booking_id = b.id
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- STEP 6: MIGRATE VOICE_NOTES DATA (IF EXISTS)
-- =====================================================

-- Migrate voice_notes data if table exists (defensive approach with column checking)
DO $$
DECLARE
    voice_notes_exists BOOLEAN;
    has_file_url BOOLEAN;
    has_file_name BOOLEAN;
    has_file_size BOOLEAN;
    has_duration_seconds BOOLEAN;
    migration_sql TEXT;
BEGIN
    -- Check if voice_notes table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'voice_notes'
    ) INTO voice_notes_exists;
    
    IF voice_notes_exists THEN
        -- Check which columns exist in voice_notes table
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'voice_notes' AND column_name = 'file_url'
        ) INTO has_file_url;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'voice_notes' AND column_name = 'file_name'
        ) INTO has_file_name;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'voice_notes' AND column_name = 'file_size'
        ) INTO has_file_size;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'voice_notes' AND column_name = 'duration_seconds'
        ) INTO has_duration_seconds;
        
        -- Build migration SQL dynamically based on available columns
        migration_sql := '
        INSERT INTO chat_messages (
            session_id,
            sender_id,
            type,
            content,
            file_url,
            file_name,
            file_size,
            duration_seconds,
            status,
            metadata,
            created_at
        )
        SELECT 
            gen_random_uuid() as session_id,
            user_id as sender_id,
            ''audio'' as type,
            ''Voice message'' as content,';
            
        -- Add file_url column conditionally
        IF has_file_url THEN
            migration_sql := migration_sql || ' COALESCE(file_url, '''') as file_url,';
        ELSE
            migration_sql := migration_sql || ' '''' as file_url,';
        END IF;
        
        -- Add file_name column conditionally
        IF has_file_name THEN
            migration_sql := migration_sql || ' COALESCE(file_name, ''voice_message.mp3'') as file_name,';
        ELSE
            migration_sql := migration_sql || ' ''voice_message.mp3'' as file_name,';
        END IF;
        
        -- Add file_size column conditionally
        IF has_file_size THEN
            migration_sql := migration_sql || ' COALESCE(file_size, 0) as file_size,';
        ELSE
            migration_sql := migration_sql || ' 0 as file_size,';
        END IF;
        
        -- Add duration_seconds column conditionally
        IF has_duration_seconds THEN
            migration_sql := migration_sql || ' COALESCE(duration_seconds, 0) as duration_seconds,';
        ELSE
            migration_sql := migration_sql || ' 0 as duration_seconds,';
        END IF;
        
        -- Complete the query
        migration_sql := migration_sql || '
            ''pending_approval'' as status,
            ''{}''::jsonb as metadata,
            created_at
        FROM voice_notes';
        
        -- Execute the migration
        EXECUTE migration_sql;
    END IF;
END $$;

-- =====================================================
-- STEP 7: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key constraints
ALTER TABLE chat_messages
ADD CONSTRAINT fk_chat_messages_session_id
FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;

ALTER TABLE chat_messages
ADD CONSTRAINT fk_chat_messages_sender_id
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE chat_messages
ADD CONSTRAINT fk_chat_messages_reply_to
FOREIGN KEY (reply_to_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;

ALTER TABLE chat_messages
ADD CONSTRAINT fk_chat_messages_approved_by
FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add foreign keys for chat_sessions
ALTER TABLE chat_sessions
ADD CONSTRAINT fk_chat_sessions_booking_id
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 8: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_message_id);

-- Chat sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants ON chat_sessions USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_type ON chat_sessions(type);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_booking_id ON chat_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON chat_sessions(last_message_at);

-- =====================================================
-- STEP 9: ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on chat tables
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Users can view messages from their sessions" ON chat_messages
FOR SELECT USING (
    auth.uid() = ANY(
        SELECT unnest(participants) 
        FROM chat_sessions 
        WHERE chat_sessions.id = chat_messages.session_id
    )
);

CREATE POLICY "Users can send messages to their sessions" ON chat_messages
FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() = ANY(
        SELECT unnest(participants) 
        FROM chat_sessions 
        WHERE chat_sessions.id = chat_messages.session_id
    )
);

CREATE POLICY "Users can update their own messages" ON chat_messages
FOR UPDATE USING (
    auth.uid() = sender_id AND
    created_at > NOW() - INTERVAL '5 minutes'
);

CREATE POLICY "Admins can view all messages" ON chat_messages
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- Chat sessions policies
CREATE POLICY "Users can view their chat sessions" ON chat_sessions
FOR SELECT USING (
    auth.uid() = ANY(participants)
);

CREATE POLICY "Users can update their chat sessions" ON chat_sessions
FOR UPDATE USING (
    auth.uid() = ANY(participants)
);

CREATE POLICY "Admins can view all chat sessions" ON chat_sessions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- =====================================================
-- STEP 10: CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_message_at in chat_sessions
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions 
    SET last_message_at = NEW.created_at 
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update session last message time
CREATE TRIGGER update_session_last_message_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_session_last_message();

-- =====================================================
-- STEP 11: STORAGE BUCKET STANDARDIZATION
-- =====================================================

-- Ensure chat-files bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for chat-files bucket
CREATE POLICY "Users can upload chat files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'chat-files' AND 
    auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view chat files they have access to" ON storage.objects
FOR SELECT USING (
    bucket_id = 'chat-files' AND 
    auth.uid() IS NOT NULL AND
    (
        -- File belongs to the user
        auth.uid()::text = (storage.foldername(name))[1] OR
        -- User is participant in the session
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id::text = (storage.foldername(name))[2] AND
            auth.uid() = ANY(cs.participants)
        )
    )
);

CREATE POLICY "Users can delete their own chat files" ON storage.objects
FOR DELETE USING (
    bucket_id = 'chat-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can access all chat files" ON storage.objects
FOR ALL USING (
    bucket_id = 'chat-files' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- =====================================================
-- STEP 12: CLEAN UP OLD TABLES (OPTIONAL - COMMENTED OUT FOR SAFETY)
-- =====================================================

-- WARNING: Only uncomment these after verifying migration success
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS voice_notes CASCADE;

-- =====================================================
-- STEP 13: VERIFICATION QUERIES
-- =====================================================

-- Verify migration results
DO $$
DECLARE
    messages_count INTEGER;
    chat_messages_count INTEGER;
    sessions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO messages_count FROM messages_backup;
    SELECT COUNT(*) INTO chat_messages_count FROM chat_messages;
    SELECT COUNT(*) INTO sessions_count FROM chat_sessions;
    
    -- Migration summary (results stored in variables)
    -- Original messages: messages_count
    -- Migrated messages: chat_messages_count  
    -- Chat sessions created: sessions_count
END $$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- CHAT SYSTEM CONSOLIDATION COMPLETED
-- Next steps:
--   1. Verify data integrity in new tables
--   2. Update backend API endpoints  
--   3. Update frontend components
--   4. Test real-time functionality
--   5. Remove old tables after verification

-- End of migration script 