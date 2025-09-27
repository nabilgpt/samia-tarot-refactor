-- 008_notifications.sql - M15 Notifications Implementation
-- FCM/APNs push + Twilio SMS/WhatsApp with per-TZ scheduling, consent, suppression

-- Notification channels
CREATE TYPE notification_channel AS ENUM (
  'fcm_push', 'apns_push', 'sms', 'whatsapp', 'email'
);

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'daily_horoscope', 'order_update', 'payment_receipt', 'promotional', 'system_alert'
);

-- Campaign types
CREATE TYPE campaign_type AS ENUM (
  'broadcast', 'targeted', 'transactional', 'drip'
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Channel preferences
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT true,
  
  -- Content preferences
  daily_horoscope BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true,
  payment_receipts BOOLEAN DEFAULT true,
  promotional BOOLEAN DEFAULT false,
  
  -- Quiet hours (user's timezone)
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Device tokens for push notifications
CREATE TABLE IF NOT EXISTS device_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(token)
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  
  name TEXT NOT NULL,
  type campaign_type NOT NULL,
  notification_type notification_type NOT NULL,
  
  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Targeting
  target_roles TEXT[] DEFAULT '{}', -- e.g., ['premium', 'basic']
  target_countries TEXT[] DEFAULT '{}', -- ISO country codes
  target_languages TEXT[] DEFAULT '{}', -- e.g., ['en', 'ar']
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC',
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  
  -- Stats (updated by triggers)
  target_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Individual notification sends
CREATE TABLE IF NOT EXISTS notification_sends (
  id BIGSERIAL PRIMARY KEY,
  
  campaign_id BIGINT REFERENCES campaigns(id),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  channel notification_channel NOT NULL,
  recipient TEXT NOT NULL, -- phone, email, device token
  
  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'suppressed')),
  
  -- Provider response
  external_id TEXT, -- Provider message ID
  provider_response JSONB DEFAULT '{}'::jsonb,
  
  -- Timing
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification suppressions (bounces, unsubscribes, etc.)
CREATE TABLE IF NOT EXISTS notification_suppressions (
  id BIGSERIAL PRIMARY KEY,
  
  recipient TEXT NOT NULL, -- phone, email, device token
  channel notification_channel NOT NULL,
  
  reason TEXT NOT NULL CHECK (reason IN ('bounce', 'complaint', 'unsubscribe', 'invalid', 'rate_limit')),
  suppressed_until TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(recipient, channel)
);

-- Rate limiting buckets (token bucket algorithm)
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  
  bucket_key TEXT NOT NULL, -- user_id:channel or global:channel
  channel notification_channel NOT NULL,
  
  tokens_remaining INT NOT NULL,
  tokens_max INT NOT NULL,
  refill_rate INT NOT NULL, -- tokens per hour
  
  last_refill TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(bucket_key, channel)
);

-- Provider settings (FCM, APNs, Twilio config)
CREATE TABLE IF NOT EXISTS notification_providers (
  id SMALLSERIAL PRIMARY KEY,
  
  provider TEXT UNIQUE NOT NULL CHECK (provider IN ('fcm', 'apns', 'twilio_sms', 'twilio_whatsapp')),
  is_enabled BOOLEAN DEFAULT false,
  
  config JSONB DEFAULT '{}'::jsonb, -- Encrypted credentials
  
  -- Health monitoring
  last_health_check TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown')),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_notification_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_timestamps();

CREATE TRIGGER device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW EXECUTE FUNCTION update_notification_timestamps();

CREATE TRIGGER rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_notification_timestamps();

CREATE TRIGGER notification_providers_updated_at
  BEFORE UPDATE ON notification_providers
  FOR EACH ROW EXECUTE FUNCTION update_notification_timestamps();

-- Rate limiting function (token bucket)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_bucket_key TEXT,
  p_channel notification_channel,
  p_tokens_requested INT DEFAULT 1,
  p_tokens_max INT DEFAULT 100,
  p_refill_rate INT DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
  current_tokens INT;
  time_since_refill INTERVAL;
  tokens_to_add INT;
BEGIN
  -- Get current bucket state
  SELECT tokens_remaining, (NOW() - last_refill)
  INTO current_tokens, time_since_refill
  FROM rate_limits
  WHERE bucket_key = p_bucket_key AND channel = p_channel;
  
  -- Create bucket if it doesn't exist
  IF current_tokens IS NULL THEN
    INSERT INTO rate_limits (bucket_key, channel, tokens_remaining, tokens_max, refill_rate)
    VALUES (p_bucket_key, p_channel, p_tokens_max - p_tokens_requested, p_tokens_max, p_refill_rate)
    ON CONFLICT (bucket_key, channel) DO NOTHING;
    RETURN true;
  END IF;
  
  -- Calculate tokens to add based on time elapsed
  tokens_to_add := FLOOR(EXTRACT(EPOCH FROM time_since_refill) / 3600.0 * p_refill_rate);
  current_tokens := LEAST(current_tokens + tokens_to_add, p_tokens_max);
  
  -- Check if we have enough tokens
  IF current_tokens >= p_tokens_requested THEN
    -- Consume tokens
    UPDATE rate_limits
    SET 
      tokens_remaining = current_tokens - p_tokens_requested,
      last_refill = NOW(),
      updated_at = NOW()
    WHERE bucket_key = p_bucket_key AND channel = p_channel;
    
    RETURN true;
  ELSE
    -- Update refill time without consuming tokens
    UPDATE rate_limits
    SET 
      tokens_remaining = current_tokens,
      last_refill = NOW(),
      updated_at = NOW()
    WHERE bucket_key = p_bucket_key AND channel = p_channel;
    
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active ON device_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_campaigns_status_scheduled ON campaigns(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_sends_campaign ON notification_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notification_sends_user_status ON notification_sends(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_sends_scheduled ON notification_sends(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_suppressions_recipient ON notification_suppressions(recipient, channel);
CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON rate_limits(bucket_key, channel);

-- Seed notification providers
INSERT INTO notification_providers (provider, is_enabled, config) VALUES
('fcm', false, '{}'::jsonb),
('apns', false, '{}'::jsonb),
('twilio_sms', false, '{}'::jsonb),
('twilio_whatsapp', false, '{}'::jsonb)
ON CONFLICT (provider) DO NOTHING;