-- M28: Secrets Management & Provider Operations Schema
-- OWASP-compliant secrets handling with NIST-aligned key lifecycle
-- Provider health monitoring, circuit breakers, and operational controls

-- =============================================================================
-- SECRETS MANAGEMENT SCHEMA
-- =============================================================================

-- Secrets configuration and lifecycle management
CREATE TABLE IF NOT EXISTS secrets_config (
  id bigserial PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('stripe', 'square', 'twilio', 'fcm', 'apns', 'supabase', 'database', 'jwt', 'webhook')),
  key_name text NOT NULL,
  key_type text NOT NULL CHECK (key_type IN ('api_key', 'secret_key', 'private_key', 'certificate', 'token', 'password')),
  
  -- Lifecycle management
  rotation_schedule text CHECK (rotation_schedule IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'manual')),
  rotation_window_hours int DEFAULT 24,
  last_rotated_at timestamptz,
  next_rotation_at timestamptz,
  
  -- Security metadata
  key_length_bits int,
  encryption_algorithm text,
  key_purpose text NOT NULL,
  
  -- Access control
  least_privilege_scopes text[],
  authorized_services text[],
  
  -- Audit and compliance
  compliance_requirements text[],
  data_classification text CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
  
  -- Status and health
  status text DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'deprecated', 'revoked', 'emergency_disabled')),
  health_check_enabled boolean DEFAULT true,
  last_health_check timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(scope, key_name)
);

-- Secrets rotation history and audit trail
CREATE TABLE IF NOT EXISTS secrets_rotation_log (
  id bigserial PRIMARY KEY,
  secret_config_id bigint NOT NULL REFERENCES secrets_config(id),
  rotation_type text NOT NULL CHECK (rotation_type IN ('scheduled', 'manual', 'emergency', 'compromise_response')),
  
  -- Rotation metadata
  initiated_by uuid REFERENCES profiles(id),
  initiated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  
  -- Key versioning
  old_key_version text,
  new_key_version text,
  key_fingerprint text, -- Hash of key for verification (not the key itself)
  
  -- Rotation outcome
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'rolled_back')),
  error_message text,
  rollback_reason text,
  
  -- Affected services
  services_updated text[],
  downtime_seconds int DEFAULT 0,
  
  -- Audit metadata
  request_id text,
  automation_source text, -- 'cron', 'api', 'emergency', 'compliance'
  
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- PROVIDER OPERATIONS SCHEMA  
-- =============================================================================

-- Provider health and operational status
CREATE TABLE IF NOT EXISTS provider_health_status (
  id bigserial PRIMARY KEY,
  provider_name text NOT NULL CHECK (provider_name IN ('stripe', 'square', 'twilio', 'fcm', 'apns', 'supabase')),
  service_type text NOT NULL CHECK (service_type IN ('payment', 'communication', 'notification', 'storage', 'authentication')),
  
  -- Health status
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'maintenance', 'disabled')),
  last_health_check timestamptz DEFAULT now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  
  -- Performance metrics
  response_time_ms int,
  success_rate decimal(5,4),
  error_rate decimal(5,4),
  
  -- Circuit breaker state
  circuit_breaker_state text DEFAULT 'closed' CHECK (circuit_breaker_state IN ('closed', 'open', 'half_open')),
  circuit_breaker_failures int DEFAULT 0,
  circuit_breaker_last_failure timestamptz,
  circuit_breaker_next_attempt timestamptz,
  
  -- Configuration
  health_check_url text,
  health_check_interval_seconds int DEFAULT 300, -- 5 minutes
  circuit_breaker_failure_threshold int DEFAULT 5,
  circuit_breaker_reset_timeout_seconds int DEFAULT 300, -- 5 minutes
  
  -- Operational controls
  is_enabled boolean DEFAULT true,
  maintenance_mode boolean DEFAULT false,
  priority_level int DEFAULT 1, -- For provider failover ordering
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(provider_name, service_type)
);

-- Provider operational events and incidents
CREATE TABLE IF NOT EXISTS provider_operational_events (
  id bigserial PRIMARY KEY,
  provider_name text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('health_check', 'circuit_breaker_trip', 'circuit_breaker_reset', 'toggle', 'maintenance', 'incident')),
  
  -- Event details
  severity text CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  summary text NOT NULL,
  description text,
  
  -- Context
  triggered_by uuid REFERENCES profiles(id), -- NULL for automated events
  request_id text,
  correlation_id text, -- For grouping related events
  
  -- State changes
  previous_state jsonb,
  new_state jsonb,
  
  -- Resolution
  resolved_at timestamptz,
  resolution_notes text,
  resolved_by uuid REFERENCES profiles(id),
  
  created_at timestamptz DEFAULT now()
);

-- Provider configuration and toggles
CREATE TABLE IF NOT EXISTS provider_config (
  id bigserial PRIMARY KEY,
  provider_name text NOT NULL,
  config_key text NOT NULL,
  config_value text, -- Encrypted if sensitive
  config_type text CHECK (config_type IN ('string', 'integer', 'boolean', 'json', 'encrypted')),
  
  -- Metadata
  description text,
  is_sensitive boolean DEFAULT false,
  requires_restart boolean DEFAULT false,
  
  -- Change tracking
  last_modified_by uuid REFERENCES profiles(id),
  last_modified_at timestamptz DEFAULT now(),
  change_reason text,
  
  -- Validation
  validation_regex text,
  allowed_values text[],
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(provider_name, config_key)
);

-- =============================================================================
-- OPERATIONAL MONITORING SCHEMA
-- =============================================================================

-- System-wide operational metrics
CREATE TABLE IF NOT EXISTS operational_metrics (
  id bigserial PRIMARY KEY,
  metric_name text NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'rate')),
  
  -- Metric value
  value_numeric decimal,
  value_json jsonb,
  
  -- Dimensions
  provider_name text,
  service_type text,
  region text,
  environment text DEFAULT 'production',
  
  -- Metadata
  unit text, -- 'ms', 'count', 'percentage', 'bytes'
  tags jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  collected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Indexing
  INDEX (metric_name, collected_at DESC),
  INDEX (provider_name, collected_at DESC) WHERE provider_name IS NOT NULL
);

-- =============================================================================
-- HELPER FUNCTIONS FOR SECRETS MANAGEMENT
-- =============================================================================

-- Get next rotation date for a secret
CREATE OR REPLACE FUNCTION calculate_next_rotation(
  p_schedule text,
  p_last_rotated timestamptz DEFAULT now()
) RETURNS timestamptz AS $$
BEGIN
  CASE p_schedule
    WHEN 'daily' THEN RETURN p_last_rotated + INTERVAL '1 day';
    WHEN 'weekly' THEN RETURN p_last_rotated + INTERVAL '1 week';
    WHEN 'monthly' THEN RETURN p_last_rotated + INTERVAL '1 month';
    WHEN 'quarterly' THEN RETURN p_last_rotated + INTERVAL '3 months';
    WHEN 'annual' THEN RETURN p_last_rotated + INTERVAL '1 year';
    WHEN 'manual' THEN RETURN NULL;
    ELSE RETURN p_last_rotated + INTERVAL '1 month'; -- Default
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if secret rotation is due
CREATE OR REPLACE FUNCTION is_rotation_due(secret_id bigint) RETURNS boolean AS $$
DECLARE
  next_rotation timestamptz;
BEGIN
  SELECT next_rotation_at INTO next_rotation
  FROM secrets_config
  WHERE id = secret_id;
  
  RETURN next_rotation IS NOT NULL AND next_rotation <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Start secret rotation process
CREATE OR REPLACE FUNCTION start_secret_rotation(
  p_secret_id bigint,
  p_rotation_type text,
  p_initiated_by uuid,
  p_request_id text DEFAULT NULL
) RETURNS bigint AS $$
DECLARE
  rotation_id bigint;
  secret_rec record;
BEGIN
  -- Get secret info
  SELECT * INTO secret_rec FROM secrets_config WHERE id = p_secret_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Secret not found: %', p_secret_id;
  END IF;
  
  -- Update secret status
  UPDATE secrets_config 
  SET status = 'rotating', updated_at = now()
  WHERE id = p_secret_id;
  
  -- Create rotation log entry
  INSERT INTO secrets_rotation_log (
    secret_config_id, rotation_type, initiated_by, request_id,
    old_key_version, status
  ) VALUES (
    p_secret_id, p_rotation_type, p_initiated_by, p_request_id,
    'v' || extract(epoch from now()), 'in_progress'
  ) RETURNING id INTO rotation_id;
  
  -- Log operational event
  INSERT INTO provider_operational_events (
    provider_name, event_type, severity, summary, triggered_by, request_id
  ) VALUES (
    secret_rec.scope, 'maintenance', 'info',
    'Secret rotation started: ' || secret_rec.key_name,
    p_initiated_by, p_request_id
  );
  
  RETURN rotation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete secret rotation
CREATE OR REPLACE FUNCTION complete_secret_rotation(
  p_rotation_id bigint,
  p_new_key_version text,
  p_key_fingerprint text,
  p_services_updated text[] DEFAULT NULL,
  p_downtime_seconds int DEFAULT 0
) RETURNS void AS $$
DECLARE
  rotation_rec record;
BEGIN
  -- Get rotation info
  SELECT r.*, s.scope, s.key_name INTO rotation_rec
  FROM secrets_rotation_log r
  JOIN secrets_config s ON s.id = r.secret_config_id
  WHERE r.id = p_rotation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rotation not found: %', p_rotation_id;
  END IF;
  
  -- Update rotation log
  UPDATE secrets_rotation_log SET
    status = 'completed',
    completed_at = now(),
    new_key_version = p_new_key_version,
    key_fingerprint = p_key_fingerprint,
    services_updated = p_services_updated,
    downtime_seconds = p_downtime_seconds
  WHERE id = p_rotation_id;
  
  -- Update secret config
  UPDATE secrets_config SET
    status = 'active',
    last_rotated_at = now(),
    next_rotation_at = calculate_next_rotation(rotation_schedule, now()),
    updated_at = now()
  WHERE id = rotation_rec.secret_config_id;
  
  -- Log completion event
  INSERT INTO provider_operational_events (
    provider_name, event_type, severity, summary, request_id
  ) VALUES (
    rotation_rec.scope, 'maintenance', 'info',
    'Secret rotation completed: ' || rotation_rec.key_name || ' -> ' || p_new_key_version,
    rotation_rec.request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PROVIDER HEALTH AND CIRCUIT BREAKER FUNCTIONS
-- =============================================================================

-- Update provider health status
CREATE OR REPLACE FUNCTION update_provider_health(
  p_provider_name text,
  p_service_type text,
  p_is_healthy boolean,
  p_response_time_ms int DEFAULT NULL,
  p_error_message text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  current_status text;
  current_failures int;
  should_trip_breaker boolean := false;
BEGIN
  -- Get current status
  SELECT status, circuit_breaker_failures INTO current_status, current_failures
  FROM provider_health_status
  WHERE provider_name = p_provider_name AND service_type = p_service_type;
  
  IF p_is_healthy THEN
    -- Successful health check
    UPDATE provider_health_status SET
      status = 'healthy',
      last_health_check = now(),
      last_success_at = now(),
      response_time_ms = p_response_time_ms,
      circuit_breaker_failures = 0,
      circuit_breaker_state = CASE 
        WHEN circuit_breaker_state = 'half_open' THEN 'closed'
        ELSE circuit_breaker_state
      END,
      updated_at = now()
    WHERE provider_name = p_provider_name AND service_type = p_service_type;
    
    -- Log recovery if was unhealthy
    IF current_status IN ('unhealthy', 'degraded') THEN
      INSERT INTO provider_operational_events (
        provider_name, event_type, severity, summary
      ) VALUES (
        p_provider_name, 'health_check', 'info',
        'Provider recovered: ' || p_service_type || ' service is healthy'
      );
    END IF;
  ELSE
    -- Failed health check
    current_failures := current_failures + 1;
    
    -- Check if should trip circuit breaker
    SELECT current_failures >= circuit_breaker_failure_threshold INTO should_trip_breaker
    FROM provider_health_status
    WHERE provider_name = p_provider_name AND service_type = p_service_type;
    
    UPDATE provider_health_status SET
      status = 'unhealthy',
      last_health_check = now(),
      last_failure_at = now(),
      circuit_breaker_failures = current_failures,
      circuit_breaker_last_failure = now(),
      circuit_breaker_state = CASE 
        WHEN should_trip_breaker THEN 'open'
        ELSE circuit_breaker_state
      END,
      circuit_breaker_next_attempt = CASE
        WHEN should_trip_breaker THEN now() + (circuit_breaker_reset_timeout_seconds || ' seconds')::interval
        ELSE circuit_breaker_next_attempt
      END,
      updated_at = now()
    WHERE provider_name = p_provider_name AND service_type = p_service_type;
    
    -- Log failure event
    INSERT INTO provider_operational_events (
      provider_name, event_type, severity, summary, description
    ) VALUES (
      p_provider_name, 
      CASE WHEN should_trip_breaker THEN 'circuit_breaker_trip' ELSE 'health_check' END,
      CASE WHEN should_trip_breaker THEN 'error' ELSE 'warning' END,
      'Provider health check failed: ' || p_service_type,
      p_error_message
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if provider is available (respects circuit breaker)
CREATE OR REPLACE FUNCTION is_provider_available(
  p_provider_name text,
  p_service_type text
) RETURNS boolean AS $$
DECLARE
  provider_rec record;
BEGIN
  SELECT * INTO provider_rec
  FROM provider_health_status
  WHERE provider_name = p_provider_name AND service_type = p_service_type;
  
  IF NOT FOUND THEN
    RETURN false; -- Unknown provider
  END IF;
  
  -- Check if disabled or in maintenance
  IF NOT provider_rec.is_enabled OR provider_rec.maintenance_mode THEN
    RETURN false;
  END IF;
  
  -- Check circuit breaker state
  CASE provider_rec.circuit_breaker_state
    WHEN 'closed' THEN RETURN true;
    WHEN 'open' THEN 
      -- Check if reset timeout has passed
      IF now() >= provider_rec.circuit_breaker_next_attempt THEN
        -- Move to half-open state
        UPDATE provider_health_status SET
          circuit_breaker_state = 'half_open',
          updated_at = now()
        WHERE provider_name = p_provider_name AND service_type = p_service_type;
        RETURN true;
      ELSE
        RETURN false;
      END IF;
    WHEN 'half_open' THEN RETURN true;
    ELSE RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle provider availability
CREATE OR REPLACE FUNCTION toggle_provider(
  p_provider_name text,
  p_service_type text,
  p_enabled boolean,
  p_reason text,
  p_toggled_by uuid
) RETURNS void AS $$
BEGIN
  UPDATE provider_health_status SET
    is_enabled = p_enabled,
    updated_at = now()
  WHERE provider_name = p_provider_name AND service_type = p_service_type;
  
  -- Log toggle event
  INSERT INTO provider_operational_events (
    provider_name, event_type, severity, summary, description, triggered_by
  ) VALUES (
    p_provider_name, 'toggle',
    CASE WHEN p_enabled THEN 'info' ELSE 'warning' END,
    'Provider ' || CASE WHEN p_enabled THEN 'enabled' ELSE 'disabled' END || ': ' || p_service_type,
    p_reason,
    p_toggled_by
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default secrets configuration
INSERT INTO secrets_config (scope, key_name, key_type, rotation_schedule, key_purpose, data_classification) VALUES
('stripe', 'secret_key', 'secret_key', 'quarterly', 'Payment processing', 'restricted'),
('stripe', 'webhook_secret', 'secret_key', 'quarterly', 'Webhook signature verification', 'confidential'),
('square', 'access_token', 'token', 'quarterly', 'Payment processing', 'restricted'),
('twilio', 'account_sid', 'api_key', 'annual', 'SMS/voice services', 'confidential'),
('twilio', 'auth_token', 'secret_key', 'quarterly', 'API authentication', 'restricted'),
('fcm', 'server_key', 'api_key', 'annual', 'Push notifications', 'confidential'),
('apns', 'private_key', 'private_key', 'annual', 'Push notifications', 'restricted'),
('jwt', 'signing_key', 'secret_key', 'monthly', 'JWT token signing', 'restricted'),
('database', 'connection_string', 'password', 'quarterly', 'Database access', 'restricted')
ON CONFLICT (scope, key_name) DO NOTHING;

-- Insert default provider health status
INSERT INTO provider_health_status (provider_name, service_type, status) VALUES
('stripe', 'payment', 'healthy'),
('square', 'payment', 'healthy'),
('twilio', 'communication', 'healthy'),
('fcm', 'notification', 'healthy'),
('apns', 'notification', 'healthy'),
('supabase', 'storage', 'healthy')
ON CONFLICT (provider_name, service_type) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_secrets_config_rotation_due 
  ON secrets_config (next_rotation_at) 
  WHERE next_rotation_at IS NOT NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_secrets_rotation_log_secret_status 
  ON secrets_rotation_log (secret_config_id, status, initiated_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_health_status_enabled 
  ON provider_health_status (provider_name, service_type) 
  WHERE is_enabled = true AND maintenance_mode = false;

CREATE INDEX IF NOT EXISTS idx_provider_events_provider_time 
  ON provider_operational_events (provider_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_metrics_name_time 
  ON operational_metrics (metric_name, collected_at DESC);

-- Comments for documentation
COMMENT ON TABLE secrets_config IS 'M28: Secrets lifecycle management with NIST-aligned rotation schedule';
COMMENT ON TABLE secrets_rotation_log IS 'M28: Audit trail for all secret rotations and key management';
COMMENT ON TABLE provider_health_status IS 'M28: Provider health monitoring with circuit breaker state';
COMMENT ON TABLE provider_operational_events IS 'M28: Operational events and incident tracking';
COMMENT ON TABLE provider_config IS 'M28: Provider configuration management with change tracking';
COMMENT ON TABLE operational_metrics IS 'M28: System-wide operational metrics collection';

COMMENT ON FUNCTION is_rotation_due(bigint) IS 'Check if secret rotation is due based on schedule';
COMMENT ON FUNCTION start_secret_rotation(bigint, text, uuid, text) IS 'Initiate secret rotation process';
COMMENT ON FUNCTION complete_secret_rotation(bigint, text, text, text[], int) IS 'Complete secret rotation and update status';
COMMENT ON FUNCTION update_provider_health(text, text, boolean, int, text) IS 'Update provider health status and circuit breaker state';
COMMENT ON FUNCTION is_provider_available(text, text) IS 'Check if provider is available (respects circuit breaker)';
COMMENT ON FUNCTION toggle_provider(text, text, boolean, text, uuid) IS 'Enable/disable provider with audit trail';