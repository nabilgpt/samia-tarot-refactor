-- M40 Emergency/Siren Escalation System
-- Comprehensive incident management with policy-driven escalation
-- RLS enforced, FORCE RLS enabled, append-only audit trail

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Siren Incidents Table
-- Core incident tracking with deduplication support
CREATE TABLE IF NOT EXISTS siren_incidents (
    id BIGSERIAL PRIMARY KEY,
    incident_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'payment_failure', 'slo_breach', 'call_emergency'
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5), -- 1=Critical, 5=Info
    source VARCHAR(200) NOT NULL, -- Source system/component
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    root_hash VARCHAR(64) NOT NULL, -- SHA256 hash for deduplication
    policy_id BIGINT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}', -- Additional context data
    variables JSONB NOT NULL DEFAULT '{}', -- Template variables
    created_by UUID NOT NULL REFERENCES profiles(id),
    acknowledged_by UUID REFERENCES profiles(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Siren Events Table
-- Individual notification events per escalation step
CREATE TABLE IF NOT EXISTS siren_events (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT NOT NULL REFERENCES siren_incidents(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL, -- L1=1, L2=2, L3=3
    channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'whatsapp', 'voice'
    target VARCHAR(200) NOT NULL, -- Email/phone/user_id
    template_id BIGINT REFERENCES siren_templates(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Siren Policies Table
-- Escalation policy definitions with JSON steps
CREATE TABLE IF NOT EXISTS siren_policies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    steps JSONB NOT NULL, -- [{"delay_s": 0, "channel": "email", "template_id": 1, "targets": ["admin@example.com"]}]
    cooldown_seconds INTEGER NOT NULL DEFAULT 3600, -- 1 hour default
    dedupe_window_seconds INTEGER NOT NULL DEFAULT 300, -- 5 minutes default
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Siren Templates Table
-- Message templates for different channels
CREATE TABLE IF NOT EXISTS siren_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'whatsapp', 'voice'
    subject TEXT, -- For email/voice title
    body TEXT NOT NULL, -- Template with {{variables}}
    variables JSONB NOT NULL DEFAULT '[]', -- ["incident_type", "severity", "source"]
    whatsapp_template_id VARCHAR(100), -- WhatsApp template ID for outside 24h window
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OnCall Rosters Table (Optional - for future M41+ enhancements)
CREATE TABLE IF NOT EXISTS oncall_rosters (
    id BIGSERIAL PRIMARY KEY,
    team VARCHAR(100) NOT NULL,
    schedule JSONB NOT NULL, -- Schedule configuration
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_siren_incidents_status ON siren_incidents(status);
CREATE INDEX IF NOT EXISTS idx_siren_incidents_type ON siren_incidents(type);
CREATE INDEX IF NOT EXISTS idx_siren_incidents_root_hash ON siren_incidents(root_hash);
CREATE INDEX IF NOT EXISTS idx_siren_incidents_created_at ON siren_incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_siren_events_incident_id ON siren_events(incident_id);
CREATE INDEX IF NOT EXISTS idx_siren_events_scheduled_for ON siren_events(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_siren_events_status ON siren_events(status);

-- RLS Policies

-- Enable RLS on all siren tables
ALTER TABLE siren_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE siren_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE siren_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE siren_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE oncall_rosters ENABLE ROW LEVEL SECURITY;

-- Force RLS (no bypass for table owners)
ALTER TABLE siren_incidents FORCE ROW LEVEL SECURITY;
ALTER TABLE siren_events FORCE ROW LEVEL SECURITY;
ALTER TABLE siren_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE siren_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE oncall_rosters FORCE ROW LEVEL SECURITY;

-- RLS Policy: Admin/Superadmin full access
CREATE POLICY siren_incidents_admin_policy ON siren_incidents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

CREATE POLICY siren_events_admin_policy ON siren_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

CREATE POLICY siren_policies_admin_policy ON siren_policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

CREATE POLICY siren_templates_admin_policy ON siren_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

CREATE POLICY oncall_rosters_admin_policy ON oncall_rosters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

-- RLS Policy: Monitor read + trigger access
CREATE POLICY siren_incidents_monitor_policy ON siren_incidents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id = 'monitor'
        )
    );

CREATE POLICY siren_incidents_monitor_trigger_policy ON siren_incidents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('monitor', 'admin', 'superadmin')
        )
    );

CREATE POLICY siren_events_monitor_policy ON siren_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('monitor', 'admin', 'superadmin')
        )
    );

-- Insert default critical escalation policy
INSERT INTO siren_policies (name, description, steps, cooldown_seconds, dedupe_window_seconds, created_by)
SELECT
    'Critical',
    'Critical incident escalation: L1 Email+SMS, L2 WhatsApp, L3 Voice',
    '[
        {
            "delay_s": 0,
            "channel": "email",
            "template_id": 1,
            "targets": ["admin@samiatarot.com"]
        },
        {
            "delay_s": 0,
            "channel": "sms",
            "template_id": 2,
            "targets": ["+1234567890"]
        },
        {
            "delay_s": 300,
            "channel": "whatsapp",
            "template_id": 3,
            "targets": ["+1234567890"]
        },
        {
            "delay_s": 600,
            "channel": "voice",
            "template_id": 4,
            "targets": ["+1234567890"]
        }
    ]'::jsonb,
    3600, -- 1 hour cooldown
    300,  -- 5 minute dedup window
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM siren_policies WHERE name = 'Critical');

-- Insert default templates
INSERT INTO siren_templates (name, channel, subject, body, variables, created_by)
SELECT
    'Critical Incident Email',
    'email',
    'CRITICAL: {{incident_type}} - {{source}}',
    'CRITICAL INCIDENT ALERT

Type: {{incident_type}}
Severity: {{severity}}
Source: {{source}}
Time: {{created_at}}

Details: {{context}}

Please acknowledge this incident immediately.
Dashboard: https://samiatarot.com/admin/incidents/{{incident_id}}',
    '["incident_type", "severity", "source", "created_at", "context", "incident_id"]'::jsonb,
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM siren_templates WHERE name = 'Critical Incident Email');

INSERT INTO siren_templates (name, channel, subject, body, variables, created_by)
SELECT
    'Critical Incident SMS',
    'sms',
    NULL,
    'CRITICAL: {{incident_type}} at {{source}}. Severity {{severity}}. ACK required: https://samiatarot.com/admin/incidents/{{incident_id}}',
    '["incident_type", "source", "severity", "incident_id"]'::jsonb,
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM siren_templates WHERE name = 'Critical Incident SMS');

INSERT INTO siren_templates (name, channel, subject, body, variables, whatsapp_template_id, created_by)
SELECT
    'Critical Incident WhatsApp',
    'whatsapp',
    NULL,
    'CRITICAL INCIDENT: {{incident_type}} - {{source}} (Severity {{severity}}). Please check dashboard and acknowledge.',
    '["incident_type", "source", "severity"]'::jsonb,
    'critical_incident_v1', -- WhatsApp template ID for outside 24h window
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM siren_templates WHERE name = 'Critical Incident WhatsApp');

INSERT INTO siren_templates (name, channel, subject, body, variables, created_by)
SELECT
    'Critical Incident Voice',
    'voice',
    'Critical Incident Alert',
    'This is a critical incident alert for {{incident_type}} at {{source}}. Severity level {{severity}}. Please check your dashboard and acknowledge this incident immediately.',
    '["incident_type", "source", "severity"]'::jsonb,
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM siren_templates WHERE name = 'Critical Incident Voice');

-- Audit log enhancement for siren events
CREATE OR REPLACE FUNCTION log_siren_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (actor, event, entity, entity_id, meta, created_at)
        VALUES (
            COALESCE(auth.uid()::text, 'system'),
            'siren_' || TG_TABLE_NAME || '_created',
            TG_TABLE_NAME,
            NEW.id::text,
            row_to_json(NEW),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (actor, event, entity, entity_id, meta, created_at)
        VALUES (
            COALESCE(auth.uid()::text, 'system'),
            'siren_' || TG_TABLE_NAME || '_updated',
            TG_TABLE_NAME,
            NEW.id::text,
            jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)),
            NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to siren tables
CREATE TRIGGER siren_incidents_audit_trigger
    AFTER INSERT OR UPDATE ON siren_incidents
    FOR EACH ROW EXECUTE FUNCTION log_siren_audit();

CREATE TRIGGER siren_events_audit_trigger
    AFTER INSERT OR UPDATE ON siren_events
    FOR EACH ROW EXECUTE FUNCTION log_siren_audit();

-- Migration complete
SELECT 'M40 Siren Escalation System migration completed successfully' AS status;