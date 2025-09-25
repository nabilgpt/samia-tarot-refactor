-- M41 WhatsApp + n8n Automations
-- Inbound WhatsApp → Supabase (RLS), 24h-aware templates, Payment Links follow-up
-- RLS enforced, FORCE RLS enabled, append-only audit trail

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- WhatsApp Messages Table
-- Stores all inbound/outbound WhatsApp messages with E.164 normalization
CREATE TABLE IF NOT EXISTS wa_messages (
    id BIGSERIAL PRIMARY KEY,
    message_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    wa_message_id VARCHAR(200), -- WhatsApp provider message ID
    phone_e164 VARCHAR(20) NOT NULL, -- E.164 normalized phone number
    profile_id UUID REFERENCES profiles(id), -- Linked profile if verified
    message_type VARCHAR(50) NOT NULL, -- text, image, document, audio, video, template
    content_text TEXT, -- Message text content
    media_url TEXT, -- Original media URL (temporary)
    media_stored_path TEXT, -- Our private storage path
    media_mime_type VARCHAR(100),
    media_filename VARCHAR(255),
    template_name VARCHAR(100), -- For outbound template messages
    template_language VARCHAR(10), -- Template language code
    template_params JSONB, -- Template parameters
    metadata JSONB NOT NULL DEFAULT '{}', -- Provider-specific metadata
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'delivered', 'read', 'failed', 'sent')),
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE, -- For media URL expiry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Templates Table
-- Approved templates for outside 24h window
CREATE TABLE IF NOT EXISTS wa_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- MARKETING, UTILITY, AUTHENTICATION
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    header_text TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    parameters JSONB NOT NULL DEFAULT '[]', -- Parameter definitions
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    provider_template_id VARCHAR(200), -- Provider's template ID after approval
    created_by UUID NOT NULL REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Conversations Table
-- Track 24-hour conversation windows
CREATE TABLE IF NOT EXISTS wa_conversations (
    id BIGSERIAL PRIMARY KEY,
    phone_e164 VARCHAR(20) NOT NULL UNIQUE,
    profile_id UUID REFERENCES profiles(id),
    last_customer_message_at TIMESTAMP WITH TIME ZONE,
    last_business_message_at TIMESTAMP WITH TIME ZONE,
    is_within_24h BOOLEAN GENERATED ALWAYS AS (
        last_customer_message_at IS NOT NULL AND
        last_customer_message_at > NOW() - INTERVAL '24 hours'
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Automation Flows Table
-- Track automated flows (payment reminders, follow-ups)
CREATE TABLE IF NOT EXISTS wa_automation_flows (
    id BIGSERIAL PRIMARY KEY,
    flow_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    phone_e164 VARCHAR(20) NOT NULL,
    profile_id UUID REFERENCES profiles(id),
    flow_type VARCHAR(50) NOT NULL, -- payment_reminder, payment_follow_up, order_update
    trigger_data JSONB NOT NULL DEFAULT '{}', -- Data that triggered the flow
    current_step VARCHAR(50) NOT NULL DEFAULT 'initial',
    steps_completed JSONB NOT NULL DEFAULT '[]',
    next_action_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Signatures Table
-- Track signed URLs for secure media delivery
CREATE TABLE IF NOT EXISTS wa_media_signatures (
    id BIGSERIAL PRIMARY KEY,
    signature_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    message_id BIGINT NOT NULL REFERENCES wa_messages(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    access_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accessed_count INTEGER DEFAULT 0,
    max_access_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone_e164 ON wa_messages(phone_e164);
CREATE INDEX IF NOT EXISTS idx_wa_messages_direction ON wa_messages(direction);
CREATE INDEX IF NOT EXISTS idx_wa_messages_created_at ON wa_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_wa_messages_profile_id ON wa_messages(profile_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone_e164 ON wa_conversations(phone_e164);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_24h ON wa_conversations(is_within_24h);
CREATE INDEX IF NOT EXISTS idx_wa_automation_flows_phone ON wa_automation_flows(phone_e164);
CREATE INDEX IF NOT EXISTS idx_wa_automation_flows_status ON wa_automation_flows(status);
CREATE INDEX IF NOT EXISTS idx_wa_media_signatures_expires_at ON wa_media_signatures(expires_at);

-- RLS Policies

-- Enable RLS on all WhatsApp tables
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_media_signatures ENABLE ROW LEVEL SECURITY;

-- Force RLS (no bypass for table owners)
ALTER TABLE wa_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE wa_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE wa_automation_flows FORCE ROW LEVEL SECURITY;
ALTER TABLE wa_media_signatures FORCE ROW LEVEL SECURITY;

-- RLS Policy: Admin/Superadmin full access
CREATE POLICY wa_messages_admin_policy ON wa_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

CREATE POLICY wa_templates_admin_policy ON wa_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

CREATE POLICY wa_conversations_admin_policy ON wa_conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

CREATE POLICY wa_automation_flows_admin_policy ON wa_automation_flows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

CREATE POLICY wa_media_signatures_admin_policy ON wa_media_signatures
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_id IN ('admin', 'superadmin')
        )
    );

-- RLS Policy: Users can see their own WhatsApp messages
CREATE POLICY wa_messages_owner_policy ON wa_messages
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY wa_conversations_owner_policy ON wa_conversations
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY wa_automation_flows_owner_policy ON wa_automation_flows
    FOR SELECT USING (profile_id = auth.uid());

-- Insert default WhatsApp templates
INSERT INTO wa_templates (name, category, language, body_text, parameters, approval_status, created_by)
SELECT
    'PAYMENT_REMINDER',
    'UTILITY',
    'en',
    'Hi {{1}}, your payment of {{2}} for order {{3}} is pending. Complete your payment here: {{4}}',
    '[{"name": "customer_name", "type": "text"}, {"name": "amount", "type": "text"}, {"name": "order_id", "type": "text"}, {"name": "payment_link", "type": "text"}]'::jsonb,
    'pending',
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM wa_templates WHERE name = 'PAYMENT_REMINDER');

INSERT INTO wa_templates (name, category, language, body_text, parameters, approval_status, created_by)
SELECT
    'PAYMENT_RETRY',
    'UTILITY',
    'en',
    'Hi {{1}}, this is a friendly reminder that your payment of {{2}} is still pending. Please complete your payment: {{3}}',
    '[{"name": "customer_name", "type": "text"}, {"name": "amount", "type": "text"}, {"name": "payment_link", "type": "text"}]'::jsonb,
    'pending',
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM wa_templates WHERE name = 'PAYMENT_RETRY');

INSERT INTO wa_templates (name, category, language, body_text, parameters, approval_status, created_by)
SELECT
    'PAYMENT_SUCCESS',
    'UTILITY',
    'en',
    'Thank you {{1}}! Your payment of {{2}} has been received. Download your invoice here: {{3}}',
    '[{"name": "customer_name", "type": "text"}, {"name": "amount", "type": "text"}, {"name": "invoice_link", "type": "text"}]'::jsonb,
    'pending',
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM wa_templates WHERE name = 'PAYMENT_SUCCESS');

INSERT INTO wa_templates (name, category, language, body_text, parameters, approval_status, created_by)
SELECT
    'ORDER_CONFIRMATION',
    'UTILITY',
    'en',
    'Hi {{1}}, your order {{2}} has been confirmed. We will contact you shortly. Order details: {{3}}',
    '[{"name": "customer_name", "type": "text"}, {"name": "order_id", "type": "text"}, {"name": "order_link", "type": "text"}]'::jsonb,
    'pending',
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM wa_templates WHERE name = 'ORDER_CONFIRMATION');

-- Function to update conversation 24h window
CREATE OR REPLACE FUNCTION update_wa_conversation(p_phone_e164 TEXT, p_profile_id UUID, p_is_customer BOOLEAN)
RETURNS VOID AS $$
BEGIN
    INSERT INTO wa_conversations (phone_e164, profile_id, last_customer_message_at, last_business_message_at)
    VALUES (
        p_phone_e164,
        p_profile_id,
        CASE WHEN p_is_customer THEN NOW() ELSE NULL END,
        CASE WHEN NOT p_is_customer THEN NOW() ELSE NULL END
    )
    ON CONFLICT (phone_e164)
    DO UPDATE SET
        last_customer_message_at = CASE
            WHEN p_is_customer THEN NOW()
            ELSE wa_conversations.last_customer_message_at
        END,
        last_business_message_at = CASE
            WHEN NOT p_is_customer THEN NOW()
            ELSE wa_conversations.last_business_message_at
        END,
        profile_id = COALESCE(p_profile_id, wa_conversations.profile_id),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check if can send free-form message
CREATE OR REPLACE FUNCTION can_send_freeform_wa(p_phone_e164 TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    conv_record RECORD;
BEGIN
    SELECT is_within_24h INTO conv_record
    FROM wa_conversations
    WHERE phone_e164 = p_phone_e164;

    RETURN COALESCE(conv_record.is_within_24h, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Audit log enhancement for WhatsApp events
CREATE OR REPLACE FUNCTION log_wa_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (actor, event, entity, entity_id, meta, created_at)
        VALUES (
            COALESCE(auth.uid()::text, 'system'),
            'wa_' || TG_TABLE_NAME || '_created',
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
            'wa_' || TG_TABLE_NAME || '_updated',
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

-- Add audit triggers to WhatsApp tables
CREATE TRIGGER wa_messages_audit_trigger
    AFTER INSERT OR UPDATE ON wa_messages
    FOR EACH ROW EXECUTE FUNCTION log_wa_audit();

CREATE TRIGGER wa_automation_flows_audit_trigger
    AFTER INSERT OR UPDATE ON wa_automation_flows
    FOR EACH ROW EXECUTE FUNCTION log_wa_audit();

-- Function to clean up expired media signatures
CREATE OR REPLACE FUNCTION cleanup_expired_wa_media()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM wa_media_signatures
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Migration complete
SELECT 'M41 WhatsApp + n8n Automations migration completed successfully' AS status;