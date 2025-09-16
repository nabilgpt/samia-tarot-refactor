-- M35 Key Rotation Audit Infrastructure
-- Creates tables to track secret rotations with immutable audit trail

-- Key rotation audit table
CREATE TABLE IF NOT EXISTS key_rotation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_name VARCHAR(100) NOT NULL,
    rotation_type VARCHAR(50) NOT NULL, -- 'scheduled', 'emergency', 'manual'
    previous_key_hash VARCHAR(64), -- SHA-256 hash of previous key (for verification)
    new_key_hash VARCHAR(64), -- SHA-256 hash of new key
    rotated_by UUID REFERENCES profiles(id),
    rotated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rotation_reason TEXT,
    verification_tests JSONB, -- Results of post-rotation tests
    rollback_procedure TEXT,
    next_rotation_due DATE,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit trail integrity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audit_hash VARCHAR(64) -- Chain hash for immutability
);

-- Enable RLS on key rotation audit
ALTER TABLE key_rotation_audit ENABLE ROW LEVEL SECURITY;

-- RLS policy: Admin and superadmin can view all, others can view their own rotations
CREATE POLICY "key_rotation_audit_access" ON key_rotation_audit FOR SELECT
TO authenticated
USING (
    get_user_role(auth.uid()) IN ('admin', 'superadmin')
    OR rotated_by = auth.uid()
);

-- RLS policy: Only admin and superadmin can insert rotation records
CREATE POLICY "key_rotation_audit_insert" ON key_rotation_audit FOR INSERT
TO authenticated
WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'superadmin')
);

-- Secret inventory table for tracking current state
CREATE TABLE IF NOT EXISTS secret_inventory (
    secret_name VARCHAR(100) PRIMARY KEY,
    secret_type VARCHAR(50) NOT NULL,
    owner_service VARCHAR(100) NOT NULL,
    rotation_priority VARCHAR(20) NOT NULL CHECK (rotation_priority IN ('low', 'medium', 'high')),
    rotation_frequency_days INTEGER NOT NULL,
    last_rotated_at TIMESTAMP WITH TIME ZONE,
    next_rotation_due DATE,
    current_key_hash VARCHAR(64),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on secret inventory
ALTER TABLE secret_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policy: Admin and superadmin can view all secrets inventory
CREATE POLICY "secret_inventory_access" ON secret_inventory FOR SELECT
TO authenticated
USING (
    get_user_role(auth.uid()) IN ('admin', 'superadmin')
);

-- RLS policy: Only admin and superadmin can manage inventory
CREATE POLICY "secret_inventory_write" ON secret_inventory FOR ALL
TO authenticated
USING (
    get_user_role(auth.uid()) IN ('admin', 'superadmin')
);

-- Function to calculate audit hash for rotation records
CREATE OR REPLACE FUNCTION calculate_rotation_audit_hash(
    p_secret_name VARCHAR(100),
    p_rotation_type VARCHAR(50),
    p_previous_hash VARCHAR(64),
    p_new_hash VARCHAR(64),
    p_rotated_by UUID,
    p_rotated_at TIMESTAMP WITH TIME ZONE
) RETURNS VARCHAR(64)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN encode(
        digest(
            CONCAT(
                p_secret_name, '|',
                p_rotation_type, '|',
                COALESCE(p_previous_hash, ''), '|',
                COALESCE(p_new_hash, ''), '|',
                p_rotated_by::text, '|',
                extract(epoch from p_rotated_at)::text
            ),
            'sha256'
        ),
        'hex'
    );
END;
$$;

-- Function to safely hash secrets (for audit purposes only)
CREATE OR REPLACE FUNCTION hash_secret_for_audit(secret_value TEXT)
RETURNS VARCHAR(64)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Return SHA-256 hash of the secret for audit trail
    -- Never store the actual secret value
    RETURN encode(digest(secret_value, 'sha256'), 'hex');
END;
$$;

-- Trigger to automatically set audit hash on rotation records
CREATE OR REPLACE FUNCTION set_rotation_audit_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    NEW.audit_hash := calculate_rotation_audit_hash(
        NEW.secret_name,
        NEW.rotation_type,
        NEW.previous_key_hash,
        NEW.new_key_hash,
        NEW.rotated_by,
        NEW.rotated_at
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER key_rotation_audit_hash_trigger
    BEFORE INSERT ON key_rotation_audit
    FOR EACH ROW EXECUTE FUNCTION set_rotation_audit_hash();

-- Function to update secret inventory after rotation
CREATE OR REPLACE FUNCTION update_secret_inventory(
    p_secret_name VARCHAR(100),
    p_new_key_hash VARCHAR(64),
    p_rotation_frequency_days INTEGER DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    UPDATE secret_inventory
    SET
        last_rotated_at = NOW(),
        next_rotation_due = CURRENT_DATE + INTERVAL '1 day' * COALESCE(
            p_rotation_frequency_days,
            rotation_frequency_days
        ),
        current_key_hash = p_new_key_hash,
        updated_at = NOW()
    WHERE secret_name = p_secret_name;

    -- Insert if not exists
    IF NOT FOUND THEN
        INSERT INTO secret_inventory (
            secret_name,
            secret_type,
            owner_service,
            rotation_priority,
            rotation_frequency_days,
            last_rotated_at,
            next_rotation_due,
            current_key_hash
        ) VALUES (
            p_secret_name,
            'unknown',
            'unknown',
            'medium',
            COALESCE(p_rotation_frequency_days, 90),
            NOW(),
            CURRENT_DATE + INTERVAL '1 day' * COALESCE(p_rotation_frequency_days, 90),
            p_new_key_hash
        );
    END IF;
END;
$$;

-- View for rotation dashboard
CREATE OR REPLACE VIEW rotation_dashboard AS
SELECT
    si.secret_name,
    si.secret_type,
    si.owner_service,
    si.rotation_priority,
    si.last_rotated_at,
    si.next_rotation_due,
    CASE
        WHEN si.next_rotation_due < CURRENT_DATE THEN 'OVERDUE'
        WHEN si.next_rotation_due <= CURRENT_DATE + INTERVAL '7 days' THEN 'DUE_SOON'
        ELSE 'OK'
    END as rotation_status,
    kra.rotated_by as last_rotated_by,
    kra.verification_tests as last_verification_results
FROM secret_inventory si
LEFT JOIN LATERAL (
    SELECT rotated_by, verification_tests
    FROM key_rotation_audit
    WHERE secret_name = si.secret_name
    ORDER BY rotated_at DESC
    LIMIT 1
) kra ON true
WHERE si.is_active = true
ORDER BY
    CASE
        WHEN si.next_rotation_due < CURRENT_DATE THEN 1
        WHEN si.next_rotation_due <= CURRENT_DATE + INTERVAL '7 days' THEN 2
        ELSE 3
    END,
    si.next_rotation_due;

-- Initialize secret inventory with M35 secrets
INSERT INTO secret_inventory (
    secret_name, secret_type, owner_service, rotation_priority, rotation_frequency_days
) VALUES
    ('DB_DSN', 'database', 'Supabase', 'high', 30),
    ('SUPABASE_ANON', 'supabase_anon', 'Supabase', 'medium', 90),
    ('SUPABASE_SERVICE', 'supabase_service', 'Supabase', 'high', 30),
    ('STRIPE_SECRET_KEY', 'stripe_secret', 'Stripe', 'high', 30),
    ('STRIPE_WEBHOOK_SECRET', 'stripe_webhook', 'Stripe', 'high', 30),
    ('TWILIO_AUTH_TOKEN', 'twilio_auth', 'Twilio', 'high', 30),
    ('FCM_SERVICE_ACCOUNT_JSON', 'fcm_service', 'Google/Firebase', 'high', 30),
    ('SMTP_PASS', 'smtp_password', 'SMTP Provider', 'high', 30),
    ('JOB_TOKEN', 'job_token', 'Internal', 'high', 30),
    ('STRIPE_PUBLISHABLE_KEY', 'stripe_publishable', 'Stripe', 'low', 365),
    ('SUPABASE_URL', 'supabase_url', 'Supabase', 'low', 365),
    ('LHCI_GITHUB_APP_TOKEN', 'github_app', 'GitHub', 'medium', 90),
    ('PUBLIC_WEBHOOK_BASE', 'webhook_url', 'ngrok/Domain', 'low', 365)
ON CONFLICT (secret_name) DO UPDATE SET
    secret_type = EXCLUDED.secret_type,
    owner_service = EXCLUDED.owner_service,
    rotation_priority = EXCLUDED.rotation_priority,
    rotation_frequency_days = EXCLUDED.rotation_frequency_days,
    updated_at = NOW();

-- Create index for efficient rotation schedule queries
CREATE INDEX IF NOT EXISTS idx_secret_inventory_rotation_due
ON secret_inventory(next_rotation_due)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_key_rotation_audit_secret_time
ON key_rotation_audit(secret_name, rotated_at DESC);