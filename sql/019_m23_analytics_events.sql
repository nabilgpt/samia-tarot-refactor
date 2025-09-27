-- M23: Analytics & KPIs - Events and Metrics Schema
-- Privacy-preserving analytics with no PII, partitioned tables, and ETL aggregation
-- Covers: fulfillment, payments, calls, engagement, content approval workflows

-- Events ingestion table (short retention, high volume)
CREATE TABLE IF NOT EXISTS events_raw (
  id bigserial PRIMARY KEY,
  schema_version smallint NOT NULL DEFAULT 1,
  event_domain text NOT NULL CHECK (event_domain IN ('orders', 'payments', 'calls', 'notifications', 'moderation', 'content')),
  event_type text NOT NULL,
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  
  -- Core identifiers (no PII)
  user_id uuid,
  entity_type text,  -- 'order', 'payment', 'call', 'notification', 'horoscope'
  entity_id text,
  
  -- Event-specific data (no PII, minimal context)
  status text,
  provider text,
  country_code text,  -- 2-letter ISO code only
  service_code text,
  
  -- Quantitative measures
  amount_cents bigint,  -- Financial amounts in smallest unit
  duration_seconds int, -- Call duration, processing time, etc.
  
  -- Technical context (no sensitive data)
  request_id text,
  session_id text,
  retry_count smallint DEFAULT 0,
  
  -- Metadata (sanitized, no PII)
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now()
) PARTITION BY RANGE (event_timestamp);

-- Create partitions for events_raw (monthly partitions for performance)
CREATE TABLE IF NOT EXISTS events_raw_2024_01 PARTITION OF events_raw
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE IF NOT EXISTS events_raw_2024_02 PARTITION OF events_raw
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE IF NOT EXISTS events_raw_2024_03 PARTITION OF events_raw
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
-- Additional partitions would be created by automated jobs

-- Indexes for efficient querying and ETL
CREATE INDEX IF NOT EXISTS idx_events_raw_domain_type_timestamp 
  ON events_raw (event_domain, event_type, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_events_raw_user_timestamp 
  ON events_raw (user_id, event_timestamp) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_raw_entity_timestamp 
  ON events_raw (entity_type, entity_id, event_timestamp);

-- =============================================================================
-- AGGREGATED METRICS TABLES (longer retention, lower volume)
-- =============================================================================

-- Daily fulfillment metrics
CREATE TABLE IF NOT EXISTS metrics_daily_fulfillment (
  id bigserial PRIMARY KEY,
  metric_date date NOT NULL,
  service_code text,
  country_code text,
  
  -- Order counts
  orders_created int DEFAULT 0,
  orders_assigned int DEFAULT 0,
  orders_in_progress int DEFAULT 0,
  orders_awaiting_approval int DEFAULT 0,
  orders_approved int DEFAULT 0,
  orders_rejected int DEFAULT 0,
  orders_delivered int DEFAULT 0,
  orders_cancelled int DEFAULT 0,
  
  -- Time-to-fulfillment metrics (in seconds)
  ttf_response_avg int,      -- Time from create to assigned
  ttf_response_p95 int,
  ttf_delivery_avg int,      -- Time from create to delivered  
  ttf_delivery_p95 int,
  ttf_approval_avg int,      -- Time from submission to approved/rejected
  ttf_approval_p95 int,
  
  -- Quality metrics
  approval_rate decimal(5,4),       -- approved / (approved + rejected)
  rejection_loop_rate decimal(5,4), -- orders rejected multiple times
  
  computed_at timestamptz DEFAULT now(),
  UNIQUE(metric_date, service_code, country_code)
);

-- Daily payments metrics
CREATE TABLE IF NOT EXISTS metrics_daily_payments (
  id bigserial PRIMARY KEY,
  metric_date date NOT NULL,
  country_code text,
  provider text, -- 'stripe', 'square', 'manual', 'usdt'
  
  -- Transaction counts
  payment_attempts int DEFAULT 0,
  payment_successes int DEFAULT 0,
  payment_failures int DEFAULT 0,
  payment_fallbacks int DEFAULT 0, -- Fell back to different provider
  refunds_issued int DEFAULT 0,
  
  -- Financial amounts (in cents)
  total_attempted_cents bigint DEFAULT 0,
  total_succeeded_cents bigint DEFAULT 0,
  total_refunded_cents bigint DEFAULT 0,
  
  -- Performance metrics
  success_rate decimal(5,4),        -- successes / attempts
  fallback_rate decimal(5,4),       -- fallbacks / attempts
  refund_rate decimal(5,4),         -- refunds / successes
  avg_transaction_cents bigint,
  
  computed_at timestamptz DEFAULT now(),
  UNIQUE(metric_date, country_code, provider)
);

-- Daily calls metrics
CREATE TABLE IF NOT EXISTS metrics_daily_calls (
  id bigserial PRIMARY KEY,
  metric_date date NOT NULL,
  service_code text, -- 'healing', 'direct_call'
  country_code text,
  
  -- Call counts
  calls_attempted int DEFAULT 0,
  calls_answered int DEFAULT 0,
  calls_completed int DEFAULT 0,
  calls_dropped_monitor int DEFAULT 0,
  calls_dropped_reader int DEFAULT 0,
  calls_dropped_client int DEFAULT 0,
  calls_failed_technical int DEFAULT 0,
  
  -- Duration metrics (in seconds)
  total_duration_seconds bigint DEFAULT 0,
  avg_duration_seconds int,
  recording_duration_seconds bigint DEFAULT 0,
  
  -- Quality metrics
  answer_rate decimal(5,4),         -- answered / attempted
  completion_rate decimal(5,4),     -- completed / answered
  drop_rate decimal(5,4),           -- dropped / answered
  recording_usage_rate decimal(5,4), -- calls_recorded / calls_answered
  
  computed_at timestamptz DEFAULT now(),
  UNIQUE(metric_date, service_code, country_code)
);

-- Daily engagement metrics
CREATE TABLE IF NOT EXISTS metrics_daily_engagement (
  id bigserial PRIMARY KEY,
  metric_date date NOT NULL,
  country_code text,
  
  -- User activity
  daily_active_users int DEFAULT 0,
  new_registrations int DEFAULT 0,
  profile_completions int DEFAULT 0,
  email_verifications int DEFAULT 0,
  phone_verifications int DEFAULT 0,
  
  -- Content engagement
  horoscope_listens int DEFAULT 0,
  horoscope_listen_duration_seconds bigint DEFAULT 0,
  avg_listen_through_rate decimal(5,4), -- Percentage of audio listened
  
  -- Notifications engagement
  notifications_sent int DEFAULT 0,
  notifications_delivered int DEFAULT 0,
  notifications_opened int DEFAULT 0,
  notifications_clicked int DEFAULT 0,
  notification_opt_outs int DEFAULT 0,
  
  -- Engagement rates
  notification_ctr decimal(5,4),      -- clicked / delivered
  notification_opt_out_rate decimal(5,4), -- opt_outs / sent
  
  computed_at timestamptz DEFAULT now(),
  UNIQUE(metric_date, country_code)
);

-- Daily content metrics
CREATE TABLE IF NOT EXISTS metrics_daily_content (
  id bigserial PRIMARY KEY,
  metric_date date NOT NULL,
  
  -- Daily horoscope coverage
  horoscopes_uploaded int DEFAULT 0,    -- Admin uploads for the day
  horoscopes_pending int DEFAULT 0,     -- Awaiting monitor approval
  horoscopes_approved int DEFAULT 0,    -- Approved by monitor
  horoscopes_rejected int DEFAULT 0,    -- Rejected by monitor
  horoscopes_published int DEFAULT 0,   -- Actually seeded to users
  
  -- Coverage completeness (out of 12 zodiac signs)
  coverage_uploaded int DEFAULT 0,      -- How many signs have content
  coverage_approved int DEFAULT 0,      -- How many signs approved
  coverage_published int DEFAULT 0,     -- How many signs live to users
  
  -- Approval workflow metrics (in minutes)
  approval_latency_avg int,             -- Time from upload to approval
  approval_latency_p95 int,
  
  -- Quality metrics
  approval_rate decimal(5,4),           -- approved / (approved + rejected)
  coverage_rate decimal(5,4),           -- published / 12
  
  computed_at timestamptz DEFAULT now(),
  UNIQUE(metric_date)
);

-- User cohort retention tracking
CREATE TABLE IF NOT EXISTS metrics_cohort_retention (
  id bigserial PRIMARY KEY,
  cohort_date date NOT NULL,           -- When users first registered
  retention_date date NOT NULL,        -- When we're measuring retention
  country_code text,
  
  cohort_size int NOT NULL,            -- Users who registered on cohort_date
  retained_users int NOT NULL,         -- Users active on retention_date
  retention_rate decimal(5,4) NOT NULL, -- retained_users / cohort_size
  
  -- Retention period calculation
  retention_days int GENERATED ALWAYS AS (retention_date - cohort_date) STORED,
  
  computed_at timestamptz DEFAULT now(),
  UNIQUE(cohort_date, retention_date, country_code)
);

-- =============================================================================
-- ETL METADATA AND JOB TRACKING
-- =============================================================================

-- Track ETL job runs for idempotency and monitoring
CREATE TABLE IF NOT EXISTS etl_job_runs (
  id bigserial PRIMARY KEY,
  job_name text NOT NULL,
  target_date date NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  records_processed int DEFAULT 0,
  error_message text,
  request_id text,
  
  UNIQUE(job_name, target_date, started_at)
);

-- Schema version tracking for events_raw
CREATE TABLE IF NOT EXISTS event_schema_versions (
  version smallint PRIMARY KEY,
  description text NOT NULL,
  fields jsonb NOT NULL, -- JSON schema of fields for this version
  created_at timestamptz DEFAULT now()
);

-- Insert current schema version
INSERT INTO event_schema_versions (version, description, fields) VALUES
(1, 'Initial M23 event schema', '{
  "required": ["event_domain", "event_type", "event_timestamp"],
  "properties": {
    "event_domain": {"type": "string", "enum": ["orders", "payments", "calls", "notifications", "moderation", "content"]},
    "event_type": {"type": "string"},
    "user_id": {"type": "string", "format": "uuid"},
    "entity_type": {"type": "string"},
    "entity_id": {"type": "string"},
    "status": {"type": "string"},
    "provider": {"type": "string"},
    "country_code": {"type": "string", "maxLength": 2},
    "service_code": {"type": "string"},
    "amount_cents": {"type": "integer"},
    "duration_seconds": {"type": "integer"},
    "request_id": {"type": "string"},
    "session_id": {"type": "string"},
    "retry_count": {"type": "integer", "minimum": 0},
    "metadata": {"type": "object"}
  }
}')
ON CONFLICT (version) DO NOTHING;

-- Indexes for metrics tables (optimized for common query patterns)
CREATE INDEX IF NOT EXISTS idx_metrics_fulfillment_date_service 
  ON metrics_daily_fulfillment (metric_date DESC, service_code);
CREATE INDEX IF NOT EXISTS idx_metrics_payments_date_country 
  ON metrics_daily_payments (metric_date DESC, country_code);
CREATE INDEX IF NOT EXISTS idx_metrics_calls_date_service 
  ON metrics_daily_calls (metric_date DESC, service_code);
CREATE INDEX IF NOT EXISTS idx_metrics_engagement_date_country 
  ON metrics_daily_engagement (metric_date DESC, country_code);
CREATE INDEX IF NOT EXISTS idx_metrics_content_date 
  ON metrics_daily_content (metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_cohort_retention_cohort_days 
  ON metrics_cohort_retention (cohort_date, retention_days);

-- =============================================================================
-- HELPER FUNCTIONS FOR EVENT INGESTION
-- =============================================================================

-- Function to emit events (used by application code)
CREATE OR REPLACE FUNCTION emit_analytics_event(
  p_event_domain text,
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_country_code text DEFAULT NULL,
  p_service_code text DEFAULT NULL,
  p_amount_cents bigint DEFAULT NULL,
  p_duration_seconds int DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO events_raw (
    event_domain, event_type, user_id, entity_type, entity_id, status,
    provider, country_code, service_code, amount_cents, duration_seconds,
    request_id, session_id, metadata, event_timestamp
  ) VALUES (
    p_event_domain, p_event_type, p_user_id, p_entity_type, p_entity_id, p_status,
    p_provider, p_country_code, p_service_code, p_amount_cents, p_duration_seconds,
    p_request_id, p_session_id, p_metadata, now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely get country code from user (privacy-preserving)
CREATE OR REPLACE FUNCTION get_user_country_code(p_user_id uuid) RETURNS text AS $$
DECLARE
  country_code text;
BEGIN
  SELECT country INTO country_code 
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Return only ISO 2-letter codes, sanitize others
  IF length(country_code) = 2 THEN
    RETURN upper(country_code);
  ELSE
    RETURN 'XX'; -- Unknown/Other
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new events_raw partition
CREATE OR REPLACE FUNCTION create_events_partition(target_date date) RETURNS void AS $$
DECLARE
  partition_name text;
  start_date date;
  end_date date;
BEGIN
  -- Calculate partition bounds (monthly)
  start_date := date_trunc('month', target_date);
  end_date := start_date + interval '1 month';
  
  partition_name := 'events_raw_' || to_char(start_date, 'YYYY_MM');
  
  -- Create partition if it doesn't exist
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I PARTITION OF events_raw
    FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
  
  -- Create partition-specific indexes
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS %I ON %I (event_domain, event_type, event_timestamp)',
    'idx_' || partition_name || '_domain_type_timestamp',
    partition_name
  );
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE events_raw IS 'M23: Raw analytics events with short retention and high volume';
COMMENT ON TABLE metrics_daily_fulfillment IS 'M23: Daily aggregated fulfillment KPIs (TTF, approval rates)';
COMMENT ON TABLE metrics_daily_payments IS 'M23: Daily aggregated payment KPIs (success rates, fallbacks)';
COMMENT ON TABLE metrics_daily_calls IS 'M23: Daily aggregated call QoS metrics';
COMMENT ON TABLE metrics_daily_engagement IS 'M23: Daily user engagement and notification metrics';
COMMENT ON TABLE metrics_daily_content IS 'M23: Daily content approval and coverage metrics';
COMMENT ON TABLE metrics_cohort_retention IS 'M23: User cohort retention analysis';
COMMENT ON TABLE etl_job_runs IS 'M23: ETL job execution tracking for idempotency';

-- Sample events for testing (would be generated by application code)
-- These demonstrate the event schema and expected usage patterns
INSERT INTO events_raw (event_domain, event_type, user_id, entity_type, entity_id, status, service_code, country_code, request_id, metadata) VALUES
('orders', 'order_created', gen_random_uuid(), 'order', '1001', 'new', 'tarot', 'SA', gen_random_uuid()::text, '{"is_gold": false}'::jsonb),
('orders', 'order_assigned', gen_random_uuid(), 'order', '1001', 'assigned', 'tarot', 'SA', gen_random_uuid()::text, '{"reader_id": "reader123"}'::jsonb),
('payments', 'payment_attempted', gen_random_uuid(), 'payment', 'pay_001', 'attempted', 'stripe', 'SA', gen_random_uuid()::text, '{}'::jsonb),
('payments', 'payment_succeeded', gen_random_uuid(), 'payment', 'pay_001', 'succeeded', 'stripe', 'SA', gen_random_uuid()::text, '{}'::jsonb),
('calls', 'call_started', gen_random_uuid(), 'call', 'call_001', 'started', 'healing', 'SA', gen_random_uuid()::text, '{}'::jsonb),
('calls', 'call_ended', gen_random_uuid(), 'call', 'call_001', 'completed', 'healing', 'SA', gen_random_uuid()::text, '{"duration_seconds": 1800}'::jsonb),
('notifications', 'notification_sent', gen_random_uuid(), 'notification', 'notif_001', 'sent', NULL, 'SA', gen_random_uuid()::text, '{"channel": "push"}'::jsonb),
('notifications', 'notification_opened', gen_random_uuid(), 'notification', 'notif_001', 'opened', NULL, 'SA', gen_random_uuid()::text, '{"channel": "push"}'::jsonb),
('content', 'horoscope_uploaded', gen_random_uuid(), 'horoscope', 'horo_001', 'pending', NULL, NULL, gen_random_uuid()::text, '{"zodiac": "Aries"}'::jsonb),
('content', 'horoscope_approved', gen_random_uuid(), 'horoscope', 'horo_001', 'approved', NULL, NULL, gen_random_uuid()::text, '{"zodiac": "Aries"}'::jsonb)
ON CONFLICT DO NOTHING;