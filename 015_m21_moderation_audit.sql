-- M21: Moderation & Audit - Enhanced moderation with tamper-evident audit trail
-- Extends existing moderation_actions and audit_log with taxonomy, appeals, and integrity

-- Moderation reason taxonomy (normalized)
CREATE TABLE IF NOT EXISTS moderation_reasons (
  id bigserial PRIMARY KEY,
  code text UNIQUE NOT NULL, -- harassment, abuse, fraud, copyright, safety, spam, violence, etc
  category text NOT NULL, -- content, behavior, legal, technical, policy
  severity integer NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=critical
  description text NOT NULL,
  auto_actions jsonb DEFAULT '[]'::jsonb, -- suggested actions for this reason
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Extend existing moderation_actions with M21 enhancements
ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS reason_code text REFERENCES moderation_reasons(code);
ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS severity integer DEFAULT 1;
ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS evidence_refs jsonb DEFAULT '[]'::jsonb; -- media IDs, order refs, etc
ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS duration_hours integer; -- for temporary blocks
ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE moderation_actions ADD COLUMN IF NOT EXISTS case_id bigint; -- link to moderation cases

-- Moderation cases (incidents requiring review)
CREATE TABLE IF NOT EXISTS moderation_cases (
  id bigserial PRIMARY KEY,
  case_type text NOT NULL, -- manual_report, automated_sweep, appeal_review
  subject_type text NOT NULL, -- profile, order, media, call
  subject_id text NOT NULL,
  priority integer NOT NULL DEFAULT 2, -- 1=low, 2=normal, 3=high, 4=urgent
  status text NOT NULL DEFAULT 'open', -- open, in_progress, resolved, escalated, closed
  reason_code text REFERENCES moderation_reasons(code),
  description text NOT NULL,
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  assigned_to uuid REFERENCES profiles(id),
  opened_by uuid REFERENCES profiles(id),
  resolved_by uuid REFERENCES profiles(id),
  resolution_notes text,
  opened_at timestamptz DEFAULT now(),
  assigned_at timestamptz,
  resolved_at timestamptz,
  sla_deadline timestamptz, -- calculated based on priority
  
  CONSTRAINT moderation_cases_case_type_check 
    CHECK (case_type IN ('manual_report', 'automated_sweep', 'appeal_review', 'escalation')),
  CONSTRAINT moderation_cases_subject_type_check 
    CHECK (subject_type IN ('profile', 'order', 'media', 'call', 'payment')),
  CONSTRAINT moderation_cases_priority_check 
    CHECK (priority BETWEEN 1 AND 4),
  CONSTRAINT moderation_cases_status_check 
    CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated', 'closed'))
);

-- Appeals system
CREATE TABLE IF NOT EXISTS moderation_appeals (
  id bigserial PRIMARY KEY,
  moderation_action_id bigint NOT NULL REFERENCES moderation_actions(id) ON DELETE CASCADE,
  appellant_id uuid NOT NULL REFERENCES profiles(id), -- who is appealing
  appeal_reason text NOT NULL, -- why they think action was wrong
  appeal_evidence jsonb DEFAULT '[]'::jsonb, -- supporting evidence
  status text NOT NULL DEFAULT 'pending', -- pending, under_review, approved, denied, withdrawn
  priority integer DEFAULT 2, -- same scale as cases
  
  -- Decision tracking
  reviewed_by uuid REFERENCES profiles(id),
  decision text, -- approved, denied, partial_approval
  decision_reason text,
  decision_notes text,
  
  -- Timestamps
  opened_at timestamptz DEFAULT now(),
  review_started_at timestamptz,
  decided_at timestamptz,
  sla_deadline timestamptz,
  
  -- Outcome tracking
  original_action_reversed boolean DEFAULT false,
  new_action_applied boolean DEFAULT false,
  
  CONSTRAINT moderation_appeals_status_check 
    CHECK (status IN ('pending', 'under_review', 'approved', 'denied', 'withdrawn')),
  CONSTRAINT moderation_appeals_priority_check 
    CHECK (priority BETWEEN 1 AND 4),
  CONSTRAINT moderation_appeals_decision_check 
    CHECK (decision IS NULL OR decision IN ('approved', 'denied', 'partial_approval'))
);

-- User blocks and restrictions (extends profile blocking concept)
CREATE TABLE IF NOT EXISTS user_restrictions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restriction_type text NOT NULL, -- block, suspend, limit_orders, limit_calls, shadow_ban
  reason_code text REFERENCES moderation_reasons(code),
  severity integer DEFAULT 1,
  
  -- Duration and status
  status text NOT NULL DEFAULT 'active', -- active, expired, lifted, appealed
  duration_hours integer, -- NULL = permanent
  applied_by uuid NOT NULL REFERENCES profiles(id),
  lifted_by uuid REFERENCES profiles(id),
  
  -- Evidence and notes
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  internal_notes text,
  user_visible_reason text, -- sanitized reason shown to user
  
  -- Timestamps
  applied_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- calculated from duration_hours
  lifted_at timestamptz,
  
  -- Appeal tracking
  appeal_id bigint REFERENCES moderation_appeals(id),
  
  CONSTRAINT user_restrictions_type_check 
    CHECK (restriction_type IN ('block', 'suspend', 'limit_orders', 'limit_calls', 'shadow_ban', 'verify_required')),
  CONSTRAINT user_restrictions_status_check 
    CHECK (status IN ('active', 'expired', 'lifted', 'appealed'))
);

-- Automated sweep configurations
CREATE TABLE IF NOT EXISTS moderation_sweep_configs (
  id bigserial PRIMARY KEY,
  sweep_name text UNIQUE NOT NULL, -- excessive_rejections, rapid_refunds, high_call_drops, etc
  sweep_type text NOT NULL, -- anomaly_detection, pattern_matching, threshold_based
  is_active boolean DEFAULT true,
  
  -- Configuration
  check_interval_hours integer DEFAULT 24, -- how often to run
  lookback_hours integer DEFAULT 168, -- 7 days default lookback
  threshold_config jsonb NOT NULL, -- sweep-specific parameters
  
  -- Actions
  auto_create_case boolean DEFAULT true,
  suggested_priority integer DEFAULT 2,
  suggested_reason_code text REFERENCES moderation_reasons(code),
  
  -- Metadata
  description text,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT moderation_sweep_configs_type_check 
    CHECK (sweep_type IN ('anomaly_detection', 'pattern_matching', 'threshold_based'))
);

-- Sweep execution results
CREATE TABLE IF NOT EXISTS moderation_sweep_results (
  id bigserial PRIMARY KEY,
  sweep_config_id bigint NOT NULL REFERENCES moderation_sweep_configs(id) ON DELETE CASCADE,
  run_started_at timestamptz DEFAULT now(),
  run_completed_at timestamptz,
  
  -- Results
  total_checked integer DEFAULT 0,
  anomalies_found integer DEFAULT 0,
  cases_created integer DEFAULT 0,
  false_positives integer DEFAULT 0, -- marked by human reviewers
  
  -- Execution details
  execution_status text DEFAULT 'running', -- running, completed, failed, cancelled
  error_message text,
  execution_metadata jsonb DEFAULT '{}'::jsonb,
  
  CONSTRAINT moderation_sweep_results_status_check 
    CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled'))
);

-- Enhanced audit_log with integrity features
-- Add hash chain for tamper evidence
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS sequence_number bigserial;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS previous_hash text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS record_hash text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS request_id text; -- trace requests end-to-end

-- Audit attestations (periodic signed exports)
CREATE TABLE IF NOT EXISTS audit_attestations (
  id bigserial PRIMARY KEY,
  attestation_period_start timestamptz NOT NULL,
  attestation_period_end timestamptz NOT NULL,
  
  -- Content
  total_records bigint NOT NULL,
  first_sequence_number bigint NOT NULL,
  last_sequence_number bigint NOT NULL,
  content_hash text NOT NULL, -- hash of exported content
  
  -- Signing
  signed_by uuid NOT NULL REFERENCES profiles(id),
  signature text, -- cryptographic signature of content_hash
  public_key_id text, -- identifier for verification
  
  -- Export details
  export_format text DEFAULT 'json', -- json, csv, xml
  export_location text, -- storage path or URL
  export_metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT audit_attestations_period_check 
    CHECK (attestation_period_end > attestation_period_start)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_moderation_reasons_code ON moderation_reasons(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_moderation_actions_reason_code ON moderation_actions(reason_code);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_case_id ON moderation_actions(case_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_status ON moderation_cases(status, priority);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_assigned ON moderation_cases(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_sla ON moderation_cases(sla_deadline) WHERE status IN ('open', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_status ON moderation_appeals(status, priority);
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_sla ON moderation_appeals(sla_deadline) WHERE status IN ('pending', 'under_review');
CREATE INDEX IF NOT EXISTS idx_user_restrictions_user ON user_restrictions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_expires ON user_restrictions(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sweep_results_config ON moderation_sweep_results(sweep_config_id, run_started_at);

-- Enhanced audit_log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_sequence ON audit_log(sequence_number);
CREATE INDEX IF NOT EXISTS idx_audit_log_request_id ON audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_event ON audit_log(actor, event, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_attestations_period ON audit_attestations(attestation_period_start, attestation_period_end);

-- Functions for audit integrity
CREATE OR REPLACE FUNCTION calculate_audit_record_hash(
  seq_num bigint,
  prev_hash text,
  actor_val text,
  event_val text,
  entity_val text,
  entity_id_val text,
  meta_val text,
  created_at_val timestamptz
) RETURNS text AS $$
BEGIN
  RETURN encode(
    digest(
      COALESCE(seq_num::text, '') || '|' ||
      COALESCE(prev_hash, '') || '|' ||
      COALESCE(actor_val, '') || '|' ||
      COALESCE(event_val, '') || '|' ||
      COALESCE(entity_val, '') || '|' ||
      COALESCE(entity_id_val, '') || '|' ||
      COALESCE(meta_val, '') || '|' ||
      COALESCE(created_at_val::text, ''),
      'sha256'
    ), 
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to maintain hash chain in audit_log
CREATE OR REPLACE FUNCTION maintain_audit_hash_chain()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash_val text;
  current_seq bigint;
BEGIN
  -- Get the previous hash and sequence
  SELECT record_hash, sequence_number INTO prev_hash_val, current_seq
  FROM audit_log 
  ORDER BY sequence_number DESC 
  LIMIT 1;
  
  -- Set previous hash (NULL for first record)
  NEW.previous_hash := prev_hash_val;
  
  -- Calculate current record hash
  NEW.record_hash := calculate_audit_record_hash(
    NEW.sequence_number,
    NEW.previous_hash,
    NEW.actor,
    NEW.event,
    NEW.entity,
    NEW.entity_id,
    COALESCE(NEW.meta::text, ''),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_hash_chain ON audit_log;
CREATE TRIGGER trigger_audit_hash_chain
  BEFORE INSERT ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION maintain_audit_hash_chain();

-- Function to calculate SLA deadlines
CREATE OR REPLACE FUNCTION calculate_sla_deadline(
  priority_level integer,
  created_at timestamptz DEFAULT now()
) RETURNS timestamptz AS $$
BEGIN
  RETURN CASE priority_level
    WHEN 4 THEN created_at + INTERVAL '2 hours'  -- urgent
    WHEN 3 THEN created_at + INTERVAL '8 hours'  -- high
    WHEN 2 THEN created_at + INTERVAL '24 hours' -- normal
    ELSE created_at + INTERVAL '72 hours'        -- low
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate SLA deadlines
CREATE OR REPLACE FUNCTION set_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sla_deadline := calculate_sla_deadline(NEW.priority, NEW.opened_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_case_sla_deadline ON moderation_cases;
CREATE TRIGGER trigger_case_sla_deadline
  BEFORE INSERT ON moderation_cases
  FOR EACH ROW
  EXECUTE FUNCTION set_sla_deadline();

DROP TRIGGER IF EXISTS trigger_appeal_sla_deadline ON moderation_appeals;
CREATE TRIGGER trigger_appeal_sla_deadline
  BEFORE INSERT ON moderation_appeals
  FOR EACH ROW
  EXECUTE FUNCTION set_sla_deadline();

-- Trigger to auto-calculate restriction expiry
CREATE OR REPLACE FUNCTION set_restriction_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.duration_hours IS NOT NULL THEN
    NEW.expires_at := NEW.applied_at + (NEW.duration_hours || ' hours')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restriction_expiry ON user_restrictions;
CREATE TRIGGER trigger_restriction_expiry
  BEFORE INSERT OR UPDATE ON user_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION set_restriction_expiry();

-- Seed moderation reasons taxonomy
INSERT INTO moderation_reasons (code, category, severity, description, auto_actions) VALUES
('harassment', 'behavior', 3, 'Harassment, bullying, or targeted abuse', '["warn", "temp_block"]'),
('abuse', 'behavior', 4, 'Severe abusive behavior or threats', '["block", "escalate"]'),
('fraud', 'legal', 4, 'Fraudulent activity or payment issues', '["block", "freeze_payments", "escalate"]'),
('copyright', 'legal', 2, 'Copyright infringement or IP violation', '["remove_media", "warn"]'),
('safety', 'behavior', 4, 'Safety concerns or dangerous content', '["block", "escalate", "notify_authorities"]'),
('spam', 'content', 2, 'Spam, unsolicited content, or excessive posting', '["warn", "limit_orders", "temp_block"]'),
('violence', 'content', 4, 'Violent content or threats of violence', '["block", "remove_media", "escalate"]'),
('inappropriate', 'content', 2, 'Inappropriate content for platform', '["warn", "remove_media"]'),
('impersonation', 'behavior', 3, 'Impersonating another person or entity', '["verify_required", "temp_block"]'),
('underage', 'legal', 4, 'Underage user or inappropriate content involving minors', '["block", "escalate", "notify_authorities"]'),
('technical_abuse', 'technical', 3, 'Technical exploitation or system abuse', '["temp_block", "limit_calls"]'),
('policy_violation', 'policy', 2, 'General platform policy violation', '["warn"]'),
('quality_issues', 'content', 1, 'Poor quality content or service', '["warn", "review_required"]'),
('excessive_refunds', 'behavior', 2, 'Pattern of excessive refund requests', '["review_required", "limit_orders"]'),
('call_abuse', 'behavior', 3, 'Inappropriate behavior during calls', '["limit_calls", "temp_block"]),
('payment_issues', 'technical', 2, 'Repeated payment failures or disputes', '["review_required"]')
ON CONFLICT (code) DO NOTHING;

-- Seed sweep configurations
INSERT INTO moderation_sweep_configs (sweep_name, sweep_type, threshold_config, description, suggested_reason_code) VALUES
(
  'excessive_rejections_by_reader', 
  'threshold_based',
  '{"rejection_rate_threshold": 0.8, "min_orders": 10, "lookback_hours": 168}',
  'Detect readers with abnormally high rejection rates',
  'quality_issues'
),
(
  'rapid_refund_sequences', 
  'pattern_matching',
  '{"refunds_per_hour_threshold": 5, "same_user_pattern": true, "lookback_hours": 24}',
  'Detect unusual refund patterns that may indicate abuse',
  'fraud'
),
(
  'high_call_drop_rates', 
  'threshold_based',
  '{"drop_rate_threshold": 0.6, "min_calls": 5, "lookback_hours": 72}',
  'Detect users or readers with high call drop rates',
  'call_abuse'
),
(
  'payment_fallback_spikes', 
  'anomaly_detection',
  '{"fallback_rate_threshold": 0.3, "volume_threshold": 20, "lookback_hours": 24}',
  'Detect spikes in payment fallback rates indicating provider issues',
  'payment_issues'
),
(
  'bulk_order_patterns', 
  'pattern_matching',
  '{"orders_per_hour_threshold": 10, "similar_content_threshold": 0.8, "lookback_hours": 4}',
  'Detect potential spam or bulk ordering patterns',
  'spam'
)
ON CONFLICT (sweep_name) DO NOTHING;

COMMENT ON TABLE moderation_reasons IS 'M21: Normalized taxonomy of moderation reasons with severity and suggested actions';
COMMENT ON TABLE moderation_cases IS 'M21: Moderation incidents requiring review with SLA tracking';
COMMENT ON TABLE moderation_appeals IS 'M21: Appeals process for disputed moderation actions';
COMMENT ON TABLE user_restrictions IS 'M21: User blocks and restrictions with duration and appeal tracking';
COMMENT ON TABLE moderation_sweep_configs IS 'M21: Configuration for automated anomaly detection sweeps';
COMMENT ON TABLE moderation_sweep_results IS 'M21: Results and metrics from automated moderation sweeps';
COMMENT ON TABLE audit_attestations IS 'M21: Periodic signed exports for audit integrity verification';
COMMENT ON FUNCTION maintain_audit_hash_chain IS 'M21: Maintains tamper-evident hash chain in audit log';
COMMENT ON FUNCTION calculate_sla_deadline IS 'M21: Calculates SLA deadlines based on priority levels';