-- ============================================================
-- PART 2: CHAT SYSTEM TABLES - SAMIA TAROT
-- This script handles only chat-related tables
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CHAT SESSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL, -- Will add foreign key constraint later
    reader_id UUID NOT NULL, -- Will add foreign key constraint later
    
    session_type VARCHAR(50) DEFAULT 'one_on_one' CHECK (session_type IN ('one_on_one', 'group', 'support')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked', 'deleted')),
    
    is_encrypted BOOLEAN DEFAULT true,
    participants UUID[] NOT NULL,
    
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. CHAT MESSAGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL, -- Will add foreign key constraint later
    sender_id UUID NOT NULL, -- Will add foreign key constraint later
    
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'file', 'video', 'system')),
    content TEXT,
    content_encrypted TEXT,
    
    -- File attachments
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    
    -- Voice messages
    duration_seconds INTEGER,
    waveform_data JSONB,
    
    -- Message status
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery tracking
    delivered_to UUID[] DEFAULT '{}',
    read_by UUID[] DEFAULT '{}',
    
    reply_to_message_id UUID, -- Will add foreign key constraint later
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. VOICE NOTES TABLE (OPTIONAL - FOR ENHANCED VOICE FEATURES)
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    duration_seconds INTEGER,
    
    -- Audio processing
    transcription TEXT,
    waveform_data JSONB,
    is_processed BOOLEAN DEFAULT false,
    
    -- Usage context
    context_type VARCHAR(50) DEFAULT 'chat' CHECK (context_type IN ('chat', 'reading', 'feedback')),
    context_id UUID,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================

-- Chat sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_client_id ON chat_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_reader_id ON chat_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants ON chat_sessions USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);

-- Voice notes indexes
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_context ON voice_notes(context_type, context_id);

-- ============================================================
-- 5. ENABLE RLS (BASIC POLICIES)
-- ============================================================

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

-- Create basic policies (permissive for now)
CREATE POLICY "chat_sessions_access" ON chat_sessions FOR ALL USING (true);
CREATE POLICY "chat_messages_access" ON chat_messages FOR ALL USING (true);
CREATE POLICY "voice_notes_access" ON voice_notes FOR ALL USING (true);

-- ============================================================
-- 6. UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_notes_updated_at
    BEFORE UPDATE ON voice_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Chat system tables created successfully!';
    RAISE NOTICE '📋 Tables: chat_sessions, chat_messages, voice_notes';
    RAISE NOTICE '🔒 RLS enabled with permissive policies';
    RAISE NOTICE '📊 Indexes created for performance';
END $$; 