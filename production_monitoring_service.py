"""
M31 Production Monitoring Service
Golden Signals monitoring, circuit breakers, budget guards, and health checks
"""
import os
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import psycopg2
from psycopg2.pool import SimpleConnectionPool

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=10, dsn=DSN)

# Configure logging (no PII)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('production_monitoring')

class CircuitBreakerState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class MetricType(Enum):
    LATENCY = "latency"
    TRAFFIC = "traffic"
    ERRORS = "errors"
    SATURATION = "saturation"

@dataclass
class GoldenSignal:
    service: str
    metric_type: MetricType
    value: float
    unit: str
    labels: Dict[str, Any]
    timestamp: datetime

@dataclass
class CircuitBreakerInfo:
    provider_name: str
    provider_type: str
    state: CircuitBreakerState
    failure_count: int
    last_failure: Optional[datetime]
    last_success: Optional[datetime]

@dataclass
class BudgetAlert:
    category: str
    current_spend: int
    budget_limit: int
    threshold_percentage: int
    is_over_threshold: bool

class ProductionMonitoringService:
    """Production monitoring with SRE Golden Signals and operational controls"""
    
    def __init__(self):
        self.feature_flags_cache = {}
        self.cache_ttl = 300  # 5 minutes
        self.last_cache_refresh = 0
    
    # Feature Flags Management
    def check_feature_flag(self, flag_key: str, user_cohort: str = None) -> bool:
        """Check if feature flag is enabled (with caching)"""
        current_time = time.time()
        
        # Refresh cache if expired
        if current_time - self.last_cache_refresh > self.cache_ttl:
            self._refresh_feature_flags_cache()
        
        return self.feature_flags_cache.get(flag_key, False)
    
    def _refresh_feature_flags_cache(self):
        """Refresh feature flags cache from database"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select flag_key, check_feature_flag(flag_key, null) as is_enabled
                    from feature_flags
                    where is_enabled = true
                """)
                
                self.feature_flags_cache = {
                    row[0]: row[1] for row in cur.fetchall()
                }
                self.last_cache_refresh = time.time()
                
        except Exception as e:
            logger.error(f"Failed to refresh feature flags cache: {e}")
        finally:
            POOL.putconn(conn)
    
    def toggle_feature_flag(self, flag_key: str, enabled: bool, 
                           rollout_percentage: int = 100) -> bool:
        """Toggle feature flag (Admin only)"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    update feature_flags 
                    set is_enabled = %s, rollout_percentage = %s, updated_at = now()
                    where flag_key = %s
                    returning id
                """, (enabled, rollout_percentage, flag_key))
                
                success = cur.fetchone() is not None
                conn.commit()
                
                if success:
                    # Invalidate cache
                    self.last_cache_refresh = 0
                    logger.info(f"Feature flag {flag_key} toggled to {enabled} at {rollout_percentage}%")
                
                return success
        except Exception as e:
            logger.error(f"Failed to toggle feature flag {flag_key}: {e}")
            return False
        finally:
            POOL.putconn(conn)
    
    # Golden Signals Monitoring (SRE)
    def record_golden_signal(self, signal: GoldenSignal):
        """Record Golden Signal metric (Latency, Traffic, Errors, Saturation)"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select record_metric(%s, %s, %s, %s, %s, %s)
                """, (
                    f"{signal.service}_{signal.metric_type.value}",
                    signal.metric_type.value,
                    signal.service,
                    signal.value,
                    signal.unit,
                    json.dumps(signal.labels)
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to record golden signal: {e}")
        finally:
            POOL.putconn(conn)
    
    def get_golden_signals_dashboard(self, time_window_minutes: int = 60) -> Dict[str, Any]:
        """Get Golden Signals dashboard data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Get recent metrics for dashboard
                cur.execute("""
                    select 
                        service_name,
                        metric_type,
                        avg(value) as avg_value,
                        max(value) as max_value,
                        min(value) as min_value,
                        count(*) as sample_count
                    from monitoring_metrics
                    where recorded_at > now() - interval '%s minutes'
                    group by service_name, metric_type
                    order by service_name, metric_type
                """, (time_window_minutes,))
                
                metrics = []
                for row in cur.fetchall():
                    metrics.append({
                        'service': row[0],
                        'metric_type': row[1],
                        'avg_value': float(row[2]),
                        'max_value': float(row[3]),
                        'min_value': float(row[4]),
                        'sample_count': row[5]
                    })
                
                # Check SLO breaches
                cur.execute("""
                    select slo_name, service_name, metric_type, target_value, comparison_op
                    from slo_definitions
                    where is_active = true
                """)
                
                slo_status = []
                for slo_row in cur.fetchall():
                    slo_name, service, metric_type, target, op = slo_row
                    
                    # Get recent metric for this SLO
                    cur.execute("""
                        select avg(value) as current_value
                        from monitoring_metrics
                        where service_name = %s 
                          and metric_type = %s
                          and recorded_at > now() - interval '5 minutes'
                    """, (service, metric_type))
                    
                    current_row = cur.fetchone()
                    current_value = float(current_row[0]) if current_row and current_row[0] else 0
                    
                    # Evaluate SLO
                    breach = self._evaluate_slo(current_value, target, op)
                    
                    slo_status.append({
                        'slo_name': slo_name,
                        'service': service,
                        'metric_type': metric_type,
                        'target_value': float(target),
                        'current_value': current_value,
                        'is_breached': breach,
                        'comparison': op
                    })
                
                return {
                    'golden_signals': metrics,
                    'slo_status': slo_status,
                    'time_window_minutes': time_window_minutes,
                    'generated_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to generate dashboard: {e}")
            return {'error': str(e)}
        finally:
            POOL.putconn(conn)
    
    def _evaluate_slo(self, current: float, target: float, operator: str) -> bool:
        """Evaluate if SLO is breached"""
        if operator == '<':
            return current >= target
        elif operator == '<=':
            return current > target
        elif operator == '>':
            return current <= target
        elif operator == '>=':
            return current < target
        elif operator == '=':
            return abs(current - target) > 0.01  # Small tolerance for floats
        return False
    
    # Circuit Breaker Management
    def get_circuit_breaker_status(self, provider_name: str) -> Optional[CircuitBreakerInfo]:
        """Get circuit breaker status for provider"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select provider_name, provider_type, state, failure_count,
                           last_failure_at, last_success_at
                    from circuit_breakers
                    where provider_name = %s
                """, (provider_name,))
                
                row = cur.fetchone()
                if row:
                    return CircuitBreakerInfo(
                        provider_name=row[0],
                        provider_type=row[1],
                        state=CircuitBreakerState(row[2]),
                        failure_count=row[3],
                        last_failure=row[4],
                        last_success=row[5]
                    )
        except Exception as e:
            logger.error(f"Failed to get circuit breaker status: {e}")
        finally:
            POOL.putconn(conn)
    
    def update_circuit_breaker(self, provider_name: str, success: bool) -> CircuitBreakerState:
        """Update circuit breaker state based on operation result"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select update_circuit_breaker(%s, %s)
                """, (provider_name, success))
                
                new_state_str = cur.fetchone()[0]
                conn.commit()
                
                new_state = CircuitBreakerState(new_state_str)
                
                if not success:
                    logger.warning(f"Circuit breaker {provider_name} recorded failure, state: {new_state.value}")
                
                return new_state
        except Exception as e:
            logger.error(f"Failed to update circuit breaker: {e}")
            return CircuitBreakerState.CLOSED  # Safe default
        finally:
            POOL.putconn(conn)
    
    def get_all_circuit_breakers(self) -> List[CircuitBreakerInfo]:
        """Get status of all circuit breakers"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select provider_name, provider_type, state, failure_count,
                           last_failure_at, last_success_at
                    from circuit_breakers
                    order by provider_name
                """)
                
                breakers = []
                for row in cur.fetchall():
                    breakers.append(CircuitBreakerInfo(
                        provider_name=row[0],
                        provider_type=row[1],
                        state=CircuitBreakerState(row[2]),
                        failure_count=row[3],
                        last_failure=row[4],
                        last_success=row[5]
                    ))
                
                return breakers
        except Exception as e:
            logger.error(f"Failed to get circuit breakers: {e}")
            return []
        finally:
            POOL.putconn(conn)
    
    # Budget Guards and Cost Monitoring
    def update_budget_spend(self, category: str, amount_cents: int, 
                           date: datetime = None) -> BudgetAlert:
        """Update budget spend and check for alerts"""
        if date is None:
            date = datetime.now().date()
        
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Update spend amount
                cur.execute("""
                    insert into budget_tracking (budget_category, date_tracked, spend_amount_cents, budget_limit_cents)
                    values (%s, %s, %s, (select budget_limit_cents from budget_tracking where budget_category = %s and date_tracked = current_date limit 1))
                    on conflict (budget_category, date_tracked) 
                    do update set spend_amount_cents = budget_tracking.spend_amount_cents + excluded.spend_amount_cents
                    returning spend_amount_cents, budget_limit_cents, alert_threshold_percentage
                """, (category, date, amount_cents, category))
                
                row = cur.fetchone()
                if not row:
                    # Create with default if not exists
                    cur.execute("""
                        insert into budget_tracking (budget_category, date_tracked, spend_amount_cents, budget_limit_cents)
                        values (%s, %s, %s, 100000)
                        returning spend_amount_cents, budget_limit_cents, alert_threshold_percentage
                    """, (category, date, amount_cents))
                    row = cur.fetchone()
                
                current_spend, budget_limit, threshold_pct = row
                
                # Check if alert needed
                alert_needed = self._check_budget_alert(category, date)
                
                conn.commit()
                
                threshold_amount = (budget_limit * threshold_pct) // 100
                is_over = current_spend >= threshold_amount
                
                return BudgetAlert(
                    category=category,
                    current_spend=current_spend,
                    budget_limit=budget_limit,
                    threshold_percentage=threshold_pct,
                    is_over_threshold=is_over
                )
        except Exception as e:
            logger.error(f"Failed to update budget spend: {e}")
            return BudgetAlert(category, 0, 0, 0, False)
        finally:
            POOL.putconn(conn)
    
    def _check_budget_alert(self, category: str, date: datetime) -> bool:
        """Check if budget alert should be sent"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("select check_budget_alert(%s, %s)", (category, date))
                return cur.fetchone()[0]
        except Exception as e:
            logger.error(f"Failed to check budget alert: {e}")
            return False
        finally:
            POOL.putconn(conn)
    
    def get_budget_dashboard(self) -> Dict[str, Any]:
        """Get current budget status for all categories"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select budget_category, spend_amount_cents, budget_limit_cents,
                           alert_threshold_percentage, is_alert_sent,
                           round(100.0 * spend_amount_cents / budget_limit_cents, 2) as usage_percentage
                    from budget_tracking
                    where date_tracked = current_date
                    order by usage_percentage desc
                """)
                
                budgets = []
                for row in cur.fetchall():
                    category, spend, limit, threshold, alert_sent, usage = row
                    budgets.append({
                        'category': category,
                        'spend_cents': spend,
                        'limit_cents': limit,
                        'usage_percentage': float(usage),
                        'threshold_percentage': threshold,
                        'alert_sent': alert_sent,
                        'is_over_threshold': usage >= threshold
                    })
                
                return {
                    'budgets': budgets,
                    'date': datetime.now().date().isoformat(),
                    'total_spend_cents': sum(b['spend_cents'] for b in budgets),
                    'total_limit_cents': sum(b['limit_cents'] for b in budgets)
                }
        except Exception as e:
            logger.error(f"Failed to get budget dashboard: {e}")
            return {'error': str(e)}
        finally:
            POOL.putconn(conn)
    
    # Health Checks
    def record_health_check(self, check_name: str, check_type: str, 
                          status: str, response_time_ms: int = None,
                          error_message: str = None, metadata: Dict = None):
        """Record system health check result"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into health_checks 
                    (check_name, check_type, status, response_time_ms, error_message, metadata)
                    values (%s, %s, %s, %s, %s, %s)
                """, (
                    check_name, check_type, status, response_time_ms, 
                    error_message, json.dumps(metadata or {})
                ))
                
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to record health check: {e}")
        finally:
            POOL.putconn(conn)
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get current system health status"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Get latest health check for each type
                cur.execute("""
                    select distinct on (check_type) 
                           check_name, check_type, status, response_time_ms, 
                           error_message, checked_at
                    from health_checks
                    order by check_type, checked_at desc
                """)
                
                health_checks = []
                overall_status = "healthy"
                
                for row in cur.fetchall():
                    check_name, check_type, status, response_time, error, checked_at = row
                    
                    health_checks.append({
                        'check_name': check_name,
                        'check_type': check_type,
                        'status': status,
                        'response_time_ms': response_time,
                        'error_message': error,
                        'checked_at': checked_at.isoformat() if checked_at else None
                    })
                    
                    # Determine overall status
                    if status == 'unhealthy':
                        overall_status = "unhealthy"
                    elif status == 'degraded' and overall_status == "healthy":
                        overall_status = "degraded"
                
                return {
                    'overall_status': overall_status,
                    'health_checks': health_checks,
                    'checked_at': datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {'overall_status': 'unhealthy', 'error': str(e)}
        finally:
            POOL.putconn(conn)
    
    # Production Incidents
    def create_incident(self, incident_type: str, severity: str, title: str,
                       description: str = None, affected_services: List[str] = None) -> int:
        """Create production incident"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into production_incidents 
                    (incident_type, severity, title, description, affected_services, started_at)
                    values (%s, %s, %s, %s, %s, now())
                    returning id
                """, (
                    incident_type, severity, title, description, 
                    affected_services or []
                ))
                
                incident_id = cur.fetchone()[0]
                conn.commit()
                
                logger.warning(f"Production incident created: {incident_id} - {title}")
                return incident_id
        except Exception as e:
            logger.error(f"Failed to create incident: {e}")
            return 0
        finally:
            POOL.putconn(conn)