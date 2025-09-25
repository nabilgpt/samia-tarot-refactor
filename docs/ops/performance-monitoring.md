# Performance Monitoring & Alerting (M36)

## Core Web Vitals Monitoring

### Performance Budgets

| Metric | Target | Warning | Critical | Action |
|--------|--------|---------|----------|--------|
| **LCP** | <2.5s | >2.5s | >4.0s | Block deployment |
| **FID** | <100ms | >100ms | >300ms | Investigation required |
| **CLS** | <0.1 | >0.1 | >0.25 | UX review needed |
| **TTFB** | <800ms | >800ms | >1.8s | Server optimization |

### Lighthouse CI Configuration

**Budget Configuration (lighthouse-budget.json):**
```json
{
  "budget": [
    {
      "path": "/*",
      "timings": [
        {"metric": "first-contentful-paint", "budget": 2000},
        {"metric": "largest-contentful-paint", "budget": 2500},
        {"metric": "cumulative-layout-shift", "budget": 100},
        {"metric": "total-blocking-time", "budget": 300}
      ],
      "resourceSizes": [
        {"resourceType": "total", "budget": 500000},
        {"resourceType": "script", "budget": 150000},
        {"resourceType": "stylesheet", "budget": 50000},
        {"resourceType": "image", "budget": 250000}
      ]
    }
  ]
}
```

**Lighthouse CI Configuration (.lighthouserc.js):**
```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'https://samiatarot.com/',
        'https://samiatarot.com/order',
        'https://samiatarot.com/readers',
        'https://samiatarot.com/profile'
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless'
      }
    },
    assert: {
      budgetFile: './lighthouse-budget.json',
      assertions: {
        'categories:performance': ['warn', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:seo': ['warn', {minScore: 0.8}],
        'categories:best-practices': ['warn', {minScore: 0.9}]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

## Real User Monitoring (RUM)

### Web Vitals Collection

**Client-Side Monitoring:**
```javascript
// Web Vitals monitoring (M36)
import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'web-vitals';

function sendToAnalytics(metric) {
  // Only send if analytics consent given
  if (!window.enableWebVitals) return;

  fetch('/api/metrics/web-vitals', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
      navigationType: metric.navigationType,
      url: window.location.href,
      timestamp: Date.now()
    })
  });
}

// Collect all Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

**Server-Side Processing:**
```python
@app.post("/api/metrics/web-vitals")
def record_web_vitals(request: WebVitalsRequest):
    try:
        # Store metric
        db_exec("""
            INSERT INTO web_vitals_metrics (
                metric_name, value, page_url, user_agent,
                navigation_type, timestamp
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            request.name,
            request.value,
            request.url,
            request.user_agent,
            request.navigation_type,
            datetime.fromtimestamp(request.timestamp / 1000)
        ))

        # Check against thresholds
        if request.name == 'LCP' and request.value > 4000:
            # Trigger performance alert
            siren_service.trigger_incident(
                incident_type='performance_degradation',
                severity=2,
                source='web_vitals',
                policy_name='Critical',
                context={
                    'metric': request.name,
                    'value': request.value,
                    'threshold': 2500,
                    'url': request.url
                },
                variables={'user_impact': 'high'},
                created_by='performance_monitor'
            )

        return {"status": "recorded"}

    except Exception as e:
        logger.error(f"Error recording web vitals: {e}")
        return {"status": "error"}
```

## Performance Dashboard

### Key Performance Indicators

**Daily Performance Report:**
```sql
-- Performance KPIs for last 24 hours
SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    metric_name,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
    COUNT(*) as sample_count,
    CASE
        WHEN metric_name = 'LCP' AND PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) <= 2500 THEN '✅'
        WHEN metric_name = 'FID' AND PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) <= 100 THEN '✅'
        WHEN metric_name = 'CLS' AND PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) <= 0.1 THEN '✅'
        ELSE '❌'
    END as status
FROM web_vitals_metrics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), metric_name
ORDER BY hour DESC, metric_name;
```

### Page-Level Analysis

**Slowest Pages Report:**
```sql
-- Identify performance problem pages
SELECT
    page_url,
    metric_name,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
    COUNT(*) as measurements,
    CASE
        WHEN metric_name = 'LCP' THEN
            CASE WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) > 4000 THEN 'CRITICAL'
                 WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) > 2500 THEN 'WARNING'
                 ELSE 'GOOD' END
        WHEN metric_name = 'FID' THEN
            CASE WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) > 300 THEN 'CRITICAL'
                 WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) > 100 THEN 'WARNING'
                 ELSE 'GOOD' END
        WHEN metric_name = 'CLS' THEN
            CASE WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) > 0.25 THEN 'CRITICAL'
                 WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) > 0.1 THEN 'WARNING'
                 ELSE 'GOOD' END
    END as performance_grade
FROM web_vitals_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY page_url, metric_name
HAVING COUNT(*) >= 10  -- Minimum sample size
ORDER BY
    CASE performance_grade
        WHEN 'CRITICAL' THEN 1
        WHEN 'WARNING' THEN 2
        WHEN 'GOOD' THEN 3
    END,
    p95_value DESC;
```

## Server Performance Monitoring

### Database Performance

**Query Performance Tracking:**
```sql
-- Slow query monitoring
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    rows,
    CASE
        WHEN mean_time > 1000 THEN '❌ CRITICAL'
        WHEN mean_time > 500 THEN '⚠️ WARNING'
        ELSE '✅ GOOD'
    END as performance_status
FROM pg_stat_statements
WHERE calls > 100  -- Only queries called frequently
ORDER BY total_time DESC
LIMIT 20;
```

**Connection Pool Health:**
```sql
-- Monitor database connections
SELECT
    state,
    COUNT(*) as connection_count,
    CASE
        WHEN COUNT(*) > 80 THEN '❌ HIGH'
        WHEN COUNT(*) > 50 THEN '⚠️ MEDIUM'
        ELSE '✅ NORMAL'
    END as load_status
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;
```

### API Performance

**Response Time Monitoring:**
```python
# Middleware for API performance tracking
@app.middleware("http")
async def performance_middleware(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    # Log slow requests
    if process_time > 1.0:  # >1 second
        logger.warning(f"Slow request: {request.url.path} took {process_time:.2f}s")

        # Record in metrics
        db_exec("""
            INSERT INTO api_performance_metrics (
                endpoint, method, response_time, status_code, timestamp
            ) VALUES (%s, %s, %s, %s, %s)
        """, (
            request.url.path,
            request.method,
            process_time * 1000,  # Convert to milliseconds
            response.status_code,
            datetime.utcnow()
        ))

        # Trigger alert for very slow requests
        if process_time > 5.0:
            siren_service.trigger_incident(
                incident_type='api_performance_degradation',
                severity=2,
                source='api_monitor',
                policy_name='Critical',
                context={
                    'endpoint': request.url.path,
                    'response_time': process_time,
                    'threshold': 1.0
                },
                variables={'method': request.method},
                created_by='performance_monitor'
            )

    return response
```

## Alerting Configuration

### Performance Thresholds

**Alert Rules:**
```python
# Performance monitoring rules
PERFORMANCE_RULES = {
    'web_vitals': {
        'LCP': {'warning': 2500, 'critical': 4000},
        'FID': {'warning': 100, 'critical': 300},
        'CLS': {'warning': 0.1, 'critical': 0.25}
    },
    'api_response': {
        'p95_response_time': {'warning': 1000, 'critical': 2000},
        'error_rate': {'warning': 0.05, 'critical': 0.10}
    },
    'database': {
        'query_time': {'warning': 500, 'critical': 1000},
        'connection_count': {'warning': 50, 'critical': 80}
    }
}

def check_performance_thresholds():
    """Run hourly to check performance metrics"""

    # Check Web Vitals
    vitals = db_fetch_all("""
        SELECT
            metric_name,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95
        FROM web_vitals_metrics
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY metric_name
    """)

    for vital in vitals:
        metric = vital['metric_name']
        value = vital['p95']

        if metric in PERFORMANCE_RULES['web_vitals']:
            thresholds = PERFORMANCE_RULES['web_vitals'][metric]

            if value > thresholds['critical']:
                severity = 1
            elif value > thresholds['warning']:
                severity = 2
            else:
                continue  # Performance is good

            siren_service.trigger_incident(
                incident_type='web_vitals_degradation',
                severity=severity,
                source='performance_monitor',
                policy_name='Critical',
                context={
                    'metric': metric,
                    'value': value,
                    'threshold': thresholds['warning']
                },
                variables={'timeframe': '1_hour'},
                created_by='automated_monitor'
            )
```

### Siren Integration

**Performance Incident Templates:**
```sql
-- Insert performance-specific templates
INSERT INTO siren_templates (name, category, body_text, parameters, created_by)
VALUES (
    'PERFORMANCE_DEGRADATION',
    'UTILITY',
    'Performance Alert: {{metric}} is {{value}}ms (threshold: {{threshold}}ms) on {{page}}. Investigation required.',
    '["metric", "value", "threshold", "page"]'::jsonb,
    (SELECT id FROM profiles WHERE role_id = 'superadmin' LIMIT 1)
) ON CONFLICT (name) DO NOTHING;
```

## Performance Optimization

### Automated Optimizations

**Image Optimization:**
```javascript
// Automatic image optimization
const imageOptimization = {
    // WebP conversion for supported browsers
    formatSupport: {
        webp: 'image/webp',
        avif: 'image/avif'
    },

    // Responsive image sizes
    generateSrcSet(imagePath) {
        const sizes = [320, 640, 960, 1280, 1920];
        return sizes.map(size =>
            `${imagePath}?w=${size}&f=webp ${size}w`
        ).join(', ');
    },

    // Lazy loading implementation
    lazyLoad() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }
};
```

### Caching Strategy

**Multi-Level Caching:**
```python
# Cache performance monitoring
CACHE_PERFORMANCE = {
    'cdn_hit_rate': 0.95,  # Target 95% hit rate
    'api_cache_ttl': 300,  # 5 minutes
    'static_cache_ttl': 86400  # 24 hours
}

def monitor_cache_performance():
    """Monitor caching effectiveness"""

    # API response caching
    cache_stats = db_fetch_one("""
        SELECT
            COUNT(CASE WHEN response_time < 100 THEN 1 END)::float / COUNT(*)::float as cache_hit_rate,
            AVG(response_time) as avg_response_time
        FROM api_performance_metrics
        WHERE timestamp > NOW() - INTERVAL '1 hour'
    """)

    if cache_stats['cache_hit_rate'] < 0.8:  # <80% cache hit rate
        siren_service.trigger_incident(
            incident_type='cache_performance_low',
            severity=3,
            source='cache_monitor',
            policy_name='Critical',
            context={
                'hit_rate': cache_stats['cache_hit_rate'],
                'target': 0.8
            },
            variables={'timeframe': '1_hour'},
            created_by='cache_monitor'
        )
```

## Performance Testing

### Load Testing

**Automated Load Tests:**
```javascript
// k6 load testing script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 20 },  // Ramp up to 20
    { duration: '5m', target: 20 },  // Stay at 20
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};

export default function() {
  let response = http.get('https://samiatarot.com/');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

### Performance Regression Testing

**CI Performance Gates:**
```yaml
# .github/workflows/performance-test.yml
name: Performance Testing

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.11.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

  load_test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Load Tests
        run: |
          docker run --rm -v $PWD:/k6 loadimpact/k6 run /k6/load-test.js
```

## Performance Incident Response

### Performance Degradation Response

**Immediate Actions:**
1. **Identify** affected components
2. **Assess** user impact scope
3. **Implement** quick fixes (caching, CDN)
4. **Monitor** recovery metrics
5. **Document** root cause

**Performance Incident Playbook:**
```bash
#!/bin/bash
# Performance incident response script

echo "🚨 Performance Incident Response"
echo "================================"

# 1. Quick health check
echo "1. System Health Check:"
curl -s "https://samiatarot.com/api/health" | jq .

# 2. Check current metrics
echo "2. Current Performance Metrics:"
psql $DATABASE_URL -c "
  SELECT
    metric_name,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
    COUNT(*) as samples
  FROM web_vitals_metrics
  WHERE timestamp > NOW() - INTERVAL '5 minutes'
  GROUP BY metric_name;
"

# 3. Check database performance
echo "3. Database Performance:"
psql $DATABASE_URL -c "
  SELECT query, calls, mean_time, max_time
  FROM pg_stat_statements
  WHERE mean_time > 1000
  ORDER BY total_time DESC
  LIMIT 5;
"

# 4. CDN and cache status
echo "4. Cache Performance:"
curl -s "https://samiatarot.com/" -w "Response Time: %{time_total}s\nCDN Hit: %{http_code}\n"

echo "📊 Performance investigation complete"
```

## Continuous Improvement

### Performance Budget Evolution

**Monthly Budget Review:**
```sql
-- Performance trend analysis
SELECT
    DATE_TRUNC('week', timestamp) as week,
    metric_name,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
    COUNT(*) as sample_count
FROM web_vitals_metrics
WHERE timestamp > NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', timestamp), metric_name
ORDER BY week DESC, metric_name;
```

**Budget Adjustment Recommendations:**
- Tighten budgets if consistently beating targets
- Investigate if missing targets frequently
- Consider user experience impact
- Balance performance vs feature delivery