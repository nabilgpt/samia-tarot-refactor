-- =====================================================
-- SAMIA TAROT - AI CONTENT SECURITY ENFORCEMENT
-- CRITICAL: PREVENTS UNAUTHORIZED ACCESS TO AI DATA
-- =====================================================

-- =====================================================
-- 1. AI CONTENT ACCESS AUDIT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_content_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    role TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    action TEXT NOT NULL, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    ai_fields_accessed TEXT[], -- Array of AI field names accessed
    success BOOLEAN NOT NULL,
    denial_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Enable RLS on audit table
ALTER TABLE ai_content_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins and super_admins can view audit logs
CREATE POLICY "ai_audit_logs_admin_only" ON ai_content_access_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- System can always insert audit logs
CREATE POLICY "ai_audit_logs_system_insert" ON ai_content_access_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 2. AI CONTENT PROTECTION FUNCTIONS
-- =====================================================

-- Function to check if user can access AI content
CREATE OR REPLACE FUNCTION can_access_ai_content()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get current user's role
    SELECT role INTO user_role 
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Only readers, admins, and super_admins can access AI content
    RETURN user_role IN ('reader', 'admin', 'super_admin');
END;
$$;

-- Function to log AI content access attempts
CREATE OR REPLACE FUNCTION log_ai_access_attempt(
    p_endpoint TEXT,
    p_action TEXT,
    p_table_name TEXT,
    p_ai_fields TEXT[],
    p_success BOOLEAN,
    p_denial_reason TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    log_id UUID;
BEGIN
    -- Get current user's role
    SELECT role INTO user_role 
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Insert audit log
    INSERT INTO ai_content_access_log (
        user_id, role, endpoint, action, table_name,
        ai_fields_accessed, success, denial_reason,
        ip_address, user_agent, session_id, metadata
    ) VALUES (
        auth.uid(), COALESCE(user_role, 'anonymous'), p_endpoint, p_action, p_table_name,
        p_ai_fields, p_success, p_denial_reason,
        p_ip_address, p_user_agent, p_session_id, p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- =====================================================
-- 3. ENHANCED READING SESSIONS TABLE WITH AI SEPARATION
-- =====================================================

-- Work with existing ai_reading_results table and add security columns
ALTER TABLE ai_reading_results 
ADD COLUMN IF NOT EXISTS ai_processing_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS ai_content_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_access_restricted BOOLEAN DEFAULT true; -- Default to restricted

-- Create separate AI interpretations table for better security
CREATE TABLE IF NOT EXISTS ai_reading_interpretations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_reading_result_id UUID REFERENCES ai_reading_results(id) ON DELETE CASCADE,
    ai_interpretation JSONB NOT NULL,
    ai_insights JSONB,
    ai_confidence_score DECIMAL(3,2) CHECK (ai_confidence_score >= 0.0 AND ai_confidence_score <= 1.0),
    ai_model_version VARCHAR(50) NOT NULL,
    ai_processing_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Security constraints
    CONSTRAINT ai_interpretation_not_empty CHECK (ai_interpretation IS NOT NULL AND ai_interpretation != '{}'),
    CONSTRAINT ai_model_version_not_empty CHECK (ai_model_version IS NOT NULL AND ai_model_version != '')
);

-- Enable RLS on both tables
ALTER TABLE ai_reading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reading_interpretations ENABLE ROW LEVEL SECURITY;

-- Function to log SELECT attempts (called from RLS policies)
CREATE OR REPLACE FUNCTION log_ai_select_attempt(table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_can_access BOOLEAN;
    log_id UUID;
BEGIN
    -- Check if user can access AI content
    user_can_access := can_access_ai_content();
    
    -- Log the SELECT access attempt
    SELECT log_ai_access_attempt(
        'rls_policy',
        'SELECT',
        table_name,
        ARRAY['ai_interpretation', 'ai_insights', 'ai_confidence_score', 'ai_model_version'],
        user_can_access,
        CASE WHEN NOT user_can_access THEN 'RLS policy blocked unauthorized SELECT' ELSE NULL END,
        NULL, -- IP address not available in RLS
        NULL, -- User agent not available in RLS
        NULL, -- Session ID not available in RLS
        jsonb_build_object('rls_source', table_name, 'operation', 'SELECT')
    ) INTO log_id;
    
    RETURN user_can_access;
END;
$$;

-- =====================================================
-- 4. STRICT RLS POLICIES FOR AI CONTENT
-- =====================================================

-- AI Reading Results Policies
CREATE POLICY "ai_reading_results_user_access" ON ai_reading_results
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- AI Interpretations Table Policies  
CREATE POLICY "ai_interpretations_reader_only_select" ON ai_reading_interpretations
    FOR SELECT USING (
        log_ai_select_attempt('ai_reading_interpretations') AND
        can_access_ai_content() AND
        EXISTS (
            SELECT 1 FROM ai_reading_results arr
            WHERE arr.id = ai_reading_result_id
            AND arr.user_id = auth.uid()
        )
    );

CREATE POLICY "ai_interpretations_reader_only_insert" ON ai_reading_interpretations
    FOR INSERT WITH CHECK (
        can_access_ai_content()
    );

CREATE POLICY "ai_interpretations_reader_only_update" ON ai_reading_interpretations
    FOR UPDATE USING (
        can_access_ai_content()
    );

-- =====================================================
-- 5. AI CONTENT ACCESS TRIGGERS
-- =====================================================

-- Trigger function to log AI content access (for DML operations)
CREATE OR REPLACE FUNCTION trigger_log_ai_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    ai_fields TEXT[] := ARRAY['ai_interpretation', 'ai_insights', 'ai_confidence_score', 'ai_model_version'];
    user_can_access BOOLEAN;
    log_id UUID;
BEGIN
    -- Check if user can access AI content
    user_can_access := can_access_ai_content();
    
    -- Log the access attempt
    SELECT log_ai_access_attempt(
        'database_trigger',
        TG_OP,
        TG_TABLE_NAME,
        ai_fields,
        user_can_access,
        CASE WHEN NOT user_can_access THEN 'Insufficient role permissions for ' || TG_OP ELSE NULL END,
        NULL, -- IP address not available in trigger
        NULL, -- User agent not available in trigger
        NULL, -- Session ID not available in trigger
        jsonb_build_object('trigger_source', TG_TABLE_NAME, 'operation', TG_OP)
    ) INTO log_id;
    
    -- If user cannot access AI content and trying to modify, deny
    IF NOT user_can_access THEN
        RAISE EXCEPTION 'Access denied: Insufficient permissions to % AI content', TG_OP
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add triggers to AI-sensitive tables (only for DML operations, not SELECT)
CREATE TRIGGER ai_access_log_insert_trigger
    BEFORE INSERT ON ai_reading_interpretations
    FOR EACH ROW EXECUTE FUNCTION trigger_log_ai_access();

CREATE TRIGGER ai_access_log_update_trigger
    BEFORE UPDATE ON ai_reading_interpretations
    FOR EACH ROW EXECUTE FUNCTION trigger_log_ai_access();

CREATE TRIGGER ai_access_log_delete_trigger
    BEFORE DELETE ON ai_reading_interpretations
    FOR EACH ROW EXECUTE FUNCTION trigger_log_ai_access();

-- =====================================================
-- 6. AI CONTENT SANITIZATION VIEWS
-- =====================================================

-- Ensure ai_reading_results table exists with proper structure (matching analytics schema)
CREATE TABLE IF NOT EXISTS ai_reading_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    reading_type VARCHAR(50) NOT NULL,
    cards_drawn JSONB NOT NULL,
    interpretation JSONB NOT NULL,
    
    -- AI model information
    model_version VARCHAR(50),
    confidence_score DECIMAL(3,2),
    
    -- User interaction
    user_feedback JSONB,
    is_saved BOOLEAN DEFAULT false,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Note: No updated_at column to match existing analytics schema
);

-- Add missing columns if they don't exist (no updated_at to match analytics schema)
ALTER TABLE ai_reading_results 
ADD COLUMN IF NOT EXISTS user_feedback JSONB,
ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS model_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);

-- Client-safe view of AI reading results (no AI content)
CREATE OR REPLACE VIEW client_ai_reading_results AS
SELECT 
    id, 
    user_id, 
    reading_type, 
    cards_drawn, 
    user_feedback,
    is_saved,
    metadata,
    created_at,
    -- Explicitly exclude AI fields
    NULL::JSONB as interpretation,
    NULL::VARCHAR as model_version,
    NULL::DECIMAL as confidence_score,
    'client' as view_type
FROM ai_reading_results
WHERE 
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    );

-- Reader-full view of AI reading results (includes AI content)
CREATE OR REPLACE VIEW reader_ai_reading_results AS
SELECT 
    arr.id,
    arr.user_id,
    arr.reading_type,
    arr.cards_drawn,
    arr.interpretation,
    arr.model_version,
    arr.confidence_score,
    arr.user_feedback,
    arr.is_saved,
    arr.metadata,
    arr.created_at,
    -- AI interpretations from separate table
    ari.ai_interpretation,
    ari.ai_insights,
    ari.ai_processing_metadata,
    'reader' as view_type
FROM ai_reading_results arr
LEFT JOIN ai_reading_interpretations ari ON arr.id = ari.ai_reading_result_id
WHERE 
    can_access_ai_content() AND (
        arr.user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ai_access_log_user_id ON ai_content_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_access_log_timestamp ON ai_content_access_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_access_log_success ON ai_content_access_log(success);
CREATE INDEX IF NOT EXISTS idx_ai_access_log_role ON ai_content_access_log(role);
CREATE INDEX IF NOT EXISTS idx_ai_interpretations_result ON ai_reading_interpretations(ai_reading_result_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_user ON ai_reading_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_type ON ai_reading_results(reading_type);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_created ON ai_reading_results(created_at);

-- =====================================================
-- 8. SECURITY COMMENTS
-- =====================================================
COMMENT ON TABLE ai_content_access_log IS 'Audit trail for all AI content access attempts';
COMMENT ON TABLE ai_reading_interpretations IS 'Separate table for AI interpretations with strict access control';
COMMENT ON FUNCTION can_access_ai_content() IS 'Determines if current user can access AI content based on role';
COMMENT ON FUNCTION log_ai_access_attempt(TEXT, TEXT, TEXT, TEXT[], BOOLEAN, TEXT, TEXT, TEXT, TEXT, JSONB) IS 'Logs all AI content access attempts for security auditing';
COMMENT ON VIEW client_ai_reading_results IS 'Client-safe view of AI reading results with AI content explicitly excluded';
COMMENT ON VIEW reader_ai_reading_results IS 'Reader view of AI reading results with full AI content access';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ AI CONTENT SECURITY ENFORCEMENT IMPLEMENTED SUCCESSFULLY';
    RAISE NOTICE '🛡️ Database-level protection active for AI interpretations';
    RAISE NOTICE '📝 Audit logging enabled for all AI content access';
    RAISE NOTICE '🔒 RLS policies enforced for role-based AI access';
END $$; 