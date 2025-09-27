-- M22: Notifications & Campaigns Schema
-- Implements: FCM/APNs push, Twilio SMS/WhatsApp, per-TZ scheduling, consent management
-- Compliance: GDPR, TCPA, CAN-SPAM with opt-in/opt-out discipline and suppression lists

-- Notification consent & preferences per user
CREATE TABLE IF NOT EXISTS notification_consents (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'whatsapp', 'email')),
  opted_in boolean NOT NULL DEFAULT false,
  lawful_basis text CHECK (lawful_basis IN ('consent', 'legitimate_interest', 'contract')),
  consent_timestamp timestamptz,
  opt_out_timestamp timestamptz,
  quiet_hours_start time, -- Local time for user's TZ
  quiet_hours_end time,   -- Local time for user's TZ
  timezone_cohort text,   -- Links to M18A TZ cohorts
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, channel)
);

-- Device tokens for push notifications
CREATE TABLE IF NOT EXISTS device_tokens (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('fcm', 'apns')),
  platform text CHECK (platform IN ('android', 'ios', 'web')),
  app_version text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  UNIQUE(token, provider)
);

-- Suppression list for bounces, complaints, opt-outs
CREATE TABLE IF NOT EXISTS notification_suppressions (
  id bigserial PRIMARY KEY,
  identifier text NOT NULL, -- email, phone, or device token
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'whatsapp', 'email')),
  reason text NOT NULL CHECK (reason IN ('hard_bounce', 'complaint', 'opt_out', 'manual')),
  applied_by uuid REFERENCES profiles(id), -- NULL for automatic, user_id for manual
  applied_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- NULL for permanent
  notes text,
  UNIQUE(identifier, channel)
);

-- Campaign definitions
CREATE TABLE IF NOT EXISTS campaigns (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  description text,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'whatsapp', 'email')),
  message_template jsonb NOT NULL, -- Bilingual content: {en: {...}, ar: {...}}
  target_audience jsonb NOT NULL, -- Targeting criteria: roles, countries, segments
  created_by uuid NOT NULL REFERENCES profiles(id),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'cancelled')),
  timezone_cohorts text[], -- Array of TZ cohorts to target
  send_in_quiet_hours boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual notification events
CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  campaign_id bigint REFERENCES campaigns(id), -- NULL for single notifications
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'whatsapp', 'email')),
  message_content jsonb NOT NULL, -- Rendered content in user's language
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'suppressed')),
  provider_message_id text, -- FCM/APNs/Twilio message ID
  failure_reason text,
  retry_count int DEFAULT 0,
  timezone_cohort text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Delivery tracking and engagement stats
CREATE TABLE IF NOT EXISTS notification_events (
  id bigserial PRIMARY KEY,
  notification_id bigint NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  event_timestamp timestamptz DEFAULT now(),
  provider_data jsonb, -- Provider-specific delivery info
  created_at timestamptz DEFAULT now()
);

-- Audiences for targeting (reusable audience definitions)
CREATE TABLE IF NOT EXISTS audiences (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  description text,
  criteria jsonb NOT NULL, -- Targeting rules: {"roles": ["client"], "countries": ["SA"], "engagement": "active_7d"}
  created_by uuid NOT NULL REFERENCES profiles(id),
  estimated_size int,
  last_computed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaign statistics (materialized for performance)
CREATE TABLE IF NOT EXISTS campaign_stats (
  id bigserial PRIMARY KEY,
  campaign_id bigint NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  stat_date date NOT NULL,
  sent_count int DEFAULT 0,
  delivered_count int DEFAULT 0,
  opened_count int DEFAULT 0,
  clicked_count int DEFAULT 0,
  bounced_count int DEFAULT 0,
  complained_count int DEFAULT 0,
  suppressed_count int DEFAULT 0,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, stat_date)
);

-- Timezone cohort management (extends M18A cohorts)
CREATE TABLE IF NOT EXISTS timezone_cohorts (
  id bigserial PRIMARY KEY,
  cohort_name text UNIQUE NOT NULL,
  timezone_name text NOT NULL, -- IANA timezone (e.g., 'Asia/Riyadh')
  utc_offset_hours int NOT NULL, -- For quick calculations
  countries text[], -- Countries typically in this cohort
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Webhook validation secrets for providers
CREATE TABLE IF NOT EXISTS webhook_secrets (
  id bigserial PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('fcm', 'apns', 'twilio')),
  secret_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(provider, is_active) DEFERRABLE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_consents_user_channel ON notification_consents(user_id, channel);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active ON device_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_suppressions_identifier_channel ON notification_suppressions(identifier, channel);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_scheduled ON campaigns(status, scheduled_start) WHERE status IN ('scheduled', 'running');
CREATE INDEX IF NOT EXISTS idx_notifications_campaign_status ON notifications(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_cohort ON notifications(scheduled_at, timezone_cohort, status);
CREATE INDEX IF NOT EXISTS idx_notification_events_type_timestamp ON notification_events(event_type, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_campaign_stats_campaign_date ON campaign_stats(campaign_id, stat_date);

-- Seed timezone cohorts (reuse from M18A)
INSERT INTO timezone_cohorts (cohort_name, timezone_name, utc_offset_hours, countries) VALUES
  ('GMT', 'Europe/London', 0, ARRAY['GB', 'IE']),
  ('CET', 'Europe/Berlin', 1, ARRAY['DE', 'FR', 'IT', 'ES']),
  ('EET', 'Europe/Athens', 2, ARRAY['GR', 'FI', 'RO']),
  ('AST', 'Asia/Riyadh', 3, ARRAY['SA', 'KW', 'BH', 'QA']),
  ('GST', 'Asia/Dubai', 4, ARRAY['AE', 'OM']),
  ('IST', 'Asia/Kolkata', 5, ARRAY['IN', 'LK']),
  ('JST', 'Asia/Tokyo', 9, ARRAY['JP']),
  ('AET', 'Australia/Sydney', 10, ARRAY['AU']),
  ('PST', 'America/Los_Angeles', -8, ARRAY['US']),
  ('EST', 'America/New_York', -5, ARRAY['US', 'CA'])
ON CONFLICT (cohort_name) DO NOTHING;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_consents_updated_at ON notification_consents;
CREATE TRIGGER trg_notification_consents_updated_at
  BEFORE UPDATE ON notification_consents
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON campaigns;
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Functions for targeting and scheduling
CREATE OR REPLACE FUNCTION get_user_timezone_cohort(user_country text) RETURNS text AS $$
BEGIN
  -- Map country to timezone cohort
  RETURN CASE 
    WHEN user_country = 'SA' THEN 'AST'
    WHEN user_country = 'AE' THEN 'GST'
    WHEN user_country = 'IN' THEN 'IST'
    WHEN user_country = 'US' THEN 'EST'
    WHEN user_country = 'GB' THEN 'GMT'
    WHEN user_country IN ('DE', 'FR', 'IT', 'ES') THEN 'CET'
    ELSE 'GMT' -- Default fallback
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION is_quiet_hours(user_id uuid, send_time timestamptz) RETURNS boolean AS $$
DECLARE
  consent_rec RECORD;
  user_local_time time;
BEGIN
  -- Get user's quiet hours settings
  SELECT quiet_hours_start, quiet_hours_end, timezone_cohort
  INTO consent_rec
  FROM notification_consents nc
  JOIN profiles p ON p.id = nc.user_id
  WHERE nc.user_id = user_id AND nc.channel = 'push' -- Use push channel as default
  LIMIT 1;
  
  -- If no quiet hours set, not in quiet hours
  IF consent_rec.quiet_hours_start IS NULL OR consent_rec.quiet_hours_end IS NULL THEN
    RETURN false;
  END IF;
  
  -- Convert send time to user's local time
  user_local_time := (send_time AT TIME ZONE 'UTC' AT TIME ZONE 
    (SELECT timezone_name FROM timezone_cohorts WHERE cohort_name = consent_rec.timezone_cohort)
  )::time;
  
  -- Check if within quiet hours
  IF consent_rec.quiet_hours_start <= consent_rec.quiet_hours_end THEN
    -- Same day range (e.g., 22:00 to 08:00 next day)
    RETURN user_local_time >= consent_rec.quiet_hours_start AND user_local_time <= consent_rec.quiet_hours_end;
  ELSE
    -- Spans midnight (e.g., 22:00 to 08:00)
    RETURN user_local_time >= consent_rec.quiet_hours_start OR user_local_time <= consent_rec.quiet_hours_end;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE notification_consents IS 'M22: Per-user, per-channel consent and preferences';
COMMENT ON TABLE device_tokens IS 'M22: FCM/APNs device tokens for push notifications';
COMMENT ON TABLE notification_suppressions IS 'M22: Suppression list for bounces, complaints, manual blocks';
COMMENT ON TABLE campaigns IS 'M22: Bulk notification campaigns with targeting and scheduling';
COMMENT ON TABLE notifications IS 'M22: Individual notification events and delivery tracking';
COMMENT ON TABLE notification_events IS 'M22: Delivery events and engagement tracking';
COMMENT ON TABLE audiences IS 'M22: Reusable audience definitions for targeting';
COMMENT ON TABLE campaign_stats IS 'M22: Campaign performance statistics (materialized)';
COMMENT ON TABLE timezone_cohorts IS 'M22: Timezone cohort management (extends M18A)';
COMMENT ON TABLE webhook_secrets IS 'M22: Provider webhook validation secrets';