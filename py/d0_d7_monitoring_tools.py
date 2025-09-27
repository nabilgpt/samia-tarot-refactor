#!/usr/bin/env python3
"""
D0-D7 Monitoring Tools
Automated monitoring and health check tools for the first week after production cutover
"""
import os
import sys
import json
import subprocess
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from production_monitoring_service import ProductionMonitoringService

class D0D7MonitoringService:
    """Service for intensive D0-D7 monitoring after production cutover"""
    
    def __init__(self):
        self.monitoring = ProductionMonitoringService()
        self.alerts_sent = []
        self.health_history = []
        
    def log_monitoring_event(self, event_type: str, severity: str, details: str, metadata: Dict = None):
        """Log monitoring events with timestamp"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'severity': severity,
            'details': details,
            'metadata': metadata or {}
        }
        
        print(f"[{severity}] {event_type}: {details}")
        
        if severity in ['CRITICAL', 'HIGH']:
            self.alerts_sent.append(event)
    
    def intensive_health_check(self) -> Dict[str, any]:
        """Comprehensive health check for D0-D7 period"""
        health_status = {
            'timestamp': datetime.now().isoformat(),
            'overall_health': 'UNKNOWN',
            'components': {},
            'golden_signals': {},
            'circuit_breakers': {},
            'feature_flags': {},
            'budget_status': {},
            'alerts': [],
            'recommendations': []
        }
        
        try:
            # 1. Golden Signals Check
            self.log_monitoring_event("Golden Signals Check", "INFO", "Checking latency, traffic, errors, saturation")
            golden_signals = self._check_golden_signals()
            health_status['golden_signals'] = golden_signals
            
            # 2. Circuit Breaker Status
            self.log_monitoring_event("Circuit Breaker Check", "INFO", "Checking external provider protection")
            circuit_status = self._check_circuit_breaker_status()
            health_status['circuit_breakers'] = circuit_status
            
            # 3. Feature Flag Health
            self.log_monitoring_event("Feature Flag Check", "INFO", "Checking feature flag rollout status")
            feature_flags = self._check_feature_flag_health()
            health_status['feature_flags'] = feature_flags
            
            # 4. Budget Guards
            self.log_monitoring_event("Budget Check", "INFO", "Checking spend limits and budget health")
            budget_status = self._check_budget_health()
            health_status['budget_status'] = budget_status
            
            # 5. System Components
            self.log_monitoring_event("Component Check", "INFO", "Checking database, API, external services")
            components = self._check_system_components()
            health_status['components'] = components
            
            # 6. Performance Analysis
            performance_issues = self._analyze_performance_issues(golden_signals)
            health_status['alerts'].extend(performance_issues)
            
            # 7. Overall Health Assessment
            overall_health = self._assess_overall_health(health_status)
            health_status['overall_health'] = overall_health
            
            # 8. Generate Recommendations
            recommendations = self._generate_recommendations(health_status)
            health_status['recommendations'] = recommendations
            
            self.health_history.append(health_status)
            
        except Exception as e:
            self.log_monitoring_event("Health Check Error", "CRITICAL", f"Health check failed: {e}")
            health_status['overall_health'] = 'CRITICAL'
            health_status['alerts'].append({
                'type': 'SYSTEM_ERROR',
                'severity': 'CRITICAL',
                'message': f"Monitoring system error: {e}"
            })
        
        return health_status
    
    def _check_golden_signals(self) -> Dict[str, any]:
        """Check Google SRE Golden Signals"""
        try:
            dashboard = self.monitoring.get_golden_signals_dashboard(15)  # Last 15 minutes
            
            signals_status = {
                'latency': {'status': 'UNKNOWN', 'value': 0, 'threshold': 500},
                'traffic': {'status': 'UNKNOWN', 'value': 0, 'threshold': 1000},
                'errors': {'status': 'UNKNOWN', 'value': 0, 'threshold': 1.0},
                'saturation': {'status': 'UNKNOWN', 'value': 0, 'threshold': 80.0}
            }
            
            if 'golden_signals' in dashboard:
                for signal in dashboard['golden_signals']:
                    signal_type = signal['metric_type']
                    avg_value = signal['avg_value']
                    
                    if signal_type in signals_status:
                        signals_status[signal_type]['value'] = avg_value
                        
                        # Assess status based on thresholds
                        threshold = signals_status[signal_type]['threshold']
                        
                        if signal_type == 'latency':  # Lower is better
                            if avg_value <= threshold * 0.5:
                                signals_status[signal_type]['status'] = 'EXCELLENT'
                            elif avg_value <= threshold:
                                signals_status[signal_type]['status'] = 'GOOD'
                            elif avg_value <= threshold * 1.5:
                                signals_status[signal_type]['status'] = 'WARNING'
                            else:
                                signals_status[signal_type]['status'] = 'CRITICAL'
                        
                        elif signal_type == 'errors':  # Lower is better
                            if avg_value <= threshold * 0.1:
                                signals_status[signal_type]['status'] = 'EXCELLENT'
                            elif avg_value <= threshold:
                                signals_status[signal_type]['status'] = 'GOOD'
                            elif avg_value <= threshold * 2:
                                signals_status[signal_type]['status'] = 'WARNING'
                            else:
                                signals_status[signal_type]['status'] = 'CRITICAL'
                        
                        elif signal_type in ['traffic', 'saturation']:  # Context dependent
                            if signal_type == 'traffic':
                                # Traffic levels depend on expected load
                                signals_status[signal_type]['status'] = 'GOOD'  # Neutral for now
                            else:  # saturation
                                if avg_value <= 50:
                                    signals_status[signal_type]['status'] = 'EXCELLENT'
                                elif avg_value <= threshold:
                                    signals_status[signal_type]['status'] = 'GOOD'
                                elif avg_value <= 90:
                                    signals_status[signal_type]['status'] = 'WARNING'
                                else:
                                    signals_status[signal_type]['status'] = 'CRITICAL'
            
            return signals_status
            
        except Exception as e:
            self.log_monitoring_event("Golden Signals Error", "HIGH", f"Failed to check golden signals: {e}")
            return {'error': str(e)}
    
    def _check_circuit_breaker_status(self) -> Dict[str, any]:
        """Check circuit breaker protection status"""
        try:
            breakers = self.monitoring.get_all_circuit_breakers()
            
            breaker_status = {
                'total_breakers': 0,
                'healthy_breakers': 0,
                'open_breakers': 0,
                'half_open_breakers': 0,
                'protection_score': 0,
                'details': []
            }
            
            for breaker in breakers:
                breaker_status['total_breakers'] += 1
                
                if breaker.state.value == 'CLOSED':
                    breaker_status['healthy_breakers'] += 1
                elif breaker.state.value == 'OPEN':
                    breaker_status['open_breakers'] += 1
                elif breaker.state.value == 'HALF_OPEN':
                    breaker_status['half_open_breakers'] += 1
                
                breaker_status['details'].append({
                    'provider': breaker.provider_name,
                    'state': breaker.state.value,
                    'failure_count': breaker.failure_count,
                    'last_failure': breaker.last_failure_at.isoformat() if breaker.last_failure_at else None
                })
            
            # Calculate protection score
            if breaker_status['total_breakers'] > 0:
                breaker_status['protection_score'] = (
                    (breaker_status['healthy_breakers'] + breaker_status['half_open_breakers']) / 
                    breaker_status['total_breakers'] * 100
                )
            
            return breaker_status
            
        except Exception as e:
            self.log_monitoring_event("Circuit Breaker Error", "HIGH", f"Failed to check circuit breakers: {e}")
            return {'error': str(e)}
    
    def _check_feature_flag_health(self) -> Dict[str, any]:
        """Check feature flag rollout health"""
        try:
            flag_status = {
                'critical_flags': {},
                'rollout_status': 'STABLE',
                'recommendations': []
            }
            
            # Critical flags to monitor
            critical_flags = [
                'community_enabled',
                'notifications_enabled', 
                'rate_limiting_enabled',
                'circuit_breakers_enabled',
                'budget_guards_enabled'
            ]
            
            for flag_key in critical_flags:
                flag_enabled = self.monitoring.check_feature_flag(flag_key)
                flag_status['critical_flags'][flag_key] = {
                    'enabled': flag_enabled,
                    'expected_state': self._get_expected_flag_state(flag_key),
                    'status': 'OK'
                }
                
                # Check if flag is in expected state
                expected = self._get_expected_flag_state(flag_key)
                if flag_enabled != expected:
                    flag_status['critical_flags'][flag_key]['status'] = 'UNEXPECTED'
                    flag_status['rollout_status'] = 'ATTENTION_NEEDED'
                    flag_status['recommendations'].append(
                        f"Flag {flag_key} is {flag_enabled} but expected {expected}"
                    )
            
            return flag_status
            
        except Exception as e:
            self.log_monitoring_event("Feature Flag Error", "HIGH", f"Failed to check feature flags: {e}")
            return {'error': str(e)}
    
    def _get_expected_flag_state(self, flag_key: str) -> bool:
        """Get expected state for critical flags during D0-D7"""
        expected_states = {
            'community_enabled': False,        # Should be OFF initially
            'notifications_enabled': False,    # Should be OFF or very low %
            'rate_limiting_enabled': True,     # Should be ON for protection
            'circuit_breakers_enabled': True,  # Should be ON for protection
            'budget_guards_enabled': True,     # Should be ON for cost control
        }
        return expected_states.get(flag_key, True)
    
    def _check_budget_health(self) -> Dict[str, any]:
        """Check budget and cost health"""
        try:
            budget_status = self.monitoring.get_budget_dashboard()
            
            health_status = {
                'total_categories': 0,
                'healthy_categories': 0,
                'warning_categories': 0,
                'over_budget_categories': 0,
                'total_spend_today': 0,
                'categories': []
            }
            
            if 'budgets' in budget_status:
                for budget in budget_status['budgets']:
                    health_status['total_categories'] += 1
                    
                    spend_percentage = (budget['spend_amount_cents'] / budget['budget_limit_cents'] * 100) if budget['budget_limit_cents'] > 0 else 0
                    
                    category_info = {
                        'category': budget['budget_category'],
                        'spend_percentage': round(spend_percentage, 2),
                        'spend_amount': budget['spend_amount_cents'],
                        'budget_limit': budget['budget_limit_cents'],
                        'status': 'HEALTHY'
                    }
                    
                    health_status['total_spend_today'] += budget['spend_amount_cents']
                    
                    if spend_percentage >= 100:
                        category_info['status'] = 'OVER_BUDGET'
                        health_status['over_budget_categories'] += 1
                    elif spend_percentage >= budget.get('alert_threshold_percentage', 80):
                        category_info['status'] = 'WARNING'
                        health_status['warning_categories'] += 1
                    else:
                        health_status['healthy_categories'] += 1
                    
                    health_status['categories'].append(category_info)
            
            return health_status
            
        except Exception as e:
            self.log_monitoring_event("Budget Error", "HIGH", f"Failed to check budget health: {e}")
            return {'error': str(e)}
    
    def _check_system_components(self) -> Dict[str, any]:
        """Check individual system components"""
        components = {
            'database': {'status': 'UNKNOWN', 'response_time': 0},
            'api_gateway': {'status': 'UNKNOWN', 'response_time': 0},
            'external_providers': {'status': 'UNKNOWN', 'details': []}
        }
        
        # Database health check
        try:
            start_time = time.time()
            dashboard = self.monitoring.get_golden_signals_dashboard(1)
            db_response_time = int((time.time() - start_time) * 1000)
            
            components['database'] = {
                'status': 'HEALTHY' if db_response_time < 500 else 'SLOW',
                'response_time': db_response_time
            }
            
        except Exception as e:
            components['database'] = {'status': 'UNHEALTHY', 'error': str(e)}
        
        # API Gateway health (simulated - would use actual health endpoint)
        components['api_gateway'] = {
            'status': 'HEALTHY',  # Would check actual endpoint
            'response_time': 150  # Simulated
        }
        
        # External provider health (check via circuit breakers)
        try:
            breakers = self.monitoring.get_all_circuit_breakers()
            provider_details = []
            healthy_providers = 0
            
            for breaker in breakers:
                provider_status = 'HEALTHY' if breaker.state.value == 'CLOSED' else 'DEGRADED'
                if provider_status == 'HEALTHY':
                    healthy_providers += 1
                
                provider_details.append({
                    'provider': breaker.provider_name,
                    'status': provider_status,
                    'state': breaker.state.value
                })
            
            components['external_providers'] = {
                'status': 'HEALTHY' if healthy_providers >= len(breakers) * 0.8 else 'DEGRADED',
                'healthy_count': healthy_providers,
                'total_count': len(breakers),
                'details': provider_details
            }
            
        except Exception as e:
            components['external_providers'] = {'status': 'UNKNOWN', 'error': str(e)}
        
        return components
    
    def _analyze_performance_issues(self, golden_signals: Dict) -> List[Dict]:
        """Analyze performance issues from golden signals"""
        alerts = []
        
        if 'latency' in golden_signals:
            latency = golden_signals['latency']
            if latency['status'] in ['WARNING', 'CRITICAL']:
                alerts.append({
                    'type': 'PERFORMANCE',
                    'severity': latency['status'],
                    'message': f"High latency detected: {latency['value']}ms (threshold: {latency['threshold']}ms)",
                    'recommendation': 'Check database queries, API response times, and external service latency'
                })
        
        if 'errors' in golden_signals:
            errors = golden_signals['errors']
            if errors['status'] in ['WARNING', 'CRITICAL']:
                alerts.append({
                    'type': 'RELIABILITY',
                    'severity': errors['status'],
                    'message': f"High error rate: {errors['value']}% (threshold: {errors['threshold']}%)",
                    'recommendation': 'Review error logs, check circuit breaker status, validate input validation'
                })
        
        if 'saturation' in golden_signals:
            saturation = golden_signals['saturation']
            if saturation['status'] in ['WARNING', 'CRITICAL']:
                alerts.append({
                    'type': 'CAPACITY',
                    'severity': saturation['status'],
                    'message': f"High resource utilization: {saturation['value']}% (threshold: {saturation['threshold']}%)",
                    'recommendation': 'Monitor CPU, memory, database connections. Consider scaling if needed'
                })
        
        return alerts
    
    def _assess_overall_health(self, health_status: Dict) -> str:
        """Assess overall system health"""
        critical_issues = len([alert for alert in health_status.get('alerts', []) if alert.get('severity') == 'CRITICAL'])
        warning_issues = len([alert for alert in health_status.get('alerts', []) if alert.get('severity') == 'WARNING'])
        
        # Check component health
        components = health_status.get('components', {})
        unhealthy_components = len([comp for comp in components.values() if comp.get('status') in ['UNHEALTHY', 'DEGRADED']])
        
        # Check budget status
        budget = health_status.get('budget_status', {})
        over_budget = budget.get('over_budget_categories', 0)
        
        if critical_issues > 0 or unhealthy_components > 1:
            return 'CRITICAL'
        elif warning_issues > 2 or unhealthy_components > 0 or over_budget > 0:
            return 'WARNING'
        elif warning_issues > 0:
            return 'GOOD'
        else:
            return 'EXCELLENT'
    
    def _generate_recommendations(self, health_status: Dict) -> List[str]:
        """Generate actionable recommendations based on health status"""
        recommendations = []
        
        overall_health = health_status.get('overall_health')
        
        if overall_health == 'CRITICAL':
            recommendations.append("🚨 CRITICAL: Immediate intervention required - check alerts and system logs")
            recommendations.append("Consider activating incident response procedures")
        
        elif overall_health == 'WARNING':
            recommendations.append("⚠️ WARNING: Monitor closely and prepare to take action if issues escalate")
        
        # Feature flag recommendations
        feature_flags = health_status.get('feature_flags', {})
        if feature_flags.get('rollout_status') == 'ATTENTION_NEEDED':
            recommendations.append("Review feature flag states - some flags may need adjustment")
        
        # Budget recommendations
        budget = health_status.get('budget_status', {})
        if budget.get('over_budget_categories', 0) > 0:
            recommendations.append("Budget overage detected - review spend and consider cost controls")
        
        # Performance recommendations
        golden_signals = health_status.get('golden_signals', {})
        if any(signal.get('status') in ['WARNING', 'CRITICAL'] for signal in golden_signals.values()):
            recommendations.append("Performance issues detected - review golden signals dashboard")
        
        # Circuit breaker recommendations
        circuit_breakers = health_status.get('circuit_breakers', {})
        if circuit_breakers.get('protection_score', 100) < 80:
            recommendations.append("Multiple circuit breakers triggered - check external provider health")
        
        return recommendations
    
    def generate_d0_d7_report(self, day: int) -> Dict[str, any]:
        """Generate comprehensive D0-D7 monitoring report"""
        report = {
            'day': day,
            'timestamp': datetime.now().isoformat(),
            'monitoring_period': f"D+{day}",
            'health_checks_today': len([h for h in self.health_history if 
                                      datetime.fromisoformat(h['timestamp']).date() == datetime.now().date()]),
            'alerts_today': len([a for a in self.alerts_sent if 
                               datetime.fromisoformat(a['timestamp']).date() == datetime.now().date()]),
            'current_health': {},
            'trends': {},
            'daily_summary': {},
            'recommendations': []
        }
        
        # Current health check
        current_health = self.intensive_health_check()
        report['current_health'] = current_health
        
        # Analyze trends if we have history
        if len(self.health_history) >= 2:
            report['trends'] = self._analyze_health_trends()
        
        # Daily summary
        report['daily_summary'] = {
            'total_health_checks': len(self.health_history),
            'avg_overall_health': self._calculate_avg_health_score(),
            'critical_incidents': len([a for a in self.alerts_sent if a['severity'] == 'CRITICAL']),
            'warnings': len([a for a in self.alerts_sent if a['severity'] in ['HIGH', 'WARNING']]),
            'uptime_estimate': self._estimate_uptime()
        }
        
        # Day-specific recommendations
        report['recommendations'] = self._get_day_specific_recommendations(day, current_health)
        
        return report
    
    def _analyze_health_trends(self) -> Dict[str, any]:
        """Analyze health trends over time"""
        if len(self.health_history) < 2:
            return {}
        
        recent_checks = self.health_history[-10:]  # Last 10 checks
        
        trends = {
            'health_trend': 'STABLE',
            'latency_trend': 'STABLE',
            'error_trend': 'STABLE',
            'budget_trend': 'STABLE'
        }
        
        # Analyze overall health trend
        health_scores = []
        for check in recent_checks:
            score = self._health_to_score(check.get('overall_health', 'UNKNOWN'))
            health_scores.append(score)
        
        if len(health_scores) >= 3:
            if health_scores[-1] < health_scores[0]:
                trends['health_trend'] = 'DECLINING'
            elif health_scores[-1] > health_scores[0]:
                trends['health_trend'] = 'IMPROVING'
        
        return trends
    
    def _health_to_score(self, health_status: str) -> int:
        """Convert health status to numeric score"""
        scores = {
            'CRITICAL': 1,
            'WARNING': 2,
            'GOOD': 3,
            'EXCELLENT': 4,
            'UNKNOWN': 2
        }
        return scores.get(health_status, 2)
    
    def _calculate_avg_health_score(self) -> float:
        """Calculate average health score"""
        if not self.health_history:
            return 0.0
        
        scores = [self._health_to_score(h.get('overall_health', 'UNKNOWN')) for h in self.health_history]
        return sum(scores) / len(scores)
    
    def _estimate_uptime(self) -> float:
        """Estimate system uptime percentage"""
        if not self.health_history:
            return 100.0
        
        healthy_checks = len([h for h in self.health_history if h.get('overall_health') in ['EXCELLENT', 'GOOD']])
        return (healthy_checks / len(self.health_history)) * 100
    
    def _get_day_specific_recommendations(self, day: int, current_health: Dict) -> List[str]:
        """Get recommendations specific to the day after cutover"""
        recommendations = []
        
        if day == 0:  # D0 - Launch day
            recommendations.extend([
                "🔥 D0 Launch Day: Monitor every 15 minutes",
                "Keep all team leads available",
                "Watch for traffic spikes and error rate increases",
                "Be ready for immediate rollback if critical issues arise"
            ])
        
        elif day == 1:  # D+1
            recommendations.extend([
                "📊 D+1: Analyze first day performance",
                "Review overnight stability and error patterns",
                "Gradual increase in feature flag rollouts if stable"
            ])
        
        elif day <= 3:  # D+2 to D+3
            recommendations.extend([
                "📈 Early Days: Monitor for emerging patterns",
                "Begin gradual rollout of disabled features if performance is stable",
                "Validate budget projections against actual spend"
            ])
        
        elif day <= 7:  # D+4 to D+7
            recommendations.extend([
                "🎯 First Week: Prepare for normal operations",
                "Complete feature rollouts if no issues detected",
                "Document lessons learned and update monitoring thresholds"
            ])
        
        # Add current health-specific recommendations
        if current_health.get('overall_health') == 'CRITICAL':
            recommendations.insert(0, "🚨 CRITICAL STATUS: Consider rollback procedures")
        
        return recommendations

def run_d0_d7_monitoring_cycle(day: int, monitoring_interval_minutes: int = 15):
    """Run continuous D0-D7 monitoring cycle"""
    print(f"Starting D+{day} Monitoring Cycle")
    print(f"Monitoring interval: {monitoring_interval_minutes} minutes")
    print("=" * 50)
    
    monitor = D0D7MonitoringService()
    cycle_count = 0
    
    try:
        while True:
            cycle_count += 1
            print(f"\n=== D+{day} Monitoring Cycle #{cycle_count} ===")
            print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Run intensive health check
            health_status = monitor.intensive_health_check()
            
            # Log overall status
            overall_health = health_status.get('overall_health', 'UNKNOWN')
            print(f"Overall Health: {overall_health}")
            
            # Handle critical issues
            if overall_health == 'CRITICAL':
                print("🚨 CRITICAL STATUS DETECTED!")
                print("Alerts have been logged. Manual intervention may be required.")
                
                # In production, this would trigger alerts/notifications
                # For now, we log and continue monitoring
            
            # Save health check results
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_file = f"d{day}_health_check_{timestamp}.json"
            
            try:
                with open(report_file, 'w') as f:
                    json.dump(health_status, f, indent=2)
                print(f"Health report saved: {report_file}")
            except Exception as e:
                print(f"Warning: Could not save health report: {e}")
            
            # Wait for next cycle (or break if running in test mode)
            if len(sys.argv) > 2 and sys.argv[2] == '--single-run':
                break
            
            print(f"\nNext check in {monitoring_interval_minutes} minutes...")
            time.sleep(monitoring_interval_minutes * 60)
    
    except KeyboardInterrupt:
        print(f"\nMonitoring cycle stopped. Completed {cycle_count} cycles.")
        
        # Generate final report
        final_report = monitor.generate_d0_d7_report(day)
        
        report_file = f"d{day}_final_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(final_report, f, indent=2)
        
        print(f"Final D+{day} report saved: {report_file}")
        
        return True
    
    except Exception as e:
        print(f"Monitoring error: {e}")
        return False

def main():
    """Main function for D0-D7 monitoring tools"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python d0_d7_monitoring_tools.py <day> [--single-run] [--interval=<minutes>]")
        print("  python d0_d7_monitoring_tools.py 0                    # D0 monitoring")
        print("  python d0_d7_monitoring_tools.py 1 --single-run      # D+1 single check")
        print("  python d0_d7_monitoring_tools.py 2 --interval=30     # D+2 with 30min intervals")
        return False
    
    try:
        day = int(sys.argv[1])
        if day < 0 or day > 7:
            print("Day must be between 0-7 (D0 to D+7)")
            return False
    except ValueError:
        print("Day must be a number between 0-7")
        return False
    
    # Parse optional arguments
    interval_minutes = 15  # Default
    single_run = '--single-run' in sys.argv
    
    for arg in sys.argv:
        if arg.startswith('--interval='):
            try:
                interval_minutes = int(arg.split('=')[1])
            except ValueError:
                print("Invalid interval value")
                return False
    
    # Adjust interval based on day (more frequent on early days)
    if day == 0:  # D0 - Launch day
        default_interval = 5  # Every 5 minutes
    elif day == 1:  # D+1
        default_interval = 10  # Every 10 minutes
    elif day <= 3:  # D+2 to D+3
        default_interval = 15  # Every 15 minutes
    else:  # D+4 to D+7
        default_interval = 30  # Every 30 minutes
    
    # Use custom interval if provided, otherwise use day-specific default
    if '--interval=' not in ' '.join(sys.argv):
        interval_minutes = default_interval
    
    print(f"D+{day} Monitoring Configuration:")
    print(f"  Monitoring Interval: {interval_minutes} minutes")
    print(f"  Single Run: {single_run}")
    print(f"  Day Type: {'Launch Day' if day == 0 else f'Post-Launch Day +{day}'}")
    
    if single_run:
        # Run single health check
        monitor = D0D7MonitoringService()
        health_status = monitor.intensive_health_check()
        
        # Generate report
        report = monitor.generate_d0_d7_report(day)
        
        # Save report
        report_file = f"d{day}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nD+{day} Report Generated: {report_file}")
        print(f"Overall Health: {health_status.get('overall_health', 'UNKNOWN')}")
        
        # Print key recommendations
        recommendations = report.get('recommendations', [])
        if recommendations:
            print("\nKey Recommendations:")
            for rec in recommendations[:3]:  # Top 3 recommendations
                print(f"  - {rec}")
        
        return health_status.get('overall_health') not in ['CRITICAL']
    
    else:
        # Run continuous monitoring
        return run_d0_d7_monitoring_cycle(day, interval_minutes)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)