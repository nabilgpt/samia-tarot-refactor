-- M38 Legal / 18+ Compliance & Gating - Backend only, no UI changes
-- Legal consent tracking with policy versioning and age verification

-- Legal policy texts with versioning
CREATE TABLE IF NOT EXISTS legal_texts (
    id BIGSERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    lang VARCHAR(10) NOT NULL DEFAULT 'en',
    policy_type VARCHAR(50) NOT NULL DEFAULT 'terms_of_service', -- terms_of_service, privacy_policy, age_policy
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(version, lang, policy_type)
);

-- User consent records with IP hash (no raw PII)
CREATE TABLE IF NOT EXISTS user_consents (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    policy_type VARCHAR(50) NOT NULL,
    policy_version INTEGER NOT NULL,
    ip_hash VARCHAR(64), -- SHA-256 hash of IP for audit (no raw IP stored)
    user_agent TEXT,
    consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, policy_type, policy_version)
);

-- Age verification records (year only to minimize PII)
CREATE TABLE IF NOT EXISTS age_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    dob_year INTEGER, -- Birth year only (minimal PII)
    over18 BOOLEAN NOT NULL DEFAULT FALSE,
    verification_method VARCHAR(50) NOT NULL DEFAULT 'self_attestation', -- self_attestation, document_check
    ip_hash VARCHAR(64), -- SHA-256 hash for audit trail
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id),
    CONSTRAINT valid_birth_year CHECK (dob_year IS NULL OR (dob_year >= 1900 AND dob_year <= EXTRACT(YEAR FROM NOW())))
);

-- Legal compliance audit log (append-only)
CREATE TABLE IF NOT EXISTS legal_compliance_audit (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action_type VARCHAR(50) NOT NULL, -- consent_given, age_verified, access_denied, policy_updated
    policy_type VARCHAR(50),
    policy_version INTEGER,
    success BOOLEAN DEFAULT TRUE,
    ip_hash VARCHAR(64),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all sensitive tables
ALTER TABLE legal_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE age_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_verifications FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_compliance_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_texts (public read for current versions, admin manage)
CREATE POLICY "legal_texts_public_read" ON legal_texts FOR SELECT
TO anon, authenticated
USING (effective_date <= CURRENT_DATE);

CREATE POLICY "legal_texts_admin_manage" ON legal_texts FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) IN ('admin', 'superadmin'));

-- RLS Policies for user_consents (owner only + admin)
CREATE POLICY "user_consents_owner_access" ON user_consents FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_consents_owner_insert" ON user_consents FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_consents_admin_access" ON user_consents FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) IN ('admin', 'superadmin'));

-- RLS Policies for age_verifications (owner only + admin)
CREATE POLICY "age_verifications_owner_access" ON age_verifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "age_verifications_owner_upsert" ON age_verifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "age_verifications_owner_update" ON age_verifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "age_verifications_admin_access" ON age_verifications FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) IN ('admin', 'superadmin'));

-- RLS Policies for legal_compliance_audit (owner read + admin full)
CREATE POLICY "legal_audit_owner_read" ON legal_compliance_audit FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR get_user_role(auth.uid()) IN ('admin', 'superadmin'));

CREATE POLICY "legal_audit_system_insert" ON legal_compliance_audit FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow system to log any compliance events

-- Function to check if user has valid consent for policy type
CREATE OR REPLACE FUNCTION check_user_consent(
    p_user_id UUID,
    p_policy_type VARCHAR(50) DEFAULT 'terms_of_service'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    latest_version INTEGER;
    user_version INTEGER;
BEGIN
    -- Get latest policy version
    SELECT MAX(version) INTO latest_version
    FROM legal_texts
    WHERE policy_type = p_policy_type
      AND effective_date <= CURRENT_DATE;

    IF latest_version IS NULL THEN
        RETURN TRUE; -- No policy exists yet
    END IF;

    -- Check user's consent version
    SELECT policy_version INTO user_version
    FROM user_consents
    WHERE user_id = p_user_id
      AND policy_type = p_policy_type
      AND policy_version = latest_version;

    RETURN (user_version IS NOT NULL);
END;
$$;

-- Function to check if user is age verified
CREATE OR REPLACE FUNCTION check_age_verification(p_user_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    is_verified BOOLEAN := FALSE;
BEGIN
    SELECT over18 INTO is_verified
    FROM age_verifications
    WHERE user_id = p_user_id;

    RETURN COALESCE(is_verified, FALSE);
END;
$$;

-- Function to log compliance events
CREATE OR REPLACE FUNCTION log_legal_compliance(
    p_user_id UUID,
    p_action_type VARCHAR(50),
    p_policy_type VARCHAR(50) DEFAULT NULL,
    p_policy_version INTEGER DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_ip_hash VARCHAR(64) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    audit_id BIGINT;
BEGIN
    INSERT INTO legal_compliance_audit (
        user_id, action_type, policy_type, policy_version,
        success, ip_hash, user_agent, metadata
    ) VALUES (
        p_user_id, p_action_type, p_policy_type, p_policy_version,
        p_success, p_ip_hash, p_user_agent, p_metadata
    ) RETURNING id INTO audit_id;

    RETURN audit_id;
END;
$$;

-- Insert default legal policies (admin must update these)
INSERT INTO legal_texts (version, lang, policy_type, title, body) VALUES
(1, 'en', 'terms_of_service', 'Terms of Service', 'Default Terms of Service - Admin must update this policy.'),
(1, 'en', 'privacy_policy', 'Privacy Policy', 'Default Privacy Policy - Admin must update this policy.'),
(1, 'en', 'age_policy', '18+ Age Requirement', 'This service requires users to be 18 years of age or older. By using this service, you confirm that you are at least 18 years old.');

INSERT INTO legal_texts (version, lang, policy_type, title, body) VALUES
(1, 'ar', 'terms_of_service', 'شروط الخدمة', 'شروط الخدمة الافتراضية - يجب على المدير تحديث هذه السياسة.'),
(1, 'ar', 'privacy_policy', 'سياسة الخصوصية', 'سياسة الخصوصية الافتراضية - يجب على المدير تحديث هذه السياسة.'),
(1, 'ar', 'age_policy', 'متطلب العمر 18+', 'تتطلب هذه الخدمة أن يكون المستخدمون بعمر 18 سنة أو أكثر. باستخدام هذه الخدمة، تؤكد أنك بعمر 18 سنة على الأقل.');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_texts_current ON legal_texts(policy_type, lang, version, effective_date);

CREATE INDEX IF NOT EXISTS idx_user_consents_lookup ON user_consents(user_id, policy_type, policy_version);

CREATE INDEX IF NOT EXISTS idx_age_verifications_user ON age_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_legal_audit_user_time ON legal_compliance_audit(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_legal_audit_action_time ON legal_compliance_audit(action_type, created_at);