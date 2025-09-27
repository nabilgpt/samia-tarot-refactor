#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Golden Signals Monitoring Service
Implements Google SRE Golden Signals: Latency, Traffic, Errors, Saturation
"""

import os
import sys
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import psycopg2
from psycopg2.pool import SimpleConnectionPool

# Force UTF-8 encoding for stdout/stderr
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Configuration
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

class ServiceType(Enum):
    AUTH = "auth"
    BOOKING = "booking"  
    PAYMENT = "payment"
    EMERGENCY = "emergency"
    HOROSCOPE = "horoscope"
    API_GATEWAY = "api_gateway"

class AlertSeverity(Enum):
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

@dataclass
class GoldenSignalsMetrics:
    """Golden Signals metrics snapshot"""
    service: str
    timestamp: datetime
    
    # Latency (ms)
    latency_p50: float
    latency_p95: float
    latency_p99: float
    
    # Traffic (requests per second)
    requests_per_second: float
    
    # Errors (error rate percentage)
    error_rate: float
    
    # Saturation (resource utilization percentage)
    cpu_utilization: float
    memory_utilization: float
    connection_pool_utilization: float

@dataclass
class SLO:
    """Service Level Objective definition"""
    service: str
    metric: str
    threshold: float
    window_minutes: int
    description: str

@dataclass
class SLI:
    """Service Level Indicator measurement"""
    service: str
    metric: str
    value: float
    timestamp: datetime
    meets_slo: bool

class GoldenSignalsService:
    """Service for collecting and analyzing Golden Signals metrics"""
    
    def __init__(self):
        self.setup_metrics_schema()
        self.slos = self._load_slos()
    
    def setup_metrics_schema(self):
        """Setup database schema for metrics collection"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Metrics storage table
                cur.execute("""
                    create table if not exists golden_signals_metrics (
                        id bigserial primary key,
                        service text not null,
                        timestamp timestamptz default now(),
                        latency_p50 numeric(10,3),
                        latency_p95 numeric(10,3),
                        latency_p99 numeric(10,3),
                        requests_per_second numeric(10,3),
                        error_rate numeric(5,2),
                        cpu_utilization numeric(5,2),
                        memory_utilization numeric(5,2),
                        connection_pool_utilization numeric(5,2),
                        created_at timestamptz default now()
                    );
                    
                    create index if not exists idx_golden_signals_service_timestamp 
                    on golden_signals_metrics(service, timestamp desc);
                """)
                
                # SLOs configuration table
                cur.execute("""
                    create table if not exists slos (
                        id bigserial primary key,
                        service text not null,
                        metric text not null,
                        threshold numeric(10,3) not null,
                        window_minutes int not null default 5,
                        description text not null,
                        is_active boolean default true,
                        created_at timestamptz default now(),
                        unique (service, metric)
                    );
                """)
                
                # SLI measurements table
                cur.execute("""
                    create table if not exists sli_measurements (
                        id bigserial primary key,
                        service text not null,
                        metric text not null,
                        value numeric(10,3) not null,
                        timestamp timestamptz not null,
                        meets_slo boolean not null,
                        created_at timestamptz default now()
                    );
                    
                    create index if not exists idx_sli_service_metric_timestamp 
                    on sli_measurements(service, metric, timestamp desc);
                """)
                
                # Alerts table
                cur.execute("""
                    create table if not exists observability_alerts (
                        id bigserial primary key,
                        service text not null,
                        metric text not null,
                        severity text not null,
                        message text not null,
                        threshold_breached numeric(10,3),
                        current_value numeric(10,3),
                        runbook_url text,
                        fired_at timestamptz default now(),
                        resolved_at timestamptz,
                        escalated_to text,
                        created_at timestamptz default now()
                    );
                    
                    create index if not exists idx_alerts_service_fired 
                    on observability_alerts(service, fired_at desc);
                """)
                
                # Insert default SLOs
                cur.execute("""
                    insert into slos (service, metric, threshold, window_minutes, description) values
                    ('auth', 'latency_p95', 500.0, 5, 'Authentication response time p95 < 500ms'),
                    ('auth', 'error_rate', 1.0, 5, 'Authentication error rate < 1%'),
                    ('booking', 'latency_p95', 1000.0, 5, 'Booking response time p95 < 1000ms'),
                    ('booking', 'error_rate', 0.5, 5, 'Booking error rate < 0.5%'),
                    ('payment', 'latency_p95', 2000.0, 5, 'Payment response time p95 < 2000ms'),
                    ('payment', 'error_rate', 0.1, 5, 'Payment error rate < 0.1%'),
                    ('emergency', 'latency_p95', 100.0, 1, 'Emergency call response time p95 < 100ms'),
                    ('emergency', 'error_rate', 0.0, 1, 'Emergency call error rate = 0%'),
                    ('horoscope', 'latency_p95', 800.0, 5, 'Horoscope response time p95 < 800ms'),
                    ('api_gateway', 'cpu_utilization', 80.0, 5, 'API Gateway CPU utilization < 80%')
                    on conflict (service, metric) do nothing;
                """)
                
            print("Golden Signals metrics schema setup completed")
            
        except Exception as e:
            print(f"Error setting up metrics schema: {e}")
        finally:
            POOL.putconn(conn)
    
    def collect_metrics(self, service: str, metrics: Dict[str, Any]) -> bool:
        """Collect Golden Signals metrics for a service"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into golden_signals_metrics (
                        service, latency_p50, latency_p95, latency_p99,
                        requests_per_second, error_rate, cpu_utilization,
                        memory_utilization, connection_pool_utilization
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    service,
                    metrics.get('latency_p50', 0),
                    metrics.get('latency_p95', 0),
                    metrics.get('latency_p99', 0),
                    metrics.get('requests_per_second', 0),
                    metrics.get('error_rate', 0),
                    metrics.get('cpu_utilization', 0),
                    metrics.get('memory_utilization', 0),
                    metrics.get('connection_pool_utilization', 0)
                ))
                
                # Evaluate SLOs
                self._evaluate_slos(service, metrics)
                
                return True
                
        except Exception as e:
            print(f"Error collecting metrics for {service}: {e}")
            return False
        finally:
            POOL.putconn(conn)
    
    def get_dashboard_data(self, service: str, hours: int = 24) -> Dict:
        """Get Golden Signals dashboard data for a service"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Get recent metrics
                cur.execute("""
                    select * from golden_signals_metrics 
                    where service = %s 
                    and timestamp > now() - interval '%s hours'
                    order by timestamp desc
                    limit 288  -- 5-minute intervals for 24 hours
                """, (service, hours))
                
                metrics = []
                for row in cur.fetchall():
                    metrics.append({
                        'timestamp': row[2].isoformat(),
                        'latency_p50': float(row[3]) if row[3] else 0,
                        'latency_p95': float(row[4]) if row[4] else 0,
                        'latency_p99': float(row[5]) if row[5] else 0,
                        'requests_per_second': float(row[6]) if row[6] else 0,
                        'error_rate': float(row[7]) if row[7] else 0,
                        'cpu_utilization': float(row[8]) if row[8] else 0,
                        'memory_utilization': float(row[9]) if row[9] else 0,
                        'connection_pool_utilization': float(row[10]) if row[10] else 0
                    })
                
                # Get SLO status
                cur.execute("""
                    select s.metric, s.threshold, s.description,
                           coalesce(avg(case when sli.meets_slo then 1.0 else 0.0 end), 1.0) as slo_compliance
                    from slos s
                    left join sli_measurements sli on s.service = sli.service and s.metric = sli.metric
                        and sli.timestamp > now() - interval '%s hours'
                    where s.service = %s and s.is_active = true
                    group by s.metric, s.threshold, s.description
                """, (hours, service))
                
                slos = []
                for row in cur.fetchall():
                    slos.append({
                        'metric': row[0],
                        'threshold': float(row[1]),
                        'description': row[2],
                        'compliance': float(row[3]) * 100
                    })
                
                # Get active alerts
                cur.execute("""
                    select metric, severity, message, current_value, 
                           fired_at, runbook_url
                    from observability_alerts 
                    where service = %s and resolved_at is null
                    order by fired_at desc
                """, (service,))
                
                alerts = []
                for row in cur.fetchall():
                    alerts.append({
                        'metric': row[0],
                        'severity': row[1],
                        'message': row[2],
                        'current_value': float(row[3]) if row[3] else 0,
                        'fired_at': row[4].isoformat(),
                        'runbook_url': row[5]
                    })
                
                return {
                    'service': service,
                    'metrics': metrics,
                    'slos': slos,
                    'alerts': alerts,
                    'generated_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            print(f"Error getting dashboard data for {service}: {e}")
            return {}
        finally:
            POOL.putconn(conn)
    
    def _load_slos(self) -> List[SLO]:
        """Load SLO definitions from database"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select service, metric, threshold, window_minutes, description
                    from slos where is_active = true
                """)
                
                slos = []
                for row in cur.fetchall():
                    slos.append(SLO(
                        service=row[0],
                        metric=row[1],
                        threshold=float(row[2]),
                        window_minutes=row[3],
                        description=row[4]
                    ))
                
                return slos
        except Exception as e:
            print(f"Error loading SLOs: {e}")
            return []
        finally:
            POOL.putconn(conn)
    
    def _evaluate_slos(self, service: str, metrics: Dict[str, Any]):
        """Evaluate SLOs against current metrics and trigger alerts"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                for slo in self.slos:
                    if slo.service != service:
                        continue
                    
                    metric_value = metrics.get(slo.metric)
                    if metric_value is None:
                        continue
                    
                    meets_slo = metric_value <= slo.threshold
                    
                    # Record SLI measurement
                    cur.execute("""
                        insert into sli_measurements (
                            service, metric, value, timestamp, meets_slo
                        ) values (%s, %s, %s, now(), %s)
                    """, (service, slo.metric, metric_value, meets_slo))
                    
                    # Check if alert needed
                    if not meets_slo:
                        self._fire_alert(service, slo, metric_value)
                        
        except Exception as e:
            print(f"Error evaluating SLOs for {service}: {e}")
        finally:
            POOL.putconn(conn)
    
    def _fire_alert(self, service: str, slo: SLO, current_value: float):
        """Fire an alert for SLO breach"""
        # Determine severity based on how much SLO is breached
        breach_ratio = current_value / slo.threshold
        if breach_ratio > 2.0:
            severity = AlertSeverity.EMERGENCY
        elif breach_ratio > 1.5:
            severity = AlertSeverity.CRITICAL
        else:
            severity = AlertSeverity.WARNING
        
        message = f"{service} {slo.metric} SLO breach: {current_value:.2f} > {slo.threshold:.2f}"
        
        # Map to runbook URLs
        runbook_urls = {
            'auth': '/RUNBOOKS/INCIDENT_RESPONSE.md#authentication-issues',
            'booking': '/RUNBOOKS/INCIDENT_RESPONSE.md#booking-problems',
            'payment': '/RUNBOOKS/INCIDENT_RESPONSE.md#payment-failures',
            'emergency': '/RUNBOOKS/INCIDENT_RESPONSE.md#emergency-call',
            'horoscope': '/RUNBOOKS/INCIDENT_RESPONSE.md#performance-issues'
        }
        
        runbook_url = runbook_urls.get(service, '/RUNBOOKS/INCIDENT_RESPONSE.md')
        
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Check if alert already exists (avoid spam)
                cur.execute("""
                    select id from observability_alerts 
                    where service = %s and metric = %s and resolved_at is null
                    and fired_at > now() - interval '15 minutes'
                """, (service, slo.metric))
                
                if not cur.fetchone():
                    # Fire new alert
                    cur.execute("""
                        insert into observability_alerts (
                            service, metric, severity, message, threshold_breached,
                            current_value, runbook_url
                        ) values (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        service, slo.metric, severity.value, message,
                        slo.threshold, current_value, runbook_url
                    ))
                    
                    # Escalate to on-call if critical/emergency
                    if severity in [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]:
                        self._escalate_alert(service, slo.metric, severity, message)
                        
        except Exception as e:
            print(f"Error firing alert for {service}: {e}")
        finally:
            POOL.putconn(conn)
    
    def _escalate_alert(self, service: str, metric: str, severity: AlertSeverity, message: str):
        """Escalate alert to M32 on-call system"""
        try:
            from on_call_escalation_service import OnCallService, SeverityLevel
            
            # Map observability severity to incident severity
            sev_mapping = {
                AlertSeverity.WARNING: SeverityLevel.SEV_3,
                AlertSeverity.CRITICAL: SeverityLevel.SEV_2,
                AlertSeverity.EMERGENCY: SeverityLevel.SEV_1
            }
            
            incident_severity = sev_mapping.get(severity, SeverityLevel.SEV_3)
            incident_id = f"OBS-{service.upper()}-{int(time.time())}"
            
            on_call_service = OnCallService()
            result = on_call_service.trigger_incident_escalation(
                incident_id=incident_id,
                severity=incident_severity,
                description=f"Observability Alert: {message}",
                emergency_call=(severity == AlertSeverity.EMERGENCY and service == 'emergency')
            )
            
            print(f"Alert escalated to on-call: {incident_id}")
            return result
            
        except ImportError:
            print("On-call escalation service not available")
        except Exception as e:
            print(f"Error escalating alert: {e}")

def main():
    """Main function for Golden Signals operations"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python golden_signals_service.py setup                    # Setup database schema")
        print("  python golden_signals_service.py collect <service>       # Collect sample metrics")
        print("  python golden_signals_service.py dashboard <service>     # Get dashboard data")
        print("  python golden_signals_service.py test                    # Test with sample data")
        return False
    
    command = sys.argv[1].lower()
    service = GoldenSignalsService()
    
    if command == 'setup':
        print("Golden Signals monitoring setup completed")
        return True
    
    elif command == 'collect':
        if len(sys.argv) < 3:
            print("Usage: collect <service>")
            return False
        
        service_name = sys.argv[2]
        
        # Simulate collecting metrics (in production, this would come from actual monitoring)
        sample_metrics = {
            'latency_p50': 150.0,
            'latency_p95': 350.0,
            'latency_p99': 500.0,
            'requests_per_second': 45.2,
            'error_rate': 0.5,
            'cpu_utilization': 65.0,
            'memory_utilization': 72.0,
            'connection_pool_utilization': 45.0
        }
        
        success = service.collect_metrics(service_name, sample_metrics)
        print(f"Metrics collection for {service_name}: {'Success' if success else 'Failed'}")
        return success
    
    elif command == 'dashboard':
        if len(sys.argv) < 3:
            print("Usage: dashboard <service>")
            return False
        
        service_name = sys.argv[2]
        dashboard_data = service.get_dashboard_data(service_name)
        
        print(f"Dashboard Data for {service_name}:")
        print(json.dumps(dashboard_data, indent=2))
        return True
    
    elif command == 'test':
        print("Testing Golden Signals with sample data...")
        
        services = ['auth', 'booking', 'payment', 'emergency']
        
        for svc in services:
            # Generate sample metrics that trigger different SLO states
            if svc == 'emergency':
                # Emergency should have very strict SLOs
                sample_metrics = {
                    'latency_p95': 150.0,  # Breach: > 100ms
                    'error_rate': 0.1      # Breach: > 0%
                }
            else:
                sample_metrics = {
                    'latency_p50': 200.0,
                    'latency_p95': 450.0,
                    'latency_p99': 800.0,
                    'requests_per_second': 25.0,
                    'error_rate': 0.8,
                    'cpu_utilization': 70.0,
                    'memory_utilization': 65.0,
                    'connection_pool_utilization': 40.0
                }
            
            success = service.collect_metrics(svc, sample_metrics)
            print(f"Test metrics for {svc}: {'Success' if success else 'Failed'}")
        
        print("\nTest completed - check dashboards for SLO breaches and alerts")
        return True
    
    else:
        print(f"Unknown command: {command}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)