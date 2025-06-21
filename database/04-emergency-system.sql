-- ============================================================
-- PART 4: EMERGENCY SYSTEM TABLES - SAMIA TAROT
-- This script handles only emergency-related tables
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. EMERGENCY ESCALATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS emergency_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID, -- Will add foreign key constraint later
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    reader_id UUID, -- Will add foreign key constraint later
    
    escalation_type VARCHAR(50) NOT NULL CHECK (escalation_type IN ('emergency_call', 'safety_concern', 'technical_issue', 'payment_dispute')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    
    -- Assignment tracking
    assigned_to UUID, -- Will add foreign key constraint later
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Resolution tracking
    resolved_by UUID, -- Will add foreign key constraint later
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Auto-escalation
    auto_escalate_at TIMESTAMP WITH TIME ZONE,
    escalation_level INTEGER DEFAULT 1,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. EMERGENCY ALERTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('panic_button', 'safety_concern', 'technical_emergency', 'medical_emergency')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    message TEXT,
    location_data JSONB,
    
    -- Response tracking
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID, -- Will add foreign key constraint later
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID, -- Will add foreign key constraint later
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Notification tracking
    notifications_sent JSONB DEFAULT '{}',
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. SYSTEM SETTINGS TABLE (FOR EMERGENCY CONFIGURATIONS)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_category VARCHAR(100) DEFAULT 'general',
    value JSONB NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    data_type VARCHAR(50) DEFAULT 'string',
    is_required BOOLEAN DEFAULT false,
    validation_rules JSONB DEFAULT '{}',
    default_value JSONB,
    is_public BOOLEAN DEFAULT false,
    requires_admin BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. READER APPLICATIONS TABLE (FOR EMERGENCY READER ASSIGNMENTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS reader_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    
    application_status VARCHAR(50) DEFAULT 'pending' CHECK (application_status IN ('pending', 'under_review', 'approved', 'rejected', 'suspended')),
    
    -- Personal information
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    date_of_birth DATE,
    
    -- Experience and qualifications
    experience_years INTEGER,
    certifications JSONB DEFAULT '{}',
    specialties TEXT[],
    languages TEXT[],
    
    -- Background check
    background_check_status VARCHAR(50) DEFAULT 'pending',
    background_check_date TIMESTAMP WITH TIME ZONE,
    
    -- Emergency availability
    emergency_availability BOOLEAN DEFAULT false,
    emergency_response_time INTEGER, -- minutes
    
    -- Application documents
    documents JSONB DEFAULT '{}',
    
    -- Review information
    reviewed_by UUID, -- Will add foreign key constraint later
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================

-- Emergency escalations indexes
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_user_id ON emergency_escalations(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_status ON emergency_escalations(status);
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_priority ON emergency_escalations(priority);
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_type ON emergency_escalations(escalation_type);
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_assigned_to ON emergency_escalations(assigned_to);

-- Emergency alerts indexes
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_type ON emergency_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_severity ON emergency_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_acknowledged ON emergency_alerts(is_acknowledged);

-- System settings indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(setting_category);

-- Reader applications indexes
CREATE INDEX IF NOT EXISTS idx_reader_applications_user_id ON reader_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_reader_applications_status ON reader_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_reader_applications_emergency ON reader_applications(emergency_availability);

-- ============================================================
-- 6. ENABLE RLS (BASIC POLICIES)
-- ============================================================

ALTER TABLE emergency_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_applications ENABLE ROW LEVEL SECURITY;

-- Create basic policies (permissive for now)
CREATE POLICY "emergency_escalations_access" ON emergency_escalations FOR ALL USING (true);
CREATE POLICY "emergency_alerts_access" ON emergency_alerts FOR ALL USING (true);
CREATE POLICY "system_settings_access" ON system_settings FOR ALL USING (true);
CREATE POLICY "reader_applications_access" ON reader_applications FOR ALL USING (true);

-- ============================================================
-- 7. UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emergency_escalations_updated_at
    BEFORE UPDATE ON emergency_escalations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_alerts_updated_at
    BEFORE UPDATE ON emergency_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reader_applications_updated_at
    BEFORE UPDATE ON reader_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Emergency system tables created successfully!';
    RAISE NOTICE '📋 Tables: emergency_escalations, emergency_alerts, system_settings, reader_applications';
    RAISE NOTICE '🔒 RLS enabled with permissive policies';
    RAISE NOTICE '📊 Indexes created for performance';
END $$; 