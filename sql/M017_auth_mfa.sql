-- M017_auth_mfa.sql
-- MFA: Staff required (TOTP/WebAuthn), Clients optional (as per Backend Core Spec)

CREATE TABLE IF NOT EXISTS mfa_enrollments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),

  method TEXT NOT NULL CHECK (method IN ('totp', 'webauthn')),
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- TOTP fields
  totp_secret TEXT,
  totp_verified BOOLEAN DEFAULT FALSE,

  -- WebAuthn fields
  webauthn_credential_id TEXT,
  webauthn_public_key TEXT,
  webauthn_counter BIGINT DEFAULT 0,
  webauthn_transports TEXT[],

  friendly_name TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  CONSTRAINT one_primary_per_user UNIQUE (user_id, is_primary) WHERE is_primary = TRUE
);

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  enrollment_id BIGINT REFERENCES mfa_enrollments(id),

  challenge_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  attempts INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mfa_enrollments_user_id ON mfa_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_enrollments_active ON mfa_enrollments(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user_id ON mfa_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expires_at ON mfa_challenges(expires_at);

-- RLS Policies
ALTER TABLE mfa_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_challenges ENABLE ROW LEVEL SECURITY;

-- Users see own enrollments
CREATE POLICY mfa_enrollments_select_own ON mfa_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY mfa_enrollments_insert_own ON mfa_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY mfa_enrollments_update_own ON mfa_enrollments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY mfa_enrollments_delete_own ON mfa_enrollments
  FOR DELETE USING (auth.uid() = user_id);

-- Users see own challenges
CREATE POLICY mfa_challenges_select_own ON mfa_challenges
  FOR SELECT USING (auth.uid() = user_id);

-- System manages challenges
CREATE POLICY mfa_challenges_insert_system ON mfa_challenges
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY mfa_challenges_update_system ON mfa_challenges
  FOR UPDATE USING (TRUE);

-- Function to check if user needs MFA enforcement
CREATE OR REPLACE FUNCTION requires_mfa_enforcement(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_role_code TEXT;
  v_has_mfa BOOLEAN;
BEGIN
  -- Get user role
  SELECT r.code INTO v_role_code
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = p_user_id;

  -- Staff roles require MFA
  IF v_role_code IN ('reader', 'monitor', 'admin', 'superadmin') THEN
    -- Check if user has at least one active MFA method
    SELECT EXISTS (
      SELECT 1 FROM mfa_enrollments
      WHERE user_id = p_user_id
        AND is_active = TRUE
    ) INTO v_has_mfa;

    RETURN NOT v_has_mfa;
  END IF;

  RETURN FALSE;
END;
$$;

-- Function to get user's MFA status
CREATE OR REPLACE FUNCTION get_mfa_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
  v_enrollments JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'method', method,
    'is_primary', is_primary,
    'friendly_name', friendly_name,
    'created_at', created_at,
    'last_used_at', last_used_at
  ))
  INTO v_enrollments
  FROM mfa_enrollments
  WHERE user_id = p_user_id
    AND is_active = TRUE;

  v_result := jsonb_build_object(
    'enrolled', COALESCE(jsonb_array_length(v_enrollments), 0) > 0,
    'required', requires_mfa_enforcement(p_user_id),
    'methods', COALESCE(v_enrollments, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

COMMENT ON TABLE mfa_enrollments IS 'MFA methods: TOTP/WebAuthn (staff required, clients optional)';
COMMENT ON TABLE mfa_challenges IS 'Active MFA challenges';
COMMENT ON FUNCTION requires_mfa_enforcement IS 'Check if user (staff) must enroll MFA';
COMMENT ON FUNCTION get_mfa_status IS 'Get user MFA enrollment status and methods';