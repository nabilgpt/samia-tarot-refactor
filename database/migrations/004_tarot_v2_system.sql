-- =====================================================
-- TAROT V2 CLIENT-REVEAL WITH AI DRAFT ISOLATION
-- Migration: 004_tarot_v2_system.sql
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TAROT V2 READINGS TABLE (Enhanced)
-- =====================================================

CREATE TABLE IF NOT EXISTS tarot_v2_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core reading info
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    deck_id UUID REFERENCES tarot_decks(id) ON DELETE SET NULL,
    spread_id UUID REFERENCES tarot_spreads(id) ON DELETE SET NULL,
    
    -- Reading configuration
    reading_type TEXT NOT NULL CHECK (reading_type IN ('ai_draft', 'reader_guided', 'client_reveal')),
    session_id UUID, -- For grouping related readings
    
    -- Status and workflow
    status TEXT NOT NULL DEFAULT 'initiated' CHECK (
        status IN ('initiated', 'ai_generating', 'ai_draft_ready', 'reader_reviewing', 
                  'reader_editing', 'reader_approved', 'ready_for_reveal', 'revealed_to_client', 
                  'completed', 'cancelled')
    ),
    
    -- AI isolation controls
    ai_draft_visible_to_client BOOLEAN DEFAULT false, -- CRITICAL: must stay false until reader approval
    ai_draft_generated_at TIMESTAMPTZ,
    ai_model_used TEXT,
    ai_confidence_score DECIMAL(3,2),
    
    -- Reader workflow
    reader_assigned_at TIMESTAMPTZ,
    reader_started_review_at TIMESTAMPTZ,
    reader_approved_at TIMESTAMPTZ,
    reader_modifications_count INTEGER DEFAULT 0,
    
    -- Client reveal controls
    client_reveal_requested_at TIMESTAMPTZ,
    client_revealed_at TIMESTAMPTZ,
    client_can_view_cards BOOLEAN DEFAULT false,
    client_can_view_interpretation BOOLEAN DEFAULT false,
    
    -- Content and pricing
    total_cards INTEGER,
    selected_cards JSONB, -- Array of card IDs and positions
    
    -- Pricing and payment
    base_price_usd DECIMAL(10,2),
    reader_rate_usd DECIMAL(10,2),
    ai_processing_fee_usd DECIMAL(10,2) DEFAULT 0.00,
    total_price_usd DECIMAL(10,2),
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_intent_id TEXT,
    
    -- Quality control
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
    requires_human_review BOOLEAN DEFAULT false,
    adult_content_detected BOOLEAN DEFAULT false, -- Business rule: adults only
    flagged_for_review BOOLEAN DEFAULT false,
    
    -- Timing and sessions
    estimated_completion_time INTERVAL,
    actual_completion_time INTERVAL,
    session_duration_minutes INTEGER,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Metadata
    client_ip INET,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (
        CASE 
            WHEN reading_type = 'ai_draft' THEN reader_id IS NULL
            WHEN reading_type = 'reader_guided' THEN reader_id IS NOT NULL
            WHEN reading_type = 'client_reveal' THEN reader_id IS NOT NULL AND client_revealed_at IS NOT NULL
            ELSE true
        END
    ),
    
    CHECK (total_price_usd >= 0),
    CHECK (ai_confidence_score IS NULL OR ai_confidence_score BETWEEN 0.0 AND 1.0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tarot_v2_readings_client_id ON tarot_v2_readings(client_id);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_readings_reader_id ON tarot_v2_readings(reader_id);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_readings_session_id ON tarot_v2_readings(session_id);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_readings_status ON tarot_v2_readings(status);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_readings_reading_type ON tarot_v2_readings(reading_type);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_readings_ai_draft_client_visibility ON tarot_v2_readings(ai_draft_visible_to_client) WHERE ai_draft_visible_to_client = false;

-- =====================================================
-- 2. TAROT V2 CARD INTERPRETATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tarot_v2_card_interpretations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reading_id UUID NOT NULL REFERENCES tarot_v2_readings(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES tarot_cards(id) ON DELETE CASCADE,
    
    -- Card position and context
    position_in_spread INTEGER NOT NULL,
    position_name TEXT, -- e.g., "Past", "Present", "Future", "Outcome"
    position_meaning TEXT, -- What this position represents in the spread
    card_orientation TEXT CHECK (card_orientation IN ('upright', 'reversed')) DEFAULT 'upright',
    
    -- AI-generated content (ISOLATED from clients until approved)
    ai_interpretation_draft TEXT,
    ai_keywords JSONB, -- Array of AI-generated keywords
    ai_emotional_tone TEXT,
    ai_guidance_level TEXT CHECK (ai_guidance_level IN ('gentle', 'direct', 'empowering', 'warning')),
    ai_generated_at TIMESTAMPTZ,
    ai_model_used TEXT,
    
    -- Reader modifications and approval
    reader_interpretation_final TEXT, -- Final interpretation after reader review/edit
    reader_keywords JSONB, -- Reader-modified keywords
    reader_notes TEXT, -- Internal notes for reader
    reader_confidence INTEGER CHECK (reader_confidence BETWEEN 1 AND 5),
    reader_modified_at TIMESTAMPTZ,
    reader_approved BOOLEAN DEFAULT false,
    
    -- Client visibility controls
    visible_to_client BOOLEAN DEFAULT false, -- CRITICAL: Controls what client can see
    client_revealed_at TIMESTAMPTZ,
    
    -- Content quality and safety
    content_flagged BOOLEAN DEFAULT false,
    adult_content_warning BOOLEAN DEFAULT false,
    requires_sensitivity BOOLEAN DEFAULT false, -- For sensitive topics
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(reading_id, position_in_spread)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tarot_v2_interpretations_reading_id ON tarot_v2_card_interpretations(reading_id);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_interpretations_card_id ON tarot_v2_card_interpretations(card_id);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_interpretations_visible_to_client ON tarot_v2_card_interpretations(visible_to_client);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_interpretations_reader_approved ON tarot_v2_card_interpretations(reader_approved);

-- =====================================================
-- 3. TAROT V2 READING SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tarot_v2_reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE, -- Groups multiple readings
    
    -- Participants
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Session configuration
    session_type TEXT NOT NULL CHECK (session_type IN ('single_reading', 'multi_reading', 'consultation')),
    max_readings_allowed INTEGER DEFAULT 1,
    readings_completed INTEGER DEFAULT 0,
    
    -- Payment and pricing for entire session
    session_base_price_usd DECIMAL(10,2),
    session_total_price_usd DECIMAL(10,2),
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    
    -- Session controls
    client_can_request_new_reading BOOLEAN DEFAULT true,
    reader_available_for_consultation BOOLEAN DEFAULT false,
    
    -- Timing
    session_started_at TIMESTAMPTZ DEFAULT NOW(),
    session_ends_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tarot_v2_sessions_client_id ON tarot_v2_reading_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_sessions_reader_id ON tarot_v2_reading_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_sessions_session_id ON tarot_v2_reading_sessions(session_id);

-- =====================================================
-- 4. AI CONTENT ISOLATION AUDIT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tarot_v2_ai_isolation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reading_id UUID NOT NULL REFERENCES tarot_v2_readings(id) ON DELETE CASCADE,
    
    -- Access control tracking
    user_id UUID NOT NULL REFERENCES profiles(id),
    user_role TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (
        action_type IN ('view_ai_draft', 'edit_ai_draft', 'approve_ai_draft', 'reveal_to_client', 
                       'attempt_unauthorized_access', 'client_view_attempt')
    ),
    
    -- Security details
    access_granted BOOLEAN NOT NULL,
    access_denied_reason TEXT,
    security_violation BOOLEAN DEFAULT false,
    
    -- Content accessed
    content_type TEXT CHECK (content_type IN ('full_reading', 'card_interpretation', 'ai_draft', 'final_interpretation')),
    content_id UUID, -- Reference to specific card interpretation if applicable
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tarot_v2_audit_reading_id ON tarot_v2_ai_isolation_audit(reading_id);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_audit_user_id ON tarot_v2_ai_isolation_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_audit_action_type ON tarot_v2_ai_isolation_audit(action_type);
CREATE INDEX IF NOT EXISTS idx_tarot_v2_audit_security_violations ON tarot_v2_ai_isolation_audit(security_violation) WHERE security_violation = true;

-- =====================================================
-- 5. SECURITY FUNCTIONS FOR AI ISOLATION
-- =====================================================

-- Function to check if user can access AI draft content
CREATE OR REPLACE FUNCTION can_access_ai_draft_content(
    p_user_id UUID,
    p_reading_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    reading_reader_id UUID;
    reading_status TEXT;
BEGIN
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE id = p_user_id;
    
    -- Get reading details
    SELECT reader_id, status INTO reading_reader_id, reading_status
    FROM tarot_v2_readings
    WHERE id = p_reading_id;
    
    -- Admin and super_admin can always access
    IF user_role IN ('admin', 'super_admin') THEN
        RETURN true;
    END IF;
    
    -- Reader can access if they are assigned to this reading
    IF user_role = 'reader' AND reading_reader_id = p_user_id THEN
        RETURN true;
    END IF;
    
    -- Clients can NEVER access AI draft content directly
    IF user_role = 'client' THEN
        RETURN false;
    END IF;
    
    -- Default deny
    RETURN false;
END;
$$;

-- Function to check if content can be revealed to client
CREATE OR REPLACE FUNCTION can_reveal_to_client(
    p_reading_id UUID,
    p_requesting_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    reading_status TEXT;
    reader_approved BOOLEAN := false;
    reading_reader_id UUID;
BEGIN
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE id = p_requesting_user_id;
    
    -- Get reading details
    SELECT status, reader_id INTO reading_status, reading_reader_id
    FROM tarot_v2_readings
    WHERE id = p_reading_id;
    
    -- Check if all card interpretations are reader-approved
    SELECT BOOL_AND(reader_approved) INTO reader_approved
    FROM tarot_v2_card_interpretations
    WHERE reading_id = p_reading_id;
    
    -- Only reader assigned to this reading or admin can reveal
    IF user_role NOT IN ('reader', 'admin', 'super_admin') THEN
        RETURN false;
    END IF;
    
    -- If reader, must be assigned to this reading
    IF user_role = 'reader' AND reading_reader_id != p_requesting_user_id THEN
        RETURN false;
    END IF;
    
    -- Reading must be in appropriate status
    IF reading_status NOT IN ('reader_approved', 'ready_for_reveal') THEN
        RETURN false;
    END IF;
    
    -- All interpretations must be reader-approved
    IF NOT reader_approved THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- Function to create AI draft isolation audit log
CREATE OR REPLACE FUNCTION log_ai_access_attempt(
    p_reading_id UUID,
    p_user_id UUID,
    p_action_type TEXT,
    p_access_granted BOOLEAN,
    p_content_type TEXT DEFAULT NULL,
    p_access_denied_reason TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    audit_id UUID;
    user_role TEXT;
    is_security_violation BOOLEAN := false;
BEGIN
    -- Get user role
    SELECT role INTO user_role
    FROM profiles
    WHERE id = p_user_id;
    
    -- Determine if this is a security violation
    IF NOT p_access_granted AND p_action_type IN ('view_ai_draft', 'client_view_attempt') THEN
        is_security_violation := true;
    END IF;
    
    -- Insert audit log
    INSERT INTO tarot_v2_ai_isolation_audit (
        reading_id,
        user_id,
        user_role,
        action_type,
        access_granted,
        access_denied_reason,
        security_violation,
        content_type,
        ip_address,
        user_agent
    ) VALUES (
        p_reading_id,
        p_user_id,
        user_role,
        p_action_type,
        p_access_granted,
        p_access_denied_reason,
        is_security_violation,
        p_content_type,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tarot_v2_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_v2_card_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_v2_reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_v2_ai_isolation_audit ENABLE ROW LEVEL SECURITY;

-- Tarot V2 Readings Policies
CREATE POLICY "Clients can view their own readings (limited)" ON tarot_v2_readings
    FOR SELECT USING (
        auth.uid() = client_id 
        AND status IN ('ready_for_reveal', 'revealed_to_client', 'completed')
        AND ai_draft_visible_to_client = false -- CRITICAL: Clients never see AI drafts
    );

CREATE POLICY "Readers can view assigned readings (full access)" ON tarot_v2_readings
    FOR SELECT USING (
        auth.uid() = reader_id 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Readers can update assigned readings" ON tarot_v2_readings
    FOR UPDATE USING (
        auth.uid() = reader_id 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Clients can create readings" ON tarot_v2_readings
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Card Interpretations Policies (CRITICAL for AI isolation)
CREATE POLICY "Clients can only view approved interpretations" ON tarot_v2_card_interpretations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tarot_v2_readings r
            WHERE r.id = reading_id 
            AND r.client_id = auth.uid()
            AND visible_to_client = true
            AND reader_approved = true
            AND r.status IN ('revealed_to_client', 'completed')
        )
    );

CREATE POLICY "Readers can view/edit assigned interpretations" ON tarot_v2_card_interpretations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tarot_v2_readings r
            WHERE r.id = reading_id 
            AND (
                r.reader_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            )
        )
    );

-- Reading Sessions Policies
CREATE POLICY "Users can view their own sessions" ON tarot_v2_reading_sessions
    FOR SELECT USING (
        auth.uid() = client_id 
        OR auth.uid() = reader_id
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- AI Isolation Audit Policies
CREATE POLICY "Users can view their own audit logs" ON tarot_v2_ai_isolation_audit
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can log all access attempts" ON tarot_v2_ai_isolation_audit
    FOR INSERT WITH CHECK (true); -- Allow system to log everything

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT AND BUSINESS RULES
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_tarot_v2_readings_updated_at 
    BEFORE UPDATE ON tarot_v2_readings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarot_v2_interpretations_updated_at 
    BEFORE UPDATE ON tarot_v2_card_interpretations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarot_v2_sessions_updated_at 
    BEFORE UPDATE ON tarot_v2_reading_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business rule enforcement trigger
CREATE OR REPLACE FUNCTION enforce_tarot_v2_business_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- CRITICAL: Ensure AI drafts are never visible to clients by default
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Force AI draft visibility to false for new/updated readings
        NEW.ai_draft_visible_to_client := false;
        
        -- Ensure adult content check
        IF NEW.adult_content_detected = true THEN
            NEW.requires_human_review := true;
        END IF;
        
        -- Auto-expire old readings
        IF NEW.expires_at IS NULL THEN
            NEW.expires_at := NOW() + INTERVAL '24 hours';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_tarot_v2_business_rules_trigger
    BEFORE INSERT OR UPDATE ON tarot_v2_readings
    FOR EACH ROW EXECUTE FUNCTION enforce_tarot_v2_business_rules();

-- =====================================================
-- 8. SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample reading session and reading (only if test data doesn't exist)
DO $$
DECLARE
    sample_client_id UUID;
    sample_reader_id UUID;
    sample_session_id UUID := gen_random_uuid();
    sample_reading_id UUID;
BEGIN
    -- Get sample user IDs
    SELECT id INTO sample_client_id 
    FROM profiles 
    WHERE role = 'client' 
    LIMIT 1;
    
    SELECT id INTO sample_reader_id 
    FROM profiles 
    WHERE role = 'reader' 
    LIMIT 1;
    
    -- Only create sample data if we have users and no existing data
    IF sample_client_id IS NOT NULL AND sample_reader_id IS NOT NULL 
       AND NOT EXISTS (SELECT 1 FROM tarot_v2_readings LIMIT 1) THEN
        
        -- Create sample session
        INSERT INTO tarot_v2_reading_sessions (
            session_id, client_id, reader_id, session_type,
            session_base_price_usd, session_total_price_usd
        ) VALUES (
            sample_session_id, sample_client_id, sample_reader_id, 'single_reading',
            25.00, 25.00
        );
        
        -- Create sample reading
        INSERT INTO tarot_v2_readings (
            client_id, reader_id, session_id, reading_type, status,
            total_cards, base_price_usd, total_price_usd, payment_status
        ) VALUES (
            sample_client_id, sample_reader_id, sample_session_id, 'ai_draft', 'ai_draft_ready',
            3, 25.00, 25.00, 'paid'
        ) RETURNING id INTO sample_reading_id;
        
        -- Create sample card interpretations (AI drafts - not visible to client)
        INSERT INTO tarot_v2_card_interpretations (
            reading_id, card_id, position_in_spread, position_name,
            ai_interpretation_draft, ai_keywords, reader_approved, visible_to_client
        ) SELECT 
            sample_reading_id,
            tc.id,
            row_number() OVER (),
            CASE row_number() OVER ()
                WHEN 1 THEN 'Past'
                WHEN 2 THEN 'Present'  
                WHEN 3 THEN 'Future'
            END,
            'AI-generated interpretation (HIDDEN from client until approved)',
            '["growth", "change", "opportunity"]'::jsonb,
            false, -- Not yet approved by reader
            false  -- CRITICAL: Not visible to client
        FROM tarot_cards tc
        LIMIT 3;
        
        RAISE NOTICE 'Sample Tarot V2 data created - AI drafts properly isolated from client';
    ELSE
        RAISE NOTICE 'No sample data created - either missing users or data already exists';
    END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE '✅ Tarot V2 Client-Reveal with AI Draft Isolation migration completed successfully';
    RAISE NOTICE '📋 Tables created: tarot_v2_readings, tarot_v2_card_interpretations, tarot_v2_reading_sessions, tarot_v2_ai_isolation_audit';
    RAISE NOTICE '🔧 Functions created: can_access_ai_draft_content, can_reveal_to_client, log_ai_access_attempt';
    RAISE NOTICE '🔒 CRITICAL: AI draft isolation enforced - clients cannot see AI content until reader approval';
    RAISE NOTICE '🛡️ RLS policies enforced for all tables with business rule compliance';
    RAISE NOTICE '⚡ Triggers added for updated_at and business rule enforcement';
    RAISE NOTICE '🔐 Security: All AI drafts are isolated from clients by default';
END $$;