-- M24: Community Retention and Cleanup Jobs
-- Idempotent jobs for retention cleanup and anomaly detection
-- Aligned with storage limitation principles and M21 moderation integration

-- =============================================================================
-- RETENTION CLEANUP FUNCTIONS (IDEMPOTENT)
-- =============================================================================

-- Daily retention cleanup job for community content
CREATE OR REPLACE FUNCTION run_community_retention_cleanup(retention_days int DEFAULT 365) RETURNS jsonb AS $$
DECLARE
  cleanup_results jsonb := '{}';
  cutoff_date timestamptz;
  deleted_comments int := 0;
  deleted_reactions int := 0;
  deleted_flags int := 0;
  deleted_cases int := 0;
  deleted_appeals int := 0;
  job_start timestamptz := now();
BEGIN
  cutoff_date := now() - (retention_days || ' days')::interval;
  
  -- Log job start
  INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta) VALUES (
    'system',
    'system',
    'community_retention_cleanup_started',
    'retention_job',
    retention_days::text,
    json_build_object('cutoff_date', cutoff_date, 'started_at', job_start)::jsonb
  );
  
  -- Delete old comments (keep audit trail for moderated content)
  WITH deleted AS (
    DELETE FROM community_comments 
    WHERE created_at < cutoff_date 
    AND status NOT IN ('removed') -- Keep evidence of removed content longer
    RETURNING id
  )
  SELECT count(*) INTO deleted_comments FROM deleted;
  
  -- Delete old reactions
  WITH deleted AS (
    DELETE FROM community_reactions 
    WHERE created_at < cutoff_date 
    RETURNING id
  )
  SELECT count(*) INTO deleted_reactions FROM deleted;
  
  -- Delete old resolved flags (keep audit trail for escalated cases)
  WITH deleted AS (
    DELETE FROM community_flags 
    WHERE created_at < cutoff_date 
    AND status IN ('dismissed', 'reviewed')
    AND severity NOT IN ('high', 'critical') -- Keep high severity longer
    RETURNING id
  )
  SELECT count(*) INTO deleted_flags FROM deleted;
  
  -- Delete old resolved moderation cases (no appeals)
  WITH deleted AS (
    DELETE FROM community_moderation_cases 
    WHERE created_at < cutoff_date 
    AND status = 'resolved' 
    AND is_appealed = false
    AND priority NOT IN ('high', 'urgent') -- Keep high priority longer
    RETURNING id
  )
  SELECT count(*) INTO deleted_cases FROM deleted;
  
  -- Delete old closed appeals
  WITH deleted AS (
    DELETE FROM community_appeals 
    WHERE created_at < cutoff_date 
    AND status IN ('approved', 'denied')
    RETURNING id
  )
  SELECT count(*) INTO deleted_appeals FROM deleted;
  
  -- Build results
  cleanup_results := json_build_object(
    'retention_days', retention_days,
    'cutoff_date', cutoff_date,
    'deleted_counts', json_build_object(
      'comments', deleted_comments,
      'reactions', deleted_reactions,
      'flags', deleted_flags,
      'moderation_cases', deleted_cases,
      'appeals', deleted_appeals
    ),
    'total_deleted', deleted_comments + deleted_reactions + deleted_flags + deleted_cases + deleted_appeals,
    'execution_time_seconds', EXTRACT(EPOCH FROM (now() - job_start))
  )::jsonb;
  
  -- Log job completion
  INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta) VALUES (
    'system',
    'system',
    'community_retention_cleanup_completed',
    'retention_job',
    retention_days::text,
    cleanup_results
  );
  
  RETURN cleanup_results;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ANOMALY DETECTION FUNCTIONS (REUSING M21 ENGINE)
-- =============================================================================

-- Detect unusual community activity patterns
CREATE OR REPLACE FUNCTION detect_community_anomalies(lookback_hours int DEFAULT 24) RETURNS jsonb AS $$
DECLARE
  anomaly_results jsonb := '{}';
  cutoff_time timestamptz;
  job_start timestamptz := now();
  
  -- Thresholds
  max_comments_per_user int := 50;
  max_flags_per_user int := 10;
  max_reactions_per_user int := 200;
  spam_comment_threshold numeric := 0.8; -- 80% similarity threshold
  
  -- Counters
  spam_users int := 0;
  flagged_users int := 0;
  suspicious_comments int := 0;
  created_cases int := 0;
BEGIN
  cutoff_time := now() - (lookback_hours || ' hours')::interval;
  
  -- Log anomaly detection start
  INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta) VALUES (
    'system',
    'system',
    'community_anomaly_detection_started',
    'anomaly_job',
    lookback_hours::text,
    json_build_object('cutoff_time', cutoff_time, 'started_at', job_start)::jsonb
  );
  
  -- Detect spam users (too many comments)
  WITH spam_commenters AS (
    SELECT author_id, COUNT(*) as comment_count
    FROM community_comments 
    WHERE created_at >= cutoff_time
    GROUP BY author_id
    HAVING COUNT(*) > max_comments_per_user
  ),
  flagged AS (
    INSERT INTO community_moderation_cases (
      subject_ref, case_type, taxonomy_reason, priority, status
    )
    SELECT 
      'user:' || author_id::text,
      'flag',
      'spam_detection',
      'high',
      'pending'
    FROM spam_commenters
    RETURNING id
  )
  SELECT COUNT(*) INTO created_cases FROM flagged;
  
  GET DIAGNOSTICS spam_users = ROW_COUNT;
  
  -- Detect excessive flagging (potential abuse)
  WITH excessive_flaggers AS (
    SELECT created_by, COUNT(*) as flag_count
    FROM community_flags 
    WHERE created_at >= cutoff_time
    GROUP BY created_by
    HAVING COUNT(*) > max_flags_per_user
  ),
  flagged AS (
    INSERT INTO community_moderation_cases (
      subject_ref, case_type, taxonomy_reason, priority, status
    )
    SELECT 
      'user:' || created_by::text,
      'flag',
      'abuse_detection',
      'medium',
      'pending'
    FROM excessive_flaggers
    RETURNING id
  )
  SELECT COUNT(*) INTO flagged_users FROM flagged;
  
  -- Detect potential duplicate/spam comments (simple similarity check)
  WITH similar_comments AS (
    SELECT c1.id as comment1_id, c2.id as comment2_id, c1.author_id
    FROM community_comments c1
    JOIN community_comments c2 ON c1.author_id = c2.author_id 
    WHERE c1.created_at >= cutoff_time
    AND c2.created_at >= cutoff_time
    AND c1.id < c2.id
    AND similarity(c1.body, c2.body) > spam_comment_threshold
    AND length(c1.body) > 10 -- Ignore very short comments
  ),
  flagged_comments AS (
    INSERT INTO community_moderation_cases (
      subject_ref, case_type, taxonomy_reason, priority, status
    )
    SELECT DISTINCT
      'comment:' || comment1_id::text,
      'comment',
      'spam_detection',
      'medium',
      'pending'
    FROM similar_comments
    RETURNING id
  )
  SELECT COUNT(*) INTO suspicious_comments FROM flagged_comments;
  
  -- Detect reaction bombing (too many reactions from same user)
  WITH reaction_bombers AS (
    SELECT author_id, COUNT(*) as reaction_count
    FROM community_reactions 
    WHERE created_at >= cutoff_time
    GROUP BY author_id
    HAVING COUNT(*) > max_reactions_per_user
  ),
  flagged AS (
    INSERT INTO community_moderation_cases (
      subject_ref, case_type, taxonomy_reason, priority, status
    )
    SELECT 
      'user:' || author_id::text,
      'flag',
      'reaction_bombing',
      'low',
      'pending'
    FROM reaction_bombers
    ON CONFLICT DO NOTHING -- Avoid duplicate cases
    RETURNING id
  )
  SELECT COUNT(*) INTO created_cases FROM flagged;
  
  -- Build results
  anomaly_results := json_build_object(
    'lookback_hours', lookback_hours,
    'cutoff_time', cutoff_time,
    'detected_anomalies', json_build_object(
      'spam_users', spam_users,
      'excessive_flaggers', flagged_users,
      'suspicious_comments', suspicious_comments,
      'total_cases_created', created_cases
    ),
    'thresholds', json_build_object(
      'max_comments_per_user', max_comments_per_user,
      'max_flags_per_user', max_flags_per_user,
      'max_reactions_per_user', max_reactions_per_user,
      'spam_similarity_threshold', spam_comment_threshold
    ),
    'execution_time_seconds', EXTRACT(EPOCH FROM (now() - job_start))
  )::jsonb;
  
  -- Log job completion
  INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta) VALUES (
    'system',
    'system',
    'community_anomaly_detection_completed',
    'anomaly_job',
    lookback_hours::text,
    anomaly_results
  );
  
  RETURN anomaly_results;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RATE LIMITING AND FLOOD PROTECTION
-- =============================================================================

-- Check user rate limits for community actions
CREATE OR REPLACE FUNCTION check_community_rate_limit(
  p_user_id uuid,
  p_action text,
  p_window_minutes int DEFAULT 60,
  p_max_actions int DEFAULT 10
) RETURNS boolean AS $$
DECLARE
  action_count int;
  cutoff_time timestamptz;
BEGIN
  cutoff_time := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count recent actions by this user
  IF p_action = 'comment' THEN
    SELECT COUNT(*) INTO action_count
    FROM community_comments 
    WHERE author_id = p_user_id 
    AND created_at >= cutoff_time;
  ELSIF p_action = 'reaction' THEN
    SELECT COUNT(*) INTO action_count
    FROM community_reactions 
    WHERE author_id = p_user_id 
    AND created_at >= cutoff_time;
  ELSIF p_action = 'flag' THEN
    SELECT COUNT(*) INTO action_count
    FROM community_flags 
    WHERE created_by = p_user_id 
    AND created_at >= cutoff_time;
  ELSE
    -- Unknown action type
    RETURN false;
  END IF;
  
  -- Return true if under limit
  RETURN action_count < p_max_actions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STATS AND MONITORING FUNCTIONS
-- =============================================================================

-- Get community health metrics
CREATE OR REPLACE FUNCTION get_community_health_metrics(hours_back int DEFAULT 24) RETURNS jsonb AS $$
DECLARE
  cutoff_time timestamptz;
  health_metrics jsonb;
BEGIN
  cutoff_time := now() - (hours_back || ' hours')::interval;
  
  WITH metrics AS (
    SELECT 
      -- Comment metrics
      COUNT(DISTINCT cc.id) as total_comments,
      COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'pending') as pending_comments,
      COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'approved') as approved_comments,
      COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'removed') as removed_comments,
      
      -- Reaction metrics
      COUNT(DISTINCT cr.id) as total_reactions,
      
      -- Flag metrics
      COUNT(DISTINCT cf.id) as total_flags,
      COUNT(DISTINCT cf.id) FILTER (WHERE cf.status = 'pending') as pending_flags,
      
      -- Moderation metrics
      COUNT(DISTINCT cmc.id) as total_moderation_cases,
      COUNT(DISTINCT cmc.id) FILTER (WHERE cmc.status = 'pending') as pending_cases,
      AVG(EXTRACT(EPOCH FROM (cmc.decided_at - cmc.created_at))/3600) FILTER (WHERE cmc.decided_at IS NOT NULL) as avg_resolution_hours,
      
      -- User activity
      COUNT(DISTINCT cc.author_id) as active_commenters,
      COUNT(DISTINCT cr.author_id) as active_reactors,
      COUNT(DISTINCT cf.created_by) as active_flaggers
      
    FROM community_comments cc
    FULL JOIN community_reactions cr ON cr.created_at >= cutoff_time
    FULL JOIN community_flags cf ON cf.created_at >= cutoff_time
    FULL JOIN community_moderation_cases cmc ON cmc.created_at >= cutoff_time
    WHERE cc.created_at >= cutoff_time OR cc.created_at IS NULL
  )
  SELECT json_build_object(
    'period_hours', hours_back,
    'cutoff_time', cutoff_time,
    'comments', json_build_object(
      'total', COALESCE(total_comments, 0),
      'pending', COALESCE(pending_comments, 0),
      'approved', COALESCE(approved_comments, 0),
      'removed', COALESCE(removed_comments, 0),
      'approval_rate', CASE 
        WHEN COALESCE(total_comments, 0) > 0 
        THEN ROUND(COALESCE(approved_comments, 0)::numeric / total_comments * 100, 2)
        ELSE 0 
      END
    ),
    'reactions', json_build_object(
      'total', COALESCE(total_reactions, 0)
    ),
    'flags', json_build_object(
      'total', COALESCE(total_flags, 0),
      'pending', COALESCE(pending_flags, 0)
    ),
    'moderation', json_build_object(
      'total_cases', COALESCE(total_moderation_cases, 0),
      'pending_cases', COALESCE(pending_cases, 0),
      'avg_resolution_hours', COALESCE(ROUND(avg_resolution_hours::numeric, 2), 0)
    ),
    'users', json_build_object(
      'active_commenters', COALESCE(active_commenters, 0),
      'active_reactors', COALESCE(active_reactors, 0),
      'active_flaggers', COALESCE(active_flaggers, 0)
    )
  ) INTO health_metrics FROM metrics;
  
  RETURN health_metrics;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- JOB SCHEDULING HELPERS (FOR N8N/CRON INTEGRATION)
-- =============================================================================

-- Master community maintenance job (daily)
CREATE OR REPLACE FUNCTION run_daily_community_maintenance() RETURNS jsonb AS $$
DECLARE
  maintenance_results jsonb := '{}';
  retention_result jsonb;
  anomaly_result jsonb;
  health_result jsonb;
  job_start timestamptz := now();
BEGIN
  -- Run retention cleanup (1 year default)
  retention_result := run_community_retention_cleanup(365);
  
  -- Run anomaly detection (last 24 hours)
  anomaly_result := detect_community_anomalies(24);
  
  -- Get health metrics (last 24 hours)
  health_result := get_community_health_metrics(24);
  
  -- Combine results
  maintenance_results := json_build_object(
    'job_type', 'daily_community_maintenance',
    'executed_at', job_start,
    'execution_time_seconds', EXTRACT(EPOCH FROM (now() - job_start)),
    'retention_cleanup', retention_result,
    'anomaly_detection', anomaly_result,
    'health_metrics', health_result
  )::jsonb;
  
  -- Log master job completion
  INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta) VALUES (
    'system',
    'system',
    'daily_community_maintenance_completed',
    'maintenance_job',
    'daily',
    maintenance_results
  );
  
  RETURN maintenance_results;
END;
$$ LANGUAGE plpgsql;

-- Weekly community deep cleanup (longer retention, more thorough)
CREATE OR REPLACE FUNCTION run_weekly_community_deep_cleanup() RETURNS jsonb AS $$
DECLARE
  deep_cleanup_results jsonb := '{}';
  job_start timestamptz := now();
  deleted_audit_entries int := 0;
BEGIN
  -- Run extended retention cleanup (shorter retention for deep clean)
  deep_cleanup_results := run_community_retention_cleanup(180); -- 6 months
  
  -- Clean up old audit entries related to community (keep 2 years)
  WITH deleted AS (
    DELETE FROM audit_log 
    WHERE event LIKE 'community_%' 
    AND created_at < now() - INTERVAL '2 years'
    RETURNING id
  )
  SELECT count(*) INTO deleted_audit_entries FROM deleted;
  
  -- Update results
  deep_cleanup_results := deep_cleanup_results || json_build_object(
    'deleted_audit_entries', deleted_audit_entries,
    'deep_cleanup_execution_time', EXTRACT(EPOCH FROM (now() - job_start))
  )::jsonb;
  
  -- Log deep cleanup completion
  INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta) VALUES (
    'system',
    'system',
    'weekly_community_deep_cleanup_completed',
    'maintenance_job',
    'weekly',
    deep_cleanup_results
  );
  
  RETURN deep_cleanup_results;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON FUNCTION run_community_retention_cleanup(int) IS 'M24: Daily retention cleanup for community content (idempotent)';
COMMENT ON FUNCTION detect_community_anomalies(int) IS 'M24: Anomaly detection for spam/abuse patterns';
COMMENT ON FUNCTION check_community_rate_limit(uuid, text, int, int) IS 'M24: Rate limiting for community actions';
COMMENT ON FUNCTION get_community_health_metrics(int) IS 'M24: Health metrics for community monitoring';
COMMENT ON FUNCTION run_daily_community_maintenance() IS 'M24: Master daily maintenance job';
COMMENT ON FUNCTION run_weekly_community_deep_cleanup() IS 'M24: Weekly deep cleanup job';

-- Enable pg_similarity extension for spam detection (if available)
-- This is optional and should be installed at database level
-- CREATE EXTENSION IF NOT EXISTS pg_similarity;