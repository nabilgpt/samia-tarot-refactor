-- 🔍 SAMIA TAROT - AI READING AUDIT LOG TABLE
-- Missing table referenced in tarotRoutes.js line 663

-- Create AI Reading Audit Log Table
CREATE TABLE IF NOT EXISTS ai_reading_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    -- Enhanced audit fields
    card_id UUID,
    card_name VARCHAR(255),
    position_name VARCHAR(100),
    ai_content_accessed BOOLEAN DEFAULT false,
    reading_type VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    
    -- Indexes for performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE ai_reading_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ai_reading_audit_admin_only" ON ai_reading_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- System can always insert audit logs
CREATE POLICY "ai_reading_audit_system_insert" ON ai_reading_audit_log
    FOR INSERT WITH CHECK (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_ai_reading_audit_session ON ai_reading_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_audit_user ON ai_reading_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_audit_action ON ai_reading_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_ai_reading_audit_timestamp ON ai_reading_audit_log(timestamp);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AI Reading Audit Log table created successfully';
    RAISE NOTICE '📝 Table: ai_reading_audit_log';
    RAISE NOTICE '🔒 RLS policies applied';
    RAISE NOTICE '⚡ Performance indexes created';
END $$; 