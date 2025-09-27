-- M29: SRE & Cost Guards Schema
-- Google SRE Golden Signals monitoring, rate limiting, circuit breakers, and FinOps cost management
-- Backend-only operational foundation for reliability and cost control

-- =============================================================================
-- SRE MONITORING & GOLDEN SIGNALS SCHEMA
-- =============================================================================

-- Golden signals metrics (Latency, Traffic, Errors, Saturation)
CREATE TABLE IF NOT EXISTS sre_golden_signals (
  id bigserial PRIMARY KEY,
  
  -- Time window
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  window_size_seconds int NOT NULL DEFAULT 300, -- 5 minutes
  
  -- Service context
  service_name text NOT NULL,
  endpoint_pattern text, -- /api/orders, /api/payments, etc.
  method text, -- GET, POST, etc.
  
  -- Latency (response time distribution)
  latency_p50_ms decimal(10,2),
  latency_p95_ms decimal(10,2),
  latency_p99_ms decimal(10,2),
  latency_max_ms decimal(10,2),
  
  -- Traffic (request volume)
  request_count bigint DEFAULT 0,
  request_rate_per_second decimal(10,2),
  
  -- Errors (error rate and types)
  error_count bigint DEFAULT 0,
  error_rate decimal(5,4), -- percentage: errors/total_requests
  status_4xx_count bigint DEFAULT 0,
  status_5xx_count bigint DEFAULT 0,
  
  -- Saturation (resource utilization)
  cpu_usage_percent decimal(5,2),
  memory_usage_percent decimal(5,2),
  db_connection_usage_percent decimal(5,2),
  
  -- Context
  environment text DEFAULT 'production',
  region text DEFAULT 'eu-north-1',
  
  created_at timestamptz DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(window_start, service_name, endpoint_pattern, method)
);

-- SLO (Service Level Objectives) configuration
CREATE TABLE IF NOT EXISTS sre_slo_config (
  id bigserial PRIMARY KEY,
  service_name text NOT NULL,
  slo_name text NOT NULL,
  slo_type text CHECK (slo_type IN ('availability', 'latency', 'error_rate')),
  
  -- SLO targets
  target_value decimal(8,4) NOT NULL, -- e.g., 99.9% availability, 200ms p95 latency
  measurement_window text DEFAULT '30d' CHECK (measurement_window IN ('1h', '24h', '7d', '30d')),
  
  -- Alert thresholds  
  warning_threshold decimal(8,4),
  critical_threshold decimal(8,4),
  
  -- Configuration
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(service_name, slo_name)
);

-- =============================================================================
-- RATE LIMITING & QUOTAS SCHEMA
-- =============================================================================

-- Rate limiting policies (Token Bucket algorithm)
CREATE TABLE IF NOT EXISTS sre_rate_limits (
  id bigserial PRIMARY KEY,
  
  -- Policy identification
  policy_name text UNIQUE NOT NULL,
  scope text NOT NULL CHECK (scope IN ('global', 'per_ip', 'per_user', 'per_endpoint')),
  resource_pattern text NOT NULL, -- /api/*, /api/orders, specific endpoint patterns
  
  -- Token bucket configuration
  bucket_size bigint NOT NULL DEFAULT 100, -- Maximum tokens
  refill_rate bigint NOT NULL DEFAULT 10, -- Tokens per second
  burst_allowance bigint NOT NULL DEFAULT 20, -- Extra tokens for bursts
  
  -- Time windows
  window_seconds int NOT NULL DEFAULT 3600, -- 1 hour window
  reset_interval_seconds int NOT NULL DEFAULT 60, -- Token refill interval
  
  -- Policy configuration
  is_enabled boolean DEFAULT true,
  priority int DEFAULT 1, -- Higher numbers = higher priority
  
  -- Actions when limit exceeded
  action text DEFAULT '429' CHECK (action IN ('429', 'delay', 'degrade', 'block')),
  retry_after_seconds int DEFAULT 60,
  
  -- Metadata
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rate limiting state (per scope instance)
CREATE TABLE IF NOT EXISTS sre_rate_limit_state (
  id bigserial PRIMARY KEY,
  rate_limit_id bigint NOT NULL REFERENCES sre_rate_limits(id),
  
  -- Scope identification
  scope_key text NOT NULL, -- IP address, user_id, endpoint, or 'global'
  
  -- Token bucket state
  current_tokens decimal(10,2) NOT NULL DEFAULT 0,
  last_refill_at timestamptz DEFAULT now(),
  
  -- Usage tracking
  requests_count bigint DEFAULT 0,
  blocked_count bigint DEFAULT 0,
  last_request_at timestamptz DEFAULT now(),
  
  -- Reset tracking
  window_start timestamptz DEFAULT now(),
  
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(rate_limit_id, scope_key)
);

-- Rate limiting violations log
CREATE TABLE IF NOT EXISTS sre_rate_limit_violations (
  id bigserial PRIMARY KEY,
  rate_limit_id bigint NOT NULL REFERENCES sre_rate_limits(id),
  
  -- Violation context
  scope_key text NOT NULL,
  violated_at timestamptz DEFAULT now(),
  
  -- Request context (sanitized)
  endpoint text,
  method text,
  status_code int,
  
  -- Rate limit context
  attempted_tokens decimal(10,2),
  available_tokens decimal(10,2),
  retry_after_seconds int,
  
  -- Response
  action_taken text,
  
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- CIRCUIT BREAKERS SCHEMA  
-- =============================================================================

-- Circuit breaker configuration for external services
CREATE TABLE IF NOT EXISTS sre_circuit_breakers (
  id bigserial PRIMARY KEY,
  
  -- Service identification
  service_name text NOT NULL,
  service_type text NOT NULL, -- payment, notification, communication, etc.
  endpoint_pattern text, -- Optional: specific endpoints
  
  -- Circuit breaker thresholds
  failure_threshold int NOT NULL DEFAULT 5,
  success_threshold int NOT NULL DEFAULT 3, -- Successes needed to close from half-open
  timeout_seconds int NOT NULL DEFAULT 60, -- Time before trying half-open
  
  -- Current state
  state text NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count int DEFAULT 0,
  success_count int DEFAULT 0,
  
  -- State transitions
  last_failure_at timestamptz,
  last_success_at timestamptz,
  state_changed_at timestamptz DEFAULT now(),
  next_attempt_at timestamptz,
  
  -- Configuration
  is_enabled boolean DEFAULT true,
  auto_recovery boolean DEFAULT true,
  
  -- Metadata
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(service_name, service_type, endpoint_pattern)
);

-- Circuit breaker events log
CREATE TABLE IF NOT EXISTS sre_circuit_breaker_events (
  id bigserial PRIMARY KEY,
  circuit_breaker_id bigint NOT NULL REFERENCES sre_circuit_breakers(id),
  
  -- Event details
  event_type text NOT NULL CHECK (event_type IN ('trip', 'reset', 'half_open_attempt', 'failure', 'success')),
  previous_state text,
  new_state text,
  
  -- Context
  failure_count int,
  success_count int,
  error_message text,
  response_time_ms int,
  
  -- Request context (sanitized)
  request_id text,
  endpoint text,
  
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- COST TRACKING & FINOPS SCHEMA
-- =============================================================================

-- Cost budget configuration (FinOps-aligned)
CREATE TABLE IF NOT EXISTS cost_budgets (
  id bigserial PRIMARY KEY,
  
  -- Budget identification
  budget_name text UNIQUE NOT NULL,
  budget_type text NOT NULL CHECK (budget_type IN ('monthly', 'quarterly', 'annual', 'project')),
  category text NOT NULL CHECK (category IN ('infrastructure', 'providers', 'storage', 'bandwidth', 'communications', 'total')),
  
  -- Budget amounts (in cents for precision)
  budget_amount_cents bigint NOT NULL,
  warning_threshold_percent int DEFAULT 75, -- Alert at 75% usage
  critical_threshold_percent int DEFAULT 90, -- Critical at 90% usage
  
  -- Time period
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Current usage
  current_usage_cents bigint DEFAULT 0,
  last_updated_at timestamptz DEFAULT now(),
  
  -- Configuration
  is_active boolean DEFAULT true,
  auto_alerts boolean DEFAULT true,
  
  -- Metadata
  description text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Daily cost usage tracking
CREATE TABLE IF NOT EXISTS cost_usage_daily (
  id bigserial PRIMARY KEY,
  
  -- Date and category
  usage_date date NOT NULL,
  category text NOT NULL,
  provider text, -- stripe, square, twilio, fcm, supabase, etc.
  service_type text, -- payment, sms, push, storage, etc.
  
  -- Usage metrics
  usage_count bigint DEFAULT 0, -- number of operations
  usage_volume bigint DEFAULT 0, -- bytes, minutes, etc.
  unit text, -- requests, bytes, minutes, messages
  
  -- Cost breakdown (in cents)
  base_cost_cents bigint DEFAULT 0,
  variable_cost_cents bigint DEFAULT 0, 
  total_cost_cents bigint DEFAULT 0,
  
  -- Rate information
  unit_cost_cents decimal(10,4), -- cost per unit
  
  -- Metadata
  currency text DEFAULT 'USD',
  exchange_rate decimal(10,4) DEFAULT 1.0,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(usage_date, category, provider, service_type)
);

-- Cost alerts log
CREATE TABLE IF NOT EXISTS cost_alerts (
  id bigserial PRIMARY KEY,
  budget_id bigint NOT NULL REFERENCES cost_budgets(id),
  
  -- Alert details
  alert_type text NOT NULL CHECK (alert_type IN ('warning', 'critical', 'exceeded')),
  threshold_percent int NOT NULL,
  
  -- Usage at alert time
  current_usage_cents bigint NOT NULL,
  budget_amount_cents bigint NOT NULL,
  usage_percent decimal(5,2) NOT NULL,
  
  -- Alert timing
  alert_date date NOT NULL,
  period_remaining_days int,
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  
  -- Actions taken
  actions_taken text[],
  
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- INCIDENT MANAGEMENT SCHEMA
-- =============================================================================

-- Incident tracking and runbooks
CREATE TABLE IF NOT EXISTS incidents (
  id bigserial PRIMARY KEY,
  
  -- Incident identification
  incident_number text UNIQUE NOT NULL, -- INC-2024-001
  title text NOT NULL,
  description text,
  
  -- Classification
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text CHECK (category IN ('availability', 'performance', 'security', 'cost', 'data')),
  
  -- Status tracking
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed')),
  
  -- Assignment
  assigned_to uuid REFERENCES profiles(id),
  reported_by uuid REFERENCES profiles(id),
  
  -- Timing
  detected_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  
  -- Impact
  affected_services text[],
  user_impact text,
  business_impact text,
  
  -- Resolution
  root_cause text,
  resolution text,
  follow_up_actions text[],
  
  -- Runbook reference
  runbook_id bigint,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Runbooks for incident response
CREATE TABLE IF NOT EXISTS runbooks (
  id bigserial PRIMARY KEY,
  
  -- Runbook identification
  runbook_name text UNIQUE NOT NULL,
  version text DEFAULT 'v1.0',
  
  -- Categorization
  category text NOT NULL,
  severity_level text, -- Which incident severities this applies to
  
  -- Content
  description text,
  trigger_conditions text NOT NULL, -- When to use this runbook
  steps jsonb NOT NULL, -- Array of step objects with instructions
  
  -- Metadata
  estimated_time_minutes int,
  required_roles text[],
  escalation_contacts text[],
  
  -- Status
  is_active boolean DEFAULT true,
  last_reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- HELPER FUNCTIONS FOR SRE OPERATIONS
-- =============================================================================

-- Check if rate limit allows request (Token Bucket algorithm)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_policy_name text,
  p_scope_key text,
  p_tokens_requested decimal DEFAULT 1
) RETURNS jsonb AS $$
DECLARE
  policy_rec record;
  state_rec record;
  tokens_to_add decimal;
  time_elapsed_seconds decimal;
  result jsonb;
BEGIN
  -- Get rate limit policy
  SELECT * INTO policy_rec FROM sre_rate_limits WHERE policy_name = p_policy_name AND is_enabled = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_policy');
  END IF;
  
  -- Get or create rate limit state
  SELECT * INTO state_rec FROM sre_rate_limit_state 
  WHERE rate_limit_id = policy_rec.id AND scope_key = p_scope_key;
  
  IF NOT FOUND THEN
    -- Create new state
    INSERT INTO sre_rate_limit_state (rate_limit_id, scope_key, current_tokens, last_refill_at)
    VALUES (policy_rec.id, p_scope_key, policy_rec.bucket_size, now())
    RETURNING * INTO state_rec;
  END IF;
  
  -- Calculate token refill
  time_elapsed_seconds := EXTRACT(EPOCH FROM (now() - state_rec.last_refill_at));
  tokens_to_add := LEAST(
    policy_rec.bucket_size - state_rec.current_tokens,
    (time_elapsed_seconds * policy_rec.refill_rate)
  );
  
  -- Update token count
  state_rec.current_tokens := LEAST(
    policy_rec.bucket_size,
    state_rec.current_tokens + tokens_to_add
  );
  
  -- Check if request allowed
  IF state_rec.current_tokens >= p_tokens_requested THEN
    -- Allow request and consume tokens
    UPDATE sre_rate_limit_state SET
      current_tokens = state_rec.current_tokens - p_tokens_requested,
      last_refill_at = now(),
      requests_count = requests_count + 1,
      last_request_at = now(),
      updated_at = now()
    WHERE id = state_rec.id;
    
    result := jsonb_build_object(
      'allowed', true,
      'tokens_remaining', state_rec.current_tokens - p_tokens_requested,
      'retry_after_seconds', null
    );
  ELSE
    -- Block request
    UPDATE sre_rate_limit_state SET
      blocked_count = blocked_count + 1,
      last_request_at = now(),
      updated_at = now()
    WHERE id = state_rec.id;
    
    -- Log violation
    INSERT INTO sre_rate_limit_violations (
      rate_limit_id, scope_key, attempted_tokens, available_tokens, retry_after_seconds, action_taken
    ) VALUES (
      policy_rec.id, p_scope_key, p_tokens_requested, state_rec.current_tokens, policy_rec.retry_after_seconds, policy_rec.action
    );
    
    result := jsonb_build_object(
      'allowed', false,
      'tokens_remaining', state_rec.current_tokens,
      'retry_after_seconds', policy_rec.retry_after_seconds,
      'reason', 'rate_limit_exceeded'
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update circuit breaker state
CREATE OR REPLACE FUNCTION update_circuit_breaker(
  p_service_name text,
  p_service_type text,
  p_success boolean,
  p_response_time_ms int DEFAULT NULL,
  p_error_message text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  breaker_rec record;
  new_state text;
  should_trip boolean := false;
  should_reset boolean := false;
BEGIN
  -- Get circuit breaker
  SELECT * INTO breaker_rec FROM sre_circuit_breakers 
  WHERE service_name = p_service_name AND service_type = p_service_type AND is_enabled = true;
  
  IF NOT FOUND THEN
    RETURN; -- No circuit breaker configured
  END IF;
  
  new_state := breaker_rec.state;
  
  IF p_success THEN
    -- Success case
    IF breaker_rec.state = 'half_open' THEN
      -- Count successes in half-open state
      IF breaker_rec.success_count + 1 >= breaker_rec.success_threshold THEN
        new_state := 'closed';
        should_reset := true;
      END IF;
    ELSIF breaker_rec.state = 'open' THEN
      -- Reset failure count on success after being open
      new_state := 'half_open';
    END IF;
    
    -- Update success tracking
    UPDATE sre_circuit_breakers SET
      success_count = CASE WHEN breaker_rec.state = 'half_open' THEN success_count + 1 ELSE 1 END,
      failure_count = CASE WHEN should_reset THEN 0 ELSE failure_count END,
      last_success_at = now(),
      state = new_state,
      state_changed_at = CASE WHEN new_state != breaker_rec.state THEN now() ELSE state_changed_at END,
      updated_at = now()
    WHERE id = breaker_rec.id;
    
  ELSE
    -- Failure case
    IF breaker_rec.state = 'closed' OR breaker_rec.state = 'half_open' THEN
      -- Count failures
      IF breaker_rec.failure_count + 1 >= breaker_rec.failure_threshold THEN
        new_state := 'open';
        should_trip := true;
      END IF;
    END IF;
    
    -- Update failure tracking
    UPDATE sre_circuit_breakers SET
      failure_count = failure_count + 1,
      success_count = 0,
      last_failure_at = now(),
      state = new_state,
      state_changed_at = CASE WHEN new_state != breaker_rec.state THEN now() ELSE state_changed_at END,
      next_attempt_at = CASE WHEN should_trip THEN now() + (timeout_seconds || ' seconds')::interval ELSE next_attempt_at END,
      updated_at = now()
    WHERE id = breaker_rec.id;
  END IF;
  
  -- Log circuit breaker event
  INSERT INTO sre_circuit_breaker_events (
    circuit_breaker_id, event_type, previous_state, new_state,
    failure_count, success_count, error_message, response_time_ms
  ) VALUES (
    breaker_rec.id,
    CASE 
      WHEN should_trip THEN 'trip'
      WHEN should_reset THEN 'reset'
      WHEN p_success THEN 'success'
      ELSE 'failure'
    END,
    breaker_rec.state,
    new_state,
    breaker_rec.failure_count + CASE WHEN p_success THEN 0 ELSE 1 END,
    CASE WHEN p_success THEN breaker_rec.success_count + 1 ELSE 0 END,
    p_error_message,
    p_response_time_ms
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check circuit breaker state
CREATE OR REPLACE FUNCTION is_circuit_breaker_closed(
  p_service_name text,
  p_service_type text
) RETURNS boolean AS $$
DECLARE
  breaker_rec record;
BEGIN
  SELECT * INTO breaker_rec FROM sre_circuit_breakers 
  WHERE service_name = p_service_name AND service_type = p_service_type AND is_enabled = true;
  
  IF NOT FOUND THEN
    RETURN true; -- No circuit breaker = assume available
  END IF;
  
  -- Check if we should move from open to half-open
  IF breaker_rec.state = 'open' AND breaker_rec.next_attempt_at <= now() THEN
    UPDATE sre_circuit_breakers SET
      state = 'half_open',
      state_changed_at = now(),
      updated_at = now()
    WHERE id = breaker_rec.id;
    
    RETURN true; -- Allow attempt in half-open state
  END IF;
  
  RETURN breaker_rec.state IN ('closed', 'half_open');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update cost usage
CREATE OR REPLACE FUNCTION update_cost_usage(
  p_date date,
  p_category text,
  p_provider text,
  p_service_type text,
  p_usage_count bigint,
  p_cost_cents bigint,
  p_unit text DEFAULT 'requests'
) RETURNS void AS $$
BEGIN
  INSERT INTO cost_usage_daily (
    usage_date, category, provider, service_type,
    usage_count, total_cost_cents, unit
  ) VALUES (
    p_date, p_category, p_provider, p_service_type,
    p_usage_count, p_cost_cents, p_unit
  )
  ON CONFLICT (usage_date, category, provider, service_type)
  DO UPDATE SET
    usage_count = cost_usage_daily.usage_count + EXCLUDED.usage_count,
    total_cost_cents = cost_usage_daily.total_cost_cents + EXCLUDED.total_cost_cents,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default SRE configurations
INSERT INTO sre_rate_limits (policy_name, scope, resource_pattern, bucket_size, refill_rate, description) VALUES
('global_api_limit', 'global', '/api/*', 1000, 50, 'Global API rate limit'),
('user_orders_limit', 'per_user', '/api/orders', 10, 1, 'Per-user order creation limit'),
('user_payments_limit', 'per_user', '/api/payments', 5, 1, 'Per-user payment attempts limit'),
('ip_general_limit', 'per_ip', '/*', 100, 10, 'Per-IP general rate limit')
ON CONFLICT (policy_name) DO NOTHING;

INSERT INTO sre_circuit_breakers (service_name, service_type, description) VALUES
('stripe', 'payment', 'Stripe payment processing circuit breaker'),
('square', 'payment', 'Square payment processing circuit breaker'),
('twilio', 'communication', 'Twilio SMS/voice circuit breaker'),
('fcm', 'notification', 'Firebase push notification circuit breaker'),
('apns', 'notification', 'Apple push notification circuit breaker')
ON CONFLICT (service_name, service_type, endpoint_pattern) DO NOTHING;

INSERT INTO cost_budgets (budget_name, budget_type, category, budget_amount_cents, period_start, period_end, description) VALUES
('monthly_total', 'monthly', 'total', 50000, DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'Monthly total spend budget'),
('monthly_providers', 'monthly', 'providers', 30000, DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'Monthly external providers budget'),
('monthly_communications', 'monthly', 'communications', 10000, DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'Monthly SMS/push notifications budget')
ON CONFLICT (budget_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sre_golden_signals_time_service 
  ON sre_golden_signals (window_start DESC, service_name, endpoint_pattern);
CREATE INDEX IF NOT EXISTS idx_sre_rate_limit_state_policy_scope 
  ON sre_rate_limit_state (rate_limit_id, scope_key, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sre_circuit_breakers_service_enabled 
  ON sre_circuit_breakers (service_name, service_type) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_cost_usage_daily_date_category 
  ON cost_usage_daily (usage_date DESC, category, provider);
CREATE INDEX IF NOT EXISTS idx_incidents_status_severity 
  ON incidents (status, severity, created_at DESC) WHERE status != 'closed';

-- Comments for documentation
COMMENT ON TABLE sre_golden_signals IS 'M29: Google SRE Golden Signals metrics (latency, traffic, errors, saturation)';
COMMENT ON TABLE sre_rate_limits IS 'M29: Token bucket rate limiting policies with 429 HTTP semantics';
COMMENT ON TABLE sre_circuit_breakers IS 'M29: Circuit breaker state for external service resilience';
COMMENT ON TABLE cost_budgets IS 'M29: FinOps cost budgets with threshold alerts';
COMMENT ON TABLE cost_usage_daily IS 'M29: Daily cost usage tracking across providers and services';
COMMENT ON TABLE incidents IS 'M29: Incident management and tracking';

COMMENT ON FUNCTION check_rate_limit(text, text, decimal) IS 'Token bucket rate limit check with consumption';
COMMENT ON FUNCTION update_circuit_breaker(text, text, boolean, int, text) IS 'Update circuit breaker state based on success/failure';
COMMENT ON FUNCTION is_circuit_breaker_closed(text, text) IS 'Check if circuit breaker allows requests';
COMMENT ON FUNCTION update_cost_usage(date, text, text, text, bigint, bigint, text) IS 'Record daily cost usage for FinOps tracking';