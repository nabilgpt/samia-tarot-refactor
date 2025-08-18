-- ==========================================
-- DECK BULK UPLOAD SYSTEM MIGRATION
-- ==========================================
-- Implements 78+1 card deck upload with metadata tracking
-- Version: 1.0.0
-- Date: 2025-08-17

BEGIN;

-- ===========================================
-- 1. CREATE DECK CARDS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS tarot.deck_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES tarot_decks(id) ON DELETE CASCADE,
    card_index INTEGER NOT NULL CHECK (card_index BETWEEN 0 AND 77),
    file_name TEXT NOT NULL,
    original_name TEXT, -- Original uploaded filename
    storage_path TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'deck-cards',
    file_size_bytes BIGINT,
    checksum TEXT, -- MD5 or SHA256 for integrity
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    is_back BOOLEAN DEFAULT false,
    upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploaded', 'processing', 'complete', 'failed')),
    upload_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_deck_card_index UNIQUE (deck_id, card_index),
    CONSTRAINT valid_filename CHECK (file_name ~ '^[a-zA-Z0-9._-]+$'),
    CONSTRAINT valid_mime_type CHECK (mime_type IN ('image/webp', 'image/jpeg', 'image/png', 'image/gif'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON tarot.deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_index ON tarot.deck_cards(card_index);
CREATE INDEX IF NOT EXISTS idx_deck_cards_back ON tarot.deck_cards(deck_id, is_back);
CREATE INDEX IF NOT EXISTS idx_deck_cards_status ON tarot.deck_cards(upload_status);
CREATE INDEX IF NOT EXISTS idx_deck_cards_created_at ON tarot.deck_cards(created_at);

-- ===========================================
-- 2. DECK UPLOAD SESSIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS tarot.deck_upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES tarot_decks(id) ON DELETE CASCADE,
    session_key TEXT NOT NULL UNIQUE,
    total_files INTEGER NOT NULL,
    uploaded_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    session_status TEXT DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'failed', 'cancelled')),
    upload_metadata JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    started_by UUID,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_file_counts CHECK (
        uploaded_files >= 0 AND 
        processed_files >= 0 AND 
        failed_files >= 0 AND
        uploaded_files <= total_files AND
        processed_files <= uploaded_files
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_upload_sessions_deck_id ON tarot.deck_upload_sessions(deck_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_session_key ON tarot.deck_upload_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON tarot.deck_upload_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_started_at ON tarot.deck_upload_sessions(started_at);

-- ===========================================
-- 3. CARD VALIDATION RULES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS tarot.card_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('file_size', 'dimensions', 'format', 'naming')),
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default validation rules
INSERT INTO tarot.card_validation_rules (rule_name, rule_type, rule_config) VALUES
('max_file_size', 'file_size', '{"max_bytes": 10485760, "description": "Maximum file size 10MB"}'),
('min_dimensions', 'dimensions', '{"min_width": 200, "min_height": 300, "description": "Minimum dimensions 200x300px"}'),
('max_dimensions', 'dimensions', '{"max_width": 4000, "max_height": 6000, "description": "Maximum dimensions 4000x6000px"}'),
('allowed_formats', 'format', '{"allowed_types": ["image/webp", "image/jpeg", "image/png"], "description": "Allowed formats: WebP, JPEG, PNG"}'),
('card_naming', 'naming', '{"pattern": "^Card_(0[0-9]|[1-6][0-9]|7[0-7])\\.webp$", "description": "Format: Card_00.webp to Card_77.webp"}'),
('back_naming', 'naming', '{"pattern": "^back\\.webp$", "description": "Back card must be named back.webp"}')
ON CONFLICT (rule_name) DO NOTHING;

-- ===========================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on deck_cards table
ALTER TABLE tarot.deck_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all deck cards
CREATE POLICY deck_cards_admin_all 
ON tarot.deck_cards
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- Policy: Readers can view cards from decks they have access to
CREATE POLICY deck_cards_reader_view 
ON tarot.deck_cards
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'reader'
    )
    AND EXISTS (
        SELECT 1 FROM tarot_decks td
        WHERE td.id = deck_id 
        AND td.is_active = true
    )
);

-- Enable RLS on upload_sessions table
ALTER TABLE tarot.deck_upload_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all upload sessions
CREATE POLICY upload_sessions_admin_all 
ON tarot.deck_upload_sessions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- Policy: Users can view their own upload sessions
CREATE POLICY upload_sessions_owner_view 
ON tarot.deck_upload_sessions
FOR SELECT
TO authenticated
USING (started_by = auth.uid());

-- ===========================================
-- 5. TRIGGERS AND FUNCTIONS
-- ===========================================

-- Function to update upload session progress
CREATE OR REPLACE FUNCTION update_upload_session_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session progress when card status changes
    UPDATE tarot.deck_upload_sessions 
    SET 
        uploaded_files = (
            SELECT COUNT(*) 
            FROM tarot.deck_cards 
            WHERE deck_id = NEW.deck_id 
            AND upload_status IN ('uploaded', 'processing', 'complete')
        ),
        processed_files = (
            SELECT COUNT(*) 
            FROM tarot.deck_cards 
            WHERE deck_id = NEW.deck_id 
            AND upload_status = 'complete'
        ),
        failed_files = (
            SELECT COUNT(*) 
            FROM tarot.deck_cards 
            WHERE deck_id = NEW.deck_id 
            AND upload_status = 'failed'
        ),
        updated_at = NOW()
    WHERE deck_id = NEW.deck_id 
    AND session_status = 'active';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update session progress
DROP TRIGGER IF EXISTS trigger_update_upload_progress ON tarot.deck_cards;
CREATE TRIGGER trigger_update_upload_progress
    AFTER INSERT OR UPDATE OF upload_status ON tarot.deck_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_upload_session_progress();

-- Function to auto-complete upload sessions
CREATE OR REPLACE FUNCTION check_upload_completion()
RETURNS TRIGGER AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Get current session status
    SELECT * INTO session_record
    FROM tarot.deck_upload_sessions 
    WHERE deck_id = NEW.deck_id 
    AND session_status = 'active';
    
    IF FOUND THEN
        -- Check if all files are processed (complete or failed)
        IF (session_record.uploaded_files + session_record.failed_files) >= session_record.total_files THEN
            UPDATE tarot.deck_upload_sessions 
            SET 
                session_status = CASE 
                    WHEN session_record.failed_files = 0 THEN 'completed'
                    WHEN session_record.processed_files = 0 THEN 'failed'
                    ELSE 'completed' -- Partial success
                END,
                completed_at = NOW()
            WHERE id = session_record.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-complete sessions
DROP TRIGGER IF EXISTS trigger_check_completion ON tarot.deck_upload_sessions;
CREATE TRIGGER trigger_check_completion
    AFTER UPDATE ON tarot.deck_upload_sessions
    FOR EACH ROW
    EXECUTE FUNCTION check_upload_completion();

-- Function to validate card file naming
CREATE OR REPLACE FUNCTION validate_card_filename(
    filename TEXT,
    is_back_card BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    validation_result JSONB := '{"valid": true, "errors": []}';
    card_number INTEGER;
BEGIN
    IF is_back_card THEN
        -- Validate back card naming
        IF filename !~ '^back\.webp$' THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'
            );
            validation_result := jsonb_set(
                validation_result, 
                '{errors}', 
                validation_result->'errors' || '["Back card must be named back.webp"]'
            );
        END IF;
    ELSE
        -- Validate numbered card naming
        IF filename !~ '^Card_(0[0-9]|[1-6][0-9]|7[0-7])\.webp$' THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'
            );
            validation_result := jsonb_set(
                validation_result, 
                '{errors}', 
                validation_result->'errors' || '["Card must be named Card_00.webp to Card_77.webp"]'
            );
        ELSE
            -- Extract and validate card number
            card_number := CAST(substring(filename from 'Card_(\d{2})\.webp') AS INTEGER);
            IF card_number < 0 OR card_number > 77 THEN
                validation_result := jsonb_set(
                    validation_result, 
                    '{valid}', 
                    'false'
                );
                validation_result := jsonb_set(
                    validation_result, 
                    '{errors}', 
                    validation_result->'errors' || '["Card number must be between 00 and 77"]'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get deck upload progress
CREATE OR REPLACE FUNCTION get_deck_upload_progress(deck_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    session_data RECORD;
    cards_data RECORD;
BEGIN
    -- Get session data
    SELECT * INTO session_data
    FROM tarot.deck_upload_sessions 
    WHERE deck_id = deck_uuid 
    ORDER BY started_at DESC 
    LIMIT 1;
    
    -- Get cards data
    SELECT 
        COUNT(*) as total_cards,
        COUNT(*) FILTER (WHERE upload_status = 'complete') as complete_cards,
        COUNT(*) FILTER (WHERE upload_status = 'failed') as failed_cards,
        COUNT(*) FILTER (WHERE upload_status = 'pending') as pending_cards,
        COUNT(*) FILTER (WHERE is_back = true) as back_cards
    INTO cards_data
    FROM tarot.deck_cards 
    WHERE deck_id = deck_uuid;
    
    -- Build result
    result := jsonb_build_object(
        'deck_id', deck_uuid,
        'session', CASE 
            WHEN session_data.id IS NOT NULL THEN
                jsonb_build_object(
                    'id', session_data.id,
                    'status', session_data.session_status,
                    'total_files', session_data.total_files,
                    'uploaded_files', session_data.uploaded_files,
                    'processed_files', session_data.processed_files,
                    'failed_files', session_data.failed_files,
                    'started_at', session_data.started_at,
                    'completed_at', session_data.completed_at
                )
            ELSE NULL
        END,
        'cards', jsonb_build_object(
            'total', cards_data.total_cards,
            'complete', cards_data.complete_cards,
            'failed', cards_data.failed_cards,
            'pending', cards_data.pending_cards,
            'has_back', cards_data.back_cards > 0
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 6. GRANTS AND PERMISSIONS
-- ===========================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tarot.deck_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tarot.deck_upload_sessions TO authenticated;
GRANT SELECT ON tarot.card_validation_rules TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION validate_card_filename(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_deck_upload_progress(UUID) TO authenticated;

COMMIT;

-- ===========================================
-- VERIFICATION QUERIES (FOR TESTING)
-- ===========================================

-- Verify the migration
SELECT 
    'deck_cards table' as component,
    COUNT(*) as records
FROM tarot.deck_cards

UNION ALL

SELECT 
    'upload_sessions table' as component,
    COUNT(*) as records
FROM tarot.deck_upload_sessions

UNION ALL

SELECT 
    'validation_rules table' as component,
    COUNT(*) as records
FROM tarot.card_validation_rules

UNION ALL

SELECT 
    'RLS policies on deck_cards' as component,
    COUNT(*) as records
FROM pg_policies 
WHERE tablename = 'deck_cards'

UNION ALL

SELECT 
    'RLS policies on upload_sessions' as component,
    COUNT(*) as records
FROM pg_policies 
WHERE tablename = 'deck_upload_sessions';

-- Example usage (commented for production)
-- SELECT validate_card_filename('Card_00.webp', false);
-- SELECT validate_card_filename('back.webp', true);
-- SELECT get_deck_upload_progress('deck-uuid-here');