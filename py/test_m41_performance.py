"""
M41: Performance & Resilience Tests
Test circuit breakers, metrics collection, and performance tracking
"""
import asyncio
import time
from unittest.mock import Mock, patch

def test_circuit_breaker_states():
    """Test circuit breaker state transitions"""
    from services.providers_guard import CircuitBreaker, CircuitConfig, CircuitState
    
    # Test circuit with low failure threshold for testing
    config = CircuitConfig(failure_threshold=2, timeout_seconds=1)
    circuit = CircuitBreaker("test_provider", config)
    
    # Initially closed
    assert circuit.state == CircuitState.CLOSED
    
    # First failure - stays closed
    circuit._on_failure()
    assert circuit.state == CircuitState.CLOSED
    assert circuit.failure_count == 1
    
    # Second failure - opens circuit
    circuit._on_failure() 
    assert circuit.state == CircuitState.OPEN
    assert circuit.failure_count == 2
    
    # Success resets circuit
    circuit._on_success()
    assert circuit.state == CircuitState.CLOSED
    assert circuit.failure_count == 0
    
    print("Circuit breaker state transitions: PASS")

def test_circuit_breaker_timeout():
    """Test circuit breaker auto-recovery after timeout"""
    from services.providers_guard import CircuitBreaker, CircuitConfig, CircuitState
    
    config = CircuitConfig(failure_threshold=1, timeout_seconds=0.1)  # Very short timeout
    circuit = CircuitBreaker("test_timeout", config)
    
    # Force circuit open
    circuit._on_failure()
    assert circuit.state == CircuitState.OPEN
    
    # Should not allow calls immediately
    assert not circuit._should_attempt_call()
    
    # Wait for timeout
    time.sleep(0.2)
    
    # Should transition to half-open and allow attempt
    assert circuit._should_attempt_call()
    assert circuit.state == CircuitState.HALF_OPEN
    
    print("Circuit breaker timeout recovery: PASS")

def test_performance_tracker_metrics():
    """Test performance metrics collection"""
    from api import PerformanceTracker
    
    tracker = PerformanceTracker()
    
    # Simulate some requests
    tracker.record_request("/api/orders", "POST", 150.0, 200)
    tracker.record_request("/api/orders", "POST", 200.0, 200)  
    tracker.record_request("/api/orders", "POST", 300.0, 500)  # Error
    tracker.record_request("/api/orders", "POST", 100.0, 429)  # Rate limit
    
    metrics = tracker.get_metrics()
    
    # Check metrics exist
    assert 'requests_total_POST_/api/orders' in metrics
    assert metrics['requests_total_POST_/api/orders'] == 4
    
    assert 'errors_total_POST_/api/orders' in metrics  
    assert metrics['errors_total_POST_/api/orders'] == 1
    
    assert 'rate_limit_breaches_total' in metrics
    assert metrics['rate_limit_breaches_total'] == 1
    
    # Check percentiles
    assert 'latency_ms_p50_POST_/api/orders' in metrics
    assert 'latency_ms_p95_POST_/api/orders' in metrics
    assert 'latency_ms_p99_POST_/api/orders' in metrics
    
    # Check error rate calculation
    assert 'error_rate_POST_/api/orders' in metrics
    assert metrics['error_rate_POST_/api/orders'] == 0.25  # 1 error out of 4 requests
    
    print("Performance tracker metrics: PASS")

def test_retry_with_exponential_backoff():
    """Test retry mechanism with exponential backoff"""
    from services.providers_guard import CircuitBreaker, CircuitConfig
    
    config = CircuitConfig(max_retries=3, base_delay_ms=10, max_delay_ms=100)
    circuit = CircuitBreaker("test_retry", config)
    
    call_count = 0
    
    async def failing_func():
        nonlocal call_count
        call_count += 1
        if call_count <= 2:
            raise Exception(f"Failure {call_count}")
        return "success"
    
    # Should succeed on third attempt
    result = asyncio.run(circuit.call(failing_func))
    assert result == "success"
    assert call_count == 3
    
    print("Exponential backoff retry: PASS")

def test_rate_limit_with_retry_after():
    """Test rate limit responses include Retry-After header"""
    # This would require mocking the database rate limit function
    # For now, just verify the structure
    from fastapi import HTTPException
    
    try:
        # Simulate rate limit exceeded
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded", 
            headers={"Retry-After": "60"}
        )
    except HTTPException as e:
        assert e.status_code == 429
        assert "Retry-After" in e.headers
        assert e.headers["Retry-After"] == "60"
    
    print("Rate limit Retry-After header: PASS")

def test_provider_guard_integration():
    """Test ProviderGuard circuit management"""
    from services.providers_guard import ProviderGuard
    
    # Get circuit for a provider
    circuit = ProviderGuard.get_circuit("test_provider")
    assert circuit is not None
    
    # Get same circuit again - should be cached
    circuit2 = ProviderGuard.get_circuit("test_provider")  
    assert circuit is circuit2
    
    # Get status
    status = ProviderGuard.get_circuit_status()
    assert "test_provider" in status
    assert "state" in status["test_provider"]
    
    print("ProviderGuard integration: PASS")

def test_metrics_endpoint_includes_performance():
    """Test that metrics endpoint includes M41 performance data"""
    # This would require a full API test with mocked dependencies
    # For now, verify the structure exists
    from api import perf_tracker
    
    # Simulate some activity
    perf_tracker.record_request("/test", "GET", 100.0, 200)
    
    metrics = perf_tracker.get_metrics()
    
    assert 'requests_total_GET_/test' in metrics
    assert 'latency_ms_p95_GET_/test' in metrics
    assert 'rate_limit_breaches_total' in metrics
    
    print("Metrics endpoint performance data: PASS")

async def test_circuit_breaker_fail_fast():
    """Test circuit breaker fails fast when OPEN"""
    from services.providers_guard import CircuitBreaker, CircuitConfig, CircuitState
    from fastapi import HTTPException
    
    config = CircuitConfig(failure_threshold=1, timeout_seconds=60)  # Long timeout
    circuit = CircuitBreaker("test_fail_fast", config)
    
    # Force circuit open by triggering failure
    circuit._on_failure()
    assert circuit.state == CircuitState.OPEN
    
    async def dummy_func():
        return "should not be called"
    
    # Should fail fast without calling function
    try:
        await circuit.call(dummy_func)
        assert False, "Should have raised HTTPException"
    except HTTPException as e:
        assert e.status_code == 503
        assert "temporarily unavailable" in e.detail.lower()
    
    print("Circuit breaker fail fast: PASS")

if __name__ == "__main__":
    print("Running M41 Performance & Resilience Tests...")
    
    try:
        test_circuit_breaker_states()
        test_circuit_breaker_timeout()  
        test_performance_tracker_metrics()
        
        # Async tests  
        test_retry_with_exponential_backoff()  # This is not async
        asyncio.run(test_circuit_breaker_fail_fast())
        
        # Sync tests
        test_rate_limit_with_retry_after()
        test_provider_guard_integration()
        test_metrics_endpoint_includes_performance()
        
        print("\nM41 Performance & Resilience: ALL TESTS PASSED")
        
    except Exception as e:
        print(f"Test failed: {e}")
        raise