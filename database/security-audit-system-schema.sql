-- =============================================================================
-- COMPREHENSIVE SECURITY AUDIT SYSTEM DATABASE SCHEMA
-- SAMIA TAROT - Enhanced Security Monitoring & Compliance
-- =============================================================================
-- Date: 2025-07-13
-- Purpose: Complete security audit database schema with threat detection
-- Security: Encrypted audit trails, compliance tracking, real-time monitoring
-- =============================================================================

-- =====================================================
-- SECURITY AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    event_type TEXT NOT NULL,
    security_level TEXT NOT NULL CHECK (security_level IN ('low', 'medium', 'high', 'critical')),
    threat_type TEXT,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    response_time INTEGER,
    encrypted_metadata TEXT,
    geolocation JSONB,
    device_fingerprint TEXT,
    compliance_flags TEXT[],
    threat_indicators TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    INDEX idx_security_audit_logs_user_id (user_id),
    INDEX idx_security_audit_logs_event_type (event_type),
    INDEX idx_security_audit_logs_security_level (security_level),
    INDEX idx_security_audit_logs_threat_type (threat_type),
    INDEX idx_security_audit_logs_risk_score (risk_score),
    INDEX idx_security_audit_logs_ip_address (ip_address),
    INDEX idx_security_audit_logs_created_at (created_at),
    INDEX idx_security_audit_logs_expires_at (expires_at)
);

-- =====================================================
-- SECURITY ALERTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ip_address INET,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    threat_indicators TEXT[],
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_security_alerts_severity (severity),
    INDEX idx_security_alerts_status (status),
    INDEX idx_security_alerts_user_id (user_id),
    INDEX idx_security_alerts_assigned_to (assigned_to),
    INDEX idx_security_alerts_created_at (created_at)
);

-- =====================================================
-- SECURITY INCIDENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    affected_users UUID[],
    affected_ips INET[],
    event_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'contained', 'resolved')),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    containment_actions TEXT[],
    resolution_summary TEXT,
    lessons_learned TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_security_incidents_incident_type (incident_type),
    INDEX idx_security_incidents_severity (severity),
    INDEX idx_security_incidents_status (status),
    INDEX idx_security_incidents_assigned_to (assigned_to),
    INDEX idx_security_incidents_first_seen (first_seen),
    INDEX idx_security_incidents_last_seen (last_seen)
);

-- =====================================================
-- SECURITY METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_events INTEGER DEFAULT 0,
    low_risk_events INTEGER DEFAULT 0,
    medium_risk_events INTEGER DEFAULT 0,
    high_risk_events INTEGER DEFAULT 0,
    critical_risk_events INTEGER DEFAULT 0,
    threat_types JSONB,
    top_ips JSONB,
    top_users JSONB,
    failed_authentications INTEGER DEFAULT 0,
    successful_authentications INTEGER DEFAULT 0,
    privilege_escalations INTEGER DEFAULT 0,
    data_access_events INTEGER DEFAULT 0,
    compliance_events INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_security_metrics_date (date),
    INDEX idx_security_metrics_total_events (total_events),
    INDEX idx_security_metrics_high_risk_events (high_risk_events),
    INDEX idx_security_metrics_critical_risk_events (critical_risk_events)
);

-- =====================================================
-- USER ANOMALIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    anomaly_type TEXT NOT NULL,
    description TEXT,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    baseline_risk DECIMAL(5,2),
    event_type TEXT,
    anomaly_score DECIMAL(5,2),
    confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
    investigated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    investigation_notes TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_user_anomalies_user_id (user_id),
    INDEX idx_user_anomalies_anomaly_type (anomaly_type),
    INDEX idx_user_anomalies_risk_score (risk_score),
    INDEX idx_user_anomalies_status (status),
    INDEX idx_user_anomalies_detected_at (detected_at)
);

-- =====================================================
-- SYSTEM PATTERNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS system_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type TEXT NOT NULL,
    description TEXT,
    event_type TEXT,
    event_count INTEGER DEFAULT 0,
    time_window TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    pattern_data JSONB,
    confidence_score DECIMAL(5,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'monitoring', 'resolved')),
    first_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_system_patterns_pattern_type (pattern_type),
    INDEX idx_system_patterns_event_type (event_type),
    INDEX idx_system_patterns_severity (severity),
    INDEX idx_system_patterns_status (status),
    INDEX idx_system_patterns_detected_at (detected_at)
);

-- =====================================================
-- COMPLIANCE REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework TEXT NOT NULL CHECK (framework IN ('gdpr', 'soc2', 'iso27001', 'hipaa', 'pci_dss')),
    report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    requirements_met INTEGER DEFAULT 0,
    requirements_total INTEGER DEFAULT 0,
    gaps_identified TEXT[],
    recommendations TEXT[],
    report_data JSONB,
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'submitted', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_compliance_reports_framework (framework),
    INDEX idx_compliance_reports_report_type (report_type),
    INDEX idx_compliance_reports_period_start (period_start),
    INDEX idx_compliance_reports_period_end (period_end),
    INDEX idx_compliance_reports_compliance_score (compliance_score),
    INDEX idx_compliance_reports_generated_by (generated_by)
);

-- =====================================================
-- THREAT INTELLIGENCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS threat_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threat_type TEXT NOT NULL,
    indicator_type TEXT NOT NULL CHECK (indicator_type IN ('ip', 'domain', 'url', 'hash', 'email', 'user_agent')),
    indicator_value TEXT NOT NULL,
    confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    source TEXT,
    description TEXT,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hit_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_threat_intelligence_threat_type (threat_type),
    INDEX idx_threat_intelligence_indicator_type (indicator_type),
    INDEX idx_threat_intelligence_indicator_value (indicator_value),
    INDEX idx_threat_intelligence_confidence_level (confidence_level),
    INDEX idx_threat_intelligence_severity (severity),
    INDEX idx_threat_intelligence_status (status),
    INDEX idx_threat_intelligence_expires_at (expires_at)
);

-- =====================================================
-- SECURITY CONTROLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id TEXT NOT NULL UNIQUE,
    control_name TEXT NOT NULL,
    control_type TEXT NOT NULL CHECK (control_type IN ('preventive', 'detective', 'corrective', 'compensating')),
    category TEXT NOT NULL,
    description TEXT,
    implementation_status TEXT DEFAULT 'planned' CHECK (implementation_status IN ('planned', 'in_progress', 'implemented', 'testing', 'operational', 'failed')),
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    last_tested TIMESTAMP WITH TIME ZONE,
    next_test_due TIMESTAMP WITH TIME ZONE,
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    compliance_frameworks TEXT[],
    test_results JSONB,
    remediation_actions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_security_controls_control_id (control_id),
    INDEX idx_security_controls_control_type (control_type),
    INDEX idx_security_controls_category (category),
    INDEX idx_security_controls_implementation_status (implementation_status),
    INDEX idx_security_controls_effectiveness_rating (effectiveness_rating),
    INDEX idx_security_controls_owner_id (owner_id),
    INDEX idx_security_controls_last_tested (last_tested),
    INDEX idx_security_controls_next_test_due (next_test_due)
);

-- =====================================================
-- SECURITY CONFIGURATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    config_type TEXT NOT NULL CHECK (config_type IN ('threshold', 'policy', 'setting', 'rule')),
    category TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    last_modified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    version INTEGER DEFAULT 1,
    previous_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_security_configurations_config_key (config_key),
    INDEX idx_security_configurations_config_type (config_type),
    INDEX idx_security_configurations_category (category),
    INDEX idx_security_configurations_is_active (is_active),
    INDEX idx_security_configurations_last_modified_by (last_modified_by)
);

-- =====================================================
-- SECURITY DASHBOARD WIDGETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_type TEXT NOT NULL,
    widget_name TEXT NOT NULL,
    widget_config JSONB,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    role_access TEXT[] DEFAULT ARRAY['admin', 'super_admin'],
    refresh_interval INTEGER DEFAULT 300, -- seconds
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_security_dashboard_widgets_widget_type (widget_type),
    INDEX idx_security_dashboard_widgets_display_order (display_order),
    INDEX idx_security_dashboard_widgets_is_active (is_active),
    INDEX idx_security_dashboard_widgets_created_by (created_by)
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Security Audit Logs - Admin and Super Admin only
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_audit_logs_admin_access" ON security_audit_logs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- Security Alerts - Admin and Super Admin only
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_alerts_admin_access" ON security_alerts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- Security Incidents - Admin and Super Admin only
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_incidents_admin_access" ON security_incidents
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- Security Metrics - Admin and Super Admin only
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_metrics_admin_access" ON security_metrics
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- User Anomalies - Admin and Super Admin only
ALTER TABLE user_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_anomalies_admin_access" ON user_anomalies
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- System Patterns - Admin and Super Admin only
ALTER TABLE system_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_patterns_admin_access" ON system_patterns
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- Compliance Reports - Admin and Super Admin only
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compliance_reports_admin_access" ON compliance_reports
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- Threat Intelligence - Admin and Super Admin only
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "threat_intelligence_admin_access" ON threat_intelligence
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- Security Controls - Admin and Super Admin only
ALTER TABLE security_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_controls_admin_access" ON security_controls
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- Security Configurations - Super Admin only
ALTER TABLE security_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_configurations_super_admin_access" ON security_configurations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
            AND profiles.is_active = true
        )
    );

-- Security Dashboard Widgets - Admin and Super Admin only
ALTER TABLE security_dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_dashboard_widgets_admin_access" ON security_dashboard_widgets
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND profiles.is_active = true
        )
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean up expired audit logs
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_audit_logs
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate security metrics
CREATE OR REPLACE FUNCTION calculate_daily_security_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO security_metrics (
        date,
        total_events,
        low_risk_events,
        medium_risk_events,
        high_risk_events,
        critical_risk_events,
        failed_authentications,
        successful_authentications,
        privilege_escalations,
        data_access_events,
        compliance_events
    )
    SELECT
        target_date,
        COUNT(*),
        SUM(CASE WHEN risk_score < 25 THEN 1 ELSE 0 END),
        SUM(CASE WHEN risk_score >= 25 AND risk_score < 50 THEN 1 ELSE 0 END),
        SUM(CASE WHEN risk_score >= 50 AND risk_score < 80 THEN 1 ELSE 0 END),
        SUM(CASE WHEN risk_score >= 80 THEN 1 ELSE 0 END),
        SUM(CASE WHEN event_type = 'authentication_failed' THEN 1 ELSE 0 END),
        SUM(CASE WHEN event_type = 'authentication_success' THEN 1 ELSE 0 END),
        SUM(CASE WHEN event_type = 'privilege_escalation' THEN 1 ELSE 0 END),
        SUM(CASE WHEN event_type = 'data_access' THEN 1 ELSE 0 END),
        SUM(CASE WHEN array_length(compliance_flags, 1) > 0 THEN 1 ELSE 0 END)
    FROM security_audit_logs
    WHERE DATE(created_at) = target_date
    ON CONFLICT (date) DO UPDATE SET
        total_events = EXCLUDED.total_events,
        low_risk_events = EXCLUDED.low_risk_events,
        medium_risk_events = EXCLUDED.medium_risk_events,
        high_risk_events = EXCLUDED.high_risk_events,
        critical_risk_events = EXCLUDED.critical_risk_events,
        failed_authentications = EXCLUDED.failed_authentications,
        successful_authentications = EXCLUDED.successful_authentications,
        privilege_escalations = EXCLUDED.privilege_escalations,
        data_access_events = EXCLUDED.data_access_events,
        compliance_events = EXCLUDED.compliance_events,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get security dashboard summary
CREATE OR REPLACE FUNCTION get_security_dashboard_summary()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    today_metrics RECORD;
    recent_alerts INTEGER;
    active_incidents INTEGER;
    critical_threats INTEGER;
BEGIN
    -- Get today's metrics
    SELECT * INTO today_metrics
    FROM security_metrics
    WHERE date = CURRENT_DATE;
    
    -- Get recent alerts count
    SELECT COUNT(*) INTO recent_alerts
    FROM security_alerts
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND status = 'active';
    
    -- Get active incidents count
    SELECT COUNT(*) INTO active_incidents
    FROM security_incidents
    WHERE status IN ('active', 'investigating');
    
    -- Get critical threats count
    SELECT COUNT(*) INTO critical_threats
    FROM security_audit_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND security_level = 'critical';
    
    -- Build result
    result := jsonb_build_object(
        'today_events', COALESCE(today_metrics.total_events, 0),
        'high_risk_events', COALESCE(today_metrics.high_risk_events, 0),
        'critical_risk_events', COALESCE(today_metrics.critical_risk_events, 0),
        'recent_alerts', recent_alerts,
        'active_incidents', active_incidents,
        'critical_threats', critical_threats,
        'last_updated', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL SECURITY CONFIGURATIONS
-- =====================================================

-- Insert default security configurations
INSERT INTO security_configurations (config_key, config_value, config_type, category, description) VALUES
('failed_auth_threshold', '{"max_attempts": 5, "time_window": 3600}', 'threshold', 'authentication', 'Maximum failed authentication attempts before lockout'),
('high_risk_threshold', '{"min_score": 70}', 'threshold', 'risk_management', 'Minimum risk score for high-risk classification'),
('critical_risk_threshold', '{"min_score": 85}', 'threshold', 'risk_management', 'Minimum risk score for critical risk classification'),
('audit_retention_days', '{"days": 365}', 'policy', 'data_retention', 'Number of days to retain security audit logs'),
('real_time_monitoring', '{"enabled": true, "critical_only": false}', 'setting', 'monitoring', 'Real-time security monitoring configuration'),
('compliance_frameworks', '["gdpr", "soc2", "iso27001"]', 'setting', 'compliance', 'Active compliance frameworks'),
('threat_intelligence_sources', '["internal"]', 'setting', 'threat_intel', 'Threat intelligence data sources'),
('security_alert_channels', '["email", "dashboard", "webhook"]', 'setting', 'notifications', 'Security alert notification channels')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default security dashboard widgets
INSERT INTO security_dashboard_widgets (widget_type, widget_name, widget_config, display_order, role_access) VALUES
('metric_card', 'Total Events Today', '{"metric": "total_events", "period": "today"}', 1, ARRAY['admin', 'super_admin']),
('metric_card', 'High Risk Events', '{"metric": "high_risk_events", "period": "today"}', 2, ARRAY['admin', 'super_admin']),
('metric_card', 'Critical Threats', '{"metric": "critical_threats", "period": "today"}', 3, ARRAY['admin', 'super_admin']),
('metric_card', 'Active Incidents', '{"metric": "active_incidents", "period": "current"}', 4, ARRAY['admin', 'super_admin']),
('chart', 'Risk Score Distribution', '{"type": "pie", "data_source": "risk_distribution"}', 5, ARRAY['admin', 'super_admin']),
('chart', 'Threats Over Time', '{"type": "line", "data_source": "threats_timeline"}', 6, ARRAY['admin', 'super_admin']),
('table', 'Recent Alerts', '{"data_source": "recent_alerts", "limit": 10}', 7, ARRAY['admin', 'super_admin']),
('table', 'Top Threat IPs', '{"data_source": "top_ips", "limit": 5}', 8, ARRAY['admin', 'super_admin'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- AUTOMATED MAINTENANCE JOBS
-- =====================================================

-- Note: These would typically be set up as cron jobs or scheduled tasks
-- For demonstration, we're documenting them here

-- Daily security metrics calculation
-- 0 1 * * * SELECT calculate_daily_security_metrics();

-- Weekly audit log cleanup
-- 0 2 * * 0 SELECT cleanup_expired_audit_logs();

-- Monthly compliance report generation
-- 0 3 1 * * SELECT generate_monthly_compliance_report();

-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================

-- Create completion confirmation
DO $$
BEGIN
    RAISE NOTICE 'Security Audit System Database Schema Created Successfully';
    RAISE NOTICE 'Tables: security_audit_logs, security_alerts, security_incidents, security_metrics';
    RAISE NOTICE 'Tables: user_anomalies, system_patterns, compliance_reports, threat_intelligence';
    RAISE NOTICE 'Tables: security_controls, security_configurations, security_dashboard_widgets';
    RAISE NOTICE 'RLS Policies: Enabled for all tables with admin/super_admin access';
    RAISE NOTICE 'Functions: cleanup_expired_audit_logs, calculate_daily_security_metrics, get_security_dashboard_summary';
    RAISE NOTICE 'Initial Data: Security configurations and dashboard widgets inserted';
END $$; 