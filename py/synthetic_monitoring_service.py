#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Synthetic Monitoring Service
Automated probes for critical user journeys and health checks
"""

import os
import sys
import json
import time
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
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
BASE_URL = os.getenv("SAMIA_BASE_URL", "https://samia-tarot.com")

class ProbeType(Enum):
    HEALTH_CHECK = "health_check"
    USER_JOURNEY = "user_journey"
    API_ENDPOINT = "api_endpoint"
    EMERGENCY_CALL = "emergency_call"

class ProbeStatus(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    TIMEOUT = "timeout"
    ERROR = "error"

@dataclass
class SyntheticProbe:
    """Synthetic monitoring probe configuration"""
    name: str
    probe_type: ProbeType
    url: str
    method: str = "GET"
    expected_status: int = 200
    timeout_seconds: int = 30
    interval_minutes: int = 5
    critical: bool = False
    headers: Dict[str, str] = None
    payload: Dict[str, Any] = None

@dataclass
class ProbeResult:
    """Result of a synthetic probe execution"""
    probe_name: str
    status: ProbeStatus
    response_time_ms: float
    status_code: Optional[int]
    error_message: Optional[str]
    timestamp: datetime
    details: Dict[str, Any] = None

class SyntheticMonitoringService:
    """Service for synthetic monitoring and health checks"""
    
    def __init__(self):
        self.setup_synthetic_schema()
        self.probes = self._load_probe_configurations()
    
    def setup_synthetic_schema(self):
        """Setup database schema for synthetic monitoring"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Synthetic probe configurations
                cur.execute("""
                    create table if not exists synthetic_probes (
                        id bigserial primary key,
                        name text unique not null,
                        probe_type text not null,
                        url text not null,
                        method text default 'GET',
                        expected_status int default 200,
                        timeout_seconds int default 30,
                        interval_minutes int default 5,
                        critical boolean default false,
                        headers jsonb,
                        payload jsonb,
                        is_active boolean default true,
                        created_at timestamptz default now()
                    );
                """)
                
                # Probe execution results
                cur.execute("""
                    create table if not exists synthetic_probe_results (
                        id bigserial primary key,
                        probe_name text not null,
                        status text not null,
                        response_time_ms numeric(10,3) not null,
                        status_code int,
                        error_message text,
                        details jsonb,
                        timestamp timestamptz not null,
                        created_at timestamptz default now()
                    );
                    
                    create index if not exists idx_probe_results_name_timestamp 
                    on synthetic_probe_results(probe_name, timestamp desc);
                """)
                
                # Probe availability metrics
                cur.execute("""
                    create table if not exists probe_availability_metrics (
                        id bigserial primary key,
                        probe_name text not null,
                        window_start timestamptz not null,
                        window_end timestamptz not null,
                        total_checks int not null,
                        successful_checks int not null,
                        availability_percent numeric(5,2) not null,
                        avg_response_time_ms numeric(10,3),
                        created_at timestamptz default now()
                    );
                    
                    create index if not exists idx_availability_probe_window 
                    on probe_availability_metrics(probe_name, window_start desc);
                """)
                
                # Insert default synthetic probes
                cur.execute("""
                    insert into synthetic_probes (name, probe_type, url, critical) values
                    ('homepage_health', 'health_check', '/health', true),
                    ('api_health', 'health_check', '/api/health', true),
                    ('auth_health', 'health_check', '/api/auth/health', true),
                    ('emergency_endpoint', 'emergency_call', '/api/emergency/health', true),
                    ('login_journey', 'user_journey', '/auth', false),
                    ('booking_journey', 'user_journey', '/booking', false),
                    ('payment_health', 'api_endpoint', '/api/payments/health', true),
                    ('horoscope_api', 'api_endpoint', '/api/horoscopes/today', false)
                    on conflict (name) do nothing;
                """)
                
            print("Synthetic monitoring schema setup completed")
            
        except Exception as e:
            print(f"Error setting up synthetic schema: {e}")
        finally:
            POOL.putconn(conn)
    
    async def execute_probe(self, probe: SyntheticProbe) -> ProbeResult:
        """Execute a single synthetic probe"""
        start_time = time.time()
        
        try:
            # Construct full URL
            if probe.url.startswith('http'):
                full_url = probe.url
            else:
                full_url = f"{BASE_URL}{probe.url}"
            
            # Setup request headers
            headers = probe.headers or {}
            if probe.probe_type == ProbeType.EMERGENCY_CALL:
                headers['X-Emergency-Probe'] = 'true'
            
            # Setup timeout
            timeout = aiohttp.ClientTimeout(total=probe.timeout_seconds)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                # Execute request based on method
                if probe.method.upper() == 'GET':
                    async with session.get(full_url, headers=headers) as response:
                        response_time_ms = (time.time() - start_time) * 1000
                        content = await response.text()
                        
                        # Validate response
                        if response.status == probe.expected_status:
                            status = ProbeStatus.SUCCESS
                            error_message = None
                        else:
                            status = ProbeStatus.FAILURE
                            error_message = f"Expected {probe.expected_status}, got {response.status}"
                        
                        # Additional validations for specific probe types
                        details = await self._validate_probe_response(probe, response, content)
                        
                        return ProbeResult(
                            probe_name=probe.name,
                            status=status,
                            response_time_ms=response_time_ms,
                            status_code=response.status,
                            error_message=error_message,
                            timestamp=datetime.now(),
                            details=details
                        )
                
                elif probe.method.upper() == 'POST':
                    async with session.post(full_url, json=probe.payload, headers=headers) as response:
                        response_time_ms = (time.time() - start_time) * 1000
                        content = await response.text()
                        
                        status = ProbeStatus.SUCCESS if response.status == probe.expected_status else ProbeStatus.FAILURE
                        error_message = None if status == ProbeStatus.SUCCESS else f"Expected {probe.expected_status}, got {response.status}"
                        
                        return ProbeResult(
                            probe_name=probe.name,
                            status=status,
                            response_time_ms=response_time_ms,
                            status_code=response.status,
                            error_message=error_message,
                            timestamp=datetime.now()
                        )
        
        except asyncio.TimeoutError:
            response_time_ms = probe.timeout_seconds * 1000
            return ProbeResult(
                probe_name=probe.name,
                status=ProbeStatus.TIMEOUT,
                response_time_ms=response_time_ms,
                status_code=None,
                error_message=f"Request timed out after {probe.timeout_seconds}s",
                timestamp=datetime.now()
            )
        
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            return ProbeResult(
                probe_name=probe.name,
                status=ProbeStatus.ERROR,
                response_time_ms=response_time_ms,
                status_code=None,
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    async def _validate_probe_response(self, probe: SyntheticProbe, response: aiohttp.ClientResponse, content: str) -> Dict[str, Any]:
        """Validate probe response based on probe type"""
        details = {}
        
        if probe.probe_type == ProbeType.HEALTH_CHECK:
            # Validate health check response format
            try:
                if response.content_type == 'application/json':
                    data = json.loads(content)
                    details['health_status'] = data.get('status', 'unknown')
                    details['services'] = data.get('services', {})
                else:
                    details['response_text'] = content[:200]  # First 200 chars
            except json.JSONDecodeError:
                details['parse_error'] = 'Invalid JSON response'
        
        elif probe.probe_type == ProbeType.EMERGENCY_CALL:
            # Emergency endpoints should respond very quickly
            response_time = details.get('response_time_ms', 0)
            if response_time > 200:  # Emergency should respond in <200ms
                details['performance_warning'] = f"Emergency endpoint slow: {response_time}ms"
            
            # Check for emergency-specific headers
            if 'X-Emergency-Ready' in response.headers:
                details['emergency_ready'] = response.headers['X-Emergency-Ready']
        
        elif probe.probe_type == ProbeType.USER_JOURNEY:
            # Check for critical page elements
            if 'text/html' in response.content_type:
                # Check for common error indicators
                error_indicators = ['error', 'exception', '500', '404', 'not found']
                content_lower = content.lower()
                
                for indicator in error_indicators:
                    if indicator in content_lower:
                        details['content_warning'] = f"Error indicator found: {indicator}"
                        break
                
                # Check for expected elements
                if probe.name == 'login_journey':
                    if 'login' not in content_lower and 'sign in' not in content_lower:
                        details['content_warning'] = "Login elements not found"
                
                elif probe.name == 'booking_journey':
                    if 'book' not in content_lower and 'service' not in content_lower:
                        details['content_warning'] = "Booking elements not found"
        
        elif probe.probe_type == ProbeType.API_ENDPOINT:
            # Validate API response structure
            try:
                if response.content_type == 'application/json':
                    data = json.loads(content)
                    details['api_response'] = {
                        'has_data': 'data' in data,
                        'has_error': 'error' in data,
                        'keys': list(data.keys()) if isinstance(data, dict) else []
                    }
            except json.JSONDecodeError:
                details['api_error'] = 'Invalid JSON API response'
        
        return details
    
    def store_probe_result(self, result: ProbeResult):
        """Store probe result in database"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into synthetic_probe_results (
                        probe_name, status, response_time_ms, status_code,
                        error_message, details, timestamp
                    ) values (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    result.probe_name, result.status.value, result.response_time_ms,
                    result.status_code, result.error_message,
                    json.dumps(result.details) if result.details else None,
                    result.timestamp
                ))
                
                # Check if we need to alert on this result
                if result.status != ProbeStatus.SUCCESS:
                    self._evaluate_probe_alert(result)
                
        except Exception as e:
            print(f"Error storing probe result: {e}")
        finally:
            POOL.putconn(conn)
    
    def _evaluate_probe_alert(self, result: ProbeResult):
        """Evaluate if probe failure requires alerting"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Check if probe is critical
                cur.execute("""
                    select critical from synthetic_probes 
                    where name = %s
                """, (result.probe_name,))
                
                probe_info = cur.fetchone()
                if not probe_info or not probe_info[0]:
                    return  # Not critical, no alert needed
                
                # Check recent failure rate
                cur.execute("""
                    select count(*) as total,
                           sum(case when status = 'success' then 1 else 0 end) as successful
                    from synthetic_probe_results 
                    where probe_name = %s 
                    and timestamp > now() - interval '15 minutes'
                """, (result.probe_name,))
                
                stats = cur.fetchone()
                if stats and stats[0] > 0:
                    total_checks = stats[0]
                    successful_checks = stats[1]
                    failure_rate = ((total_checks - successful_checks) / total_checks) * 100
                    
                    # Alert if failure rate > 50% in last 15 minutes
                    if failure_rate > 50:
                        self._fire_synthetic_alert(result, failure_rate)
                
        except Exception as e:
            print(f"Error evaluating probe alert: {e}")
        finally:
            POOL.putconn(conn)
    
    def _fire_synthetic_alert(self, result: ProbeResult, failure_rate: float):
        """Fire alert for synthetic probe failure"""
        try:
            from on_call_escalation_service import OnCallService, SeverityLevel
            
            # Determine severity based on probe type and failure rate
            if result.probe_name.startswith('emergency'):
                severity = SeverityLevel.SEV_1  # Emergency probes are critical
            elif failure_rate > 80:
                severity = SeverityLevel.SEV_2  # High failure rate
            else:
                severity = SeverityLevel.SEV_3  # Moderate failure rate
            
            incident_id = f"SYNTH-{result.probe_name.upper()}-{int(time.time())}"
            
            description = f"""
Synthetic Monitoring Alert: {result.probe_name}
Status: {result.status.value}
Failure Rate: {failure_rate:.1f}% (last 15 minutes)
Response Time: {result.response_time_ms:.1f}ms
Error: {result.error_message or 'Unknown error'}

This indicates potential service degradation affecting user experience.
            """.strip()
            
            on_call_service = OnCallService()
            escalation_result = on_call_service.trigger_incident_escalation(
                incident_id=incident_id,
                severity=severity,
                description=description,
                emergency_call=(result.probe_name.startswith('emergency'))
            )
            
            print(f"Synthetic probe alert escalated: {incident_id}")
            return escalation_result
            
        except ImportError:
            print("On-call escalation service not available")
        except Exception as e:
            print(f"Error firing synthetic alert: {e}")
    
    def calculate_availability_metrics(self, probe_name: str, hours: int = 24):
        """Calculate availability metrics for a probe"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select count(*) as total_checks,
                           sum(case when status = 'success' then 1 else 0 end) as successful_checks,
                           avg(response_time_ms) as avg_response_time
                    from synthetic_probe_results 
                    where probe_name = %s 
                    and timestamp > now() - interval '%s hours'
                """, (probe_name, hours))
                
                stats = cur.fetchone()
                if stats and stats[0] > 0:
                    total_checks = stats[0]
                    successful_checks = stats[1]
                    avg_response_time = float(stats[2]) if stats[2] else 0
                    
                    availability = (successful_checks / total_checks) * 100
                    
                    # Store availability metric
                    cur.execute("""
                        insert into probe_availability_metrics (
                            probe_name, window_start, window_end,
                            total_checks, successful_checks, availability_percent,
                            avg_response_time_ms
                        ) values (
                            %s, now() - interval '%s hours', now(),
                            %s, %s, %s, %s
                        )
                    """, (
                        probe_name, hours, total_checks, successful_checks,
                        availability, avg_response_time
                    ))
                    
                    return {
                        'probe_name': probe_name,
                        'window_hours': hours,
                        'total_checks': total_checks,
                        'successful_checks': successful_checks,
                        'availability_percent': availability,
                        'avg_response_time_ms': avg_response_time
                    }
                
        except Exception as e:
            print(f"Error calculating availability metrics: {e}")
            return None
        finally:
            POOL.putconn(conn)
    
    def get_synthetic_dashboard(self) -> Dict:
        """Get synthetic monitoring dashboard data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Get recent probe results
                cur.execute("""
                    select distinct on (probe_name) 
                           probe_name, status, response_time_ms, 
                           error_message, timestamp
                    from synthetic_probe_results 
                    order by probe_name, timestamp desc
                """)
                
                current_status = []
                for row in cur.fetchall():
                    current_status.append({
                        'probe_name': row[0],
                        'status': row[1],
                        'response_time_ms': float(row[2]),
                        'error_message': row[3],
                        'last_check': row[4].isoformat()
                    })
                
                # Get availability metrics for last 24 hours
                cur.execute("""
                    select probe_name, availability_percent, avg_response_time_ms
                    from probe_availability_metrics 
                    where window_start > now() - interval '25 hours'
                    order by probe_name, window_start desc
                """)
                
                availability_metrics = []
                for row in cur.fetchall():
                    availability_metrics.append({
                        'probe_name': row[0],
                        'availability_percent': float(row[1]),
                        'avg_response_time_ms': float(row[2])
                    })
                
                # Get critical probe failures
                cur.execute("""
                    select r.probe_name, r.status, r.error_message, r.timestamp
                    from synthetic_probe_results r
                    join synthetic_probes p on r.probe_name = p.name
                    where p.critical = true and r.status != 'success'
                    and r.timestamp > now() - interval '1 hour'
                    order by r.timestamp desc
                """)
                
                critical_failures = []
                for row in cur.fetchall():
                    critical_failures.append({
                        'probe_name': row[0],
                        'status': row[1],
                        'error_message': row[2],
                        'timestamp': row[3].isoformat()
                    })
                
                return {
                    'current_status': current_status,
                    'availability_metrics': availability_metrics,
                    'critical_failures': critical_failures,
                    'generated_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            print(f"Error getting synthetic dashboard: {e}")
            return {}
        finally:
            POOL.putconn(conn)
    
    def _load_probe_configurations(self) -> List[SyntheticProbe]:
        """Load probe configurations from database"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select name, probe_type, url, method, expected_status,
                           timeout_seconds, interval_minutes, critical,
                           headers, payload
                    from synthetic_probes where is_active = true
                """)
                
                probes = []
                for row in cur.fetchall():
                    probes.append(SyntheticProbe(
                        name=row[0],
                        probe_type=ProbeType(row[1]),
                        url=row[2],
                        method=row[3],
                        expected_status=row[4],
                        timeout_seconds=row[5],
                        interval_minutes=row[6],
                        critical=row[7],
                        headers=row[8] if row[8] else {},
                        payload=row[9] if row[9] else {}
                    ))
                
                return probes
                
        except Exception as e:
            print(f"Error loading probe configurations: {e}")
            return []
        finally:
            POOL.putconn(conn)

async def run_all_probes(service: SyntheticMonitoringService):
    """Run all configured synthetic probes"""
    tasks = []
    for probe in service.probes:
        task = service.execute_probe(probe)
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"Error running probe {service.probes[i].name}: {result}")
        else:
            print(f"Probe {result.probe_name}: {result.status.value} ({result.response_time_ms:.1f}ms)")
            service.store_probe_result(result)

def main():
    """Main function for synthetic monitoring operations"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python synthetic_monitoring_service.py setup          # Setup schema")
        print("  python synthetic_monitoring_service.py run            # Run all probes")
        print("  python synthetic_monitoring_service.py probe <name>   # Run specific probe")
        print("  python synthetic_monitoring_service.py dashboard      # Get dashboard data")
        print("  python synthetic_monitoring_service.py availability <probe>  # Calculate availability")
        return False
    
    command = sys.argv[1].lower()
    service = SyntheticMonitoringService()
    
    if command == 'setup':
        print("Synthetic monitoring setup completed")
        return True
    
    elif command == 'run':
        print("Running all synthetic probes...")
        asyncio.run(run_all_probes(service))
        return True
    
    elif command == 'probe':
        if len(sys.argv) < 3:
            print("Usage: probe <name>")
            return False
        
        probe_name = sys.argv[2]
        probe = next((p for p in service.probes if p.name == probe_name), None)
        
        if not probe:
            print(f"Probe not found: {probe_name}")
            return False
        
        async def run_single_probe():
            result = await service.execute_probe(probe)
            print(f"Probe Result: {json.dumps(asdict(result), default=str, indent=2)}")
            service.store_probe_result(result)
        
        asyncio.run(run_single_probe())
        return True
    
    elif command == 'dashboard':
        dashboard_data = service.get_synthetic_dashboard()
        print("Synthetic Monitoring Dashboard:")
        print(json.dumps(dashboard_data, indent=2))
        return True
    
    elif command == 'availability':
        if len(sys.argv) < 3:
            print("Usage: availability <probe_name>")
            return False
        
        probe_name = sys.argv[2]
        metrics = service.calculate_availability_metrics(probe_name)
        
        if metrics:
            print(f"Availability Metrics for {probe_name}:")
            print(json.dumps(metrics, indent=2))
        else:
            print(f"No data found for probe: {probe_name}")
        
        return True
    
    else:
        print(f"Unknown command: {command}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)