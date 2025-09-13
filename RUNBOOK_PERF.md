# M41: Performance & Resilience Runbook

## SLO Targets & Alert Thresholds

### Performance SLOs
- **Daily Horoscopes**: p95 ≤ 300ms, error rate < 1%
- **Orders Creation**: p95 ≤ 500ms, error rate < 1%  
- **Payment Intents**: p95 ≤ 500ms, error rate < 1%
- **Rate Limit Breaches**: Monitor 429 responses with Retry-After headers

### Monitoring Endpoints
```bash
# Get current performance metrics
curl -H "X-User-Id: <admin-uuid>" "http://localhost:8000/api/ops/metrics"

# Key metrics to monitor:
# - latency_ms_p95_GET_/api/horoscopes/daily
# - latency_ms_p95_POST_/api/orders  
# - latency_ms_p95_POST_/api/payments/intent
# - error_rate_<route>
# - rate_limit_breaches_total
# - circuit_breakers status
```

## Circuit Breaker Status

### Circuit States
- **CLOSED**: Normal operation
- **OPEN**: Failing fast (returns 503)
- **HALF_OPEN**: Testing recovery

### Circuit Breaker Actions
```bash
# Check circuit status
curl -H "X-User-Id: <admin-uuid>" "http://localhost:8000/api/ops/metrics" | jq .metrics.circuit_breakers

# When payment provider circuit is OPEN:
# 1. Check provider status pages
# 2. Verify API credentials/keys
# 3. Wait for auto-recovery (60s timeout)
# 4. Monitor half-open state for successful recovery
```

## Troubleshooting High Latency

### Daily Horoscopes (p95 > 300ms)
1. **Check database**: Query `horoscopes` table performance
2. **Verify RLS policies**: Ensure efficient today-only filtering
3. **Check storage**: Signed URL generation performance

### Orders/Payments (p95 > 500ms)  
1. **Database connections**: Check Session Pooler status
2. **External providers**: Verify payment/notification provider response times
3. **Circuit breakers**: Check if providers are degraded

### Rate Limit Breaches (429s increasing)
```bash
# Check audit logs for abuse patterns
curl -X POST "http://localhost:8000/api/ops/export" \
  -H "X-User-Id: <admin-uuid>" \
  -d '{"entities": ["audit"], "range": {"from": "2025-09-13T00:00:00Z"}}'

# Look for repeated rate_limit_hit events from same actors
# Consider temporary IP blocking if abuse confirmed
```

## Performance Testing

### Run Load Tests
```bash
# Install k6 if needed
# Run performance test
k6 run perf/load_test.js

# Expected results:
# - http_req_duration{endpoint:daily_horoscopes} p95 < 300ms
# - http_req_duration{endpoint:orders} p95 < 500ms  
# - http_req_duration{endpoint:payments} p95 < 500ms
# - http_req_failed rate < 1%
```

### Load Test Results Analysis
- **P50/P95/P99 latencies**: Compare against SLO targets
- **Error rates**: Investigate any > 1% error rate
- **Circuit breaker triggers**: Verify protection mechanisms
- **Rate limit effectiveness**: Confirm 429 responses include Retry-After

## Emergency Response

### High Error Rate (> 1%)
1. **Check circuit breakers**: Are external providers failing?
2. **Database connectivity**: Verify Session Pooler health
3. **Recent deployments**: Rollback if needed
4. **Enable M40 siren**: For critical escalation

### Complete API Outage
1. **Health check**: `curl http://localhost:8000/api/ops/health`
2. **Database**: Check Supabase Session Pooler status
3. **Application logs**: Review for startup errors
4. **Rollback procedure**: Revert to last known good deployment

### Circuit Breaker Stuck OPEN
1. **Provider status**: Check external service health
2. **Credentials**: Verify API keys/tokens not expired
3. **Manual recovery**: Restart application to reset circuits
4. **Configuration**: Adjust failure thresholds if needed

## Rollback Procedures

### Database Migration Rollback
```bash
# Check current migration status
python migrate.py audit

# Manual rollback (if needed)
# 1. Backup current state
# 2. Revert problematic migrations via SQL
# 3. Update migration tracking table
```

### Application Rollback
```bash
# Revert to previous git commit
git log --oneline -10
git checkout <previous-commit>

# Restart application
uvicorn api:app --reload --port 8000
```

### Configuration Rollback
```bash
# Reset rate limits to defaults
curl -X POST "http://localhost:8000/api/ops/rate_limits" \
  -H "X-User-Id: <admin-uuid>" \
  -d '{
    "rate_orders_per_hour": 15,
    "rate_phone_verify_per_hour": 3,
    "rate_assist_draft_per_hour": 8
  }'
```

## Alert Configuration

### Prometheus/Grafana Setup (External)
```yaml
# Example alert rules (adapt to your monitoring system)
groups:
  - name: samia-tarot-performance
    rules:
      - alert: HighLatency
        expr: latency_ms_p95_GET_api_horoscopes_daily > 300
        for: 5m
        annotations:
          summary: "Daily horoscopes p95 latency > 300ms"
          
      - alert: HighErrorRate  
        expr: error_rate_POST_api_orders > 0.01
        for: 2m
        annotations:
          summary: "Orders error rate > 1%"
          
      - alert: CircuitBreakerOpen
        expr: circuit_breakers_payment_provider_state == "open"
        annotations:
          summary: "Payment provider circuit breaker is OPEN"
```

### Manual Monitoring
```bash
# Check every 5 minutes during high-traffic periods
watch -n 300 'curl -s -H "X-User-Id: <admin-uuid>" "http://localhost:8000/api/ops/metrics" | jq ".metrics | {p95_horoscopes, p95_orders, error_rates, breaches: .rate_limit_breaches_total}"'
```

---

**Last Updated**: 2025-09-13  
**Version**: M41 Performance & Resilience  
**Contact**: ops-team@samia-tarot.com