-- M016_auth_verifications.sql
-- Dual Verification: Email + WhatsApp (as per Backend Core Spec)
-- Rate limits: 5 tries/10m, lock 15m

CREATE TABLE IF NOT EXISTS verification_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),

  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  destination TEXT NOT NULL,

  code_hash TEXT NOT NULL,

  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,

  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),

  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  action TEXT NOT NULL CHECK (action IN ('send', 'verify_success', 'verify_fail', 'locked')),

  ip_address INET,
  user_agent TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_attempts_user_id ON verification_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_destination ON verification_attempts(destination);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_expires_at ON verification_attempts(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id ON verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at ON verification_logs(created_at);

-- RLS Policies
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Users see own verification attempts
CREATE POLICY verification_attempts_select_own ON verification_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- System can manage (via Edge Functions)
CREATE POLICY verification_attempts_all_system ON verification_attempts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Admins see all logs
CREATE POLICY verification_logs_select_admin ON verification_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Function to check rate limit (5 tries/10m, lock 15m)
CREATE OR REPLACE FUNCTION check_verification_rate_limit(
  p_user_id UUID,
  p_channel TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_recent_attempts INT;
  v_locked_until TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Check if currently locked
  SELECT locked_until INTO v_locked_until
  FROM verification_attempts
  WHERE user_id = p_user_id
    AND channel = p_channel
    AND locked_until > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_locked_until IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'locked',
      'locked_until', v_locked_until
    );
  END IF;

  -- Count attempts in last 10 minutes
  SELECT COUNT(*) INTO v_recent_attempts
  FROM verification_logs
  WHERE user_id = p_user_id
    AND channel = p_channel
    AND action = 'verify_fail'
    AND created_at > NOW() - INTERVAL '10 minutes';

  IF v_recent_attempts >= 5 THEN
    -- Lock for 15 minutes
    UPDATE verification_attempts
    SET locked_until = NOW() + INTERVAL '15 minutes'
    WHERE user_id = p_user_id
      AND channel = p_channel;

    INSERT INTO verification_logs (user_id, channel, action)
    VALUES (p_user_id, p_channel, 'locked');

    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'rate_limit_exceeded',
      'locked_until', NOW() + INTERVAL '15 minutes'
    );
  END IF;

  RETURN jsonb_build_object('allowed', TRUE);
END;
$$;

COMMENT ON TABLE verification_attempts IS 'Email/WhatsApp verification tracking';
COMMENT ON TABLE verification_logs IS 'Audit log for verification attempts';
COMMENT ON FUNCTION check_verification_rate_limit IS 'Rate limit: 5 tries/10m, lock 15m';