#!/usr/bin/env python3
"""
M35 — E2E Test Suite V2 + Synthetic Monitors
Critical user journeys with black-box testing approach
"""

import os
import json
import time
import asyncio
import requests
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JourneyType(Enum):
    AUTH_LOGIN = "auth_login"
    BOOKING_FLOW = "booking_flow"
    EMERGENCY_CALL = "emergency_call"
    DAILY_ZODIAC = "daily_zodiac_publish"
    RATE_LIMIT_TEST = "rate_limit_conformance"
    PITR_CONFIDENCE = "pitr_confidence_check"

class TestResult(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    SKIP = "SKIP"

@dataclass
class JourneyArtifact:
    timestamp: str
    request_id: str
    sanitized_request: Dict[str, Any]
    sanitized_response: Dict[str, Any]
    duration_ms: int
    runbook_link: Optional[str] = None

@dataclass
class E2EJourneyResult:
    journey_type: str
    test_result: TestResult
    start_time: str
    end_time: str
    duration_ms: int
    artifacts: List[JourneyArtifact]
    error_message: Optional[str] = None
    slo_compliance: bool = True

class E2ETestSuite:
    def __init__(self, base_url: str = "http://localhost:3000", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key or os.getenv("E2E_API_KEY")
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SamiaE2E/1.0',
            'Content-Type': 'application/json'
        })
        if self.api_key:
            self.session.headers.update({'Authorization': f'Bearer {self.api_key}'})
        
        self.results: List[E2EJourneyResult] = []
    
    def _sanitize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove PII and sensitive data from request/response for artifacts"""
        sensitive_keys = ['password', 'token', 'email', 'phone', 'credit_card', 'ssn', 'api_key']
        sanitized = {}
        
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_data(value)
            elif isinstance(value, list):
                sanitized[key] = [self._sanitize_data(item) if isinstance(item, dict) else item for item in value]
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _generate_request_id(self) -> str:
        """Generate unique request ID for tracing"""
        return f"e2e-{int(time.time())}-{hashlib.md5(str(time.time()).encode()).hexdigest()[:8]}"
    
    async def test_auth_login_journey(self) -> E2EJourneyResult:
        """Test Auth/Login (email/OTP & social) journey"""
        start_time = datetime.now()
        artifacts = []
        
        try:
            # Test email/OTP flow
            request_id = self._generate_request_id()
            email_payload = {
                "email": "test+e2e@samia-tarot.com",
                "flow": "email_otp"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/request-otp",
                json=email_payload,
                headers={'X-Request-ID': request_id}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(email_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/AUTH_TROUBLESHOOTING.md"
            ))
            
            # Test social auth flow
            request_id = self._generate_request_id()
            social_payload = {
                "provider": "google",
                "flow": "social_auth"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/social/initiate",
                json=social_payload,
                headers={'X-Request-ID': request_id}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(social_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/AUTH_TROUBLESHOOTING.md"
            ))
            
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds() * 1000)
            
            # Check SLO compliance (auth should be <2s)
            slo_compliance = duration < 2000
            
            return E2EJourneyResult(
                journey_type=JourneyType.AUTH_LOGIN.value,
                test_result=TestResult.PASS if response.status_code in [200, 201] else TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                duration_ms=duration,
                artifacts=artifacts,
                slo_compliance=slo_compliance
            )
            
        except Exception as e:
            logger.error(f"Auth journey failed: {e}")
            return E2EJourneyResult(
                journey_type=JourneyType.AUTH_LOGIN.value,
                test_result=TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=datetime.now().isoformat(),
                duration_ms=int((datetime.now() - start_time).total_seconds() * 1000),
                artifacts=artifacts,
                error_message=str(e),
                slo_compliance=False
            )
    
    async def test_booking_flow_journey(self) -> E2EJourneyResult:
        """Test Booking Hold → Payment Confirm (idempotency)"""
        start_time = datetime.now()
        artifacts = []
        
        try:
            # Step 1: Check availability
            request_id = self._generate_request_id()
            availability_payload = {
                "service_id": "tarot",
                "preferred_date": (datetime.now() + timedelta(days=1)).isoformat(),
                "duration_minutes": 30
            }
            
            response = self.session.post(
                f"{self.base_url}/api/bookings/availability",
                json=availability_payload,
                headers={'X-Request-ID': request_id}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(availability_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/BOOKING_TROUBLESHOOTING.md"
            ))
            
            # Step 2: Create hold with idempotency key
            idempotency_key = f"booking-{int(time.time())}-{hashlib.md5(str(time.time()).encode()).hexdigest()[:8]}"
            hold_payload = {
                "service_id": "tarot",
                "slot_id": "slot_123",
                "idempotency_key": idempotency_key
            }
            
            response = self.session.post(
                f"{self.base_url}/api/bookings/hold",
                json=hold_payload,
                headers={'X-Request-ID': request_id, 'Idempotency-Key': idempotency_key}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(hold_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/BOOKING_TROUBLESHOOTING.md"
            ))
            
            # Step 3: Test idempotency - retry same request
            response_retry = self.session.post(
                f"{self.base_url}/api/bookings/hold",
                json=hold_payload,
                headers={'X-Request-ID': request_id, 'Idempotency-Key': idempotency_key}
            )
            
            # Step 4: Confirm payment
            payment_payload = {
                "booking_id": "booking_123",
                "payment_method": "stripe",
                "idempotency_key": idempotency_key
            }
            
            response = self.session.post(
                f"{self.base_url}/api/payments/confirm",
                json=payment_payload,
                headers={'X-Request-ID': request_id, 'Idempotency-Key': idempotency_key}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(payment_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/PAYMENT_TROUBLESHOOTING.md"
            ))
            
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds() * 1000)
            
            # Check SLO compliance (booking flow should be <5s)
            slo_compliance = duration < 5000
            
            return E2EJourneyResult(
                journey_type=JourneyType.BOOKING_FLOW.value,
                test_result=TestResult.PASS if response.status_code in [200, 201] else TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                duration_ms=duration,
                artifacts=artifacts,
                slo_compliance=slo_compliance
            )
            
        except Exception as e:
            logger.error(f"Booking journey failed: {e}")
            return E2EJourneyResult(
                journey_type=JourneyType.BOOKING_FLOW.value,
                test_result=TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=datetime.now().isoformat(),
                duration_ms=int((datetime.now() - start_time).total_seconds() * 1000),
                artifacts=artifacts,
                error_message=str(e),
                slo_compliance=False
            )
    
    async def test_emergency_call_journey(self) -> E2EJourneyResult:
        """Test Emergency Call → Reader Connect (Monitor join)"""
        start_time = datetime.now()
        artifacts = []
        
        try:
            # Step 1: Initiate emergency call
            request_id = self._generate_request_id()
            emergency_payload = {
                "emergency_type": "urgent_spiritual_guidance",
                "priority": "high",
                "bypass_quiet_hours": True
            }
            
            response = self.session.post(
                f"{self.base_url}/api/emergency/initiate",
                json=emergency_payload,
                headers={'X-Request-ID': request_id}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(emergency_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/EMERGENCY_CALL_PROCEDURES.md"
            ))
            
            # Step 2: Simulate reader connection
            connect_payload = {
                "call_id": "emergency_call_123",
                "reader_id": "reader_456",
                "connection_type": "voice"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/emergency/connect",
                json=connect_payload,
                headers={'X-Request-ID': request_id}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(connect_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/EMERGENCY_CALL_PROCEDURES.md"
            ))
            
            # Step 3: Monitor join (silent)
            monitor_payload = {
                "call_id": "emergency_call_123",
                "monitor_id": "monitor_789",
                "join_type": "silent"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/emergency/monitor-join",
                json=monitor_payload,
                headers={'X-Request-ID': request_id}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(monitor_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/MONITOR_PROCEDURES.md"
            ))
            
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds() * 1000)
            
            # Check SLO compliance (emergency call should be <10s)
            slo_compliance = duration < 10000
            
            return E2EJourneyResult(
                journey_type=JourneyType.EMERGENCY_CALL.value,
                test_result=TestResult.PASS if response.status_code in [200, 201] else TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                duration_ms=duration,
                artifacts=artifacts,
                slo_compliance=slo_compliance
            )
            
        except Exception as e:
            logger.error(f"Emergency call journey failed: {e}")
            return E2EJourneyResult(
                journey_type=JourneyType.EMERGENCY_CALL.value,
                test_result=TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=datetime.now().isoformat(),
                duration_ms=int((datetime.now() - start_time).total_seconds() * 1000),
                artifacts=artifacts,
                error_message=str(e),
                slo_compliance=False
            )
    
    async def test_daily_zodiac_publish(self) -> E2EJourneyResult:
        """Test Daily Zodiac Publish workflow"""
        start_time = datetime.now()
        artifacts = []
        
        try:
            # Step 1: Check zodiac content preparation
            request_id = self._generate_request_id()
            zodiac_payload = {
                "date": datetime.now().strftime("%Y-%m-%d"),
                "signs": ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
                         "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
            }
            
            response = self.session.post(
                f"{self.base_url}/api/zodiac/prepare",
                json=zodiac_payload,
                headers={'X-Request-ID': request_id}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(zodiac_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/DAILY_ZODIAC_PROCEDURES.md"
            ))
            
            # Step 2: Monitor approval simulation
            approval_payload = {
                "batch_id": "zodiac_batch_123",
                "approved_signs": 12,
                "monitor_id": "monitor_456"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/zodiac/approve",
                json=approval_payload,
                headers={'X-Request-ID': request_id}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(approval_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/DAILY_ZODIAC_PROCEDURES.md"
            ))
            
            # Step 3: Publish to public
            publish_payload = {
                "batch_id": "zodiac_batch_123",
                "publish_time": datetime.now().isoformat(),
                "cache_invalidate": True
            }
            
            response = self.session.post(
                f"{self.base_url}/api/zodiac/publish",
                json=publish_payload,
                headers={'X-Request-ID': request_id}
            )
            
            artifacts.append(JourneyArtifact(
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                sanitized_request=self._sanitize_data(publish_payload),
                sanitized_response=self._sanitize_data(response.json() if response.status_code == 200 else {"error": response.text}),
                duration_ms=int(response.elapsed.total_seconds() * 1000),
                runbook_link="/RUNBOOKS/DAILY_ZODIAC_PROCEDURES.md"
            ))
            
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds() * 1000)
            
            # Check SLO compliance (zodiac publish should be <15s)
            slo_compliance = duration < 15000
            
            return E2EJourneyResult(
                journey_type=JourneyType.DAILY_ZODIAC.value,
                test_result=TestResult.PASS if response.status_code in [200, 201] else TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                duration_ms=duration,
                artifacts=artifacts,
                slo_compliance=slo_compliance
            )
            
        except Exception as e:
            logger.error(f"Daily zodiac journey failed: {e}")
            return E2EJourneyResult(
                journey_type=JourneyType.DAILY_ZODIAC.value,
                test_result=TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=datetime.now().isoformat(),
                duration_ms=int((datetime.now() - start_time).total_seconds() * 1000),
                artifacts=artifacts,
                error_message=str(e),
                slo_compliance=False
            )
    
    async def test_rate_limit_conformance(self) -> E2EJourneyResult:
        """Test Rate-Limit Conformance (429 + Retry-After)"""
        start_time = datetime.now()
        artifacts = []
        
        try:
            # Burst test to trigger rate limiting
            request_id = self._generate_request_id()
            
            # Send rapid requests to trigger 429
            for i in range(10):
                response = self.session.get(
                    f"{self.base_url}/api/health",
                    headers={'X-Request-ID': f"{request_id}-{i}"}
                )
                
                if response.status_code == 429:
                    retry_after = response.headers.get('Retry-After')
                    
                    artifacts.append(JourneyArtifact(
                        timestamp=datetime.now().isoformat(),
                        request_id=f"{request_id}-{i}",
                        sanitized_request={"endpoint": "/api/health", "method": "GET"},
                        sanitized_response={
                            "status_code": response.status_code,
                            "retry_after": retry_after,
                            "headers": dict(response.headers)
                        },
                        duration_ms=int(response.elapsed.total_seconds() * 1000),
                        runbook_link="/RUNBOOKS/RATE_LIMITING_PROCEDURES.md"
                    ))
                    
                    # Test exponential backoff
                    if retry_after:
                        backoff_time = int(retry_after)
                        await asyncio.sleep(backoff_time + 1)  # Wait a bit more than suggested
                        
                        # Retry after backoff
                        retry_response = self.session.get(
                            f"{self.base_url}/api/health",
                            headers={'X-Request-ID': f"{request_id}-retry"}
                        )
                        
                        artifacts.append(JourneyArtifact(
                            timestamp=datetime.now().isoformat(),
                            request_id=f"{request_id}-retry",
                            sanitized_request={"endpoint": "/api/health", "method": "GET", "after_backoff": True},
                            sanitized_response={"status_code": retry_response.status_code},
                            duration_ms=int(retry_response.elapsed.total_seconds() * 1000),
                            runbook_link="/RUNBOOKS/RATE_LIMITING_PROCEDURES.md"
                        ))
                    
                    break
                
                time.sleep(0.1)  # Small delay between requests
            
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds() * 1000)
            
            return E2EJourneyResult(
                journey_type=JourneyType.RATE_LIMIT_TEST.value,
                test_result=TestResult.PASS if any(artifact.sanitized_response.get("status_code") == 429 for artifact in artifacts) else TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                duration_ms=duration,
                artifacts=artifacts,
                slo_compliance=True  # Rate limiting is a feature, not a performance issue
            )
            
        except Exception as e:
            logger.error(f"Rate limit test failed: {e}")
            return E2EJourneyResult(
                journey_type=JourneyType.RATE_LIMIT_TEST.value,
                test_result=TestResult.FAIL,
                start_time=start_time.isoformat(),
                end_time=datetime.now().isoformat(),
                duration_ms=int((datetime.now() - start_time).total_seconds() * 1000),
                artifacts=artifacts,
                error_message=str(e),
                slo_compliance=False
            )
    
    async def run_all_journeys(self) -> List[E2EJourneyResult]:
        """Run all E2E journeys and return results"""
        logger.info("Starting E2E Test Suite V2...")
        
        journeys = [
            self.test_auth_login_journey(),
            self.test_booking_flow_journey(),
            self.test_emergency_call_journey(),
            self.test_daily_zodiac_publish(),
            self.test_rate_limit_conformance()
        ]
        
        results = await asyncio.gather(*journeys, return_exceptions=True)
        
        # Handle any exceptions
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Journey {i} failed with exception: {result}")
                results[i] = E2EJourneyResult(
                    journey_type=f"journey_{i}",
                    test_result=TestResult.FAIL,
                    start_time=datetime.now().isoformat(),
                    end_time=datetime.now().isoformat(),
                    duration_ms=0,
                    artifacts=[],
                    error_message=str(result),
                    slo_compliance=False
                )
        
        self.results = results
        return results
    
    def generate_report(self, output_file: str = "e2e_test_results.json") -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results if result.test_result == TestResult.PASS)
        failed_tests = sum(1 for result in self.results if result.test_result == TestResult.FAIL)
        slo_compliant = sum(1 for result in self.results if result.slo_compliance)
        
        report = {
            "test_suite": "E2E Test Suite V2 + Synthetics",
            "execution_time": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%",
                "slo_compliance_rate": f"{(slo_compliant/total_tests*100):.1f}%" if total_tests > 0 else "0%"
            },
            "journey_results": [asdict(result) for result in self.results],
            "burn_rate_analysis": {
                "error_budget_consumed": f"{(failed_tests/total_tests*100):.2f}%" if total_tests > 0 else "0%",
                "alert_threshold": "5%",
                "escalation_required": failed_tests/total_tests > 0.05 if total_tests > 0 else False
            },
            "runbook_links": {
                "auth": "/RUNBOOKS/AUTH_TROUBLESHOOTING.md",
                "booking": "/RUNBOOKS/BOOKING_TROUBLESHOOTING.md",
                "emergency": "/RUNBOOKS/EMERGENCY_CALL_PROCEDURES.md",
                "zodiac": "/RUNBOOKS/DAILY_ZODIAC_PROCEDURES.md",
                "rate_limiting": "/RUNBOOKS/RATE_LIMITING_PROCEDURES.md"
            }
        }
        
        # Write report to file
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"E2E Test Report generated: {output_file}")
        return report

# CLI Usage
async def main():
    suite = E2ETestSuite()
    results = await suite.run_all_journeys()
    report = suite.generate_report()
    
    print(f"\\n📊 E2E Test Suite Results:")
    print(f"Total Tests: {report['summary']['total_tests']}")
    print(f"Success Rate: {report['summary']['success_rate']}")
    print(f"SLO Compliance: {report['summary']['slo_compliance_rate']}")
    print(f"\\nDetailed results saved to: e2e_test_results.json")

if __name__ == "__main__":
    asyncio.run(main())