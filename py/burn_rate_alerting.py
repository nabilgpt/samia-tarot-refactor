#!/usr/bin/env python3
"""
M35 — Burn-Rate Alerting and Noise Control
Multi-window burn-rate alerts following Google SRE best practices
"""

import os
import json
import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class SLOType(Enum):
    AVAILABILITY = "availability"
    LATENCY = "latency"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"

@dataclass
class SLODefinition:
    slo_id: str
    name: str
    slo_type: SLOType
    target_percent: float
    measurement_window_minutes: int
    description: str

@dataclass
class BurnRateWindow:
    window_minutes: int
    threshold: float
    severity: AlertSeverity
    description: str

@dataclass
class SLOViolation:
    violation_id: str
    slo_id: str
    timestamp: str
    actual_value: float
    target_value: float
    window_minutes: int
    severity: AlertSeverity
    error_budget_consumed_percent: float
    remaining_error_budget_percent: float

@dataclass
class BurnRateAlert:
    alert_id: str
    slo_id: str
    timestamp: str
    severity: AlertSeverity
    window_minutes: int
    burn_rate_percent: float
    error_budget_remaining_percent: float
    escalation_required: bool
    runbook_link: str
    alert_description: str
    suppressed: bool = False
    suppression_reason: Optional[str] = None

class BurnRateAlerting:
    def __init__(self):
        # SLO definitions for Samia Tarot platform
        self.slos = {
            "api_availability": SLODefinition(
                slo_id="api_availability",
                name="API Availability",
                slo_type=SLOType.AVAILABILITY,
                target_percent=99.9,
                measurement_window_minutes=1440,  # 24 hours
                description="API endpoints respond with 2xx/3xx status codes"
            ),
            "page_load_latency": SLODefinition(
                slo_id="page_load_latency",
                name="Page Load Latency (P95)",
                slo_type=SLOType.LATENCY,
                target_percent=95.0,  # P95 < 2s
                measurement_window_minutes=60,
                description="95% of page loads complete within 2 seconds"
            ),
            "booking_success_rate": SLODefinition(
                slo_id="booking_success_rate",
                name="Booking Success Rate",
                slo_type=SLOType.ERROR_RATE,
                target_percent=99.5,
                measurement_window_minutes=1440,
                description="99.5% of booking attempts succeed"
            ),
            "payment_processing": SLODefinition(
                slo_id="payment_processing",
                name="Payment Processing Success",
                slo_type=SLOType.ERROR_RATE,
                target_percent=99.8,
                measurement_window_minutes=1440,
                description="99.8% of payment attempts succeed"
            ),
            "emergency_call_latency": SLODefinition(
                slo_id="emergency_call_latency",
                name="Emergency Call Connection Time",
                slo_type=SLOType.LATENCY,
                target_percent=95.0,  # P95 < 10s
                measurement_window_minutes=60,
                description="95% of emergency calls connect within 10 seconds"
            )
        }
        
        # Multi-window burn rate thresholds (Google SRE methodology)
        self.burn_rate_windows = {
            "fast_burn": BurnRateWindow(
                window_minutes=5,
                threshold=0.14,  # 14x normal burn rate
                severity=AlertSeverity.CRITICAL,
                description="Fast burn - exhausts error budget in ~6 hours"
            ),
            "medium_burn": BurnRateWindow(
                window_minutes=60,
                threshold=0.06,  # 6x normal burn rate
                severity=AlertSeverity.WARNING,
                description="Medium burn - exhausts error budget in ~1 day"
            ),
            "slow_burn": BurnRateWindow(
                window_minutes=360,
                threshold=0.03,  # 3x normal burn rate
                severity=AlertSeverity.WARNING,
                description="Slow burn - exhausts error budget in ~2 days"
            )
        }
        
        self.active_alerts: Dict[str, BurnRateAlert] = {}
        self.alert_history: List[BurnRateAlert] = []
        self.suppression_rules: List[Dict[str, Any]] = []
        
        # Noise control settings
        self.alert_cooldown_minutes = 15  # Minimum time between similar alerts
        self.max_alerts_per_hour = 10  # Rate limit on alerts
        self.alert_timestamps: List[datetime] = []
    
    def add_suppression_rule(self, rule: Dict[str, Any]):
        """Add alert suppression rule"""
        self.suppression_rules.append(rule)
        logger.info(f"Added suppression rule: {rule}")
    
    def should_suppress_alert(self, alert: BurnRateAlert) -> Tuple[bool, Optional[str]]:
        """Check if alert should be suppressed based on rules"""
        
        # Check cooldown period
        alert_key = f"{alert.slo_id}_{alert.window_minutes}"
        cooldown_cutoff = datetime.now() - timedelta(minutes=self.alert_cooldown_minutes)
        
        recent_similar_alerts = [
            existing_alert for existing_alert in self.alert_history
            if existing_alert.slo_id == alert.slo_id 
            and existing_alert.window_minutes == alert.window_minutes
            and datetime.fromisoformat(existing_alert.timestamp) > cooldown_cutoff
        ]
        
        if recent_similar_alerts:
            return True, f"Cooldown period active (last alert {len(recent_similar_alerts)} ago)"
        
        # Check rate limiting
        hour_cutoff = datetime.now() - timedelta(hours=1)
        recent_alerts = [ts for ts in self.alert_timestamps if ts > hour_cutoff]
        
        if len(recent_alerts) >= self.max_alerts_per_hour:
            return True, f"Alert rate limit exceeded ({len(recent_alerts)} alerts in past hour)"
        
        # Check custom suppression rules
        for rule in self.suppression_rules:
            if self.matches_suppression_rule(alert, rule):
                return True, f"Matches suppression rule: {rule.get('name', 'unnamed')}"
        
        return False, None
    
    def matches_suppression_rule(self, alert: BurnRateAlert, rule: Dict[str, Any]) -> bool:
        """Check if alert matches a suppression rule"""
        if "slo_id" in rule and alert.slo_id != rule["slo_id"]:
            return False
        
        if "severity" in rule and alert.severity.value != rule["severity"]:
            return False
        
        if "time_range" in rule:
            now = datetime.now().time()
            start_time = datetime.strptime(rule["time_range"]["start"], "%H:%M").time()
            end_time = datetime.strptime(rule["time_range"]["end"], "%H:%M").time()
            
            if start_time <= end_time:  # Same day range
                if not (start_time <= now <= end_time):
                    return False
            else:  # Crosses midnight
                if not (now >= start_time or now <= end_time):
                    return False
        
        if "days_of_week" in rule:
            current_day = datetime.now().strftime("%A").lower()
            if current_day not in [day.lower() for day in rule["days_of_week"]]:
                return False
        
        return True
    
    def calculate_error_budget_burn_rate(self, slo_id: str, window_minutes: int, 
                                       current_error_rate: float) -> float:
        """Calculate current error budget burn rate"""
        slo = self.slos.get(slo_id)
        if not slo:
            return 0.0
        
        # Calculate normal error budget consumption rate
        target_error_rate = (100 - slo.target_percent) / 100
        normal_burn_rate = target_error_rate / (slo.measurement_window_minutes / window_minutes)
        
        # Calculate current burn rate relative to normal
        if normal_burn_rate > 0:
            return current_error_rate / normal_burn_rate
        else:
            return 0.0 if current_error_rate == 0 else float('inf')
    
    def calculate_remaining_error_budget(self, slo_id: str, historical_error_rate: float) -> float:
        """Calculate remaining error budget percentage"""
        slo = self.slos.get(slo_id)
        if not slo:
            return 0.0
        
        target_error_rate = (100 - slo.target_percent) / 100
        consumed_budget = historical_error_rate / target_error_rate if target_error_rate > 0 else 0
        remaining_budget = max(0, 1 - consumed_budget)
        
        return remaining_budget * 100
    
    async def evaluate_burn_rate_alerts(self, metrics: Dict[str, Any]) -> List[BurnRateAlert]:
        """Evaluate all SLOs for burn rate violations"""
        new_alerts = []
        
        for slo_id, slo in self.slos.items():
            slo_metrics = metrics.get(slo_id, {})
            
            if not slo_metrics:
                continue
            
            for window_name, window_config in self.burn_rate_windows.items():
                # Get metrics for this window
                window_data = slo_metrics.get(f"window_{window_config.window_minutes}m", {})
                
                if not window_data:
                    continue
                
                current_error_rate = window_data.get("error_rate", 0.0)
                historical_error_rate = slo_metrics.get("historical_error_rate", 0.0)
                
                # Calculate burn rate
                burn_rate = self.calculate_error_budget_burn_rate(
                    slo_id, window_config.window_minutes, current_error_rate
                )
                
                # Check if burn rate exceeds threshold
                if burn_rate > window_config.threshold:
                    remaining_budget = self.calculate_remaining_error_budget(
                        slo_id, historical_error_rate
                    )
                    
                    # Create alert
                    alert = BurnRateAlert(
                        alert_id=f"burn-rate-{slo_id}-{window_name}-{int(time.time())}",
                        slo_id=slo_id,
                        timestamp=datetime.now().isoformat(),
                        severity=window_config.severity,
                        window_minutes=window_config.window_minutes,
                        burn_rate_percent=burn_rate * 100,
                        error_budget_remaining_percent=remaining_budget,
                        escalation_required=window_config.severity in [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY],
                        runbook_link=f"/RUNBOOKS/SLO_BURN_RATE_RESPONSE.md#{slo_id}",
                        alert_description=f"{slo.name}: {window_config.description}. Current burn rate: {burn_rate:.2f}x normal."
                    )
                    
                    # Check suppression
                    should_suppress, suppression_reason = self.should_suppress_alert(alert)
                    if should_suppress:
                        alert.suppressed = True
                        alert.suppression_reason = suppression_reason
                        logger.info(f"Alert suppressed: {suppression_reason}")
                    else:
                        self.alert_timestamps.append(datetime.now())
                        new_alerts.append(alert)
                        
                        # Store as active alert
                        self.active_alerts[alert.alert_id] = alert
                        
                        logger.warning(f"🚨 Burn Rate Alert: {alert.alert_description}")
        
        # Add to history
        self.alert_history.extend(new_alerts)
        
        return new_alerts
    
    def resolve_alert(self, alert_id: str, resolution_note: str = ""):
        """Mark an alert as resolved"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolution_note = resolution_note
            alert.resolved_at = datetime.now().isoformat()
            
            del self.active_alerts[alert_id]
            logger.info(f"Alert resolved: {alert_id}")
    
    def get_active_alerts_by_severity(self) -> Dict[AlertSeverity, List[BurnRateAlert]]:
        """Group active alerts by severity"""
        grouped = {severity: [] for severity in AlertSeverity}
        
        for alert in self.active_alerts.values():
            if not alert.suppressed:
                grouped[alert.severity].append(alert)
        
        return grouped
    
    def generate_alert_summary(self) -> Dict[str, Any]:
        """Generate summary of alert status"""
        active_by_severity = self.get_active_alerts_by_severity()
        
        # Calculate alert metrics
        total_active = sum(len(alerts) for alerts in active_by_severity.values())
        total_suppressed = sum(1 for alert in self.active_alerts.values() if alert.suppressed)
        
        # Recent alert rate
        hour_cutoff = datetime.now() - timedelta(hours=1)
        recent_alert_count = sum(1 for ts in self.alert_timestamps if ts > hour_cutoff)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "active_alerts": {
                "total": total_active,
                "critical": len(active_by_severity[AlertSeverity.CRITICAL]),
                "warning": len(active_by_severity[AlertSeverity.WARNING]),
                "info": len(active_by_severity[AlertSeverity.INFO]),
                "emergency": len(active_by_severity[AlertSeverity.EMERGENCY])
            },
            "suppressed_alerts": total_suppressed,
            "alert_rate_last_hour": recent_alert_count,
            "escalation_required": any(
                alert.escalation_required for alert in self.active_alerts.values()
                if not alert.suppressed
            ),
            "slo_health": self.generate_slo_health_summary(),
            "noise_control": {
                "cooldown_minutes": self.alert_cooldown_minutes,
                "max_alerts_per_hour": self.max_alerts_per_hour,
                "suppression_rules_active": len(self.suppression_rules)
            }
        }
    
    def generate_slo_health_summary(self) -> Dict[str, Any]:
        """Generate SLO health summary"""
        slo_health = {}
        
        for slo_id, slo in self.slos.items():
            # Count active alerts for this SLO
            slo_alerts = [
                alert for alert in self.active_alerts.values()
                if alert.slo_id == slo_id and not alert.suppressed
            ]
            
            # Determine health status
            if any(alert.severity == AlertSeverity.CRITICAL for alert in slo_alerts):
                health_status = "CRITICAL"
            elif any(alert.severity == AlertSeverity.WARNING for alert in slo_alerts):
                health_status = "WARNING"
            elif slo_alerts:
                health_status = "DEGRADED"
            else:
                health_status = "HEALTHY"
            
            slo_health[slo_id] = {
                "name": slo.name,
                "status": health_status,
                "target": f"{slo.target_percent}%",
                "active_alerts": len(slo_alerts),
                "runbook": f"/RUNBOOKS/SLO_BURN_RATE_RESPONSE.md#{slo_id}"
            }
        
        return slo_health
    
    async def setup_default_suppression_rules(self):
        """Setup default noise control suppression rules"""
        
        # Suppress non-critical alerts during maintenance windows
        self.add_suppression_rule({
            "name": "maintenance_window",
            "severity": "warning",
            "time_range": {"start": "02:00", "end": "06:00"},
            "days_of_week": ["sunday"],
            "description": "Suppress warnings during Sunday maintenance window"
        })
        
        # Suppress info alerts during business hours to reduce noise
        self.add_suppression_rule({
            "name": "business_hours_info_suppression",
            "severity": "info",
            "time_range": {"start": "09:00", "end": "17:00"},
            "days_of_week": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "description": "Suppress info alerts during business hours"
        })
    
    def export_alert_history(self, hours_back: int = 24) -> Dict[str, Any]:
        """Export alert history for analysis"""
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        
        recent_alerts = [
            alert for alert in self.alert_history
            if datetime.fromisoformat(alert.timestamp) >= cutoff_time
        ]
        
        return {
            "export_timestamp": datetime.now().isoformat(),
            "timeframe_hours": hours_back,
            "total_alerts": len(recent_alerts),
            "alerts": [asdict(alert) for alert in recent_alerts],
            "summary": {
                "by_severity": {
                    severity.value: len([a for a in recent_alerts if a.severity == severity])
                    for severity in AlertSeverity
                },
                "by_slo": {
                    slo_id: len([a for a in recent_alerts if a.slo_id == slo_id])
                    for slo_id in self.slos.keys()
                }
            }
        }

# Mock metrics for testing
async def generate_mock_metrics() -> Dict[str, Any]:
    """Generate mock metrics for testing burn rate alerting"""
    return {
        "api_availability": {
            "window_5m": {"error_rate": 0.02},  # 2% error rate (high)
            "window_60m": {"error_rate": 0.008},  # 0.8% error rate
            "window_360m": {"error_rate": 0.005},  # 0.5% error rate
            "historical_error_rate": 0.001  # 0.1% historical
        },
        "booking_success_rate": {
            "window_5m": {"error_rate": 0.001},  # 0.1% error rate (normal)
            "window_60m": {"error_rate": 0.002},
            "window_360m": {"error_rate": 0.003},
            "historical_error_rate": 0.003
        },
        "payment_processing": {
            "window_5m": {"error_rate": 0.015},  # 1.5% error rate (elevated)
            "window_60m": {"error_rate": 0.004},
            "window_360m": {"error_rate": 0.002},
            "historical_error_rate": 0.001
        }
    }

# CLI Usage
async def main():
    alerting = BurnRateAlerting()
    await alerting.setup_default_suppression_rules()
    
    # Simulate metrics and evaluate alerts
    mock_metrics = await generate_mock_metrics()
    alerts = await alerting.evaluate_burn_rate_alerts(mock_metrics)
    
    # Generate summary
    summary = alerting.generate_alert_summary()
    
    print(f"\\n🚨 Burn-Rate Alerting Summary:")
    print(f"Active Alerts: {summary['active_alerts']['total']}")
    print(f"Critical: {summary['active_alerts']['critical']}")
    print(f"Warnings: {summary['active_alerts']['warning']}")
    print(f"Escalation Required: {summary['escalation_required']}")
    print(f"\\nSLO Health Status:")
    for slo_id, health in summary['slo_health'].items():
        print(f"  {health['name']}: {health['status']}")
    
    # Export for integration with monitoring systems
    with open("burn_rate_alerts.json", "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\\nAlert summary saved to: burn_rate_alerts.json")

if __name__ == "__main__":
    asyncio.run(main())