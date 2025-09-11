# Post-Release Monitoring Guide
**Samia Tarot Platform - Production Monitoring & Health Assessment**

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Owner**: SRE Team  
**Review Schedule**: Weekly

---

## Overview

This guide provides comprehensive procedures for monitoring the Samia Tarot Platform after production release, covering the critical first 72 hours through ongoing operational monitoring.

### Monitoring Phases
- **Phase 1**: Critical monitoring (0-2 hours post-release)
- **Phase 2**: Intensive monitoring (2-24 hours post-release)  
- **Phase 3**: Extended monitoring (24-72 hours post-release)
- **Phase 4**: Steady-state monitoring (72+ hours post-release)

---

## Phase 1: Critical Monitoring (0-2 Hours)

### 1.1 Immediate Health Checks (Every 5 minutes)

```bash
#!/bin/bash
# Critical health monitoring script
# Location: /ops/monitoring/critical_health_check.sh

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
HEALTH_STATUS=""

echo "=== CRITICAL HEALTH CHECK: $TIMESTAMP ==="

# Core application health
APP_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null https://samia-tarot.com/health)
if [ "$APP_HEALTH" = "200" ]; then
    echo "✅ Application Health: HEALTHY"
    HEALTH_STATUS="HEALTHY"
else
    echo "❌ Application Health: FAILED ($APP_HEALTH)"
    HEALTH_STATUS="CRITICAL"
fi

# Database connectivity
DB_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null https://samia-tarot.com/api/health/database)
if [ "$DB_HEALTH" = "200" ]; then
    echo "✅ Database Health: HEALTHY"
else
    echo "❌ Database Health: FAILED ($DB_HEALTH)"
    HEALTH_STATUS="CRITICAL"
fi

# API endpoints
API_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null https://samia-tarot.com/api/health)
if [ "$API_HEALTH" = "200" ]; then
    echo "✅ API Health: HEALTHY"
else
    echo "❌ API Health: FAILED ($API_HEALTH)"
    HEALTH_STATUS="CRITICAL"
fi

# External providers
PROVIDER_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null https://samia-tarot.com/api/health/providers)
if [ "$PROVIDER_HEALTH" = "200" ]; then
    echo "✅ Provider Health: HEALTHY"
else
    echo "⚠️ Provider Health: DEGRADED ($PROVIDER_HEALTH)"
    [ "$HEALTH_STATUS" != "CRITICAL" ] && HEALTH_STATUS="WARNING"
fi

# Send alert if critical issues
if [ "$HEALTH_STATUS" = "CRITICAL" ]; then
    curl -X POST $SLACK_CRITICAL_WEBHOOK \
      -H 'Content-type: application/json' \
      --data "{
        \"text\": \"🚨 CRITICAL: Production health check failed at $TIMESTAMP\",
        \"blocks\": [{
          \"type\": \"section\",
          \"text\": {
            \"type\": \"mrkdwn\",
            \"text\": \"*PRODUCTION HEALTH ALERT*\nApp: $APP_HEALTH | DB: $DB_HEALTH | API: $API_HEALTH | Providers: $PROVIDER_HEALTH\"
          }
        }]
      }"
fi

echo "Overall Status: $HEALTH_STATUS"
echo "=====================================\n"
```

### 1.2 Golden Signals Monitoring

```python
#!/usr/bin/env python3
# Golden signals monitoring for first 2 hours
# Location: /ops/monitoring/golden_signals_monitor.py

import requests
import time
import json
from datetime import datetime

def monitor_golden_signals():
    """Monitor Google SRE Golden Signals during critical period"""
    
    metrics = {
        'timestamp': datetime.now().isoformat(),
        'latency': {},
        'traffic': {},
        'errors': {},
        'saturation': {}
    }
    
    try:
        # Latency monitoring
        response_time = requests.get('https://samia-tarot.com/', timeout=10)
        metrics['latency']['homepage_response_time'] = response_time.elapsed.total_seconds()
        
        api_response_time = requests.get('https://samia-tarot.com/api/health', timeout=10)
        metrics['latency']['api_response_time'] = api_response_time.elapsed.total_seconds()
        
        # Traffic monitoring
        # This would integrate with your analytics/logging system
        metrics['traffic']['requests_per_minute'] = get_current_rpm()  # Implement based on your setup
        
        # Error rate monitoring  
        metrics['errors']['error_rate'] = get_current_error_rate()  # Implement based on your logging
        
        # Saturation monitoring
        metrics['saturation'] = get_resource_utilization()  # Implement based on your infrastructure
        
        # Alert conditions
        alerts = []
        
        # Latency alerts (P95 target: <500ms)
        if metrics['latency']['homepage_response_time'] > 2.0:
            alerts.append(f"HIGH LATENCY: Homepage {metrics['latency']['homepage_response_time']:.2f}s")
        
        if metrics['latency']['api_response_time'] > 1.0:
            alerts.append(f"HIGH LATENCY: API {metrics['latency']['api_response_time']:.2f}s")
        
        # Error rate alerts (target: <1%)
        if metrics['errors']['error_rate'] > 5.0:
            alerts.append(f"HIGH ERROR RATE: {metrics['errors']['error_rate']:.2f}%")
        
        # Send alerts if any issues
        if alerts:
            send_golden_signals_alert(alerts, metrics)
        
        # Log metrics
        with open(f'/var/log/monitoring/golden_signals_{datetime.now().strftime("%Y%m%d")}.log', 'a') as f:
            f.write(json.dumps(metrics) + '\n')
        
        return metrics
        
    except Exception as e:
        print(f"Golden signals monitoring failed: {e}")
        return None

def get_current_rpm():
    """Get current requests per minute from logs"""
    # Implement based on your log aggregation system
    return 0

def get_current_error_rate():
    """Get current error rate percentage"""
    # Implement based on your error tracking system  
    return 0

def get_resource_utilization():
    """Get current resource utilization metrics"""
    # Implement based on your infrastructure monitoring
    return {'cpu': 0, 'memory': 0, 'disk': 0}

def send_golden_signals_alert(alerts, metrics):
    """Send alert for golden signals violations"""
    alert_message = "\\n".join(alerts)
    # Implement your alerting mechanism
    print(f"ALERT: {alert_message}")

if __name__ == "__main__":
    while True:
        monitor_golden_signals()
        time.sleep(60)  # Monitor every minute during critical period
```

### 1.3 User Journey Validation (Every 15 minutes)

```bash
#!/bin/bash
# Critical user journey testing
# Location: /ops/monitoring/user_journey_test.sh

echo "=== USER JOURNEY VALIDATION: $(date) ==="

# Test 1: Homepage load
echo "Testing homepage load..."
HOMEPAGE_STATUS=$(curl -s -w "%{http_code}:%{time_total}" https://samia-tarot.com/ | tail -c 10)
HTTP_CODE=$(echo $HOMEPAGE_STATUS | cut -d: -f1)
LOAD_TIME=$(echo $HOMEPAGE_STATUS | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ] && (( $(echo "$LOAD_TIME < 3.0" | bc -l) )); then
    echo "✅ Homepage: PASS (${LOAD_TIME}s)"
else
    echo "❌ Homepage: FAIL (Code: $HTTP_CODE, Time: ${LOAD_TIME}s)"
fi

# Test 2: User registration flow
echo "Testing registration flow..."
REGISTER_RESPONSE=$(curl -X POST https://samia-tarot.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"monitor_$(date +%s)@example.com\",
    \"password\": \"MonitorTest123!\",
    \"first_name\": \"Monitor\",
    \"last_name\": \"Test\"
  }" \
  -w "%{http_code}" -s)

if [[ "$REGISTER_RESPONSE" == *"201"* ]] || [[ "$REGISTER_RESPONSE" == *"200"* ]]; then
    echo "✅ Registration: PASS"
else
    echo "❌ Registration: FAIL ($REGISTER_RESPONSE)"
fi

# Test 3: Authentication flow  
echo "Testing authentication..."
AUTH_RESPONSE=$(curl -X POST https://samia-tarot.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@samia-tarot.com",
    "password": "TestPassword123!"
  }' \
  -w "%{http_code}" -s)

if [[ "$AUTH_RESPONSE" == *"200"* ]]; then
    echo "✅ Authentication: PASS"
else
    echo "❌ Authentication: FAIL ($AUTH_RESPONSE)"
fi

# Test 4: Payment health check
echo "Testing payment processing..."
PAYMENT_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null https://samia-tarot.com/api/health/payments)

if [ "$PAYMENT_HEALTH" = "200" ]; then
    echo "✅ Payment System: HEALTHY"
else
    echo "❌ Payment System: UNHEALTHY ($PAYMENT_HEALTH)"
fi

echo "=====================================\n"
```

---

## Phase 2: Intensive Monitoring (2-24 Hours)

### 2.1 Performance Baseline Establishment

```python
#!/usr/bin/env python3
# Performance baseline monitoring
# Location: /ops/monitoring/performance_baseline.py

import time
import requests
import statistics
import json
from datetime import datetime, timedelta

class PerformanceMonitor:
    def __init__(self):
        self.baseline_data = {
            'response_times': [],
            'error_rates': [],
            'throughput': [],
            'resource_usage': []
        }
    
    def collect_baseline_metrics(self, duration_hours=24):
        """Collect performance metrics for baseline establishment"""
        
        end_time = datetime.now() + timedelta(hours=duration_hours)
        
        while datetime.now() < end_time:
            try:
                # Response time measurement
                start_time = time.time()
                response = requests.get('https://samia-tarot.com/', timeout=30)
                response_time = time.time() - start_time
                
                self.baseline_data['response_times'].append({
                    'timestamp': datetime.now().isoformat(),
                    'response_time': response_time,
                    'status_code': response.status_code
                })
                
                # API response time
                api_start = time.time() 
                api_response = requests.get('https://samia-tarot.com/api/health', timeout=10)
                api_time = time.time() - api_start
                
                # Calculate current metrics
                recent_times = [r['response_time'] for r in self.baseline_data['response_times'][-10:]]
                
                current_metrics = {
                    'timestamp': datetime.now().isoformat(),
                    'avg_response_time': statistics.mean(recent_times),
                    'p95_response_time': statistics.quantiles(recent_times, n=20)[18] if len(recent_times) >= 20 else max(recent_times),
                    'api_response_time': api_time
                }
                
                # Alert on performance degradation
                if current_metrics['p95_response_time'] > 2.0:
                    self.send_performance_alert('HIGH_LATENCY', current_metrics)
                
                # Log metrics
                self.log_metrics(current_metrics)
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                      f"Avg: {current_metrics['avg_response_time']:.2f}s, "
                      f"P95: {current_metrics['p95_response_time']:.2f}s")
                
                time.sleep(60)  # Sample every minute
                
            except Exception as e:
                print(f"Monitoring error: {e}")
                time.sleep(60)
    
    def generate_baseline_report(self):
        """Generate baseline performance report"""
        
        if not self.baseline_data['response_times']:
            return None
        
        response_times = [r['response_time'] for r in self.baseline_data['response_times']]
        
        report = {
            'monitoring_period': '24_hours',
            'total_samples': len(response_times),
            'avg_response_time': statistics.mean(response_times),
            'median_response_time': statistics.median(response_times),
            'p95_response_time': statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else 0,
            'p99_response_time': statistics.quantiles(response_times, n=100)[98] if len(response_times) >= 100 else 0,
            'min_response_time': min(response_times),
            'max_response_time': max(response_times),
            'error_count': len([r for r in self.baseline_data['response_times'] if r['status_code'] != 200])
        }
        
        return report
    
    def log_metrics(self, metrics):
        """Log metrics to file"""
        with open(f'/var/log/monitoring/performance_baseline.log', 'a') as f:
            f.write(json.dumps(metrics) + '\\n')
    
    def send_performance_alert(self, alert_type, metrics):
        """Send performance degradation alert"""
        print(f"PERFORMANCE ALERT [{alert_type}]: {metrics}")

if __name__ == "__main__":
    monitor = PerformanceMonitor()
    monitor.collect_baseline_metrics(duration_hours=24)
    
    report = monitor.generate_baseline_report()
    if report:
        print("\\n=== BASELINE PERFORMANCE REPORT ===")
        for key, value in report.items():
            print(f"{key}: {value}")
```

### 2.2 Database Performance Monitoring

```sql
-- Database performance monitoring queries
-- Location: /ops/monitoring/db_performance.sql

-- Monitor active connections
SELECT 
    state,
    count(*) as connection_count,
    max(now() - query_start) as longest_query_runtime
FROM pg_stat_activity 
WHERE state IS NOT NULL
GROUP BY state;

-- Monitor query performance
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Monitor table sizes and growth
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_stat_get_tuples_inserted(c.oid) as inserts,
    pg_stat_get_tuples_updated(c.oid) as updates,
    pg_stat_get_tuples_deleted(c.oid) as deletes
FROM pg_tables pt
JOIN pg_class c ON c.relname = pt.tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor RLS policy performance
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_tup_hot_upd,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC;
```

### 2.3 Business Metrics Monitoring

```python
#!/usr/bin/env python3
# Business metrics monitoring during intensive period
# Location: /ops/monitoring/business_metrics.py

import psycopg2
import json
from datetime import datetime, timedelta

class BusinessMetricsMonitor:
    def __init__(self):
        self.conn = psycopg2.connect(
            host='localhost',
            database='samia_tarot',
            user='monitoring_user',
            password='monitoring_pass'
        )
    
    def collect_business_metrics(self):
        """Collect key business metrics"""
        
        with self.conn.cursor() as cur:
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'user_registrations': {},
                'orders': {},
                'payments': {},
                'errors': {}
            }
            
            # User registration metrics
            cur.execute("""
                SELECT 
                    COUNT(*) as total_registrations,
                    COUNT(CASE WHEN created_at >= now() - interval '1 hour' THEN 1 END) as last_hour,
                    COUNT(CASE WHEN created_at >= now() - interval '24 hours' THEN 1 END) as last_24h
                FROM profiles
            """)
            
            reg_data = cur.fetchone()
            metrics['user_registrations'] = {
                'total': reg_data[0],
                'last_hour': reg_data[1], 
                'last_24h': reg_data[2]
            }
            
            # Order metrics
            cur.execute("""
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN created_at >= now() - interval '1 hour' THEN 1 END) as last_hour,
                    COUNT(CASE WHEN status = 'delivered' AND delivered_at >= now() - interval '24 hours' THEN 1 END) as delivered_24h,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_total
                FROM orders
            """)
            
            order_data = cur.fetchone()
            metrics['orders'] = {
                'total': order_data[0],
                'last_hour': order_data[1],
                'delivered_24h': order_data[2],
                'cancelled_total': order_data[3]
            }
            
            # Payment metrics
            cur.execute("""
                SELECT 
                    COUNT(*) as total_transactions,
                    COUNT(CASE WHEN created_at >= now() - interval '1 hour' THEN 1 END) as last_hour,
                    SUM(CASE WHEN status = 'succeeded' AND created_at >= now() - interval '24 hours' THEN amount_cents END) as revenue_24h_cents,
                    COUNT(CASE WHEN status = 'failed' AND created_at >= now() - interval '24 hours' THEN 1 END) as failed_24h
                FROM payment_transactions
            """)
            
            payment_data = cur.fetchone()
            metrics['payments'] = {
                'total_transactions': payment_data[0],
                'last_hour': payment_data[1],
                'revenue_24h_usd': (payment_data[2] or 0) / 100,
                'failed_24h': payment_data[3]
            }
            
            # Error tracking
            cur.execute("""
                SELECT 
                    event,
                    COUNT(*) as count
                FROM audit_log 
                WHERE created_at >= now() - interval '1 hour'
                    AND event LIKE '%error%'
                GROUP BY event
                ORDER BY count DESC
                LIMIT 5
            """)
            
            error_data = cur.fetchall()
            metrics['errors'] = {row[0]: row[1] for row in error_data}
            
            return metrics
    
    def analyze_business_health(self, metrics):
        """Analyze business metrics for health indicators"""
        
        alerts = []
        
        # Registration rate analysis
        if metrics['user_registrations']['last_hour'] == 0:
            alerts.append("ZERO_REGISTRATIONS: No new registrations in last hour")
        
        # Order fulfillment analysis
        if metrics['orders']['last_hour'] > 0 and metrics['orders']['delivered_24h'] == 0:
            alerts.append("NO_DELIVERIES: Orders created but none delivered in 24h")
        
        # Payment failure analysis
        if metrics['payments']['failed_24h'] > metrics['payments']['total_transactions'] * 0.05:
            alerts.append(f"HIGH_PAYMENT_FAILURES: {metrics['payments']['failed_24h']} failures in 24h")
        
        # Revenue analysis
        if metrics['payments']['revenue_24h_usd'] == 0 and metrics['orders']['last_hour'] > 0:
            alerts.append("ZERO_REVENUE: Orders created but no successful payments")
        
        return alerts
    
    def log_business_metrics(self, metrics, alerts):
        """Log business metrics and alerts"""
        
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics,
            'alerts': alerts,
            'health_status': 'HEALTHY' if not alerts else 'DEGRADED' if len(alerts) < 3 else 'UNHEALTHY'
        }
        
        with open('/var/log/monitoring/business_metrics.log', 'a') as f:
            f.write(json.dumps(log_entry) + '\\n')
        
        # Send alerts if any issues
        if alerts:
            print(f"BUSINESS METRIC ALERTS: {', '.join(alerts)}")

if __name__ == "__main__":
    monitor = BusinessMetricsMonitor()
    
    while True:
        try:
            metrics = monitor.collect_business_metrics()
            alerts = monitor.analyze_business_health(metrics)
            monitor.log_business_metrics(metrics, alerts)
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                  f"Registrations: {metrics['user_registrations']['last_hour']}/hr, "
                  f"Orders: {metrics['orders']['last_hour']}/hr, "
                  f"Revenue: ${metrics['payments']['revenue_24h_usd']:.2f}/24h")
            
            time.sleep(300)  # Check every 5 minutes during intensive period
            
        except Exception as e:
            print(f"Business metrics monitoring error: {e}")
            time.sleep(300)
```

---

## Phase 3: Extended Monitoring (24-72 Hours)

### 3.1 Trend Analysis & Capacity Planning

```python
#!/usr/bin/env python3
# Extended monitoring with trend analysis
# Location: /ops/monitoring/trend_analysis.py

import json
import statistics
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

class TrendAnalyzer:
    def __init__(self, log_file_path):
        self.log_file_path = log_file_path
        self.data = []
    
    def load_monitoring_data(self):
        """Load monitoring data from log files"""
        
        try:
            with open(self.log_file_path, 'r') as f:
                for line in f:
                    try:
                        self.data.append(json.loads(line.strip()))
                    except json.JSONDecodeError:
                        continue
        except FileNotFoundError:
            print(f"Log file not found: {self.log_file_path}")
    
    def analyze_performance_trends(self):
        """Analyze performance trends over 24-72 hour period"""
        
        if not self.data:
            return None
        
        # Group data by hour
        hourly_data = {}
        for entry in self.data:
            timestamp = datetime.fromisoformat(entry['timestamp'].replace('Z', '+00:00'))
            hour_key = timestamp.strftime('%Y-%m-%d %H:00')
            
            if hour_key not in hourly_data:
                hourly_data[hour_key] = []
            
            hourly_data[hour_key].append(entry)
        
        # Calculate hourly averages
        trend_data = []
        for hour, entries in sorted(hourly_data.items()):
            if 'avg_response_time' in entries[0]:
                avg_response_time = statistics.mean([e['avg_response_time'] for e in entries])
                p95_response_time = max([e.get('p95_response_time', 0) for e in entries])
                
                trend_data.append({
                    'hour': hour,
                    'avg_response_time': avg_response_time,
                    'p95_response_time': p95_response_time,
                    'sample_count': len(entries)
                })
        
        return trend_data
    
    def detect_performance_degradation(self, trend_data):
        """Detect performance degradation patterns"""
        
        if len(trend_data) < 24:  # Need at least 24 hours of data
            return []
        
        alerts = []
        
        # Calculate 24-hour baseline
        baseline_avg = statistics.mean([d['avg_response_time'] for d in trend_data[:24]])
        baseline_p95 = statistics.mean([d['p95_response_time'] for d in trend_data[:24]])
        
        # Check recent performance against baseline
        recent_data = trend_data[-6:]  # Last 6 hours
        recent_avg = statistics.mean([d['avg_response_time'] for d in recent_data])
        recent_p95 = statistics.mean([d['p95_response_time'] for d in recent_data])
        
        # Alert on significant degradation
        if recent_avg > baseline_avg * 1.5:
            alerts.append(f"PERFORMANCE_DEGRADATION: Avg response time increased {recent_avg/baseline_avg:.1f}x")
        
        if recent_p95 > baseline_p95 * 2.0:
            alerts.append(f"LATENCY_SPIKE: P95 response time increased {recent_p95/baseline_p95:.1f}x")
        
        return alerts
    
    def generate_trend_report(self):
        """Generate comprehensive trend analysis report"""
        
        self.load_monitoring_data()
        trend_data = self.analyze_performance_trends()
        
        if not trend_data:
            return "No trend data available"
        
        alerts = self.detect_performance_degradation(trend_data)
        
        # Calculate summary statistics
        all_avg_times = [d['avg_response_time'] for d in trend_data]
        all_p95_times = [d['p95_response_time'] for d in trend_data]
        
        report = f"""
=== EXTENDED MONITORING TREND REPORT ===
Monitoring Period: {trend_data[0]['hour']} to {trend_data[-1]['hour']}
Total Hours Analyzed: {len(trend_data)}

Performance Summary:
- Average Response Time: {statistics.mean(all_avg_times):.3f}s (min: {min(all_avg_times):.3f}s, max: {max(all_avg_times):.3f}s)
- P95 Response Time: {statistics.mean(all_p95_times):.3f}s (min: {min(all_p95_times):.3f}s, max: {max(all_p95_times):.3f}s)

Trend Analysis:
"""
        
        if alerts:
            report += "⚠️ PERFORMANCE ALERTS:\n"
            for alert in alerts:
                report += f"  - {alert}\n"
        else:
            report += "✅ No significant performance degradation detected\n"
        
        # Hourly breakdown (last 24 hours)
        report += "\nHourly Performance (Last 24 Hours):\n"
        for hour_data in trend_data[-24:]:
            report += f"  {hour_data['hour']}: Avg {hour_data['avg_response_time']:.3f}s, P95 {hour_data['p95_response_time']:.3f}s\n"
        
        return report

if __name__ == "__main__":
    analyzer = TrendAnalyzer('/var/log/monitoring/performance_baseline.log')
    report = analyzer.generate_trend_report()
    print(report)
    
    # Save report
    with open(f'/var/log/monitoring/trend_report_{datetime.now().strftime("%Y%m%d")}.txt', 'w') as f:
        f.write(report)
```

### 3.2 User Experience Monitoring

```bash
#!/bin/bash
# User experience monitoring script
# Location: /ops/monitoring/user_experience_monitor.sh

echo "=== USER EXPERIENCE MONITORING: $(date) ==="

# Monitor key user journeys with timing
test_user_journey() {
    local journey_name="$1"
    local test_script="$2"
    
    echo "Testing: $journey_name"
    
    local start_time=$(date +%s.%N)
    local result=$(eval "$test_script")
    local end_time=$(date +%s.%N)
    
    local duration=$(echo "$end_time - $start_time" | bc)
    
    if [[ "$result" == *"SUCCESS"* ]]; then
        echo "✅ $journey_name: PASSED (${duration}s)"
    else
        echo "❌ $journey_name: FAILED (${duration}s) - $result"
    fi
}

# Test complete user registration journey
test_user_journey "User Registration Journey" "
    # Generate unique test user
    TEST_EMAIL=\"ux_test_\$(date +%s)@example.com\"
    
    # Test registration
    REGISTER_RESULT=\$(curl -X POST https://samia-tarot.com/api/auth/register \\
        -H 'Content-Type: application/json' \\
        -d \"{
            \\\"email\\\": \\\"\$TEST_EMAIL\\\",
            \\\"password\\\": \\\"UXTest123!\\\",
            \\\"first_name\\\": \\\"UX\\\",
            \\\"last_name\\\": \\\"Test\\\"
        }\" \\
        -w '%{http_code}' -s)
    
    if [[ \"\$REGISTER_RESULT\" == *\"201\"* ]] || [[ \"\$REGISTER_RESULT\" == *\"200\"* ]]; then
        echo 'SUCCESS'
    else
        echo \"FAILED: \$REGISTER_RESULT\"
    fi
"

# Test service ordering journey
test_user_journey "Service Ordering Journey" "
    # Test authenticated user creating order
    AUTH_TOKEN=\$(curl -X POST https://samia-tarot.com/api/auth/signin \\
        -H 'Content-Type: application/json' \\
        -d '{
            \"email\": \"test@samia-tarot.com\",
            \"password\": \"TestPassword123!\"
        }' -s | grep -o '\"access_token\":\"[^\"]*' | cut -d'\"' -f4)
    
    if [ -n \"\$AUTH_TOKEN\" ]; then
        ORDER_RESULT=\$(curl -X POST https://samia-tarot.com/api/orders \\
            -H \"Authorization: Bearer \$AUTH_TOKEN\" \\
            -H 'Content-Type: application/json' \\
            -d '{
                \"service_id\": 1,
                \"question_text\": \"UX test question\",
                \"is_gold\": false
            }' \\
            -w '%{http_code}' -s)
        
        if [[ \"\$ORDER_RESULT\" == *\"201\"* ]] || [[ \"\$ORDER_RESULT\" == *\"200\"* ]]; then
            echo 'SUCCESS'
        else
            echo \"FAILED: \$ORDER_RESULT\"
        fi
    else
        echo 'FAILED: Authentication failed'
    fi
"

# Test payment processing journey  
test_user_journey "Payment Processing Journey" "
    # Test payment health endpoint
    PAYMENT_HEALTH=\$(curl -s -w '%{http_code}' https://samia-tarot.com/api/health/payments)
    
    if [[ \"\$PAYMENT_HEALTH\" == *\"200\"* ]]; then
        echo 'SUCCESS'
    else
        echo \"FAILED: Payment system unhealthy (\$PAYMENT_HEALTH)\"
    fi
"

# Monitor mobile app experience (if applicable)
echo ""
echo "=== MOBILE EXPERIENCE CHECKS ==="

# Test API response times for mobile
MOBILE_API_TIME=$(curl -w "%{time_total}" -s -o /dev/null https://samia-tarot.com/api/mobile/health)
echo "Mobile API Response Time: ${MOBILE_API_TIME}s"

if (( $(echo "$MOBILE_API_TIME > 1.0" | bc -l) )); then
    echo "⚠️ Mobile API response time high"
else
    echo "✅ Mobile API response time acceptable"
fi

# Test push notification system
PUSH_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null https://samia-tarot.com/api/health/notifications)
if [ "$PUSH_HEALTH" = "200" ]; then
    echo "✅ Push notifications: HEALTHY"
else
    echo "❌ Push notifications: UNHEALTHY ($PUSH_HEALTH)"
fi

echo "=====================================\n"
```

---

## Phase 4: Steady-State Monitoring (72+ Hours)

### 4.1 Automated Health Dashboards

```python
#!/usr/bin/env python3
# Automated health dashboard generation
# Location: /ops/monitoring/health_dashboard.py

import json
import sqlite3
from datetime import datetime, timedelta
import html

class HealthDashboard:
    def __init__(self):
        self.db_path = '/var/log/monitoring/health_metrics.db'
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database for health metrics"""
        
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS health_metrics (
                timestamp TEXT,
                metric_type TEXT,
                metric_name TEXT,
                value REAL,
                status TEXT,
                details TEXT
            )
        ''')
        conn.commit()
        conn.close()
    
    def collect_current_metrics(self):
        """Collect current health metrics"""
        
        import requests
        import subprocess
        
        metrics = []
        timestamp = datetime.now().isoformat()
        
        try:
            # Application health
            app_response = requests.get('https://samia-tarot.com/health', timeout=10)
            metrics.append({
                'timestamp': timestamp,
                'metric_type': 'application',
                'metric_name': 'health_check',
                'value': app_response.elapsed.total_seconds(),
                'status': 'healthy' if app_response.status_code == 200 else 'unhealthy',
                'details': f"HTTP {app_response.status_code}"
            })
            
            # Database health
            db_response = requests.get('https://samia-tarot.com/api/health/database', timeout=15)
            metrics.append({
                'timestamp': timestamp,
                'metric_type': 'database',
                'metric_name': 'health_check',
                'value': db_response.elapsed.total_seconds(),
                'status': 'healthy' if db_response.status_code == 200 else 'unhealthy',
                'details': f"HTTP {db_response.status_code}"
            })
            
            # API health
            api_response = requests.get('https://samia-tarot.com/api/health', timeout=10)
            metrics.append({
                'timestamp': timestamp,
                'metric_type': 'api',
                'metric_name': 'health_check',
                'value': api_response.elapsed.total_seconds(),
                'status': 'healthy' if api_response.status_code == 200 else 'unhealthy',
                'details': f"HTTP {api_response.status_code}"
            })
            
            # System resource metrics (if available)
            try:
                cpu_usage = float(subprocess.check_output("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", shell=True).decode().strip())
                metrics.append({
                    'timestamp': timestamp,
                    'metric_type': 'system',
                    'metric_name': 'cpu_usage',
                    'value': cpu_usage,
                    'status': 'healthy' if cpu_usage < 80 else 'warning' if cpu_usage < 95 else 'critical',
                    'details': f"CPU usage: {cpu_usage}%"
                })
            except:
                pass  # CPU metrics not available
                
        except Exception as e:
            metrics.append({
                'timestamp': timestamp,
                'metric_type': 'monitoring',
                'metric_name': 'collection_error',
                'value': 0,
                'status': 'error',
                'details': str(e)
            })
        
        return metrics
    
    def store_metrics(self, metrics):
        """Store metrics in database"""
        
        conn = sqlite3.connect(self.db_path)
        for metric in metrics:
            conn.execute('''
                INSERT INTO health_metrics 
                (timestamp, metric_type, metric_name, value, status, details)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                metric['timestamp'],
                metric['metric_type'], 
                metric['metric_name'],
                metric['value'],
                metric['status'],
                metric['details']
            ))
        conn.commit()
        conn.close()
    
    def generate_html_dashboard(self):
        """Generate HTML health dashboard"""
        
        conn = sqlite3.connect(self.db_path)
        
        # Get recent metrics (last 24 hours)
        cutoff = (datetime.now() - timedelta(hours=24)).isoformat()
        
        metrics = conn.execute('''
            SELECT metric_type, metric_name, value, status, details, timestamp
            FROM health_metrics 
            WHERE timestamp > ?
            ORDER BY timestamp DESC
        ''', (cutoff,)).fetchall()
        
        # Get latest status for each metric type
        latest_status = conn.execute('''
            SELECT metric_type, status, MAX(timestamp) as latest_time
            FROM health_metrics
            WHERE timestamp > ?
            GROUP BY metric_type
        ''', (cutoff,)).fetchall()
        
        conn.close()
        
        # Generate HTML
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Samia Tarot - Health Dashboard</title>
    <meta http-equiv="refresh" content="60">
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .status-healthy {{ color: green; }}
        .status-warning {{ color: orange; }}
        .status-critical {{ color: red; }}
        .status-unhealthy {{ color: red; }}
        .status-error {{ color: red; }}
        .metric {{ margin: 10px 0; padding: 10px; border: 1px solid #ddd; }}
        .timestamp {{ font-size: 0.8em; color: #666; }}
    </style>
</head>
<body>
    <h1>Samia Tarot Platform Health Dashboard</h1>
    <p>Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    
    <h2>Current System Status</h2>
"""
        
        for metric_type, status, latest_time in latest_status:
            status_class = f"status-{status}"
            html_content += f"""
    <div class="metric">
        <strong>{metric_type.title()}</strong>: 
        <span class="{status_class}">{status.upper()}</span>
        <div class="timestamp">Last checked: {latest_time}</div>
    </div>
"""
        
        html_content += """
    <h2>Recent Metrics (Last 24 Hours)</h2>
    <table border="1" cellpadding="5" cellspacing="0">
        <tr>
            <th>Time</th>
            <th>Type</th>
            <th>Metric</th>
            <th>Value</th>
            <th>Status</th>
            <th>Details</th>
        </tr>
"""
        
        for metric in metrics[:100]:  # Show last 100 metrics
            timestamp, metric_type, metric_name, value, status, details = metric[-1], metric[0], metric[1], metric[2], metric[3], metric[4]
            status_class = f"status-{status}"
            
            html_content += f"""
        <tr>
            <td class="timestamp">{timestamp}</td>
            <td>{metric_type}</td>
            <td>{metric_name}</td>
            <td>{value:.3f}</td>
            <td class="{status_class}">{status}</td>
            <td>{html.escape(details)}</td>
        </tr>
"""
        
        html_content += """
    </table>
</body>
</html>
"""
        
        return html_content
    
    def update_dashboard(self):
        """Update health dashboard with current metrics"""
        
        # Collect current metrics
        metrics = self.collect_current_metrics()
        
        # Store metrics
        self.store_metrics(metrics)
        
        # Generate HTML dashboard
        html_content = self.generate_html_dashboard()
        
        # Write dashboard file
        with open('/var/www/html/health_dashboard.html', 'w') as f:
            f.write(html_content)
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Health dashboard updated")
        
        return metrics

if __name__ == "__main__":
    import time
    
    dashboard = HealthDashboard()
    
    while True:
        try:
            metrics = dashboard.update_dashboard()
            
            # Check for critical issues
            critical_issues = [m for m in metrics if m['status'] in ['critical', 'unhealthy', 'error']]
            if critical_issues:
                print(f"CRITICAL ISSUES DETECTED: {len(critical_issues)} problems")
                for issue in critical_issues:
                    print(f"  - {issue['metric_type']}.{issue['metric_name']}: {issue['details']}")
            
            time.sleep(60)  # Update every minute
            
        except Exception as e:
            print(f"Dashboard update error: {e}")
            time.sleep(60)
```

---

## Alerting & Escalation Procedures

### 5.1 Alert Severity Levels

| Severity | Response Time | Escalation | Examples |
|----------|---------------|------------|----------|
| **P0 - Critical** | 5 minutes | Immediate | Complete service down, data breach, payment system failure |
| **P1 - High** | 15 minutes | 30 minutes | High error rates, significant performance degradation |
| **P2 - Medium** | 1 hour | 2 hours | Minor performance issues, non-critical feature failures |
| **P3 - Low** | 4 hours | Next business day | Cosmetic issues, minor optimizations needed |

### 5.2 Automated Alert Rules

```yaml
# Alert configuration (conceptual)
alert_rules:
  - name: "Application Down"
    condition: "health_check_status != 200"
    severity: "P0"
    escalation_time: "5 minutes"
    
  - name: "High Error Rate"
    condition: "error_rate > 5% for 10 minutes"
    severity: "P1"
    escalation_time: "15 minutes"
    
  - name: "High Latency" 
    condition: "p95_response_time > 2000ms for 10 minutes"
    severity: "P1"
    escalation_time: "15 minutes"
    
  - name: "Payment Failures"
    condition: "payment_failure_rate > 10% for 5 minutes"
    severity: "P0"
    escalation_time: "5 minutes"
    
  - name: "Database Connection Issues"
    condition: "db_health_check_status != 200"
    severity: "P0"
    escalation_time: "5 minutes"
```

---

## Monitoring Checklist Summary

### Daily Monitoring Checklist (First Week)
- [ ] **Golden signals within targets** (Latency <500ms P95, Error rate <1%, Traffic as expected, Saturation <70%)
- [ ] **User registration flow working** (Test end-to-end)
- [ ] **Payment processing healthy** (>95% success rate)
- [ ] **Database performance stable** (Query times, connection counts)
- [ ] **External provider integrations healthy** (Stripe, Twilio, FCM/APNs)
- [ ] **No critical errors in logs** (Review error rates and patterns)
- [ ] **Backup jobs running successfully** (Verify daily backups)

### Weekly Monitoring Checklist (Ongoing)
- [ ] **Performance trend analysis** (Compare week-over-week)
- [ ] **Business metrics review** (Revenue, user growth, engagement)
- [ ] **Security monitoring review** (Failed auth attempts, suspicious activity)
- [ ] **Cost analysis** (Infrastructure costs vs budget)
- [ ] **Capacity planning review** (Resource utilization trends)
- [ ] **Alert tuning** (Adjust thresholds based on baseline data)

---

**Document Control**:
- **Document ID**: PRM-SAMIA-2025-001
- **Version**: 1.0
- **Last Updated**: January 2025
- **Next Review**: Post-launch + 7 days