# Synthetic Monitoring & Alerts Configuration

## Overview
Implement proactive synthetic monitoring with health checks, uptime monitoring, and alerting for critical endpoints.

---

## Synthetic Health Checks

### Critical Endpoints to Monitor

| Endpoint | Frequency | Timeout | Expected Status |
|----------|-----------|---------|-----------------|
| `/api/ops/health` | 1 min | 5s | 200 |
| `/api/horoscopes/daily` | 5 min | 10s | 200 |
| `/` (Homepage) | 5 min | 10s | 200 |
| `/api/orders` (POST) | 15 min | 15s | 201 or 400 |
| `/api/payments/intent` (POST) | 15 min | 15s | 200 or 503 |

---

## Implementation Options

### Option 1: Prometheus Blackbox Exporter

#### Configuration
```yaml
# prometheus-blackbox.yml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200]
      method: GET
      follow_redirects: true
      fail_if_ssl: false
      fail_if_not_ssl: false
      tls_config:
        insecure_skip_verify: false

  http_post_2xx:
    prober: http
    timeout: 15s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200, 201]
      method: POST
      headers:
        Content-Type: application/json
      body: '{"test": true}'
```

#### Prometheus Configuration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - https://example.com/api/ops/health
        - https://example.com/api/horoscopes/daily
        - https://example.com/
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

#### Alert Rules
```yaml
# prometheus-alerts.yml
groups:
  - name: synthetic_monitoring
    interval: 30s
    rules:
      - alert: HealthCheckDown
        expr: probe_success{job="blackbox",instance=~".*health.*"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Health check endpoint down"
          description: "{{ $labels.instance }} has been down for 2 minutes"

      - alert: HighLatencyHealthCheck
        expr: probe_duration_seconds{job="blackbox",instance=~".*health.*"} > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Health check latency high"
          description: "{{ $labels.instance }} responding in {{ $value }}s"

      - alert: SSLCertExpiringSoon
        expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "{{ $labels.instance }} SSL cert expires in {{ $value | humanizeDuration }}"
```

---

### Option 2: UptimeRobot (SaaS)

#### Monitors to Create

**1. Health Check Monitor**
- URL: `https://example.com/api/ops/health`
- Type: HTTP(S)
- Interval: 1 minute
- Expected Status: 200
- Alert Contacts: PagerDuty, Email

**2. Public Daily Horoscopes**
- URL: `https://example.com/api/horoscopes/daily`
- Type: HTTP(S)
- Interval: 5 minutes
- Expected Status: 200
- Keyword: `"horoscopes"`
- Alert Contacts: Slack, Email

**3. Homepage Availability**
- URL: `https://example.com/`
- Type: HTTP(S)
- Interval: 5 minutes
- Expected Status: 200

**4. SSL Certificate Monitor**
- URL: `https://example.com/`
- Type: SSL
- Alert: 30 days before expiry

---

### Option 3: Custom Monitoring Script

#### Python Implementation
```python
import requests
import time
import logging
from prometheus_client import Gauge, Counter, start_http_server

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

endpoint_up = Gauge('endpoint_up', 'Endpoint availability', ['endpoint'])
endpoint_latency = Gauge('endpoint_latency_seconds', 'Endpoint response time', ['endpoint'])
check_failures = Counter('health_check_failures_total', 'Total check failures', ['endpoint'])

ENDPOINTS = [
    {'url': 'https://example.com/api/ops/health', 'method': 'GET', 'expected': 200, 'interval': 60},
    {'url': 'https://example.com/api/horoscopes/daily', 'method': 'GET', 'expected': 200, 'interval': 300},
    {'url': 'https://example.com/', 'method': 'GET', 'expected': 200, 'interval': 300}
]

def check_endpoint(endpoint):
    url = endpoint['url']
    method = endpoint['method']
    expected = endpoint['expected']

    try:
        start = time.time()
        response = requests.request(method, url, timeout=10)
        latency = time.time() - start

        endpoint_latency.labels(endpoint=url).set(latency)

        if response.status_code == expected:
            endpoint_up.labels(endpoint=url).set(1)
            logger.info(f"✓ {url} - {response.status_code} ({latency:.3f}s)")
            return True
        else:
            endpoint_up.labels(endpoint=url).set(0)
            check_failures.labels(endpoint=url).inc()
            logger.error(f"✗ {url} - Expected {expected}, got {response.status_code}")
            return False

    except Exception as e:
        endpoint_up.labels(endpoint=url).set(0)
        check_failures.labels(endpoint=url).inc()
        logger.error(f"✗ {url} - Exception: {e}")
        return False

def monitor_loop():
    while True:
        for endpoint in ENDPOINTS:
            check_endpoint(endpoint)
            time.sleep(endpoint['interval'])

if __name__ == '__main__':
    start_http_server(8000)
    logger.info("Synthetic monitoring started on :8000")
    monitor_loop()
```

#### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir requests prometheus-client

COPY synthetic_monitor.py .

CMD ["python", "synthetic_monitor.py"]
```

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: synthetic-monitor
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: synthetic-monitor
  template:
    metadata:
      labels:
        app: synthetic-monitor
    spec:
      containers:
      - name: monitor
        image: synthetic-monitor:latest
        ports:
        - containerPort: 8000
          name: metrics
        env:
        - name: ENDPOINTS
          value: "https://example.com/api/ops/health,https://example.com/api/horoscopes/daily"
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: synthetic-monitor
  namespace: monitoring
spec:
  selector:
    app: synthetic-monitor
  ports:
  - port: 8000
    name: metrics
```

---

## Alert Channels

### PagerDuty Integration
```yaml
# alertmanager.yml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<PAGERDUTY_INTEGRATION_KEY>'
        severity: 'critical'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'
          alertname: '{{ .CommonLabels.alertname }}'

route:
  receiver: 'pagerduty-critical'
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 3h
  routes:
    - match:
        severity: critical
      receiver: pagerduty-critical
      continue: true
    - match:
        severity: warning
      receiver: slack-warnings
```

### Slack Integration
```yaml
receivers:
  - name: 'slack-warnings'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX'
        channel: '#alerts'
        title: '{{ .CommonAnnotations.summary }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
```

---

## Grafana Dashboard

### Synthetic Monitoring Dashboard
```json
{
  "dashboard": {
    "title": "Synthetic Monitoring",
    "panels": [
      {
        "title": "Endpoint Availability",
        "targets": [
          {
            "expr": "endpoint_up",
            "legendFormat": "{{ endpoint }}"
          }
        ],
        "type": "stat",
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"value": 0, "color": "red"},
                {"value": 1, "color": "green"}
              ]
            }
          }
        }
      },
      {
        "title": "Response Latency",
        "targets": [
          {
            "expr": "endpoint_latency_seconds",
            "legendFormat": "{{ endpoint }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Failed Checks (24h)",
        "targets": [
          {
            "expr": "increase(health_check_failures_total[24h])",
            "legendFormat": "{{ endpoint }}"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

---

## Uptime SLA Tracking

### Calculate Uptime Percentage
```promql
# 99.9% uptime over 30 days
avg_over_time(endpoint_up{endpoint="https://example.com/api/ops/health"}[30d]) * 100
```

### SLA Violation Alert
```yaml
- alert: SLAViolation
  expr: |
    avg_over_time(endpoint_up{endpoint=~".*health.*"}[7d]) < 0.999
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "SLA violation detected"
    description: "Uptime for {{ $labels.endpoint }} is {{ $value | humanizePercentage }} (SLA: 99.9%)"
```

---

## E2E Transaction Monitoring

### Playwright Script
```javascript
const { chromium } = require('playwright');
const { PrometheusExporter } = require('prometheus-exporter');

const exporter = new PrometheusExporter({ port: 9090 });
const transaction_duration = exporter.gauge('transaction_duration_seconds', 'E2E transaction duration', ['transaction']);
const transaction_success = exporter.gauge('transaction_success', 'E2E transaction success', ['transaction']);

async function runTransaction() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const startTime = Date.now();

  try {
    await page.goto('https://example.com/');
    await page.waitForSelector('h1', { timeout: 5000 });

    await page.goto('https://example.com/services');
    await page.waitForSelector('.service-card', { timeout: 5000 });

    const duration = (Date.now() - startTime) / 1000;
    transaction_duration.set({ transaction: 'homepage-to-services' }, duration);
    transaction_success.set({ transaction: 'homepage-to-services' }, 1);

    console.log(`✓ Transaction succeeded in ${duration}s`);
  } catch (error) {
    transaction_success.set({ transaction: 'homepage-to-services' }, 0);
    console.error(`✗ Transaction failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

setInterval(runTransaction, 300000);
```

---

## Checklist

- [ ] Health check endpoint monitored every 1 minute
- [ ] Critical public endpoints monitored every 5 minutes
- [ ] SSL certificate expiry monitored (30 day warning)
- [ ] Alerts configured for PagerDuty (critical) and Slack (warnings)
- [ ] Uptime SLA tracking (99.9% target)
- [ ] Response latency tracked and alerted (>1s warning)
- [ ] Failed checks logged and counted
- [ ] Grafana dashboard created for synthetic monitoring
- [ ] E2E transaction monitoring for critical user flows
- [ ] Alert runbooks documented

---

## References

- **Prometheus Blackbox Exporter:** https://github.com/prometheus/blackbox_exporter
- **UptimeRobot:** https://uptimerobot.com/
- **Grafana Synthetic Monitoring:** https://grafana.com/products/cloud/synthetic-monitoring/
- **Playwright:** https://playwright.dev/