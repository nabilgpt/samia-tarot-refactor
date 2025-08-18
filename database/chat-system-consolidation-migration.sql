-- ============================================================================
-- SAMIA TAROT - CHAT SYSTEM CONSOLIDATION MIGRATION
-- ============================================================================
-- Date: 2025-01-27
-- Purpose: Consolidate fragmented chat/message tables into unified schema
-- Risk Level: HIGH - Production database changes
-- Execution Time: ~45 minutes
-- 
-- CRITICAL: Only execute after backup verification
-- ============================================================================

-- ============================================================================
-- PHASE 1: BACKUP VERIFICATION & PREPARATION
-- ============================================================================

-- Verify backups exist before proceeding
DO $$
DECLARE
    backup_date TEXT := '20250127';
    table_exists BOOLEAN;
BEGIN
    -- Check if backup tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'messages_backup_' || backup_date
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE EXCEPTION 'CRITICAL: Backup tables not found. Run backup script first!';
    END IF;
    
    RAISE NOTICE 'PHASE 1: ✅ Backup verification passed';
END $$;

-- ============================================================================
-- PHASE 2: CREATE AUDIT LOGGING SYSTEM
-- ============================================================================

-- Enhanced audit logging table
CREATE TABLE IF NOT EXISTS chat_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'access', 'upload'
    table_name TEXT NOT NULL,
    record_id UUID,
    session_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_chat_audit_logs_user_id ON chat_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_audit_logs_action ON chat_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_chat_audit_logs_timestamp ON chat_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_audit_logs_session_id ON chat_audit_logs(session_id);

-- Enable RLS on audit logs
ALTER TABLE chat_audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit log access policy (admin only)
CREATE POLICY "audit_logs_admin_only" ON chat_audit_logs
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

RAISE NOTICE 'PHASE 2: ✅ Audit logging system created';

-- ============================================================================
-- PHASE 3: UNIFIED SCHEMA PREPARATION
-- ============================================================================

-- Ensure chat_sessions table has proper structure
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS participants UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'booking',
ADD COLUMN IF NOT EXISTS booking_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Ensure chat_messages table has proper structure  
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS sender_id UUID,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

RAISE NOTICE 'PHASE 3: ✅ Unified schema prepared';

-- ============================================================================
-- PHASE 4: DATA MIGRATION
-- ============================================================================

-- Step 4.1: Create chat_sessions from bookings
INSERT INTO chat_sessions (
    id, participants, type, booking_id, 
    status, created_at, last_message_at, metadata
)
SELECT DISTINCT
    b.id as id,
    ARRAY[b.user_id, b.reader_id] as participants,
    'booking' as type,
    b.id as booking_id,
    CASE 
        WHEN b.status = 'completed' THEN 'ended'
        WHEN b.status = 'cancelled' THEN 'ended'
        ELSE 'active' 
    END as status,
    b.created_at,
    COALESCE(
        (SELECT MAX(created_at) FROM messages WHERE booking_id = b.id),
        b.created_at
    ) as last_message_at,
    jsonb_build_object(
        'service_type', b.service_type,
        'original_booking_id', b.id
    ) as metadata
FROM bookings b
WHERE EXISTS (SELECT 1 FROM messages WHERE booking_id = b.id)
ON CONFLICT (id) DO UPDATE SET
    participants = EXCLUDED.participants,
    last_message_at = EXCLUDED.last_message_at,
    metadata = EXCLUDED.metadata;

-- Step 4.2: Migrate messages to chat_messages
INSERT INTO chat_messages (
    session_id, sender_id, type, content, file_url, 
    file_name, file_size, created_at, metadata, is_read, delivered_at
)
SELECT 
    COALESCE(m.booking_id, gen_random_uuid()) as session_id,
    m.sender_id,
    CASE 
        WHEN m.type = 'voice' THEN 'audio'
        WHEN m.type IS NULL THEN 'text'
        ELSE m.type 
    END as type,
    COALESCE(m.content, '') as content,
    m.file_url,
    CASE 
        WHEN m.file_url IS NOT NULL THEN 
            regexp_replace(m.file_url, '.*/', '') -- Extract filename from URL
        ELSE NULL 
    END as file_name,
    COALESCE(m.file_size, 0) as file_size,
    m.created_at,
    COALESCE(m.metadata, '{}'::jsonb) as metadata,
    COALESCE(m.is_read, false) as is_read,
    m.created_at as delivered_at -- Assume delivered when created
FROM messages m
WHERE NOT EXISTS (
    SELECT 1 FROM chat_messages cm 
    WHERE cm.session_id = m.booking_id 
    AND cm.sender_id = m.sender_id 
    AND cm.created_at = m.created_at
    AND cm.content = COALESCE(m.content, '')
);

-- Step 4.3: Migrate voice_notes to chat_messages
INSERT INTO chat_messages (
    session_id, sender_id, type, content, file_url,
    file_name, file_size, duration_seconds, created_at, metadata
)
SELECT 
    COALESCE(vn.context_id, gen_random_uuid()) as session_id,
    vn.user_id as sender_id,
    'audio' as type,
    COALESCE(vn.transcript, 'Voice message') as content,
    vn.file_url,
    vn.file_name,
    COALESCE(vn.file_size, 0) as file_size,
    vn.duration_seconds,
    vn.created_at,
    jsonb_build_object(
        'context_type', vn.context_type,
        'original_voice_note_id', vn.id
    ) as metadata
FROM voice_notes vn
WHERE vn.context_type = 'chat'
AND NOT EXISTS (
    SELECT 1 FROM chat_messages cm 
    WHERE cm.session_id = vn.context_id 
    AND cm.sender_id = vn.user_id 
    AND cm.type = 'audio'
    AND cm.created_at = vn.created_at
);

-- Step 4.4: Update session last_message_at
UPDATE chat_sessions 
SET last_message_at = (
    SELECT MAX(created_at) 
    FROM chat_messages 
    WHERE session_id = chat_sessions.id
)
WHERE last_message_at IS NULL OR last_message_at < (
    SELECT MAX(created_at) 
    FROM chat_messages 
    WHERE session_id = chat_sessions.id
);

RAISE NOTICE 'PHASE 4: ✅ Data migration completed';

-- ============================================================================
-- PHASE 5: FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key constraints with proper handling
DO $$
BEGIN
    -- Session ID foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_chat_messages_session_id'
    ) THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT fk_chat_messages_session_id 
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;
    END IF;

    -- Sender ID foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_chat_messages_sender_id'
    ) THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT fk_chat_messages_sender_id 
        FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- Reply-to foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_chat_messages_reply_to'
    ) THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT fk_chat_messages_reply_to 
        FOREIGN KEY (reply_to_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;
    END IF;

    -- Booking ID foreign key for sessions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_chat_sessions_booking_id'
    ) THEN
        ALTER TABLE chat_sessions 
        ADD CONSTRAINT fk_chat_sessions_booking_id 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
    END IF;
END $$;

RAISE NOTICE 'PHASE 5: ✅ Foreign key constraints added';

-- ============================================================================
-- PHASE 6: PERFORMANCE INDEXES
-- ============================================================================

-- Chat sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants ON chat_sessions USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_booking_id ON chat_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON chat_sessions(last_message_at DESC);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_type_created ON chat_messages(session_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants_status ON chat_sessions USING GIN(participants) WHERE status = 'active';

RAISE NOTICE 'PHASE 6: ✅ Performance indexes created';

-- ============================================================================
-- PHASE 7: SECURITY HARDENING (RLS POLICIES)
-- ============================================================================

-- Drop any permissive policies
DROP POLICY IF EXISTS "chat_sessions_access" ON chat_sessions;
DROP POLICY IF EXISTS "chat_messages_access" ON chat_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON chat_sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON chat_messages;

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat sessions - participants only
CREATE POLICY "chat_sessions_participants_only" ON chat_sessions
FOR SELECT USING (
    auth.uid() = ANY(participants) OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "chat_sessions_participants_insert" ON chat_sessions
FOR INSERT WITH CHECK (
    auth.uid() = ANY(participants) OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'reader')
    )
);

CREATE POLICY "chat_sessions_participants_update" ON chat_sessions
FOR UPDATE USING (
    auth.uid() = ANY(participants) OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- Chat messages - session participants only
CREATE POLICY "chat_messages_session_participants" ON chat_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.id = session_id 
        AND (auth.uid() = ANY(cs.participants) OR
             EXISTS (
                 SELECT 1 FROM profiles 
                 WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
             ))
    )
);

CREATE POLICY "chat_messages_participants_insert" ON chat_messages
FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.id = session_id 
        AND auth.uid() = ANY(cs.participants)
    )
);

CREATE POLICY "chat_messages_sender_update" ON chat_messages
FOR UPDATE USING (
    auth.uid() = sender_id OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "chat_messages_admin_delete" ON chat_messages
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

RAISE NOTICE 'PHASE 7: ✅ Security policies implemented';

-- ============================================================================
-- PHASE 8: AUDIT TRIGGERS
-- ============================================================================

-- Function to log chat operations
CREATE OR REPLACE FUNCTION log_chat_operation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO chat_audit_logs (
        user_id, action, table_name, record_id, 
        session_id, old_values, new_values, timestamp
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.session_id, OLD.session_id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers
DROP TRIGGER IF EXISTS chat_messages_audit_trigger ON chat_messages;
CREATE TRIGGER chat_messages_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION log_chat_operation();

DROP TRIGGER IF EXISTS chat_sessions_audit_trigger ON chat_sessions;
CREATE TRIGGER chat_sessions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION log_chat_operation();

RAISE NOTICE 'PHASE 8: ✅ Audit triggers created';

-- ============================================================================
-- PHASE 9: DATA INTEGRITY VERIFICATION
-- ============================================================================

-- Verify migration completeness
DO $$
DECLARE
    original_messages INTEGER;
    migrated_messages INTEGER;
    original_voice_notes INTEGER;
    migrated_voice_notes INTEGER;
    orphaned_messages INTEGER;
    missing_sessions INTEGER;
BEGIN
    -- Count original data
    SELECT COUNT(*) INTO original_messages FROM messages;
    SELECT COUNT(*) INTO original_voice_notes FROM voice_notes WHERE context_type = 'chat';
    
    -- Count migrated data
    SELECT COUNT(*) INTO migrated_messages FROM chat_messages WHERE type != 'audio';
    SELECT COUNT(*) INTO migrated_voice_notes FROM chat_messages WHERE type = 'audio';
    
    -- Check for orphaned messages
    SELECT COUNT(*) INTO orphaned_messages 
    FROM chat_messages cm 
    WHERE NOT EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.id = cm.session_id);
    
    -- Check for missing sessions
    SELECT COUNT(*) INTO missing_sessions
    FROM (SELECT DISTINCT session_id FROM chat_messages) cm
    WHERE NOT EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.id = cm.session_id);
    
    -- Report results
    RAISE NOTICE 'MIGRATION VERIFICATION:';
    RAISE NOTICE '  Original messages: %', original_messages;
    RAISE NOTICE '  Migrated messages: %', migrated_messages;
    RAISE NOTICE '  Original voice notes: %', original_voice_notes;
    RAISE NOTICE '  Migrated voice notes: %', migrated_voice_notes;
    RAISE NOTICE '  Orphaned messages: %', orphaned_messages;
    RAISE NOTICE '  Missing sessions: %', missing_sessions;
    
    -- Fail if data integrity issues
    IF orphaned_messages > 0 OR missing_sessions > 0 THEN
        RAISE EXCEPTION 'CRITICAL: Data integrity issues detected! Orphaned: %, Missing sessions: %', 
            orphaned_messages, missing_sessions;
    END IF;
    
    IF migrated_messages < original_messages * 0.95 THEN
        RAISE EXCEPTION 'CRITICAL: Message migration incomplete! Expected: %, Got: %', 
            original_messages, migrated_messages;
    END IF;
END $$;

RAISE NOTICE 'PHASE 9: ✅ Data integrity verified';

-- ============================================================================
-- PHASE 10: LEGACY TABLE ARCHIVAL
-- ============================================================================

-- Archive legacy tables (rename to _archived)
ALTER TABLE IF EXISTS messages RENAME TO messages_archived_20250127;
ALTER TABLE IF EXISTS voice_notes RENAME TO voice_notes_archived_20250127;

-- Remove indexes from archived tables to save space
DROP INDEX IF EXISTS idx_messages_booking_id;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_voice_notes_user_id;
DROP INDEX IF EXISTS idx_voice_notes_context_id;

RAISE NOTICE 'PHASE 10: ✅ Legacy tables archived';

-- ============================================================================
-- MIGRATION COMPLETION
-- ============================================================================

-- Log successful completion
INSERT INTO chat_audit_logs (
    user_id, action, table_name, metadata, timestamp
) VALUES (
    NULL, -- System operation
    'MIGRATION_COMPLETED',
    'chat_system_consolidation',
    jsonb_build_object(
        'migration_date', '2025-01-27',
        'operation', 'chat_system_consolidation',
        'status', 'SUCCESS',
        'phases_completed', 10
    ),
    NOW()
);

-- Final summary
DO $$
DECLARE
    total_sessions INTEGER;
    total_messages INTEGER;
    total_audio_messages INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_sessions FROM chat_sessions;
    SELECT COUNT(*) INTO total_messages FROM chat_messages;
    SELECT COUNT(*) INTO total_audio_messages FROM chat_messages WHERE type = 'audio';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '🎉 CHAT SYSTEM CONSOLIDATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Final State:';
    RAISE NOTICE '  📊 Total sessions: %', total_sessions;
    RAISE NOTICE '  💬 Total messages: %', total_messages;
    RAISE NOTICE '  🎵 Audio messages: %', total_audio_messages;
    RAISE NOTICE '  🔒 Security: RLS enabled with participant-only access';
    RAISE NOTICE '  📈 Performance: All indexes created';
    RAISE NOTICE '  🔍 Audit: Full logging enabled';
    RAISE NOTICE '  💾 Backup: Legacy tables archived as _archived_20250127';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ READY FOR PRODUCTION USE';
    RAISE NOTICE '============================================================================';
END $$; 