-- ============================================================
-- SAMIA TAROT - NEW APIS DATABASE TABLES
-- Tables for Monitor, Notifications, Emergency, and AI Moderation APIs
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. MONITOR API TABLES
-- ============================================================

-- Monitor Actions Table
CREATE TABLE IF NOT EXISTS monitor_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    monitor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID,
    content_id UUID,
    
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) DEFAULT 'session',
    reason TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Monitor Session Flags Table
CREATE TABLE IF NOT EXISTS monitor_session_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    session_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    flagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    flag_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    reason TEXT NOT NULL,
    
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Content Moderation Actions Table
CREATE TABLE IF NOT EXISTS content_moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    monitor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    
    action VARCHAR(50) NOT NULL CHECK (action IN ('approved', 'rejected', 'flagged', 'escalated')),
    feedback TEXT,
    tags TEXT[],
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Content Approval Queue Table
CREATE TABLE IF NOT EXISTS content_approval_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    content_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    flagged_reason TEXT,
    requires_approval_reason TEXT,
    
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 2. NOTIFICATIONS API TABLES
-- ============================================================

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    data JSONB DEFAULT '{}'::jsonb,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    channels TEXT[] DEFAULT ARRAY['socket'],
    
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    is_system BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    channels JSONB DEFAULT '{"socket": true, "email": true, "push": false, "sms": false}'::jsonb,
    types JSONB DEFAULT '{}'::jsonb,
    
    quiet_hours JSONB DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00"}'::jsonb,
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'disabled')),
    
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    
    variables JSONB DEFAULT '[]'::jsonb,
    
    active BOOLEAN DEFAULT true,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Notification Delivery Log Table
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    
    provider VARCHAR(100),
    provider_message_id VARCHAR(255),
    
    error_message TEXT,
    delivery_time TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 3. EMERGENCY API TABLES
-- ============================================================

-- Emergency Requests Table
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    
    emergency_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    contact_info JSONB,
    location_data JSONB,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'resolved', 'closed', 'false_alarm')),
    
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    escalated_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalation_reason TEXT,
    
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_summary TEXT,
    
    priority_score INTEGER DEFAULT 50,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Emergency Response Log Table
CREATE TABLE IF NOT EXISTS emergency_response_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    emergency_id UUID REFERENCES emergency_requests(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    response_type VARCHAR(100) NOT NULL,
    actions_taken TEXT,
    status_update TEXT,
    next_steps TEXT,
    
    response_time_seconds INTEGER,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Emergency Responders Table
CREATE TABLE IF NOT EXISTS emergency_responders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    available BOOLEAN DEFAULT true,
    specializations TEXT[],
    max_concurrent INTEGER DEFAULT 3,
    
    current_load INTEGER DEFAULT 0,
    
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    
    response_stats JSONB DEFAULT '{"total_responses": 0, "avg_response_time": 0, "rating": 5.0}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Emergency Alerts Table
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    emergency_id UUID REFERENCES emergency_requests(id) ON DELETE CASCADE,
    triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    message TEXT NOT NULL,
    channels TEXT[],
    recipients UUID[],
    
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    
    expires_at TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 4. AI MODERATION API TABLES
-- ============================================================

-- AI Moderation Models Table
CREATE TABLE IF NOT EXISTS ai_moderation_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    
    description TEXT,
    
    status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'training', 'testing')),
    
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    
    confidence_threshold DECIMAL(3,2) DEFAULT 0.80,
    
    training_data_size INTEGER,
    last_trained_at TIMESTAMP WITH TIME ZONE,
    
    model_file_url TEXT,
    model_config JSONB DEFAULT '{}'::jsonb,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    UNIQUE(name, version)
);

-- AI Content Scanning Results Table
CREATE TABLE IF NOT EXISTS ai_content_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    content_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_text TEXT,
    
    model_id UUID REFERENCES ai_moderation_models(id) ON DELETE SET NULL,
    
    scan_results JSONB NOT NULL,
    confidence_score DECIMAL(5,4),
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    
    flagged BOOLEAN DEFAULT false,
    flag_reasons TEXT[],
    
    human_reviewed BOOLEAN DEFAULT false,
    human_feedback VARCHAR(50),
    
    processing_time_ms INTEGER,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- AI Moderation Rules Table
CREATE TABLE IF NOT EXISTS ai_moderation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    
    priority INTEGER DEFAULT 100,
    active BOOLEAN DEFAULT true,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- AI Training Data Table
CREATE TABLE IF NOT EXISTS ai_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    content_text TEXT NOT NULL,
    correct_classification VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    
    confidence_rating DECIMAL(3,2) DEFAULT 1.0,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    used_in_training BOOLEAN DEFAULT false,
    training_weight DECIMAL(3,2) DEFAULT 1.0,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- AI Moderation Alerts Table
CREATE TABLE IF NOT EXISTS ai_moderation_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    content_scan_id UUID REFERENCES ai_content_scans(id) ON DELETE CASCADE,
    
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    triggered_rule_ids UUID[],
    
    message TEXT NOT NULL,
    recommended_action VARCHAR(100),
    
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    
    resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Monitor API Indexes
CREATE INDEX IF NOT EXISTS idx_monitor_actions_monitor_id ON monitor_actions(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_actions_session_id ON monitor_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_monitor_actions_created_at ON monitor_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_monitor_session_flags_session_id ON monitor_session_flags(session_id);
CREATE INDEX IF NOT EXISTS idx_monitor_session_flags_severity ON monitor_session_flags(severity);
CREATE INDEX IF NOT EXISTS idx_monitor_session_flags_resolved ON monitor_session_flags(resolved);

-- Notification API Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Emergency API Indexes
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_severity ON emergency_requests(severity);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_assigned_to ON emergency_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_created_at ON emergency_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_response_log_emergency_id ON emergency_response_log(emergency_id);
CREATE INDEX IF NOT EXISTS idx_emergency_response_log_responder_id ON emergency_response_log(responder_id);

-- AI Moderation API Indexes
CREATE INDEX IF NOT EXISTS idx_ai_content_scans_content_id ON ai_content_scans(content_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_scans_flagged ON ai_content_scans(flagged);
CREATE INDEX IF NOT EXISTS idx_ai_content_scans_confidence_score ON ai_content_scans(confidence_score);
CREATE INDEX IF NOT EXISTS idx_ai_content_scans_created_at ON ai_content_scans(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_moderation_rules_category ON ai_moderation_rules(category);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_rules_active ON ai_moderation_rules(active);

-- ============================================================
-- RLS POLICIES (ROW LEVEL SECURITY)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE monitor_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_session_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_response_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_responders ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_moderation_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_moderation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_moderation_alerts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can access their own data, admins can access all)
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Users can update own notification settings" ON notification_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own emergency requests" ON emergency_requests FOR SELECT USING (requester_id = auth.uid());

-- Admin/Monitor access policies
CREATE POLICY "Admins have full access to monitor tables" ON monitor_actions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin', 'monitor')
  )
);

CREATE POLICY "Admins have full access to ai moderation" ON ai_content_scans FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin', 'monitor')
  )
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_monitor_session_flags_updated_at 
    BEFORE UPDATE ON monitor_session_flags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_approval_queue_updated_at 
    BEFORE UPDATE ON content_approval_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_requests_updated_at 
    BEFORE UPDATE ON emergency_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_responders_updated_at 
    BEFORE UPDATE ON emergency_responders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_moderation_models_updated_at 
    BEFORE UPDATE ON ai_moderation_models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_moderation_rules_updated_at 
    BEFORE UPDATE ON ai_moderation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 