#!/usr/bin/env python3
"""
M35 — Rate-Limit Conformance Tests (HTTP 429 + Retry-After)
Validates proper rate limiting behavior and client backoff strategies
"""

import os
import json
import time
import asyncio
import requests
import random
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BackoffStrategy(Enum):
    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    FIXED = "fixed"
    EXPONENTIAL_JITTER = "exponential_jitter"

@dataclass
class RateLimitTest:
    endpoint: str
    method: str
    requests_per_second: int
    duration_seconds: int
    expected_429: bool = True
    backoff_strategy: BackoffStrategy = BackoffStrategy.EXPONENTIAL_JITTER

@dataclass
class RateLimitResult:
    test_id: str
    endpoint: str
    total_requests: int
    successful_requests: int
    rate_limited_requests: int
    retry_after_values: List[int]
    backoff_successful: bool
    avg_response_time_ms: float
    max_response_time_ms: int
    min_response_time_ms: int
    error_messages: List[str]
    compliance_score: float
    timestamp: str

class RateLimitConformanceTester:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SamiaRateLimitTest/1.0',
            'Content-Type': 'application/json'
        })
        
        # Test configurations
        self.test_configs = [
            RateLimitTest(
                endpoint="/api/auth/login",
                method="POST",
                requests_per_second=20,
                duration_seconds=10
            ),
            RateLimitTest(
                endpoint="/api/bookings/availability",
                method="GET",
                requests_per_second=50,
                duration_seconds=5
            ),
            RateLimitTest(
                endpoint="/api/zodiac/today",
                method="GET",
                requests_per_second=100,
                duration_seconds=3
            ),
            RateLimitTest(
                endpoint="/api/services",
                method="GET",
                requests_per_second=30,
                duration_seconds=8
            )
        ]
        
        self.results: List[RateLimitResult] = []
    
    def calculate_backoff_delay(self, strategy: BackoffStrategy, attempt: int, base_delay: int = 1) -> float:
        """Calculate backoff delay based on strategy"""
        if strategy == BackoffStrategy.EXPONENTIAL:
            return base_delay * (2 ** attempt)
        elif strategy == BackoffStrategy.LINEAR:
            return base_delay * attempt
        elif strategy == BackoffStrategy.FIXED:
            return base_delay
        elif strategy == BackoffStrategy.EXPONENTIAL_JITTER:
            delay = base_delay * (2 ** attempt)
            jitter = random.uniform(0.1, 0.3) * delay  # 10-30% jitter
            return delay + jitter
        else:
            return base_delay
    
    async def test_rate_limit_endpoint(self, test_config: RateLimitTest) -> RateLimitResult:
        """Test rate limiting for a specific endpoint"""
        test_id = f"rate-limit-{test_config.endpoint.replace('/', '-')}-{int(time.time())}"
        logger.info(f"Testing rate limits for {test_config.endpoint}")
        
        total_requests = 0
        successful_requests = 0
        rate_limited_requests = 0
        retry_after_values = []
        response_times = []
        error_messages = []
        backoff_successful = False
        
        # Calculate request timing
        requests_interval = 1.0 / test_config.requests_per_second
        total_expected_requests = test_config.requests_per_second * test_config.duration_seconds
        
        start_time = time.time()
        
        for i in range(total_expected_requests):
            try:
                request_start = time.time()
                
                # Prepare request
                if test_config.method == "GET":
                    response = self.session.get(
                        f"{self.base_url}{test_config.endpoint}",
                        timeout=5
                    )
                elif test_config.method == "POST":
                    payload = {"test": True, "request_id": f"{test_id}-{i}"}
                    response = self.session.post(
                        f"{self.base_url}{test_config.endpoint}",
                        json=payload,
                        timeout=5
                    )
                else:
                    continue
                
                request_end = time.time()
                response_time_ms = int((request_end - request_start) * 1000)
                response_times.append(response_time_ms)
                total_requests += 1
                
                if response.status_code == 429:
                    rate_limited_requests += 1
                    
                    # Check for Retry-After header
                    retry_after = response.headers.get('Retry-After')
                    if retry_after:
                        try:
                            retry_after_int = int(retry_after)
                            retry_after_values.append(retry_after_int)
                            
                            # Test backoff behavior
                            logger.info(f"Rate limited. Retry-After: {retry_after_int}s")
                            
                            # Calculate backoff delay
                            backoff_delay = self.calculate_backoff_delay(
                                test_config.backoff_strategy, 
                                len(retry_after_values),
                                retry_after_int
                            )
                            
                            # Wait for backoff
                            await asyncio.sleep(backoff_delay)
                            
                            # Test retry after backoff
                            retry_start = time.time()
                            if test_config.method == "GET":
                                retry_response = self.session.get(
                                    f"{self.base_url}{test_config.endpoint}",
                                    timeout=5
                                )
                            else:
                                retry_response = self.session.post(
                                    f"{self.base_url}{test_config.endpoint}",
                                    json={"test": True, "retry": True},
                                    timeout=5
                                )
                            
                            retry_end = time.time()
                            retry_time_ms = int((retry_end - retry_start) * 1000)
                            response_times.append(retry_time_ms)
                            
                            if retry_response.status_code != 429:
                                backoff_successful = True
                                successful_requests += 1
                                logger.info(f"Retry successful after backoff")
                            else:
                                logger.warning(f"Retry still rate limited after backoff")
                            
                        except (ValueError, TypeError):
                            error_messages.append(f"Invalid Retry-After header: {retry_after}")
                    else:
                        error_messages.append("Rate limited but no Retry-After header")
                
                elif 200 <= response.status_code < 300:
                    successful_requests += 1
                else:
                    error_messages.append(f"Unexpected status code: {response.status_code}")
                
                # Maintain request rate
                await asyncio.sleep(requests_interval)
                
            except Exception as e:
                error_messages.append(f"Request failed: {str(e)}")
                total_requests += 1
        
        # Calculate metrics
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        
        # Calculate compliance score
        compliance_score = self.calculate_compliance_score(
            rate_limited_requests > 0,  # Did we hit rate limits?
            len(retry_after_values) > 0,  # Were Retry-After headers present?
            backoff_successful,  # Did backoff work?
            test_config.expected_429
        )
        
        result = RateLimitResult(
            test_id=test_id,
            endpoint=test_config.endpoint,
            total_requests=total_requests,
            successful_requests=successful_requests,
            rate_limited_requests=rate_limited_requests,
            retry_after_values=retry_after_values,
            backoff_successful=backoff_successful,
            avg_response_time_ms=avg_response_time,
            max_response_time_ms=max_response_time,
            min_response_time_ms=min_response_time,
            error_messages=error_messages,
            compliance_score=compliance_score,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Rate limit test complete for {test_config.endpoint}: {compliance_score:.1f}% compliant")
        return result
    
    def calculate_compliance_score(self, hit_rate_limits: bool, has_retry_after: bool, 
                                 backoff_successful: bool, expected_429: bool) -> float:
        """Calculate compliance score based on rate limiting behavior"""
        score = 0.0
        
        # Check if rate limits were triggered as expected
        if hit_rate_limits == expected_429:
            score += 25.0
        
        # Check for Retry-After header presence
        if has_retry_after:
            score += 35.0
        
        # Check if backoff strategy worked
        if backoff_successful:
            score += 40.0
        elif not hit_rate_limits:
            # If no rate limits hit, can't test backoff, so give partial credit
            score += 20.0
        
        return score
    
    async def test_burst_behavior(self) -> RateLimitResult:
        """Test behavior under sudden traffic bursts"""
        test_id = f"burst-test-{int(time.time())}"
        logger.info("Testing burst traffic behavior")
        
        total_requests = 0
        successful_requests = 0
        rate_limited_requests = 0
        retry_after_values = []
        response_times = []
        error_messages = []
        
        # Send burst of requests
        burst_size = 100
        tasks = []
        
        async def send_burst_request(request_id: int):
            try:
                start_time = time.time()
                response = self.session.get(
                    f"{self.base_url}/api/health",
                    headers={'X-Burst-Test': f"{test_id}-{request_id}"},
                    timeout=5
                )
                end_time = time.time()
                
                return {
                    'request_id': request_id,
                    'status_code': response.status_code,
                    'response_time_ms': int((end_time - start_time) * 1000),
                    'retry_after': response.headers.get('Retry-After'),
                    'headers': dict(response.headers)
                }
            except Exception as e:
                return {
                    'request_id': request_id,
                    'error': str(e),
                    'status_code': 0,
                    'response_time_ms': 0
                }
        
        # Execute burst
        for i in range(burst_size):
            tasks.append(send_burst_request(i))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Analyze results
        for result in results:
            if isinstance(result, Exception):
                error_messages.append(str(result))
                continue
            
            total_requests += 1
            
            if 'error' in result:
                error_messages.append(result['error'])
            elif result['status_code'] == 429:
                rate_limited_requests += 1
                if result['retry_after']:
                    try:
                        retry_after_values.append(int(result['retry_after']))
                    except (ValueError, TypeError):
                        pass
            elif 200 <= result['status_code'] < 300:
                successful_requests += 1
            
            if result['response_time_ms'] > 0:
                response_times.append(result['response_time_ms'])
        
        # Calculate metrics
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        
        # For burst test, we expect rate limiting to kick in
        compliance_score = self.calculate_compliance_score(
            rate_limited_requests > 0,
            len(retry_after_values) > 0,
            False,  # We don't test backoff in burst test
            True  # We expect 429s
        )
        
        return RateLimitResult(
            test_id=test_id,
            endpoint="/api/health (burst test)",
            total_requests=total_requests,
            successful_requests=successful_requests,
            rate_limited_requests=rate_limited_requests,
            retry_after_values=retry_after_values,
            backoff_successful=False,  # Not applicable for burst test
            avg_response_time_ms=avg_response_time,
            max_response_time_ms=max_response_time,
            min_response_time_ms=min_response_time,
            error_messages=error_messages,
            compliance_score=compliance_score,
            timestamp=datetime.now().isoformat()
        )
    
    async def run_all_tests(self) -> List[RateLimitResult]:
        """Run all rate limit conformance tests"""
        logger.info("Starting Rate-Limit Conformance Tests...")
        
        # Run endpoint-specific tests
        endpoint_tests = [
            self.test_rate_limit_endpoint(config) 
            for config in self.test_configs
        ]
        
        results = await asyncio.gather(*endpoint_tests, return_exceptions=True)
        
        # Add burst test
        burst_result = await self.test_burst_behavior()
        results.append(burst_result)
        
        # Handle exceptions
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Test {i} failed: {result}")
                # Create a failed result
                failed_result = RateLimitResult(
                    test_id=f"failed-test-{i}",
                    endpoint="unknown",
                    total_requests=0,
                    successful_requests=0,
                    rate_limited_requests=0,
                    retry_after_values=[],
                    backoff_successful=False,
                    avg_response_time_ms=0,
                    max_response_time_ms=0,
                    min_response_time_ms=0,
                    error_messages=[str(result)],
                    compliance_score=0.0,
                    timestamp=datetime.now().isoformat()
                )
                valid_results.append(failed_result)
            else:
                valid_results.append(result)
        
        self.results = valid_results
        return valid_results
    
    def generate_conformance_report(self) -> Dict[str, Any]:
        """Generate comprehensive conformance report"""
        if not self.results:
            return {"error": "No test results available"}
        
        total_tests = len(self.results)
        total_requests = sum(result.total_requests for result in self.results)
        total_rate_limited = sum(result.rate_limited_requests for result in self.results)
        
        avg_compliance = sum(result.compliance_score for result in self.results) / total_tests
        
        # Analyze Retry-After behavior
        all_retry_after_values = []
        for result in self.results:
            all_retry_after_values.extend(result.retry_after_values)
        
        retry_after_stats = {
            "total_retry_after_headers": len(all_retry_after_values),
            "avg_retry_after_seconds": sum(all_retry_after_values) / len(all_retry_after_values) if all_retry_after_values else 0,
            "min_retry_after": min(all_retry_after_values) if all_retry_after_values else 0,
            "max_retry_after": max(all_retry_after_values) if all_retry_after_values else 0
        }
        
        # Performance impact analysis
        performance_impact = {
            "avg_response_time_ms": sum(result.avg_response_time_ms for result in self.results) / total_tests,
            "max_response_time_ms": max(result.max_response_time_ms for result in self.results),
            "rate_limiting_effectiveness": f"{(total_rate_limited/total_requests*100):.2f}%" if total_requests > 0 else "0%"
        }
        
        report = {
            "test_suite": "Rate-Limit Conformance Tests",
            "execution_timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "total_requests": total_requests,
                "rate_limited_requests": total_rate_limited,
                "avg_compliance_score": f"{avg_compliance:.1f}%",
                "overall_conformance": "PASS" if avg_compliance >= 75.0 else "FAIL"
            },
            "retry_after_analysis": retry_after_stats,
            "performance_impact": performance_impact,
            "detailed_results": [asdict(result) for result in self.results],
            "recommendations": self.generate_recommendations(),
            "rfc_compliance": {
                "rfc_6585_section_4": "Additional HTTP Status Codes - 429 Too Many Requests",
                "retry_after_rfc_7231": "HTTP/1.1 Semantics - Retry-After header",
                "spec_link": "https://datatracker.ietf.org/doc/html/rfc6585#section-4"
            }
        }
        
        return report
    
    def generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Check for missing Retry-After headers
        missing_retry_after = sum(1 for result in self.results 
                                if result.rate_limited_requests > 0 and not result.retry_after_values)
        
        if missing_retry_after > 0:
            recommendations.append(
                "Implement Retry-After headers in all 429 responses per RFC 6585"
            )
        
        # Check compliance scores
        low_compliance = [result for result in self.results if result.compliance_score < 75.0]
        if low_compliance:
            recommendations.append(
                f"Improve rate limiting implementation for {len(low_compliance)} endpoints"
            )
        
        # Check for backoff failures
        backoff_failures = sum(1 for result in self.results 
                             if result.rate_limited_requests > 0 and not result.backoff_successful)
        
        if backoff_failures > 0:
            recommendations.append(
                "Verify Retry-After values allow for successful backoff behavior"
            )
        
        # Performance recommendations
        high_response_times = [result for result in self.results if result.avg_response_time_ms > 2000]
        if high_response_times:
            recommendations.append(
                "Optimize response times for rate-limited endpoints"
            )
        
        if not recommendations:
            recommendations.append("Rate limiting implementation meets all conformance criteria")
        
        return recommendations

# CLI Usage
async def main():
    tester = RateLimitConformanceTester()
    results = await tester.run_all_tests()
    report = tester.generate_conformance_report()
    
    # Save report
    with open("rate_limit_conformance_report.json", "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\\n📊 Rate-Limit Conformance Test Results:")
    print(f"Overall Conformance: {report['summary']['overall_conformance']}")
    print(f"Average Compliance Score: {report['summary']['avg_compliance_score']}")
    print(f"Total Requests: {report['summary']['total_requests']}")
    print(f"Rate Limited: {report['summary']['rate_limited_requests']}")
    print(f"\\nDetailed report saved to: rate_limit_conformance_report.json")

if __name__ == "__main__":
    asyncio.run(main())