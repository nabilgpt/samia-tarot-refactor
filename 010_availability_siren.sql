-- M40: Siren & Availability Implementation
-- Date: 2025-09-13

-- Reader availability windows
CREATE TABLE IF NOT EXISTS reader_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast availability lookups
CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_active 
    ON reader_availability(reader_id, is_active, day_of_week);

-- Siren escalation configurations
CREATE TABLE IF NOT EXISTS siren_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- e.g., 'high_priority_order', 'system_alert'
    description TEXT,
    escalation_minutes INTEGER[] NOT NULL, -- [5, 15, 30] = escalate at 5min, 15min, 30min
    channels TEXT[] NOT NULL, -- ['sms', 'whatsapp', 'email']
    recipients TEXT[] NOT NULL, -- phone numbers or emails
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Siren escalation events (audit trail)
CREATE TABLE IF NOT EXISTS siren_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_name TEXT NOT NULL,
    trigger_context JSONB NOT NULL, -- order_id, alert_type, etc.
    escalation_level INTEGER NOT NULL, -- 0=first alert, 1=second, etc.
    channel TEXT NOT NULL,
    recipient TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status TEXT DEFAULT 'pending', -- pending, sent, failed
    response_metadata JSONB
);

-- RLS policies for reader availability
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;

-- Readers can only see/modify their own availability
CREATE POLICY reader_own_availability ON reader_availability
    FOR ALL USING (reader_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.code IN ('admin', 'superadmin', 'monitor')
    ));

-- Admin/Monitor can view all availability for scheduling
CREATE POLICY admin_view_availability ON reader_availability
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.code IN ('admin', 'superadmin', 'monitor')
    ));

-- Siren configs - admin only
ALTER TABLE siren_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_siren_configs ON siren_configs
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.code IN ('admin', 'superadmin')
    ));

-- Siren events - audit readable by admin
ALTER TABLE siren_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_view_siren_events ON siren_events
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.code IN ('admin', 'superadmin', 'monitor')
    ));

-- Insert default siren configurations
INSERT INTO siren_configs (name, description, escalation_minutes, channels, recipients) VALUES
    ('high_priority_order', 'High priority order escalation', ARRAY[5, 15, 30], ARRAY['sms', 'whatsapp'], ARRAY['+1234567890']),
    ('system_alert', 'System health alerts', ARRAY[0, 10], ARRAY['email', 'sms'], ARRAY['ops@samia-tarot.com', '+1234567890']),
    ('payment_failure', 'Payment processing failures', ARRAY[0, 5], ARRAY['email'], ARRAY['finance@samia-tarot.com']),
    ('call_drop_alert', 'Unexpected call terminations', ARRAY[0], ARRAY['sms'], ARRAY['+1234567890'])
ON CONFLICT (name) DO NOTHING;