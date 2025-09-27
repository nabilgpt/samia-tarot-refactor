# M23: Analytics & KPIs

Complete privacy-preserving analytics system for SAMIA-TAROT platform with real-time event ingestion, nightly ETL aggregation, and multi-role access control.

## Overview

M23 provides business intelligence and operational metrics across all platform domains:
- **Fulfillment KPIs**: Time-to-fulfillment, approval rates, workflow efficiency
- **Payment Analytics**: Success rates, fallback performance, revenue metrics
- **Call Quality**: Answer rates, drop rates, duration analytics
- **User Engagement**: DAU/WAU/MAU, retention cohorts, notification performance
- **Content Operations**: Daily horoscope coverage, approval workflows

## Architecture

### Event-Driven Analytics
- **High-volume ingestion** → `events_raw` (partitioned, short retention)
- **Nightly ETL aggregation** → `metrics_daily_*` (long retention, optimized queries)
- **Privacy-first design**: No PII storage, sanitized country codes only

### Data Flow
```
Application Events → events_raw → ETL Jobs → metrics_daily_* → API Endpoints → Dashboard
```

## Event Schema

### Raw Events (`events_raw`)
```sql
event_domain: orders | payments | calls | notifications | moderation | content
event_type: order_created, payment_succeeded, call_ended, etc.
user_id: UUID (no PII linking)
entity_type/entity_id: Resource identifiers
status: Current state
provider: stripe, square, twilio, etc.
country_code: 2-letter ISO only (privacy-sanitized)
amount_cents: Financial amounts
duration_seconds: Time measurements
metadata: Additional context (no PII)
```

### Event Domains
- **orders**: order_created, order_assigned, order_completed, order_cancelled
- **payments**: payment_attempted, payment_succeeded, payment_failed, refund_issued
- **calls**: call_started, call_answered, call_ended, call_dropped
- **notifications**: notification_sent, notification_delivered, notification_opened
- **moderation**: content_flagged, moderation_decision, appeal_submitted
- **content**: horoscope_uploaded, horoscope_approved, horoscope_published

## KPI Definitions

### Fulfillment Metrics (`metrics_daily_fulfillment`)
- **TTF Response**: Time from order creation to reader assignment
- **TTF Delivery**: Time from order creation to completion
- **TTF Approval**: Time from submission to approval/rejection
- **Approval Rate**: approved / (approved + rejected)
- **Rejection Loop Rate**: Orders rejected multiple times

### Payment Metrics (`metrics_daily_payments`)
- **Success Rate**: successful payments / attempted payments
- **Fallback Rate**: fallback attempts / total attempts
- **Refund Rate**: refunds issued / successful payments
- **Average Transaction**: Mean payment amount per country/provider

### Call Quality (`metrics_daily_calls`)
- **Answer Rate**: calls answered / calls attempted
- **Completion Rate**: calls completed / calls answered
- **Drop Rate**: calls dropped / calls answered
- **Recording Usage**: calls recorded / calls answered

### Engagement Metrics (`metrics_daily_engagement`)
- **Daily Active Users**: Unique users with activity
- **Notification CTR**: notifications clicked / notifications delivered
- **Listen-Through Rate**: Average percentage of horoscope audio consumed
- **Opt-Out Rate**: notification opt-outs / notifications sent

### Content Metrics (`metrics_daily_content`)
- **Coverage Rate**: published horoscopes / 12 zodiac signs
- **Approval Rate**: approved content / (approved + rejected)
- **Approval Latency**: Time from upload to approval (avg/p95)

## ETL Jobs

### Nightly Aggregation Schedule
```sql
-- Run daily at 02:00 UTC via cron/n8n
SELECT run_daily_etl_pipeline(CURRENT_DATE - 1);
```

### ETL Functions
- `compute_daily_fulfillment_metrics(date)` - Order workflow KPIs
- `compute_daily_payments_metrics(date)` - Payment success/fallback rates
- `compute_daily_calls_metrics(date)` - Call quality metrics
- `compute_daily_engagement_metrics(date)` - User activity metrics
- `compute_daily_content_metrics(date)` - Content approval metrics
- `compute_cohort_retention_metrics(date)` - User retention analysis

### Idempotency
All ETL jobs use DELETE-then-INSERT pattern for safe re-runs:
```sql
DELETE FROM metrics_daily_fulfillment WHERE metric_date = target_date;
INSERT INTO metrics_daily_fulfillment (...) SELECT ... FROM events_raw ...;
```

## Access Control (RLS)

### Role-Based Access Matrix
| Table | Admin/Superadmin | Monitor | Reader | Client |
|-------|------------------|---------|--------|--------|
| `events_raw` | Full | None | None | None |
| `metrics_daily_fulfillment` | Full | None | Limited (30d) | None |
| `metrics_daily_payments` | Full | None | None | None |
| `metrics_daily_calls` | Full | Full | None | None |
| `metrics_daily_engagement` | Full | None | None | None |
| `metrics_daily_content` | Full | Full | None | None |
| `metrics_cohort_retention` | Full | None | None | None |
| `etl_job_runs` | Full | None | None | None |

### Privacy Controls
- **Raw events**: Admin+ only (privacy-sensitive)
- **Financial data**: Admin/Superadmin only
- **Operational data**: Include Monitor for oversight
- **Reader access**: Self-performance metrics only (30-day window)

## API Endpoints

### Overview Metrics
```http
GET /api/metrics/overview?date=2024-01-15
Authorization: Bearer <jwt_token>
```

### Domain-Specific Metrics
```http
GET /api/metrics/fulfillment?start_date=2024-01-01&end_date=2024-01-31&service_code=tarot
GET /api/metrics/payments?start_date=2024-01-01&end_date=2024-01-31&country_code=SA
GET /api/metrics/calls?start_date=2024-01-01&end_date=2024-01-31&service_code=healing
GET /api/metrics/engagement?start_date=2024-01-01&end_date=2024-01-31
GET /api/metrics/content?start_date=2024-01-01&end_date=2024-01-31
```

### Cohort Analysis
```http
GET /api/metrics/cohort-retention?cohort_start=2024-01-01&cohort_end=2024-01-31&retention_days=7,30,90
```

## Database Schema

### Tables Created
- `events_raw` (partitioned by month)
- `metrics_daily_fulfillment`
- `metrics_daily_payments`
- `metrics_daily_calls`
- `metrics_daily_engagement`
- `metrics_daily_content`
- `metrics_cohort_retention`
- `etl_job_runs`
- `event_schema_versions`

### Partitioning Strategy
```sql
-- Monthly partitions for performance
events_raw_2024_01 FOR VALUES FROM ('2024-01-01') TO ('2024-02-01')
events_raw_2024_02 FOR VALUES FROM ('2024-02-01') TO ('2024-03-01')
-- New partitions created automatically by create_events_partition()
```

## Privacy & Compliance

### No PII Storage
- User IDs are UUIDs with no direct PII linking
- Country codes sanitized to 2-letter ISO codes only
- No storage of names, emails, phone numbers, addresses
- Metadata fields sanitized before ingestion

### Data Retention
- **events_raw**: 90 days (high volume, short retention)
- **metrics_daily_***: 2 years (aggregated, longer retention)
- **etl_job_runs**: 1 year (operational tracking)

### GDPR Compliance
- Right to erasure: Remove user_id from events (no PII exposure)
- Data minimization: Only business-necessary metrics stored
- Purpose limitation: Analytics use only, no profiling

## Operations Runbook

### Daily Monitoring
```sql
-- Check ETL job status
SELECT * FROM etl_job_runs 
WHERE target_date = CURRENT_DATE - 1 
ORDER BY started_at DESC;

-- Verify metrics coverage
SELECT table_name, COUNT(*) as daily_records
FROM (
  SELECT 'fulfillment' as table_name, COUNT(*) FROM metrics_daily_fulfillment WHERE metric_date = CURRENT_DATE - 1
  UNION ALL
  SELECT 'payments', COUNT(*) FROM metrics_daily_payments WHERE metric_date = CURRENT_DATE - 1
  UNION ALL
  SELECT 'calls', COUNT(*) FROM metrics_daily_calls WHERE metric_date = CURRENT_DATE - 1
  UNION ALL
  SELECT 'engagement', COUNT(*) FROM metrics_daily_engagement WHERE metric_date = CURRENT_DATE - 1
  UNION ALL
  SELECT 'content', COUNT(*) FROM metrics_daily_content WHERE metric_date = CURRENT_DATE - 1
) t
GROUP BY table_name;
```

### Event Volume Monitoring
```sql
-- Check recent event ingestion
SELECT event_domain, COUNT(*) as events_today
FROM events_raw 
WHERE event_timestamp >= CURRENT_DATE 
GROUP BY event_domain 
ORDER BY events_today DESC;

-- Partition health check
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE 'events_raw_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### ETL Troubleshooting
```sql
-- Re-run failed ETL job
SELECT compute_daily_fulfillment_metrics('2024-01-15'::date);

-- Check for missing metrics
SELECT metric_date, 
       CASE WHEN fulfillment_exists THEN '✓' ELSE '✗' END as fulfillment,
       CASE WHEN payments_exists THEN '✓' ELSE '✗' END as payments,
       CASE WHEN calls_exists THEN '✓' ELSE '✗' END as calls
FROM (
  SELECT d.metric_date,
         EXISTS(SELECT 1 FROM metrics_daily_fulfillment WHERE metric_date = d.metric_date) as fulfillment_exists,
         EXISTS(SELECT 1 FROM metrics_daily_payments WHERE metric_date = d.metric_date) as payments_exists,
         EXISTS(SELECT 1 FROM metrics_daily_calls WHERE metric_date = d.metric_date) as calls_exists
  FROM generate_series(CURRENT_DATE - 7, CURRENT_DATE - 1, '1 day'::interval) d(metric_date)
) t;
```

### Performance Optimization
```sql
-- Create new partition for upcoming month
SELECT create_events_partition(CURRENT_DATE + INTERVAL '1 month');

-- Cleanup old partitions (after backup)
DROP TABLE IF EXISTS events_raw_2023_01; -- Only after 90-day retention

-- Analyze tables for query optimization
ANALYZE events_raw;
ANALYZE metrics_daily_fulfillment;
ANALYZE metrics_daily_payments;
```

## Integration Points

### Application Code
```python
# Emit analytics events from application
await emit_analytics_event(
    event_domain='orders',
    event_type='order_created',
    user_id=order.user_id,
    entity_type='order',
    entity_id=str(order.id),
    status='new',
    service_code=order.service_code,
    country_code=get_user_country_code(order.user_id),
    request_id=request.headers.get('x-request-id'),
    metadata={'is_gold': order.user.is_gold_member}
)
```

### Cron/n8n Automation
```bash
# Daily ETL job (runs at 02:00 UTC)
0 2 * * * psql -c "SELECT run_daily_etl_pipeline(CURRENT_DATE - 1);"

# Weekly partition maintenance (runs Sunday 03:00 UTC)
0 3 * * 0 psql -c "SELECT create_events_partition(CURRENT_DATE + INTERVAL '2 months');"
```

### Dashboard Integration
- Connect BI tools to `metrics_daily_*` tables
- Use API endpoints for real-time dashboard updates
- Respect RLS policies for role-based dashboard views

## Testing

Run comprehensive test suite:
```bash
python test_m23_analytics.py
```

Test coverage includes:
- Event ingestion and schema validation
- ETL job idempotency and correctness
- KPI calculation accuracy
- RLS policy enforcement
- Privacy preservation
- Partition management

## Files

- `019_m23_analytics_events.sql` - Events schema and metrics tables
- `020_m23_analytics_etl.sql` - ETL jobs and KPI functions
- `021_m23_analytics_rls.sql` - Row-level security policies
- `api.py:8276-8810` - Analytics API endpoints
- `test_m23_analytics.py` - Comprehensive test suite