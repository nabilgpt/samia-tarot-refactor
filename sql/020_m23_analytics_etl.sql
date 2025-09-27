-- M23: Analytics ETL Jobs and KPI Calculation Functions
-- Idempotent nightly aggregation from events_raw into metrics_daily_* tables
-- Privacy-preserving with no PII, optimized for performance

-- =============================================================================
-- ETL JOB: DAILY FULFILLMENT METRICS
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_daily_fulfillment_metrics(target_date date) 
RETURNS void AS $$
DECLARE
  job_start_time timestamptz := now();
  records_processed int := 0;
  request_id text := gen_random_uuid()::text;
BEGIN
  -- Record job start
  INSERT INTO etl_job_runs (job_name, target_date, started_at, request_id, status)
  VALUES ('daily_fulfillment', target_date, job_start_time, request_id, 'running');
  
  -- Clear existing data for idempotency
  DELETE FROM metrics_daily_fulfillment WHERE metric_date = target_date;
  
  -- Aggregate fulfillment metrics by service and country
  INSERT INTO metrics_daily_fulfillment (
    metric_date, service_code, country_code,
    orders_created, orders_assigned, orders_in_progress, orders_awaiting_approval,
    orders_approved, orders_rejected, orders_delivered, orders_cancelled,
    ttf_response_avg, ttf_response_p95, ttf_delivery_avg, ttf_delivery_p95,
    ttf_approval_avg, ttf_approval_p95, approval_rate, rejection_loop_rate
  )
  WITH order_events AS (
    SELECT 
      e.entity_id as order_id,
      e.service_code,
      e.country_code,
      e.event_type,
      e.event_timestamp,
      e.metadata
    FROM events_raw e
    WHERE e.event_domain = 'orders'
      AND e.event_timestamp::date = target_date
      AND e.service_code IS NOT NULL
      AND e.country_code IS NOT NULL
  ),
  order_lifecycle AS (
    SELECT 
      service_code,
      country_code,
      COUNT(CASE WHEN event_type = 'order_created' THEN 1 END) as created_count,
      COUNT(CASE WHEN event_type = 'order_assigned' THEN 1 END) as assigned_count,
      COUNT(CASE WHEN event_type = 'order_status_in_progress' THEN 1 END) as in_progress_count,
      COUNT(CASE WHEN event_type = 'order_status_awaiting_approval' THEN 1 END) as awaiting_approval_count,
      COUNT(CASE WHEN event_type = 'order_approved' THEN 1 END) as approved_count,
      COUNT(CASE WHEN event_type = 'order_rejected' THEN 1 END) as rejected_count,
      COUNT(CASE WHEN event_type = 'order_delivered' THEN 1 END) as delivered_count,
      COUNT(CASE WHEN event_type = 'order_cancelled' THEN 1 END) as cancelled_count
    FROM order_events
    GROUP BY service_code, country_code
  ),
  timing_metrics AS (
    SELECT 
      oe1.service_code,
      oe1.country_code,
      -- TTF Response (create to assigned)
      EXTRACT(epoch FROM AVG(oe2.event_timestamp - oe1.event_timestamp))::int as ttf_response_avg,
      EXTRACT(epoch FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY oe2.event_timestamp - oe1.event_timestamp))::int as ttf_response_p95,
      -- TTF Delivery (create to delivered)  
      EXTRACT(epoch FROM AVG(oe3.event_timestamp - oe1.event_timestamp))::int as ttf_delivery_avg,
      EXTRACT(epoch FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY oe3.event_timestamp - oe1.event_timestamp))::int as ttf_delivery_p95,
      -- TTF Approval (awaiting to approved/rejected)
      EXTRACT(epoch FROM AVG(COALESCE(oe4.event_timestamp, oe5.event_timestamp) - oe6.event_timestamp))::int as ttf_approval_avg,
      EXTRACT(epoch FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY COALESCE(oe4.event_timestamp, oe5.event_timestamp) - oe6.event_timestamp))::int as ttf_approval_p95
    FROM order_events oe1 -- created
    LEFT JOIN order_events oe2 ON oe1.order_id = oe2.order_id AND oe2.event_type = 'order_assigned'
    LEFT JOIN order_events oe3 ON oe1.order_id = oe3.order_id AND oe3.event_type = 'order_delivered'
    LEFT JOIN order_events oe4 ON oe1.order_id = oe4.order_id AND oe4.event_type = 'order_approved'
    LEFT JOIN order_events oe5 ON oe1.order_id = oe5.order_id AND oe5.event_type = 'order_rejected'
    LEFT JOIN order_events oe6 ON oe1.order_id = oe6.order_id AND oe6.event_type = 'order_status_awaiting_approval'
    WHERE oe1.event_type = 'order_created'
    GROUP BY oe1.service_code, oe1.country_code
  ),
  quality_metrics AS (
    SELECT 
      service_code,
      country_code,
      CASE 
        WHEN (approved_count + rejected_count) > 0 
        THEN approved_count::decimal / (approved_count + rejected_count)
        ELSE NULL 
      END as approval_rate,
      -- Rejection loop rate: orders rejected multiple times
      CASE 
        WHEN rejected_count > 0
        THEN GREATEST(0, rejected_count - COUNT(DISTINCT order_id))::decimal / rejected_count
        ELSE 0
      END as rejection_loop_rate
    FROM order_events
    WHERE event_type IN ('order_approved', 'order_rejected')
    GROUP BY service_code, country_code
  )
  SELECT 
    target_date,
    COALESCE(ol.service_code, tm.service_code, qm.service_code),
    COALESCE(ol.country_code, tm.country_code, qm.country_code),
    COALESCE(ol.created_count, 0),
    COALESCE(ol.assigned_count, 0), 
    COALESCE(ol.in_progress_count, 0),
    COALESCE(ol.awaiting_approval_count, 0),
    COALESCE(ol.approved_count, 0),
    COALESCE(ol.rejected_count, 0),
    COALESCE(ol.delivered_count, 0),
    COALESCE(ol.cancelled_count, 0),
    tm.ttf_response_avg,
    tm.ttf_response_p95,
    tm.ttf_delivery_avg,
    tm.ttf_delivery_p95,
    tm.ttf_approval_avg,
    tm.ttf_approval_p95,
    qm.approval_rate,
    qm.rejection_loop_rate
  FROM order_lifecycle ol
  FULL OUTER JOIN timing_metrics tm ON ol.service_code = tm.service_code AND ol.country_code = tm.country_code
  FULL OUTER JOIN quality_metrics qm ON COALESCE(ol.service_code, tm.service_code) = qm.service_code 
                                      AND COALESCE(ol.country_code, tm.country_code) = qm.country_code;

  GET DIAGNOSTICS records_processed = ROW_COUNT;
  
  -- Mark job as completed
  UPDATE etl_job_runs 
  SET status = 'completed', completed_at = now(), records_processed = records_processed
  WHERE job_name = 'daily_fulfillment' AND target_date = target_date AND started_at = job_start_time;
  
EXCEPTION WHEN OTHERS THEN
  -- Mark job as failed
  UPDATE etl_job_runs 
  SET status = 'failed', completed_at = now(), error_message = SQLERRM
  WHERE job_name = 'daily_fulfillment' AND target_date = target_date AND started_at = job_start_time;
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ETL JOB: DAILY PAYMENTS METRICS
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_daily_payments_metrics(target_date date) 
RETURNS void AS $$
DECLARE
  job_start_time timestamptz := now();
  records_processed int := 0;
  request_id text := gen_random_uuid()::text;
BEGIN
  -- Record job start
  INSERT INTO etl_job_runs (job_name, target_date, started_at, request_id, status)
  VALUES ('daily_payments', target_date, job_start_time, request_id, 'running');
  
  -- Clear existing data for idempotency
  DELETE FROM metrics_daily_payments WHERE metric_date = target_date;
  
  -- Aggregate payment metrics by country and provider
  INSERT INTO metrics_daily_payments (
    metric_date, country_code, provider,
    payment_attempts, payment_successes, payment_failures, payment_fallbacks, refunds_issued,
    total_attempted_cents, total_succeeded_cents, total_refunded_cents,
    success_rate, fallback_rate, refund_rate, avg_transaction_cents
  )
  WITH payment_events AS (
    SELECT 
      e.entity_id as payment_id,
      e.country_code,
      e.provider,
      e.event_type,
      e.status,
      e.amount_cents,
      e.metadata
    FROM events_raw e
    WHERE e.event_domain = 'payments'
      AND e.event_timestamp::date = target_date
      AND e.country_code IS NOT NULL
      AND e.provider IS NOT NULL
  ),
  payment_aggregates AS (
    SELECT 
      country_code,
      provider,
      COUNT(CASE WHEN event_type = 'payment_attempted' THEN 1 END) as attempts,
      COUNT(CASE WHEN event_type = 'payment_succeeded' THEN 1 END) as successes,
      COUNT(CASE WHEN event_type = 'payment_failed' THEN 1 END) as failures,
      COUNT(CASE WHEN event_type = 'payment_fallback' THEN 1 END) as fallbacks,
      COUNT(CASE WHEN event_type = 'refund_issued' THEN 1 END) as refunds,
      SUM(CASE WHEN event_type = 'payment_attempted' THEN amount_cents ELSE 0 END) as attempted_cents,
      SUM(CASE WHEN event_type = 'payment_succeeded' THEN amount_cents ELSE 0 END) as succeeded_cents,
      SUM(CASE WHEN event_type = 'refund_issued' THEN amount_cents ELSE 0 END) as refunded_cents
    FROM payment_events
    WHERE amount_cents IS NOT NULL
    GROUP BY country_code, provider
  )
  SELECT 
    target_date,
    country_code,
    provider,
    attempts,
    successes,
    failures,
    fallbacks,
    refunds,
    attempted_cents,
    succeeded_cents,
    refunded_cents,
    CASE WHEN attempts > 0 THEN successes::decimal / attempts ELSE NULL END,
    CASE WHEN attempts > 0 THEN fallbacks::decimal / attempts ELSE NULL END,
    CASE WHEN successes > 0 THEN refunds::decimal / successes ELSE NULL END,
    CASE WHEN successes > 0 THEN succeeded_cents / successes ELSE NULL END
  FROM payment_aggregates;

  GET DIAGNOSTICS records_processed = ROW_COUNT;
  
  -- Mark job as completed
  UPDATE etl_job_runs 
  SET status = 'completed', completed_at = now(), records_processed = records_processed
  WHERE job_name = 'daily_payments' AND target_date = target_date AND started_at = job_start_time;
  
EXCEPTION WHEN OTHERS THEN
  UPDATE etl_job_runs 
  SET status = 'failed', completed_at = now(), error_message = SQLERRM
  WHERE job_name = 'daily_payments' AND target_date = target_date AND started_at = job_start_time;
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ETL JOB: DAILY CALLS METRICS
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_daily_calls_metrics(target_date date) 
RETURNS void AS $$
DECLARE
  job_start_time timestamptz := now();
  records_processed int := 0;
  request_id text := gen_random_uuid()::text;
BEGIN
  -- Record job start
  INSERT INTO etl_job_runs (job_name, target_date, started_at, request_id, status)
  VALUES ('daily_calls', target_date, job_start_time, request_id, 'running');
  
  -- Clear existing data for idempotency
  DELETE FROM metrics_daily_calls WHERE metric_date = target_date;
  
  INSERT INTO metrics_daily_calls (
    metric_date, service_code, country_code,
    calls_attempted, calls_answered, calls_completed, calls_dropped_monitor, 
    calls_dropped_reader, calls_dropped_client, calls_failed_technical,
    total_duration_seconds, avg_duration_seconds, recording_duration_seconds,
    answer_rate, completion_rate, drop_rate, recording_usage_rate
  )
  WITH call_events AS (
    SELECT 
      e.entity_id as call_id,
      e.service_code,
      e.country_code,
      e.event_type,
      e.status,
      e.duration_seconds,
      e.metadata
    FROM events_raw e
    WHERE e.event_domain = 'calls'
      AND e.event_timestamp::date = target_date
      AND e.service_code IS NOT NULL
      AND e.country_code IS NOT NULL
  ),
  call_aggregates AS (
    SELECT 
      service_code,
      country_code,
      COUNT(CASE WHEN event_type = 'call_started' THEN 1 END) as attempted,
      COUNT(CASE WHEN event_type = 'call_answered' THEN 1 END) as answered,
      COUNT(CASE WHEN event_type = 'call_ended' AND status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN event_type = 'call_ended' AND status = 'dropped_by_monitor' THEN 1 END) as dropped_monitor,
      COUNT(CASE WHEN event_type = 'call_ended' AND status = 'dropped_by_reader' THEN 1 END) as dropped_reader,
      COUNT(CASE WHEN event_type = 'call_ended' AND status = 'dropped_by_client' THEN 1 END) as dropped_client,
      COUNT(CASE WHEN event_type = 'call_ended' AND status = 'failed' THEN 1 END) as failed_technical,
      SUM(CASE WHEN event_type = 'call_ended' AND duration_seconds IS NOT NULL THEN duration_seconds ELSE 0 END) as total_duration,
      SUM(CASE WHEN event_type = 'call_recorded' AND duration_seconds IS NOT NULL THEN duration_seconds ELSE 0 END) as recording_duration,
      COUNT(CASE WHEN event_type = 'call_recorded' THEN 1 END) as calls_recorded
    FROM call_events
    GROUP BY service_code, country_code
  )
  SELECT 
    target_date,
    service_code,
    country_code,
    attempted,
    answered,
    completed,
    dropped_monitor,
    dropped_reader, 
    dropped_client,
    failed_technical,
    total_duration,
    CASE WHEN answered > 0 THEN total_duration / answered ELSE NULL END,
    recording_duration,
    CASE WHEN attempted > 0 THEN answered::decimal / attempted ELSE NULL END,
    CASE WHEN answered > 0 THEN completed::decimal / answered ELSE NULL END,
    CASE WHEN answered > 0 THEN (dropped_monitor + dropped_reader + dropped_client)::decimal / answered ELSE NULL END,
    CASE WHEN answered > 0 THEN calls_recorded::decimal / answered ELSE NULL END
  FROM call_aggregates;

  GET DIAGNOSTICS records_processed = ROW_COUNT;
  
  UPDATE etl_job_runs 
  SET status = 'completed', completed_at = now(), records_processed = records_processed
  WHERE job_name = 'daily_calls' AND target_date = target_date AND started_at = job_start_time;
  
EXCEPTION WHEN OTHERS THEN
  UPDATE etl_job_runs 
  SET status = 'failed', completed_at = now(), error_message = SQLERRM
  WHERE job_name = 'daily_calls' AND target_date = target_date AND started_at = job_start_time;
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ETL JOB: DAILY ENGAGEMENT METRICS
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_daily_engagement_metrics(target_date date) 
RETURNS void AS $$
DECLARE
  job_start_time timestamptz := now();
  records_processed int := 0;
  request_id text := gen_random_uuid()::text;
BEGIN
  INSERT INTO etl_job_runs (job_name, target_date, started_at, request_id, status)
  VALUES ('daily_engagement', target_date, job_start_time, request_id, 'running');
  
  DELETE FROM metrics_daily_engagement WHERE metric_date = target_date;
  
  INSERT INTO metrics_daily_engagement (
    metric_date, country_code,
    daily_active_users, new_registrations, profile_completions,
    email_verifications, phone_verifications, horoscope_listens,
    horoscope_listen_duration_seconds, avg_listen_through_rate,
    notifications_sent, notifications_delivered, notifications_opened, 
    notifications_clicked, notification_opt_outs, notification_ctr, notification_opt_out_rate
  )
  WITH user_activity AS (
    -- DAU from various activity events
    SELECT 
      country_code,
      COUNT(DISTINCT user_id) as dau
    FROM events_raw e
    WHERE e.event_timestamp::date = target_date
      AND e.user_id IS NOT NULL
      AND e.country_code IS NOT NULL
      AND e.event_domain IN ('orders', 'notifications', 'content')
    GROUP BY country_code
  ),
  registration_activity AS (
    SELECT 
      e.country_code,
      COUNT(CASE WHEN e.event_type = 'user_registered' THEN 1 END) as registrations,
      COUNT(CASE WHEN e.event_type = 'profile_completed' THEN 1 END) as completions,
      COUNT(CASE WHEN e.event_type = 'email_verified' THEN 1 END) as email_verifs,
      COUNT(CASE WHEN e.event_type = 'phone_verified' THEN 1 END) as phone_verifs
    FROM events_raw e
    WHERE e.event_timestamp::date = target_date
      AND e.event_domain = 'orders' -- User lifecycle events
      AND e.country_code IS NOT NULL
    GROUP BY e.country_code
  ),
  content_engagement AS (
    SELECT 
      e.country_code,
      COUNT(CASE WHEN e.event_type = 'horoscope_listened' THEN 1 END) as listens,
      SUM(CASE WHEN e.event_type = 'horoscope_listened' AND e.duration_seconds IS NOT NULL 
               THEN e.duration_seconds ELSE 0 END) as listen_duration,
      -- Listen through rate would need full duration context from metadata
      AVG(CASE WHEN e.event_type = 'horoscope_listened' AND (e.metadata->>'listen_through_pct')::decimal IS NOT NULL
               THEN (e.metadata->>'listen_through_pct')::decimal ELSE NULL END) as avg_listen_through
    FROM events_raw e
    WHERE e.event_timestamp::date = target_date
      AND e.event_domain = 'content'
      AND e.country_code IS NOT NULL
    GROUP BY e.country_code
  ),
  notification_engagement AS (
    SELECT 
      e.country_code,
      COUNT(CASE WHEN e.event_type = 'notification_sent' THEN 1 END) as sent,
      COUNT(CASE WHEN e.event_type = 'notification_delivered' THEN 1 END) as delivered,
      COUNT(CASE WHEN e.event_type = 'notification_opened' THEN 1 END) as opened,
      COUNT(CASE WHEN e.event_type = 'notification_clicked' THEN 1 END) as clicked,
      COUNT(CASE WHEN e.event_type = 'notification_opt_out' THEN 1 END) as opt_outs
    FROM events_raw e
    WHERE e.event_timestamp::date = target_date
      AND e.event_domain = 'notifications'
      AND e.country_code IS NOT NULL
    GROUP BY e.country_code
  )
  SELECT 
    target_date,
    COALESCE(ua.country_code, ra.country_code, ce.country_code, ne.country_code),
    COALESCE(ua.dau, 0),
    COALESCE(ra.registrations, 0),
    COALESCE(ra.completions, 0),
    COALESCE(ra.email_verifs, 0),
    COALESCE(ra.phone_verifs, 0),
    COALESCE(ce.listens, 0),
    COALESCE(ce.listen_duration, 0),
    ce.avg_listen_through,
    COALESCE(ne.sent, 0),
    COALESCE(ne.delivered, 0),
    COALESCE(ne.opened, 0),
    COALESCE(ne.clicked, 0),
    COALESCE(ne.opt_outs, 0),
    CASE WHEN ne.delivered > 0 THEN ne.clicked::decimal / ne.delivered ELSE NULL END,
    CASE WHEN ne.sent > 0 THEN ne.opt_outs::decimal / ne.sent ELSE NULL END
  FROM user_activity ua
  FULL OUTER JOIN registration_activity ra ON ua.country_code = ra.country_code
  FULL OUTER JOIN content_engagement ce ON COALESCE(ua.country_code, ra.country_code) = ce.country_code
  FULL OUTER JOIN notification_engagement ne ON COALESCE(ua.country_code, ra.country_code, ce.country_code) = ne.country_code;

  GET DIAGNOSTICS records_processed = ROW_COUNT;
  
  UPDATE etl_job_runs 
  SET status = 'completed', completed_at = now(), records_processed = records_processed
  WHERE job_name = 'daily_engagement' AND target_date = target_date AND started_at = job_start_time;
  
EXCEPTION WHEN OTHERS THEN
  UPDATE etl_job_runs 
  SET status = 'failed', completed_at = now(), error_message = SQLERRM
  WHERE job_name = 'daily_engagement' AND target_date = target_date AND started_at = job_start_time;
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ETL JOB: DAILY CONTENT METRICS  
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_daily_content_metrics(target_date date) 
RETURNS void AS $$
DECLARE
  job_start_time timestamptz := now();
  records_processed int := 0;
  request_id text := gen_random_uuid()::text;
BEGIN
  INSERT INTO etl_job_runs (job_name, target_date, started_at, request_id, status)
  VALUES ('daily_content', target_date, job_start_time, request_id, 'running');
  
  DELETE FROM metrics_daily_content WHERE metric_date = target_date;
  
  INSERT INTO metrics_daily_content (
    metric_date, horoscopes_uploaded, horoscopes_pending, horoscopes_approved, 
    horoscopes_rejected, horoscopes_published, coverage_uploaded, coverage_approved,
    coverage_published, approval_latency_avg, approval_latency_p95, approval_rate, coverage_rate
  )
  WITH content_events AS (
    SELECT 
      e.entity_id as horoscope_id,
      e.event_type,
      e.status,
      e.event_timestamp,
      e.metadata->>'zodiac' as zodiac_sign
    FROM events_raw e
    WHERE e.event_domain = 'content'
      AND e.event_timestamp::date = target_date
  ),
  content_counts AS (
    SELECT 
      COUNT(CASE WHEN event_type = 'horoscope_uploaded' THEN 1 END) as uploaded,
      COUNT(CASE WHEN event_type = 'horoscope_pending' THEN 1 END) as pending,
      COUNT(CASE WHEN event_type = 'horoscope_approved' THEN 1 END) as approved,
      COUNT(CASE WHEN event_type = 'horoscope_rejected' THEN 1 END) as rejected,
      COUNT(CASE WHEN event_type = 'horoscope_published' THEN 1 END) as published,
      -- Coverage: count distinct zodiac signs
      COUNT(DISTINCT CASE WHEN event_type = 'horoscope_uploaded' THEN zodiac_sign END) as coverage_uploaded,
      COUNT(DISTINCT CASE WHEN event_type = 'horoscope_approved' THEN zodiac_sign END) as coverage_approved,
      COUNT(DISTINCT CASE WHEN event_type = 'horoscope_published' THEN zodiac_sign END) as coverage_published
    FROM content_events
  ),
  approval_timing AS (
    SELECT 
      -- Calculate approval latency (upload to approval/rejection)
      AVG(EXTRACT(epoch FROM ce2.event_timestamp - ce1.event_timestamp) / 60)::int as approval_latency_avg,
      PERCENTILE_CONT(0.95) WITHIN GROUP (
        ORDER BY EXTRACT(epoch FROM ce2.event_timestamp - ce1.event_timestamp) / 60
      )::int as approval_latency_p95
    FROM content_events ce1 -- uploaded
    JOIN content_events ce2 ON ce1.horoscope_id = ce2.horoscope_id 
                           AND ce2.event_type IN ('horoscope_approved', 'horoscope_rejected')
    WHERE ce1.event_type = 'horoscope_uploaded'
  )
  SELECT 
    target_date,
    cc.uploaded,
    cc.pending,
    cc.approved, 
    cc.rejected,
    cc.published,
    cc.coverage_uploaded,
    cc.coverage_approved,
    cc.coverage_published,
    at.approval_latency_avg,
    at.approval_latency_p95,
    CASE WHEN (cc.approved + cc.rejected) > 0 THEN cc.approved::decimal / (cc.approved + cc.rejected) ELSE NULL END,
    cc.coverage_published::decimal / 12 -- Out of 12 zodiac signs
  FROM content_counts cc
  CROSS JOIN approval_timing at;

  GET DIAGNOSTICS records_processed = ROW_COUNT;
  
  UPDATE etl_job_runs 
  SET status = 'completed', completed_at = now(), records_processed = records_processed
  WHERE job_name = 'daily_content' AND target_date = target_date AND started_at = job_start_time;
  
EXCEPTION WHEN OTHERS THEN
  UPDATE etl_job_runs 
  SET status = 'failed', completed_at = now(), error_message = SQLERRM
  WHERE job_name = 'daily_content' AND target_date = target_date AND started_at = job_start_time;
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ETL JOB: COHORT RETENTION ANALYSIS
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_cohort_retention_metrics(target_date date) 
RETURNS void AS $$
DECLARE
  job_start_time timestamptz := now();
  records_processed int := 0;
  request_id text := gen_random_uuid()::text;
  cohort_date date;
BEGIN
  INSERT INTO etl_job_runs (job_name, target_date, started_at, request_id, status)
  VALUES ('cohort_retention', target_date, job_start_time, request_id, 'running');
  
  -- Calculate retention for cohorts from the last 90 days
  FOR cohort_date IN 
    SELECT generate_series(target_date - interval '90 days', target_date, interval '1 day')::date
  LOOP
    -- Delete existing retention data for this cohort/retention date pair
    DELETE FROM metrics_cohort_retention 
    WHERE cohort_date = cohort_date AND retention_date = target_date;
    
    -- Calculate retention for this cohort
    INSERT INTO metrics_cohort_retention (
      cohort_date, retention_date, country_code, cohort_size, retained_users, retention_rate
    )
    WITH cohort_users AS (
      -- Users who registered on the cohort date
      SELECT DISTINCT user_id, country_code
      FROM events_raw e
      WHERE e.event_type = 'user_registered'
        AND e.event_timestamp::date = cohort_date
        AND e.user_id IS NOT NULL
        AND e.country_code IS NOT NULL
    ),
    retained_users AS (
      -- Users from the cohort who were active on the retention date
      SELECT DISTINCT cu.country_code, cu.user_id
      FROM cohort_users cu
      JOIN events_raw e ON e.user_id = cu.user_id
      WHERE e.event_timestamp::date = target_date
        AND e.event_domain IN ('orders', 'notifications', 'content') -- Activity indicators
    )
    SELECT 
      cohort_date,
      target_date,
      cu.country_code,
      COUNT(cu.user_id) as cohort_size,
      COUNT(ru.user_id) as retained_users,
      CASE 
        WHEN COUNT(cu.user_id) > 0 
        THEN COUNT(ru.user_id)::decimal / COUNT(cu.user_id)
        ELSE 0 
      END as retention_rate
    FROM cohort_users cu
    LEFT JOIN retained_users ru ON cu.user_id = ru.user_id
    GROUP BY cu.country_code;
    
  END LOOP;

  GET DIAGNOSTICS records_processed = ROW_COUNT;
  
  UPDATE etl_job_runs 
  SET status = 'completed', completed_at = now(), records_processed = records_processed
  WHERE job_name = 'cohort_retention' AND target_date = target_date AND started_at = job_start_time;
  
EXCEPTION WHEN OTHERS THEN
  UPDATE etl_job_runs 
  SET status = 'failed', completed_at = now(), error_message = SQLERRM
  WHERE job_name = 'cohort_retention' AND target_date = target_date AND started_at = job_start_time;
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MASTER ETL JOB RUNNER
-- =============================================================================

CREATE OR REPLACE FUNCTION run_daily_etl(target_date date DEFAULT CURRENT_DATE - 1) 
RETURNS jsonb AS $$
DECLARE
  start_time timestamptz := now();
  job_results jsonb := '{}'::jsonb;
  job_name text;
  job_success boolean;
BEGIN
  -- Ensure target date partition exists
  PERFORM create_events_partition(target_date);
  
  -- Run all daily ETL jobs
  FOR job_name IN VALUES ('daily_fulfillment'), ('daily_payments'), ('daily_calls'), 
                          ('daily_engagement'), ('daily_content'), ('cohort_retention')
  LOOP
    BEGIN
      CASE job_name
        WHEN 'daily_fulfillment' THEN 
          PERFORM compute_daily_fulfillment_metrics(target_date);
        WHEN 'daily_payments' THEN 
          PERFORM compute_daily_payments_metrics(target_date);
        WHEN 'daily_calls' THEN 
          PERFORM compute_daily_calls_metrics(target_date);
        WHEN 'daily_engagement' THEN 
          PERFORM compute_daily_engagement_metrics(target_date);
        WHEN 'daily_content' THEN 
          PERFORM compute_daily_content_metrics(target_date);
        WHEN 'cohort_retention' THEN 
          PERFORM compute_cohort_retention_metrics(target_date);
      END CASE;
      
      job_results := job_results || jsonb_build_object(job_name, 'completed');
      
    EXCEPTION WHEN OTHERS THEN
      job_results := job_results || jsonb_build_object(job_name, 'failed: ' || SQLERRM);
    END;
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'target_date', target_date,
    'started_at', start_time,
    'completed_at', now(),
    'duration_seconds', EXTRACT(epoch FROM now() - start_time)::int,
    'job_results', job_results
  );
END;
$$ LANGUAGE plpgsql;

-- Create convenience views for common KPI queries
CREATE OR REPLACE VIEW v_latest_daily_metrics AS
SELECT 
  'fulfillment' as metric_type,
  metric_date,
  service_code as dimension_1,
  country_code as dimension_2,
  json_build_object(
    'orders_created', orders_created,
    'orders_delivered', orders_delivered,
    'ttf_delivery_avg', ttf_delivery_avg,
    'approval_rate', approval_rate
  ) as metrics
FROM metrics_daily_fulfillment
WHERE metric_date >= CURRENT_DATE - 7

UNION ALL

SELECT 
  'payments' as metric_type,
  metric_date,
  provider as dimension_1,
  country_code as dimension_2,
  json_build_object(
    'payment_attempts', payment_attempts,
    'success_rate', success_rate,
    'fallback_rate', fallback_rate
  ) as metrics
FROM metrics_daily_payments
WHERE metric_date >= CURRENT_DATE - 7

UNION ALL

SELECT 
  'engagement' as metric_type,
  metric_date,
  'all' as dimension_1,
  country_code as dimension_2,
  json_build_object(
    'dau', daily_active_users,
    'notification_ctr', notification_ctr,
    'notification_opt_out_rate', notification_opt_out_rate
  ) as metrics
FROM metrics_daily_engagement
WHERE metric_date >= CURRENT_DATE - 7;

-- Comments for ETL functions
COMMENT ON FUNCTION compute_daily_fulfillment_metrics(date) IS 'M23: Compute daily fulfillment KPIs (TTF, approval rates)';
COMMENT ON FUNCTION compute_daily_payments_metrics(date) IS 'M23: Compute daily payment KPIs (success rates, fallbacks)';
COMMENT ON FUNCTION compute_daily_calls_metrics(date) IS 'M23: Compute daily call QoS metrics';
COMMENT ON FUNCTION compute_daily_engagement_metrics(date) IS 'M23: Compute daily user engagement metrics';
COMMENT ON FUNCTION compute_daily_content_metrics(date) IS 'M23: Compute daily content approval metrics';
COMMENT ON FUNCTION compute_cohort_retention_metrics(date) IS 'M23: Compute user cohort retention analysis';
COMMENT ON FUNCTION run_daily_etl(date) IS 'M23: Master ETL job runner for all daily metrics';
COMMENT ON VIEW v_latest_daily_metrics IS 'M23: Convenience view for recent KPI data';