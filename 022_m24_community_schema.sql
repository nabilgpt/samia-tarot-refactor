-- M24: Community Features Schema
-- Feature-flagged comments and reactions on delivered readings
-- Strict moderation pipeline integration and privacy controls

-- Feature flags configuration table
CREATE TABLE IF NOT EXISTS feature_flags (
  id bigserial PRIMARY KEY,
  feature_key text UNIQUE NOT NULL,
  is_enabled boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Community comments on delivered orders/horoscopes
CREATE TABLE IF NOT EXISTS community_comments (
  id bigserial PRIMARY KEY,
  subject_ref text NOT NULL, -- 'order:123' or 'horoscope:456'
  author_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  lang text DEFAULT 'en' CHECK (lang IN ('en', 'ar')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden', 'removed')),
  
  -- Moderation integration
  moderation_case_id bigint,
  moderated_at timestamptz,
  moderated_by uuid REFERENCES profiles(id),
  moderation_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Community reactions (like, insightful, etc.)
CREATE TABLE IF NOT EXISTS community_reactions (
  id bigserial PRIMARY KEY,
  subject_ref text NOT NULL, -- 'order:123', 'horoscope:456', 'comment:789'
  author_id uuid NOT NULL REFERENCES profiles(id),
  kind text NOT NULL CHECK (kind IN ('like', 'insightful', 'helpful', 'inspiring')),
  
  created_at timestamptz DEFAULT now(),
  
  -- One reaction per user per subject
  UNIQUE(subject_ref, author_id, kind)
);

-- Community content flagging
CREATE TABLE IF NOT EXISTS community_flags (
  id bigserial PRIMARY KEY,
  subject_ref text NOT NULL, -- 'comment:123', 'reaction:456'
  reason text NOT NULL CHECK (reason IN ('harassment', 'spam', 'inappropriate', 'copyright', 'fraud', 'safety')),
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_by uuid NOT NULL REFERENCES profiles(id),
  
  -- Evidence and context (no PII)
  description text,
  evidence_refs text[], -- IDs only, no raw media URLs
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'escalated')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Community moderation cases (extends M21 pipeline)
CREATE TABLE IF NOT EXISTS community_moderation_cases (
  id bigserial PRIMARY KEY,
  subject_ref text NOT NULL,
  case_type text NOT NULL CHECK (case_type IN ('comment', 'reaction', 'flag', 'appeal')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Taxonomy alignment with M21
  taxonomy_reason text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Case lifecycle
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_review', 'resolved', 'escalated')),
  assigned_to uuid REFERENCES profiles(id),
  assigned_at timestamptz,
  
  -- Resolution
  decision text CHECK (decision IN ('hold', 'unlist', 'remove', 'escalate', 'approve', 'dismiss')),
  decided_by uuid REFERENCES profiles(id),
  decided_at timestamptz,
  decision_notes text,
  
  -- Appeal tracking
  appeal_id bigint,
  is_appealed boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Community appeals system
CREATE TABLE IF NOT EXISTS community_appeals (
  id bigserial PRIMARY KEY,
  moderation_case_id bigint NOT NULL REFERENCES community_moderation_cases(id),
  appellant_id uuid NOT NULL REFERENCES profiles(id),
  
  reason text NOT NULL,
  description text NOT NULL CHECK (length(description) BETWEEN 10 AND 1000),
  evidence_refs text[], -- Supporting evidence IDs
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'denied', 'escalated')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  decision text,
  decision_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_comments_subject_status 
  ON community_comments (subject_ref, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_author 
  ON community_comments (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_moderation 
  ON community_comments (status, moderated_at) WHERE status != 'approved';

CREATE INDEX IF NOT EXISTS idx_community_reactions_subject 
  ON community_reactions (subject_ref, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reactions_author 
  ON community_reactions (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_flags_status 
  ON community_flags (status, severity, created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_community_flags_subject 
  ON community_flags (subject_ref, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_moderation_cases_status 
  ON community_moderation_cases (status, priority, created_at) WHERE status IN ('pending', 'assigned');
CREATE INDEX IF NOT EXISTS idx_community_moderation_cases_assigned 
  ON community_moderation_cases (assigned_to, status, created_at) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_appeals_status 
  ON community_appeals (status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_community_appeals_case 
  ON community_appeals (moderation_case_id);

-- Helper functions for community features

-- Check if community features are enabled
CREATE OR REPLACE FUNCTION is_community_enabled() RETURNS boolean AS $$
DECLARE
  enabled boolean := false;
BEGIN
  SELECT is_enabled INTO enabled 
  FROM feature_flags 
  WHERE feature_key = 'community_enabled';
  
  RETURN COALESCE(enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate subject reference format and deliverability
CREATE OR REPLACE FUNCTION validate_community_subject(subject_ref text) RETURNS boolean AS $$
DECLARE
  ref_parts text[];
  ref_type text;
  ref_id bigint;
  is_delivered boolean := false;
BEGIN
  -- Parse subject_ref format: 'type:id'
  ref_parts := string_to_array(subject_ref, ':');
  IF array_length(ref_parts, 1) != 2 THEN
    RETURN false;
  END IF;
  
  ref_type := ref_parts[1];
  ref_id := ref_parts[2]::bigint;
  
  -- Check if subject exists and is delivered/approved
  IF ref_type = 'order' THEN
    SELECT (status = 'delivered') INTO is_delivered
    FROM orders 
    WHERE id = ref_id;
  ELSIF ref_type = 'horoscope' THEN
    SELECT (approved_at IS NOT NULL) INTO is_delivered
    FROM horoscopes 
    WHERE id = ref_id;
  ELSE
    RETURN false;
  END IF;
  
  RETURN COALESCE(is_delivered, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create moderation case for new community content
CREATE OR REPLACE FUNCTION create_community_moderation_case(
  p_subject_ref text,
  p_case_type text,
  p_taxonomy_reason text DEFAULT 'content_review',
  p_priority text DEFAULT 'normal'
) RETURNS bigint AS $$
DECLARE
  case_id bigint;
BEGIN
  -- Only create if community is enabled
  IF NOT is_community_enabled() THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO community_moderation_cases (
    subject_ref, case_type, taxonomy_reason, priority, status
  ) VALUES (
    p_subject_ref, p_case_type, p_taxonomy_reason, p_priority, 'pending'
  ) RETURNING id INTO case_id;
  
  RETURN case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create moderation cases for new comments
CREATE OR REPLACE FUNCTION community_comment_moderation_trigger() RETURNS trigger AS $$
DECLARE
  case_id bigint;
BEGIN
  -- Create moderation case for new comments
  case_id := create_community_moderation_case(
    'comment:' || NEW.id::text,
    'comment',
    'user_content_review',
    'normal'
  );
  
  UPDATE community_comments 
  SET moderation_case_id = case_id 
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_comment_moderation ON community_comments;
CREATE TRIGGER trg_community_comment_moderation 
  AFTER INSERT ON community_comments
  FOR EACH ROW EXECUTE FUNCTION community_comment_moderation_trigger();

-- Function to apply moderation decision
CREATE OR REPLACE FUNCTION apply_community_moderation_decision(
  p_case_id bigint,
  p_decision text,
  p_moderator_id uuid,
  p_notes text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  case_rec record;
  subject_parts text[];
  subject_type text;
  subject_id bigint;
BEGIN
  -- Get case details
  SELECT * INTO case_rec 
  FROM community_moderation_cases 
  WHERE id = p_case_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Moderation case not found: %', p_case_id;
  END IF;
  
  -- Parse subject reference
  subject_parts := string_to_array(case_rec.subject_ref, ':');
  subject_type := subject_parts[1];
  subject_id := subject_parts[2]::bigint;
  
  -- Apply decision based on subject type
  IF subject_type = 'comment' THEN
    UPDATE community_comments SET
      status = CASE 
        WHEN p_decision = 'approve' THEN 'approved'
        WHEN p_decision = 'hold' THEN 'pending' 
        WHEN p_decision = 'unlist' THEN 'hidden'
        WHEN p_decision = 'remove' THEN 'removed'
        ELSE status
      END,
      moderated_at = now(),
      moderated_by = p_moderator_id,
      moderation_reason = p_notes
    WHERE id = subject_id;
  END IF;
  
  -- Update moderation case
  UPDATE community_moderation_cases SET
    status = CASE WHEN p_decision = 'escalate' THEN 'escalated' ELSE 'resolved' END,
    decision = p_decision,
    decided_by = p_moderator_id,
    decided_at = now(),
    decision_notes = p_notes,
    updated_at = now()
  WHERE id = p_case_id;
  
  -- Log audit entry
  INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta) VALUES (
    p_moderator_id,
    'monitor',
    'community_moderation_decision',
    'community_case',
    p_case_id::text,
    json_build_object(
      'decision', p_decision,
      'subject_ref', case_rec.subject_ref,
      'case_type', case_rec.case_type
    )::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retention cleanup function (aligned with storage limitation)
CREATE OR REPLACE FUNCTION cleanup_community_content(retention_days int DEFAULT 365) RETURNS int AS $$
DECLARE
  deleted_count int := 0;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (retention_days || ' days')::interval;
  
  -- Delete old comments
  WITH deleted AS (
    DELETE FROM community_comments 
    WHERE created_at < cutoff_date 
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;
  
  -- Delete old reactions
  DELETE FROM community_reactions 
  WHERE created_at < cutoff_date;
  
  -- Delete old flags (keep audit trail for resolved cases)
  DELETE FROM community_flags 
  WHERE created_at < cutoff_date 
  AND status IN ('dismissed', 'reviewed');
  
  -- Delete old resolved moderation cases
  DELETE FROM community_moderation_cases 
  WHERE created_at < cutoff_date 
  AND status = 'resolved' 
  AND is_appealed = false;
  
  -- Delete old closed appeals
  DELETE FROM community_appeals 
  WHERE created_at < cutoff_date 
  AND status IN ('approved', 'denied');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default feature flag (OFF by default)
INSERT INTO feature_flags (feature_key, is_enabled, description) VALUES
('community_enabled', false, 'Enable community comments and reactions on delivered content')
ON CONFLICT (feature_key) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE community_comments IS 'M24: User comments on delivered orders and approved horoscopes';
COMMENT ON TABLE community_reactions IS 'M24: User reactions (like, insightful, etc.) on community content';
COMMENT ON TABLE community_flags IS 'M24: User-generated flags for inappropriate community content';
COMMENT ON TABLE community_moderation_cases IS 'M24: Moderation pipeline integration for community content';
COMMENT ON TABLE community_appeals IS 'M24: Appeal system for community moderation decisions';
COMMENT ON TABLE feature_flags IS 'M24: Feature flag system for gradual rollout control';

COMMENT ON FUNCTION is_community_enabled() IS 'Check if community features are enabled via feature flag';
COMMENT ON FUNCTION validate_community_subject(text) IS 'Validate that subject reference is deliverable content';
COMMENT ON FUNCTION apply_community_moderation_decision(bigint, text, uuid, text) IS 'Apply moderation decision and update content status';
COMMENT ON FUNCTION cleanup_community_content(int) IS 'Retention cleanup for community content (default 365 days)';