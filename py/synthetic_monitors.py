#!/usr/bin/env python3
"""
M35 — Synthetic Monitors (24/7)
Health endpoints and full user-journey probes with burn-rate alerting
"""

import os
import json
import time
import asyncio
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MonitorType(Enum):
    HEALTH_CHECK = "health_check"
    USER_JOURNEY = "user_journey"
    API_ENDPOINT = "api_endpoint"
    BURN_RATE = "burn_rate_monitor"

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

@dataclass
class SyntheticResult:
    monitor_id: str
    monitor_type: MonitorType
    timestamp: str
    success: bool
    response_time_ms: int
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    endpoint: Optional[str] = None
    slo_threshold_ms: int = 2000
    
    @property
    def slo_compliant(self) -> bool:
        return self.success and self.response_time_ms <= self.slo_threshold_ms

@dataclass
class BurnRateAlert:
    alert_id: str
    severity: AlertSeverity
    timestamp: str
    burn_rate_percent: float
    error_budget_remaining: float
    window_minutes: int
    escalation_required: bool
    runbook_link: str

class SyntheticMonitor:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SamiaSynthetic/1.0',
            'Content-Type': 'application/json'
        })
        
        # SLO Configuration
        self.slo_config = {
            "health_check": {"threshold_ms": 500, "success_rate": 99.9},
            "user_journey": {"threshold_ms": 5000, "success_rate": 99.5},
            "api_endpoint": {"threshold_ms": 2000, "success_rate": 99.8}
        }
        
        # Burn Rate Windows (Google SRE best practices)
        self.burn_rate_windows = [
            {"window_minutes": 5, "threshold": 0.14},    # Fast burn
            {"window_minutes": 60, "threshold": 0.06},   # Medium burn
            {"window_minutes": 360, "threshold": 0.03},  # Slow burn
        ]
        
        self.results: List[SyntheticResult] = []
        self.burn_rate_alerts: List[BurnRateAlert] = []
    
    async def health_check_monitor(self) -> SyntheticResult:
        """Basic health endpoint check"""
        start_time = time.time()
        monitor_id = f"health-{int(start_time)}"
        
        try:
            response = self.session.get(f"{self.base_url}/api/health", timeout=5)
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            return SyntheticResult(
                monitor_id=monitor_id,
                monitor_type=MonitorType.HEALTH_CHECK,
                timestamp=datetime.now().isoformat(),
                success=response.status_code == 200,
                response_time_ms=response_time_ms,
                status_code=response.status_code,
                endpoint="/api/health",
                slo_threshold_ms=self.slo_config["health_check"]["threshold_ms"]
            )
            
        except Exception as e:
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            return SyntheticResult(
                monitor_id=monitor_id,
                monitor_type=MonitorType.HEALTH_CHECK,
                timestamp=datetime.now().isoformat(),
                success=False,
                response_time_ms=response_time_ms,
                error_message=str(e),
                endpoint="/api/health",
                slo_threshold_ms=self.slo_config["health_check"]["threshold_ms"]
            )
    
    async def login_journey_monitor(self) -> SyntheticResult:
        """Synthetic login journey"""
        start_time = time.time()
        monitor_id = f"login-journey-{int(start_time)}"
        
        try:
            # Simulate login flow
            login_payload = {
                "email": "synthetic@samia-tarot.com",
                "type": "synthetic_test"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/synthetic-login",
                json=login_payload,
                timeout=10
            )
            
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            return SyntheticResult(
                monitor_id=monitor_id,
                monitor_type=MonitorType.USER_JOURNEY,
                timestamp=datetime.now().isoformat(),
                success=response.status_code in [200, 201],
                response_time_ms=response_time_ms,
                status_code=response.status_code,
                endpoint="/api/auth/synthetic-login",
                slo_threshold_ms=self.slo_config["user_journey"]["threshold_ms"]
            )
            
        except Exception as e:
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            return SyntheticResult(
                monitor_id=monitor_id,
                monitor_type=MonitorType.USER_JOURNEY,
                timestamp=datetime.now().isoformat(),
                success=False,
                response_time_ms=response_time_ms,
                error_message=str(e),
                endpoint="/api/auth/synthetic-login",
                slo_threshold_ms=self.slo_config["user_journey"]["threshold_ms"]
            )
    
    async def checkout_journey_monitor(self) -> SyntheticResult:
        """Synthetic booking checkout journey"""
        start_time = time.time()
        monitor_id = f"checkout-{int(start_time)}"
        
        try:
            # Simulate checkout flow
            checkout_payload = {
                "service": "tarot",
                "synthetic": True,
                "payment_method": "test_card"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/checkout/synthetic",
                json=checkout_payload,
                timeout=15
            )
            
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            return SyntheticResult(
                monitor_id=monitor_id,
                monitor_type=MonitorType.USER_JOURNEY,
                timestamp=datetime.now().isoformat(),
                success=response.status_code in [200, 201],
                response_time_ms=response_time_ms,
                status_code=response.status_code,
                endpoint="/api/checkout/synthetic",
                slo_threshold_ms=self.slo_config["user_journey"]["threshold_ms"]
            )
            
        except Exception as e:
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            return SyntheticResult(
                monitor_id=monitor_id,
                monitor_type=MonitorType.USER_JOURNEY,
                timestamp=datetime.now().isoformat(),
                success=False,
                response_time_ms=response_time_ms,
                error_message=str(e),
                endpoint="/api/checkout/synthetic",
                slo_threshold_ms=self.slo_config["user_journey"]["threshold_ms"]
            )
    
    async def emergency_route_monitor(self) -> SyntheticResult:
        """Emergency call route availability"""
        start_time = time.time()
        monitor_id = f"emergency-{int(start_time)}"
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/emergency/health",
                timeout=3
            )
            
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            return SyntheticResult(
                monitor_id=monitor_id,
                monitor_type=MonitorType.API_ENDPOINT,
                timestamp=datetime.now().isoformat(),
                success=response.status_code == 200,
                response_time_ms=response_time_ms,
                status_code=response.status_code,
                endpoint="/api/emergency/health",
                slo_threshold_ms=1000  # Emergency should be fast
            )
            
        except Exception as e:
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            return SyntheticResult(
                monitor_id=monitor_id,
                monitor_type=MonitorType.API_ENDPOINT,
                timestamp=datetime.now().isoformat(),
                success=False,
                response_time_ms=response_time_ms,
                error_message=str(e),
                endpoint="/api/emergency/health",
                slo_threshold_ms=1000
            )
    
    async def api_health_monitors(self) -> List[SyntheticResult]:
        """Check multiple API endpoints"""
        endpoints = [
            "/api/services",
            "/api/zodiac/today",
            "/api/readers/available",
            "/api/user/profile"
        ]
        
        results = []
        for endpoint in endpoints:
            start_time = time.time()
            monitor_id = f"api-{endpoint.replace('/', '-')}-{int(start_time)}"
            
            try:
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                end_time = time.time()
                response_time_ms = int((end_time - start_time) * 1000)
                
                results.append(SyntheticResult(
                    monitor_id=monitor_id,
                    monitor_type=MonitorType.API_ENDPOINT,
                    timestamp=datetime.now().isoformat(),
                    success=response.status_code == 200,
                    response_time_ms=response_time_ms,
                    status_code=response.status_code,
                    endpoint=endpoint,
                    slo_threshold_ms=self.slo_config["api_endpoint"]["threshold_ms"]
                ))
                
            except Exception as e:
                end_time = time.time()
                response_time_ms = int((end_time - start_time) * 1000)
                
                results.append(SyntheticResult(
                    monitor_id=monitor_id,
                    monitor_type=MonitorType.API_ENDPOINT,
                    timestamp=datetime.now().isoformat(),
                    success=False,
                    response_time_ms=response_time_ms,
                    error_message=str(e),
                    endpoint=endpoint,
                    slo_threshold_ms=self.slo_config["api_endpoint"]["threshold_ms"]
                ))
            
            # Small delay between requests
            await asyncio.sleep(0.5)
        
        return results
    
    def calculate_burn_rate(self, window_minutes: int) -> float:
        """Calculate error budget burn rate for given window"""
        if not self.results:
            return 0.0
        
        cutoff_time = datetime.now() - timedelta(minutes=window_minutes)
        
        # Filter results within the window
        window_results = [
            result for result in self.results
            if datetime.fromisoformat(result.timestamp) >= cutoff_time
        ]
        
        if not window_results:
            return 0.0
        
        # Calculate error rate
        total_requests = len(window_results)
        failed_requests = sum(1 for result in window_results if not result.success)
        error_rate = failed_requests / total_requests if total_requests > 0 else 0.0
        
        return error_rate
    
    def check_burn_rate_alerts(self) -> List[BurnRateAlert]:
        """Check for burn rate alerts based on multi-window analysis"""
        alerts = []
        
        for window_config in self.burn_rate_windows:
            window_minutes = window_config["window_minutes"]
            threshold = window_config["threshold"]
            
            burn_rate = self.calculate_burn_rate(window_minutes)
            
            if burn_rate > threshold:
                # Calculate remaining error budget
                target_slo = 0.999  # 99.9% target
                error_budget_consumed = burn_rate / (1 - target_slo)
                error_budget_remaining = max(0, 1 - error_budget_consumed)
                
                severity = AlertSeverity.CRITICAL if burn_rate > threshold * 2 else AlertSeverity.WARNING
                escalation_required = severity == AlertSeverity.CRITICAL or window_minutes <= 60
                
                alert = BurnRateAlert(
                    alert_id=f"burn-rate-{window_minutes}m-{int(time.time())}",
                    severity=severity,
                    timestamp=datetime.now().isoformat(),
                    burn_rate_percent=burn_rate * 100,
                    error_budget_remaining=error_budget_remaining * 100,
                    window_minutes=window_minutes,
                    escalation_required=escalation_required,
                    runbook_link=f"/RUNBOOKS/BURN_RATE_RESPONSE.md"
                )
                
                alerts.append(alert)
                logger.warning(f"Burn rate alert: {burn_rate*100:.2f}% in {window_minutes}m window")
        
        self.burn_rate_alerts.extend(alerts)
        return alerts
    
    async def run_monitoring_cycle(self) -> Dict[str, Any]:
        """Run complete monitoring cycle"""
        logger.info("Starting synthetic monitoring cycle...")
        
        # Run all monitors
        monitors = await asyncio.gather(
            self.health_check_monitor(),
            self.login_journey_monitor(),
            self.checkout_journey_monitor(),
            self.emergency_route_monitor(),
        )
        
        # Add API health monitors
        api_results = await self.api_health_monitors()
        monitors.extend(api_results)
        
        self.results.extend(monitors)
        
        # Check burn rate alerts
        burn_rate_alerts = self.check_burn_rate_alerts()
        
        # Calculate overall metrics
        total_monitors = len(monitors)
        successful_monitors = sum(1 for monitor in monitors if monitor.success)
        slo_compliant_monitors = sum(1 for monitor in monitors if monitor.slo_compliant)
        
        avg_response_time = sum(monitor.response_time_ms for monitor in monitors) / total_monitors if total_monitors > 0 else 0
        
        cycle_summary = {
            "cycle_timestamp": datetime.now().isoformat(),
            "total_monitors": total_monitors,
            "successful_monitors": successful_monitors,
            "success_rate": f"{(successful_monitors/total_monitors*100):.2f}%" if total_monitors > 0 else "0%",
            "slo_compliance_rate": f"{(slo_compliant_monitors/total_monitors*100):.2f}%" if total_monitors > 0 else "0%",
            "avg_response_time_ms": round(avg_response_time, 2),
            "burn_rate_alerts": len(burn_rate_alerts),
            "escalation_required": any(alert.escalation_required for alert in burn_rate_alerts),
            "monitor_results": [asdict(monitor) for monitor in monitors],
            "burn_rate_analysis": [asdict(alert) for alert in burn_rate_alerts]
        }
        
        logger.info(f"Monitoring cycle complete: {cycle_summary['success_rate']} success rate")
        return cycle_summary
    
    async def continuous_monitoring(self, interval_seconds: int = 300, max_cycles: Optional[int] = None):
        """Run continuous monitoring with specified interval"""
        cycle_count = 0
        
        logger.info(f"Starting continuous monitoring (interval: {interval_seconds}s)")
        
        while max_cycles is None or cycle_count < max_cycles:
            try:
                cycle_summary = await self.run_monitoring_cycle()
                
                # Log to file for observability dashboard
                log_file = f"synthetic_monitoring_{datetime.now().strftime('%Y%m%d')}.jsonl"
                with open(log_file, 'a') as f:
                    f.write(json.dumps(cycle_summary) + "\\n")
                
                # Check for escalation
                if cycle_summary["escalation_required"]:
                    logger.critical("🚨 ESCALATION REQUIRED - Burn rate threshold exceeded!")
                    # In production, this would trigger PagerDuty/Slack alerts
                
                cycle_count += 1
                await asyncio.sleep(interval_seconds)
                
            except Exception as e:
                logger.error(f"Monitoring cycle failed: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    def generate_observability_report(self, hours_back: int = 24) -> Dict[str, Any]:
        """Generate observability report for dashboard"""
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        
        recent_results = [
            result for result in self.results
            if datetime.fromisoformat(result.timestamp) >= cutoff_time
        ]
        
        if not recent_results:
            return {"error": "No recent monitoring data available"}
        
        # Group by monitor type
        by_type = {}
        for result in recent_results:
            monitor_type = result.monitor_type.value
            if monitor_type not in by_type:
                by_type[monitor_type] = []
            by_type[monitor_type].append(result)
        
        # Calculate metrics by type
        type_metrics = {}
        for monitor_type, results in by_type.items():
            total = len(results)
            successful = sum(1 for r in results if r.success)
            slo_compliant = sum(1 for r in results if r.slo_compliant)
            avg_response_time = sum(r.response_time_ms for r in results) / total if total > 0 else 0
            
            type_metrics[monitor_type] = {
                "total_checks": total,
                "success_rate": f"{(successful/total*100):.2f}%" if total > 0 else "0%",
                "slo_compliance": f"{(slo_compliant/total*100):.2f}%" if total > 0 else "0%",
                "avg_response_time_ms": round(avg_response_time, 2),
                "p95_response_time_ms": self._calculate_percentile([r.response_time_ms for r in results], 95),
                "p99_response_time_ms": self._calculate_percentile([r.response_time_ms for r in results], 99)
            }
        
        # Recent burn rate alerts
        recent_alerts = [
            alert for alert in self.burn_rate_alerts
            if datetime.fromisoformat(alert.timestamp) >= cutoff_time
        ]
        
        return {
            "report_timestamp": datetime.now().isoformat(),
            "timeframe_hours": hours_back,
            "overall_metrics": {
                "total_checks": len(recent_results),
                "overall_success_rate": f"{(sum(1 for r in recent_results if r.success)/len(recent_results)*100):.2f}%",
                "overall_slo_compliance": f"{(sum(1 for r in recent_results if r.slo_compliant)/len(recent_results)*100):.2f}%"
            },
            "metrics_by_type": type_metrics,
            "recent_alerts": [asdict(alert) for alert in recent_alerts],
            "dashboard_links": {
                "golden_signals": "/dashboard/observability",
                "incident_runbooks": "/RUNBOOKS/",
                "burn_rate_procedures": "/RUNBOOKS/BURN_RATE_RESPONSE.md"
            }
        }
    
    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile from list of values"""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        index = (percentile / 100) * (len(sorted_values) - 1)
        if index.is_integer():
            return sorted_values[int(index)]
        else:
            lower_index = int(index)
            upper_index = lower_index + 1
            weight = index - lower_index
            return sorted_values[lower_index] * (1 - weight) + sorted_values[upper_index] * weight

# CLI Usage
async def main():
    monitor = SyntheticMonitor()
    
    # Run single cycle for testing
    summary = await monitor.run_monitoring_cycle()
    print(f"\\n📊 Synthetic Monitoring Results:")
    print(f"Success Rate: {summary['success_rate']}")
    print(f"SLO Compliance: {summary['slo_compliance_rate']}")
    print(f"Average Response Time: {summary['avg_response_time_ms']}ms")
    print(f"Burn Rate Alerts: {summary['burn_rate_alerts']}")
    
    # Generate observability report
    report = monitor.generate_observability_report()
    with open("synthetic_monitoring_report.json", "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\\nObservability report saved to: synthetic_monitoring_report.json")

if __name__ == "__main__":
    asyncio.run(main())