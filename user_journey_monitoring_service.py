#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
User Journey Monitoring Service
Monitors critical user flows: Login → Booking → Payment → Emergency Call
"""

import os
import sys
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
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
POOL = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)

class JourneyType(Enum):
    LOGIN_TO_BOOKING = "login_to_booking"
    BOOKING_TO_PAYMENT = "booking_to_payment"
    PAYMENT_TO_CONFIRMATION = "payment_to_confirmation"
    EMERGENCY_CALL_FLOW = "emergency_call_flow"
    READER_CONNECT_FLOW = "reader_connect_flow"
    HOROSCOPE_DELIVERY = "horoscope_delivery"

class JourneyStage(Enum):
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ABANDONED = "abandoned"

@dataclass
class UserJourneyEvent:
    """Individual event in a user journey"""
    journey_id: str
    journey_type: JourneyType
    stage: JourneyStage
    event_name: str
    user_id: str
    session_id: str
    timestamp: datetime
    duration_ms: Optional[int] = None
    metadata: Dict[str, Any] = None
    error_details: Optional[str] = None

@dataclass
class JourneyMetrics:
    """Aggregated metrics for a journey type"""
    journey_type: str
    window_start: datetime
    window_end: datetime
    total_journeys: int
    completed_journeys: int
    failed_journeys: int
    abandoned_journeys: int
    completion_rate: float
    avg_duration_ms: float
    p95_duration_ms: float
    failure_points: Dict[str, int]

class UserJourneyMonitoringService:
    """Service for monitoring user journey flows"""
    
    def __init__(self):
        self.setup_journey_schema()
    
    def setup_journey_schema(self):
        """Setup database schema for user journey monitoring"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # User journey events
                cur.execute("""
                    create table if not exists user_journey_events (
                        id bigserial primary key,
                        journey_id text not null,
                        journey_type text not null,
                        stage text not null,
                        event_name text not null,
                        user_id uuid,
                        session_id text,
                        timestamp timestamptz not null,
                        duration_ms int,
                        metadata jsonb,
                        error_details text,
                        created_at timestamptz default now()
                    );
                    
                    create index if not exists idx_journey_events_type_timestamp 
                    on user_journey_events(journey_type, timestamp desc);
                    
                    create index if not exists idx_journey_events_journey_id 
                    on user_journey_events(journey_id, timestamp);
                """)
                
                # Journey funnel metrics
                cur.execute("""
                    create table if not exists journey_funnel_metrics (
                        id bigserial primary key,
                        journey_type text not null,
                        window_start timestamptz not null,
                        window_end timestamptz not null,
                        total_started int not null,
                        completed int not null,
                        failed int not null,
                        abandoned int not null,
                        completion_rate numeric(5,2) not null,
                        avg_duration_ms numeric(10,3),
                        p95_duration_ms numeric(10,3),
                        failure_points jsonb,
                        created_at timestamptz default now()
                    );
                    
                    create index if not exists idx_funnel_metrics_type_window 
                    on journey_funnel_metrics(journey_type, window_start desc);
                """)
                
                # Journey SLOs
                cur.execute("""
                    create table if not exists journey_slos (
                        id bigserial primary key,
                        journey_type text unique not null,
                        completion_rate_target numeric(5,2) not null,
                        duration_p95_target_ms int not null,
                        description text not null,
                        is_active boolean default true,
                        created_at timestamptz default now()
                    );
                """)
                
                # Insert default journey SLOs
                cur.execute("""
                    insert into journey_slos (journey_type, completion_rate_target, duration_p95_target_ms, description) values
                    ('login_to_booking', 85.0, 120000, 'Login to booking completion rate > 85% in < 2 minutes'),
                    ('booking_to_payment', 90.0, 180000, 'Booking to payment completion rate > 90% in < 3 minutes'),
                    ('payment_to_confirmation', 95.0, 30000, 'Payment to confirmation > 95% in < 30 seconds'),
                    ('emergency_call_flow', 99.0, 10000, 'Emergency call flow > 99% in < 10 seconds'),
                    ('reader_connect_flow', 88.0, 60000, 'Reader connection > 88% in < 1 minute'),
                    ('horoscope_delivery', 95.0, 5000, 'Horoscope delivery > 95% in < 5 seconds')
                    on conflict (journey_type) do nothing;
                """)
                
            print("User journey monitoring schema setup completed")
            
        except Exception as e:
            print(f"Error setting up journey schema: {e}")
        finally:
            POOL.putconn(conn)
    
    def track_journey_event(self, event: UserJourneyEvent):
        """Track a user journey event"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into user_journey_events (
                        journey_id, journey_type, stage, event_name,
                        user_id, session_id, timestamp, duration_ms,
                        metadata, error_details
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    event.journey_id, event.journey_type.value, event.stage.value,
                    event.event_name, event.user_id, event.session_id,
                    event.timestamp, event.duration_ms,
                    json.dumps(event.metadata) if event.metadata else None,
                    event.error_details
                ))
                
                # Check if journey completed or failed for SLO evaluation
                if event.stage in [JourneyStage.COMPLETED, JourneyStage.FAILED]:
                    self._evaluate_journey_slo(event)
                
        except Exception as e:
            print(f"Error tracking journey event: {e}")
        finally:
            POOL.putconn(conn)
    
    def analyze_journey_funnel(self, journey_type: JourneyType, hours: int = 24) -> JourneyMetrics:
        """Analyze funnel metrics for a journey type"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                window_start = datetime.now() - timedelta(hours=hours)
                window_end = datetime.now()
                
                # Get journey completion stats
                cur.execute("""
                    with journey_outcomes as (
                        select distinct on (journey_id) 
                               journey_id, stage, duration_ms
                        from user_journey_events 
                        where journey_type = %s 
                        and timestamp > %s
                        order by journey_id, timestamp desc
                    )
                    select 
                        count(*) as total,
                        sum(case when stage = 'completed' then 1 else 0 end) as completed,
                        sum(case when stage = 'failed' then 1 else 0 end) as failed,
                        sum(case when stage = 'abandoned' then 1 else 0 end) as abandoned,
                        avg(duration_ms) as avg_duration,
                        percentile_cont(0.95) within group (order by duration_ms) as p95_duration
                    from journey_outcomes
                    where duration_ms is not null
                """, (journey_type.value, window_start))
                
                stats = cur.fetchone()
                if not stats or stats[0] == 0:
                    return JourneyMetrics(
                        journey_type=journey_type.value,
                        window_start=window_start,
                        window_end=window_end,
                        total_journeys=0,
                        completed_journeys=0,
                        failed_journeys=0,
                        abandoned_journeys=0,
                        completion_rate=0.0,
                        avg_duration_ms=0.0,
                        p95_duration_ms=0.0,
                        failure_points={}
                    )
                
                total_journeys = stats[0]
                completed_journeys = stats[1] or 0
                failed_journeys = stats[2] or 0
                abandoned_journeys = stats[3] or 0
                avg_duration = float(stats[4]) if stats[4] else 0.0
                p95_duration = float(stats[5]) if stats[5] else 0.0
                
                completion_rate = (completed_journeys / total_journeys) * 100 if total_journeys > 0 else 0
                
                # Get failure points
                cur.execute("""
                    select event_name, count(*) as failure_count
                    from user_journey_events 
                    where journey_type = %s 
                    and stage = 'failed'
                    and timestamp > %s
                    group by event_name
                    order by failure_count desc
                """, (journey_type.value, window_start))
                
                failure_points = {row[0]: row[1] for row in cur.fetchall()}
                
                metrics = JourneyMetrics(
                    journey_type=journey_type.value,
                    window_start=window_start,
                    window_end=window_end,
                    total_journeys=total_journeys,
                    completed_journeys=completed_journeys,
                    failed_journeys=failed_journeys,
                    abandoned_journeys=abandoned_journeys,
                    completion_rate=completion_rate,
                    avg_duration_ms=avg_duration,
                    p95_duration_ms=p95_duration,
                    failure_points=failure_points
                )
                
                # Store metrics
                self._store_funnel_metrics(metrics)
                
                return metrics
                
        except Exception as e:
            print(f"Error analyzing journey funnel: {e}")
            return None
        finally:
            POOL.putconn(conn)
    
    def get_journey_dashboard(self, hours: int = 24) -> Dict:
        """Get user journey monitoring dashboard data"""
        dashboard_data = {
            'journey_metrics': {},
            'slo_compliance': {},
            'critical_failures': [],
            'performance_trends': {},
            'generated_at': datetime.now().isoformat()
        }
        
        # Analyze each journey type
        for journey_type in JourneyType:
            metrics = self.analyze_journey_funnel(journey_type, hours)
            if metrics:
                dashboard_data['journey_metrics'][journey_type.value] = asdict(metrics)
                
                # Check SLO compliance
                slo_compliance = self._check_journey_slo_compliance(journey_type, metrics)
                dashboard_data['slo_compliance'][journey_type.value] = slo_compliance
        
        # Get critical failures
        dashboard_data['critical_failures'] = self._get_critical_journey_failures(hours)
        
        # Get performance trends
        dashboard_data['performance_trends'] = self._get_journey_performance_trends(hours)
        
        return dashboard_data
    
    def _evaluate_journey_slo(self, event: UserJourneyEvent):
        """Evaluate journey completion against SLO"""
        if event.stage not in [JourneyStage.COMPLETED, JourneyStage.FAILED]:
            return
        
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Get SLO targets
                cur.execute("""
                    select completion_rate_target, duration_p95_target_ms
                    from journey_slos 
                    where journey_type = %s and is_active = true
                """, (event.journey_type.value,))
                
                slo = cur.fetchone()
                if not slo:
                    return
                
                completion_rate_target = float(slo[0])
                duration_target_ms = slo[1]
                
                # Check if this journey violates SLO
                slo_violations = []
                
                if event.stage == JourneyStage.FAILED:
                    slo_violations.append("journey_failed")
                
                if event.duration_ms and event.duration_ms > duration_target_ms:
                    slo_violations.append("duration_exceeded")
                
                # If violations found, potentially alert
                if slo_violations:
                    self._handle_journey_slo_violation(event, slo_violations)
                
        except Exception as e:
            print(f"Error evaluating journey SLO: {e}")
        finally:
            POOL.putconn(conn)
    
    def _handle_journey_slo_violation(self, event: UserJourneyEvent, violations: List[str]):
        """Handle journey SLO violation"""
        # For critical journeys like emergency_call, escalate immediately
        if event.journey_type == JourneyType.EMERGENCY_CALL_FLOW:
            try:
                from on_call_escalation_service import OnCallService, SeverityLevel
                
                incident_id = f"JOURNEY-EMERGENCY-{int(time.time())}"
                description = f"""
Emergency Call Journey Failure
Journey ID: {event.journey_id}
User ID: {event.user_id}
Violations: {', '.join(violations)}
Duration: {event.duration_ms}ms
Error: {event.error_details or 'Unknown error'}

Emergency call functionality is critical and must be addressed immediately.
                """.strip()
                
                on_call_service = OnCallService()
                on_call_service.trigger_incident_escalation(
                    incident_id=incident_id,
                    severity=SeverityLevel.SEV_1,
                    description=description,
                    emergency_call=True
                )
                
                print(f"Emergency journey violation escalated: {incident_id}")
                
            except ImportError:
                print("On-call escalation service not available")
            except Exception as e:
                print(f"Error escalating journey violation: {e}")
    
    def _check_journey_slo_compliance(self, journey_type: JourneyType, metrics: JourneyMetrics) -> Dict:
        """Check journey SLO compliance"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select completion_rate_target, duration_p95_target_ms, description
                    from journey_slos 
                    where journey_type = %s and is_active = true
                """, (journey_type.value,))
                
                slo = cur.fetchone()
                if not slo:
                    return {'error': 'No SLO defined'}
                
                completion_rate_target = float(slo[0])
                duration_target_ms = slo[1]
                description = slo[2]
                
                completion_compliant = metrics.completion_rate >= completion_rate_target
                duration_compliant = metrics.p95_duration_ms <= duration_target_ms
                
                return {
                    'completion_rate': {
                        'target': completion_rate_target,
                        'actual': metrics.completion_rate,
                        'compliant': completion_compliant
                    },
                    'duration_p95': {
                        'target_ms': duration_target_ms,
                        'actual_ms': metrics.p95_duration_ms,
                        'compliant': duration_compliant
                    },
                    'overall_compliant': completion_compliant and duration_compliant,
                    'description': description
                }
                
        except Exception as e:
            print(f"Error checking SLO compliance: {e}")
            return {'error': str(e)}
        finally:
            POOL.putconn(conn)
    
    def _get_critical_journey_failures(self, hours: int) -> List[Dict]:
        """Get critical journey failures in the last N hours"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select journey_type, event_name, error_details, 
                           count(*) as failure_count,
                           max(timestamp) as latest_failure
                    from user_journey_events 
                    where stage = 'failed' 
                    and timestamp > now() - interval '%s hours'
                    and journey_type in ('emergency_call_flow', 'payment_to_confirmation')
                    group by journey_type, event_name, error_details
                    having count(*) >= 3  -- At least 3 failures
                    order by failure_count desc, latest_failure desc
                """, (hours,))
                
                failures = []
                for row in cur.fetchall():
                    failures.append({
                        'journey_type': row[0],
                        'event_name': row[1],
                        'error_details': row[2],
                        'failure_count': row[3],
                        'latest_failure': row[4].isoformat()
                    })
                
                return failures
                
        except Exception as e:
            print(f"Error getting critical failures: {e}")
            return []
        finally:
            POOL.putconn(conn)
    
    def _get_journey_performance_trends(self, hours: int) -> Dict:
        """Get journey performance trends"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Get hourly completion rates
                cur.execute("""
                    select journey_type,
                           date_trunc('hour', timestamp) as hour,
                           count(*) as total,
                           sum(case when stage = 'completed' then 1 else 0 end) as completed
                    from user_journey_events 
                    where timestamp > now() - interval '%s hours'
                    group by journey_type, date_trunc('hour', timestamp)
                    order by journey_type, hour
                """, (hours,))
                
                trends = {}
                for row in cur.fetchall():
                    journey_type = row[0]
                    hour = row[1].isoformat()
                    total = row[2]
                    completed = row[3]
                    completion_rate = (completed / total) * 100 if total > 0 else 0
                    
                    if journey_type not in trends:
                        trends[journey_type] = []
                    
                    trends[journey_type].append({
                        'hour': hour,
                        'total_journeys': total,
                        'completed_journeys': completed,
                        'completion_rate': completion_rate
                    })
                
                return trends
                
        except Exception as e:
            print(f"Error getting performance trends: {e}")
            return {}
        finally:
            POOL.putconn(conn)
    
    def _store_funnel_metrics(self, metrics: JourneyMetrics):
        """Store funnel metrics in database"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into journey_funnel_metrics (
                        journey_type, window_start, window_end, total_started,
                        completed, failed, abandoned, completion_rate,
                        avg_duration_ms, p95_duration_ms, failure_points
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    metrics.journey_type, metrics.window_start, metrics.window_end,
                    metrics.total_journeys, metrics.completed_journeys,
                    metrics.failed_journeys, metrics.abandoned_journeys,
                    metrics.completion_rate, metrics.avg_duration_ms,
                    metrics.p95_duration_ms, json.dumps(metrics.failure_points)
                ))
                
        except Exception as e:
            print(f"Error storing funnel metrics: {e}")
        finally:
            POOL.putconn(conn)

def main():
    """Main function for user journey monitoring operations"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python user_journey_monitoring_service.py setup                    # Setup schema")
        print("  python user_journey_monitoring_service.py analyze <journey_type>  # Analyze funnel")
        print("  python user_journey_monitoring_service.py dashboard               # Get dashboard data")
        print("  python user_journey_monitoring_service.py simulate               # Simulate test data")
        return False
    
    command = sys.argv[1].lower()
    service = UserJourneyMonitoringService()
    
    if command == 'setup':
        print("User journey monitoring setup completed")
        return True
    
    elif command == 'analyze':
        if len(sys.argv) < 3:
            print("Usage: analyze <journey_type>")
            print("Available journey types:", [jt.value for jt in JourneyType])
            return False
        
        journey_type_str = sys.argv[2]
        try:
            journey_type = JourneyType(journey_type_str)
        except ValueError:
            print(f"Invalid journey type: {journey_type_str}")
            return False
        
        metrics = service.analyze_journey_funnel(journey_type)
        if metrics:
            print(f"Journey Metrics for {journey_type.value}:")
            print(json.dumps(asdict(metrics), default=str, indent=2))
        else:
            print("No metrics available")
        
        return True
    
    elif command == 'dashboard':
        dashboard_data = service.get_journey_dashboard()
        print("User Journey Dashboard:")
        print(json.dumps(dashboard_data, default=str, indent=2))
        return True
    
    elif command == 'simulate':
        print("Simulating user journey test data...")
        
        # Simulate various journey outcomes
        import uuid
        from random import choice, randint
        
        journey_types = [JourneyType.LOGIN_TO_BOOKING, JourneyType.BOOKING_TO_PAYMENT, 
                        JourneyType.EMERGENCY_CALL_FLOW]
        
        for _ in range(20):
            journey_id = str(uuid.uuid4())
            journey_type = choice(journey_types)
            user_id = str(uuid.uuid4())
            session_id = f"sess_{randint(1000, 9999)}"
            
            # Simulate journey outcome
            if journey_type == JourneyType.EMERGENCY_CALL_FLOW:
                # Emergency calls should mostly succeed but be fast
                stage = choice([JourneyStage.COMPLETED] * 9 + [JourneyStage.FAILED])
                duration = randint(2000, 15000)  # 2-15 seconds
            else:
                # Other journeys have more varied outcomes
                stage = choice([JourneyStage.COMPLETED] * 7 + [JourneyStage.FAILED] * 2 + [JourneyStage.ABANDONED])
                duration = randint(30000, 300000)  # 30 seconds to 5 minutes
            
            event = UserJourneyEvent(
                journey_id=journey_id,
                journey_type=journey_type,
                stage=stage,
                event_name=f"{journey_type.value}_{stage.value}",
                user_id=user_id,
                session_id=session_id,
                timestamp=datetime.now(),
                duration_ms=duration,
                error_details="Simulated failure" if stage == JourneyStage.FAILED else None
            )
            
            service.track_journey_event(event)
            print(f"Simulated: {journey_type.value} - {stage.value} ({duration}ms)")
        
        print("Test data simulation completed")
        return True
    
    else:
        print(f"Unknown command: {command}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)