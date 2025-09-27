#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Burn Rate Alerting Service
Implements multi-window burn-rate alerts for SLO monitoring
"""

import os
import sys
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
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
POOL = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)

class BurnRateWindow(Enum):
    FAST = "fast"      # Short window: 5 minutes
    SLOW = "slow"      # Long window: 60 minutes

@dataclass
class BurnRateAlert:
    """Burn rate alert configuration"""
    service: str
    metric: str
    fast_window_minutes: int = 5
    slow_window_minutes: int = 60
    fast_threshold: float = 0.9    # 90% error budget consumption in 5 min
    slow_threshold: float = 0.1    # 10% error budget consumption in 60 min
    slo_target: float = 99.9       # 99.9% uptime target

class BurnRateAlertingService:
    """Service for multi-window burn-rate alerting"""
    
    def __init__(self):
        self.setup_burn_rate_schema()
        self.alert_configs = self._load_alert_configs()
    
    def setup_burn_rate_schema(self):
        """Setup database schema for burn rate alerting"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Burn rate alert configurations
                cur.execute("""
                    create table if not exists burn_rate_alerts (
                        id bigserial primary key,
                        service text not null,
                        metric text not null,
                        fast_window_minutes int default 5,
                        slow_window_minutes int default 60,
                        fast_threshold numeric(3,2) default 0.9,
                        slow_threshold numeric(3,2) default 0.1,
                        slo_target numeric(5,2) default 99.9,
                        is_active boolean default true,
                        created_at timestamptz default now(),
                        unique (service, metric)
                    );
                """)
                
                # Error budget tracking
                cur.execute("""
                    create table if not exists error_budget_tracking (
                        id bigserial primary key,
                        service text not null,
                        metric text not null,
                        window_start timestamptz not null,
                        window_end timestamptz not null,
                        budget_consumed numeric(5,2) not null,
                        budget_remaining numeric(5,2) not null,
                        burn_rate numeric(8,4) not null,
                        window_type text not null check (window_type in ('fast', 'slow')),
                        created_at timestamptz default now()
                    );
                    
                    create index if not exists idx_error_budget_service_window 
                    on error_budget_tracking(service, window_start desc);
                """)
                
                # Burn rate incidents
                cur.execute("""
                    create table if not exists burn_rate_incidents (
                        id bigserial primary key,
                        service text not null,
                        metric text not null,
                        incident_type text not null check (incident_type in ('fast_burn', 'slow_burn', 'budget_exhausted')),
                        burn_rate numeric(8,4) not null,
                        budget_consumed numeric(5,2) not null,
                        threshold_breached numeric(3,2) not null,
                        started_at timestamptz default now(),
                        resolved_at timestamptz,
                        escalated_incident_id text,
                        created_at timestamptz default now()
                    );
                    
                    create index if not exists idx_burn_rate_incidents_service 
                    on burn_rate_incidents(service, started_at desc);
                """)
                
                # Insert default burn rate alert configs
                cur.execute("""
                    insert into burn_rate_alerts (service, metric, slo_target) values
                    ('auth', 'error_rate', 99.9),
                    ('booking', 'error_rate', 99.5),
                    ('payment', 'error_rate', 99.9),
                    ('emergency', 'error_rate', 100.0),
                    ('horoscope', 'error_rate', 99.0),
                    ('auth', 'latency_p95', 99.0),
                    ('booking', 'latency_p95', 98.0),
                    ('payment', 'latency_p95', 99.0),
                    ('emergency', 'latency_p95', 99.9)
                    on conflict (service, metric) do nothing;
                """)
                
            print("Burn rate alerting schema setup completed")
            
        except Exception as e:
            print(f"Error setting up burn rate schema: {e}")
        finally:
            POOL.putconn(conn)
    
    def calculate_burn_rate(self, service: str, metric: str, window_minutes: int) -> Dict:
        """Calculate burn rate for a service metric over a time window"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Get SLI measurements for the window
                cur.execute("""
                    select meets_slo, value from sli_measurements 
                    where service = %s and metric = %s 
                    and timestamp > now() - interval '%s minutes'
                    order by timestamp desc
                """, (service, metric, window_minutes))
                
                measurements = cur.fetchall()
                if not measurements:
                    return {'error': 'No measurements found'}
                
                total_measurements = len(measurements)
                failed_measurements = sum(1 for meets_slo, _ in measurements if not meets_slo)
                
                error_rate = (failed_measurements / total_measurements) * 100
                
                # Get SLO target for this service/metric
                cur.execute("""
                    select slo_target from burn_rate_alerts 
                    where service = %s and metric = %s and is_active = true
                """, (service, metric))
                
                slo_result = cur.fetchone()
                slo_target = float(slo_result[0]) if slo_result else 99.0
                
                # Calculate error budget
                allowed_error_rate = 100.0 - slo_target
                budget_consumed = (error_rate / allowed_error_rate) * 100 if allowed_error_rate > 0 else 0
                budget_remaining = max(0, 100.0 - budget_consumed)
                
                # Calculate burn rate (budget consumption rate)
                window_hours = window_minutes / 60.0
                monthly_hours = 30 * 24  # 720 hours per month
                burn_rate = (budget_consumed / 100.0) * (monthly_hours / window_hours)
                
                result = {
                    'service': service,
                    'metric': metric,
                    'window_minutes': window_minutes,
                    'total_measurements': total_measurements,
                    'failed_measurements': failed_measurements,
                    'error_rate': error_rate,
                    'slo_target': slo_target,
                    'budget_consumed': budget_consumed,
                    'budget_remaining': budget_remaining,
                    'burn_rate': burn_rate,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Store the calculation
                self._store_error_budget_tracking(result, window_minutes)
                
                return result
                
        except Exception as e:
            print(f"Error calculating burn rate for {service}: {e}")
            return {'error': str(e)}
        finally:
            POOL.putconn(conn)
    
    def evaluate_burn_rate_alerts(self, service: str, metric: str) -> List[Dict]:
        """Evaluate burn rate alerts for fast and slow windows"""
        alerts_fired = []
        
        # Get alert configuration
        config = next((c for c in self.alert_configs if c.service == service and c.metric == metric), None)
        if not config:
            return alerts_fired
        
        # Calculate burn rates for both windows
        fast_burn = self.calculate_burn_rate(service, metric, config.fast_window_minutes)
        slow_burn = self.calculate_burn_rate(service, metric, config.slow_window_minutes)
        
        # Check fast burn alert
        if 'error' not in fast_burn and fast_burn['budget_consumed'] > config.fast_threshold * 100:
            alert = self._fire_burn_rate_alert(
                service, metric, 'fast_burn', fast_burn, config.fast_threshold * 100
            )
            alerts_fired.append(alert)
        
        # Check slow burn alert
        if 'error' not in slow_burn and slow_burn['budget_consumed'] > config.slow_threshold * 100:
            alert = self._fire_burn_rate_alert(
                service, metric, 'slow_burn', slow_burn, config.slow_threshold * 100
            )
            alerts_fired.append(alert)
        
        # Check budget exhaustion (95% consumed)
        if 'error' not in slow_burn and slow_burn['budget_consumed'] > 95.0:
            alert = self._fire_burn_rate_alert(
                service, metric, 'budget_exhausted', slow_burn, 95.0
            )
            alerts_fired.append(alert)
        
        return alerts_fired
    
    def _fire_burn_rate_alert(self, service: str, metric: str, incident_type: str, 
                             burn_data: Dict, threshold: float) -> Dict:
        """Fire a burn rate alert and escalate if necessary"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Check if alert already exists (avoid spam)
                cur.execute("""
                    select id from burn_rate_incidents 
                    where service = %s and metric = %s and incident_type = %s 
                    and resolved_at is null and started_at > now() - interval '30 minutes'
                """, (service, metric, incident_type))
                
                if cur.fetchone():
                    return {'status': 'duplicate_alert_suppressed'}
                
                # Create burn rate incident
                cur.execute("""
                    insert into burn_rate_incidents (
                        service, metric, incident_type, burn_rate, 
                        budget_consumed, threshold_breached
                    ) values (%s, %s, %s, %s, %s, %s)
                    returning id
                """, (
                    service, metric, incident_type, 
                    burn_data['burn_rate'], burn_data['budget_consumed'], threshold
                ))
                
                incident_id = cur.fetchone()[0]
                
                # Escalate based on incident type
                escalated_incident_id = None
                if incident_type in ['fast_burn', 'budget_exhausted']:
                    escalated_incident_id = self._escalate_burn_rate_alert(
                        service, metric, incident_type, burn_data
                    )
                    
                    if escalated_incident_id:
                        cur.execute("""
                            update burn_rate_incidents 
                            set escalated_incident_id = %s 
                            where id = %s
                        """, (escalated_incident_id, incident_id))
                
                alert_result = {
                    'incident_id': incident_id,
                    'service': service,
                    'metric': metric,
                    'incident_type': incident_type,
                    'burn_rate': burn_data['burn_rate'],
                    'budget_consumed': burn_data['budget_consumed'],
                    'threshold_breached': threshold,
                    'escalated_incident_id': escalated_incident_id,
                    'status': 'alert_fired'
                }
                
                print(f"Burn rate alert fired: {service} {metric} {incident_type}")
                return alert_result
                
        except Exception as e:
            print(f"Error firing burn rate alert: {e}")
            return {'status': 'error', 'error': str(e)}
        finally:
            POOL.putconn(conn)
    
    def _escalate_burn_rate_alert(self, service: str, metric: str, incident_type: str, 
                                 burn_data: Dict) -> Optional[str]:
        """Escalate burn rate alert to M32 on-call system"""
        try:
            from on_call_escalation_service import OnCallService, SeverityLevel
            
            # Map incident type to severity
            severity_mapping = {
                'fast_burn': SeverityLevel.SEV_2,      # Fast burn = urgent
                'slow_burn': SeverityLevel.SEV_3,      # Slow burn = warning
                'budget_exhausted': SeverityLevel.SEV_1  # Budget exhausted = critical
            }
            
            severity = severity_mapping.get(incident_type, SeverityLevel.SEV_3)
            incident_id = f"BURN-{service.upper()}-{metric.upper()}-{int(time.time())}"
            
            description = f"""
Burn Rate Alert: {service} {metric}
Incident Type: {incident_type}
Budget Consumed: {burn_data['budget_consumed']:.1f}%
Burn Rate: {burn_data['burn_rate']:.2f}x
SLO Target: {burn_data['slo_target']}%

This indicates potential SLO violation requiring immediate attention.
            """.strip()
            
            on_call_service = OnCallService()
            result = on_call_service.trigger_incident_escalation(
                incident_id=incident_id,
                severity=severity,
                description=description,
                emergency_call=(incident_type == 'budget_exhausted' and service == 'emergency')
            )
            
            print(f"Burn rate alert escalated: {incident_id}")
            return incident_id
            
        except ImportError:
            print("On-call escalation service not available")
        except Exception as e:
            print(f"Error escalating burn rate alert: {e}")
        
        return None
    
    def _store_error_budget_tracking(self, burn_data: Dict, window_minutes: int):
        """Store error budget tracking data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                window_type = 'fast' if window_minutes <= 10 else 'slow'
                
                cur.execute("""
                    insert into error_budget_tracking (
                        service, metric, window_start, window_end,
                        budget_consumed, budget_remaining, burn_rate, window_type
                    ) values (
                        %s, %s, 
                        now() - interval '%s minutes', now(),
                        %s, %s, %s, %s
                    )
                """, (
                    burn_data['service'], burn_data['metric'], window_minutes,
                    burn_data['budget_consumed'], burn_data['budget_remaining'],
                    burn_data['burn_rate'], window_type
                ))
                
        except Exception as e:
            print(f"Error storing error budget tracking: {e}")
        finally:
            POOL.putconn(conn)
    
    def _load_alert_configs(self) -> List[BurnRateAlert]:
        """Load burn rate alert configurations from database"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select service, metric, fast_window_minutes, slow_window_minutes,
                           fast_threshold, slow_threshold, slo_target
                    from burn_rate_alerts where is_active = true
                """)
                
                configs = []
                for row in cur.fetchall():
                    configs.append(BurnRateAlert(
                        service=row[0],
                        metric=row[1],
                        fast_window_minutes=row[2],
                        slow_window_minutes=row[3],
                        fast_threshold=float(row[4]),
                        slow_threshold=float(row[5]),
                        slo_target=float(row[6])
                    ))
                
                return configs
                
        except Exception as e:
            print(f"Error loading alert configs: {e}")
            return []
        finally:
            POOL.putconn(conn)
    
    def get_burn_rate_dashboard(self, service: str = None) -> Dict:
        """Get burn rate dashboard data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                service_filter = "where service = %s" if service else ""
                params = [service] if service else []
                
                # Get recent burn rate incidents
                cur.execute(f"""
                    select service, metric, incident_type, burn_rate, 
                           budget_consumed, started_at, resolved_at,
                           escalated_incident_id
                    from burn_rate_incidents 
                    {service_filter}
                    order by started_at desc
                    limit 50
                """, params)
                
                incidents = []
                for row in cur.fetchall():
                    incidents.append({
                        'service': row[0],
                        'metric': row[1],
                        'incident_type': row[2],
                        'burn_rate': float(row[3]),
                        'budget_consumed': float(row[4]),
                        'started_at': row[5].isoformat(),
                        'resolved_at': row[6].isoformat() if row[6] else None,
                        'escalated_incident_id': row[7],
                        'status': 'resolved' if row[6] else 'active'
                    })
                
                # Get current error budget status
                cur.execute(f"""
                    select distinct on (service, metric) 
                           service, metric, budget_remaining, burn_rate, 
                           window_type, created_at
                    from error_budget_tracking 
                    {service_filter}
                    order by service, metric, created_at desc
                """, params)
                
                budget_status = []
                for row in cur.fetchall():
                    budget_status.append({
                        'service': row[0],
                        'metric': row[1],
                        'budget_remaining': float(row[2]),
                        'burn_rate': float(row[3]),
                        'window_type': row[4],
                        'last_updated': row[5].isoformat()
                    })
                
                return {
                    'incidents': incidents,
                    'budget_status': budget_status,
                    'generated_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            print(f"Error getting burn rate dashboard: {e}")
            return {}
        finally:
            POOL.putconn(conn)

def main():
    """Main function for burn rate alerting operations"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python burn_rate_alerting_service.py setup                      # Setup schema")
        print("  python burn_rate_alerting_service.py calculate <service> <metric>  # Calculate burn rate")
        print("  python burn_rate_alerting_service.py evaluate <service> <metric>   # Evaluate alerts")
        print("  python burn_rate_alerting_service.py dashboard [service]           # Get dashboard data")
        print("  python burn_rate_alerting_service.py test                          # Test with sample data")
        return False
    
    command = sys.argv[1].lower()
    service = BurnRateAlertingService()
    
    if command == 'setup':
        print("Burn rate alerting setup completed")
        return True
    
    elif command == 'calculate':
        if len(sys.argv) < 4:
            print("Usage: calculate <service> <metric>")
            return False
        
        service_name = sys.argv[2]
        metric_name = sys.argv[3]
        
        # Calculate for both windows
        fast_result = service.calculate_burn_rate(service_name, metric_name, 5)
        slow_result = service.calculate_burn_rate(service_name, metric_name, 60)
        
        print(f"Burn Rate Calculation for {service_name} {metric_name}:")
        print(f"Fast Window (5m): {json.dumps(fast_result, indent=2)}")
        print(f"Slow Window (60m): {json.dumps(slow_result, indent=2)}")
        
        return True
    
    elif command == 'evaluate':
        if len(sys.argv) < 4:
            print("Usage: evaluate <service> <metric>")
            return False
        
        service_name = sys.argv[2]
        metric_name = sys.argv[3]
        
        alerts = service.evaluate_burn_rate_alerts(service_name, metric_name)
        
        print(f"Burn Rate Alert Evaluation for {service_name} {metric_name}:")
        if alerts:
            for alert in alerts:
                print(f"Alert: {json.dumps(alert, indent=2)}")
        else:
            print("No alerts triggered")
        
        return True
    
    elif command == 'dashboard':
        service_name = sys.argv[2] if len(sys.argv) > 2 else None
        dashboard_data = service.get_burn_rate_dashboard(service_name)
        
        print("Burn Rate Dashboard:")
        print(json.dumps(dashboard_data, indent=2))
        return True
    
    elif command == 'test':
        print("Testing burn rate alerting with sample scenarios...")
        
        # This would typically be called by the Golden Signals service
        # when SLI measurements are recorded
        
        test_cases = [
            ('auth', 'error_rate'),
            ('payment', 'error_rate'),
            ('emergency', 'error_rate')
        ]
        
        for svc, metric in test_cases:
            alerts = service.evaluate_burn_rate_alerts(svc, metric)
            print(f"Test evaluation for {svc} {metric}: {len(alerts)} alerts")
        
        return True
    
    else:
        print(f"Unknown command: {command}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)