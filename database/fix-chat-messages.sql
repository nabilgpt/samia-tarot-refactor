-- ============================================================================
-- CHAT MESSAGES TABLE FIX
-- Creates missing chat_messages table and related functionality
-- ============================================================================

-- Create missing chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    message_content TEXT NOT NULL,
    message_data JSONB DEFAULT '{}'::jsonb,
    file_attachment_url TEXT,
    file_attachment_type VARCHAR(100),
    file_attachment_size INTEGER,
    voice_note_url TEXT,
    voice_note_duration INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    original_content TEXT,
    reply_to_message_id UUID REFERENCES chat_messages(id),
    reaction_data JSONB DEFAULT '{}'::jsonb,
    is_system_message BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_session_id ON chat_messages(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON chat_messages(message_type);

-- Create voice_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_path TEXT,
    duration_seconds INTEGER,
    file_size_bytes INTEGER,
    audio_format VARCHAR(50) DEFAULT 'mp3',
    transcription TEXT,
    is_transcribed BOOLEAN DEFAULT FALSE,
    transcribed_at TIMESTAMP WITH TIME ZONE,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    is_processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for voice_notes
CREATE INDEX IF NOT EXISTS idx_voice_notes_message_id ON voice_notes(message_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_is_transcribed ON voice_notes(is_transcribed);
CREATE INDEX IF NOT EXISTS idx_voice_notes_created_at ON voice_notes(created_at);

-- Add updated_at triggers
CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_notes_updated_at 
    BEFORE UPDATE ON voice_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their chat sessions" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = chat_session_id 
            AND (cs.reader_id = auth.uid() OR cs.client_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can send messages in their chat sessions" ON chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = chat_session_id 
            AND (cs.reader_id = auth.uid() OR cs.client_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (
        auth.uid() = sender_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for voice_notes
CREATE POLICY "Users can view voice notes in their messages" ON voice_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_messages cm 
            JOIN chat_sessions cs ON cm.chat_session_id = cs.id
            WHERE cm.id = message_id 
            AND (cs.reader_id = auth.uid() OR cs.client_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can create voice notes for their messages" ON voice_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_messages cm 
            WHERE cm.id = message_id 
            AND cm.sender_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own voice notes" ON voice_notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_messages cm 
            WHERE cm.id = message_id 
            AND cm.sender_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_chat_session_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    messages_updated INTEGER;
BEGIN
    UPDATE chat_messages 
    SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
    WHERE chat_session_id = p_chat_session_id 
      AND recipient_id = p_user_id 
      AND is_read = FALSE;
    
    GET DIAGNOSTICS messages_updated = ROW_COUNT;
    RETURN messages_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM chat_messages cm
        JOIN chat_sessions cs ON cm.chat_session_id = cs.id
        WHERE (cs.reader_id = p_user_id OR cs.client_id = p_user_id)
          AND cm.recipient_id = p_user_id
          AND cm.is_read = FALSE
          AND cm.is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
SELECT 'chat_messages' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') 
            THEN '✅ Created' 
            ELSE '❌ Failed' 
       END as status
UNION ALL
SELECT 'voice_notes' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_notes') 
            THEN '✅ Created' 
            ELSE '❌ Failed' 
       END as status; 