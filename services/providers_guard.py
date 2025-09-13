"""
M41: Circuit Breaker + Retries for External Providers
Protects against payment/notification provider failures
"""
import asyncio
import time
import random
import logging
from enum import Enum
from typing import Callable, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing fast
    HALF_OPEN = "half_open"  # Testing recovery

@dataclass 
class CircuitConfig:
    failure_threshold: int = 5       # Failures before opening
    timeout_seconds: int = 60        # How long to stay open
    max_retries: int = 3            # Max retry attempts
    base_delay_ms: int = 100        # Base retry delay
    max_delay_ms: int = 800         # Max retry delay

class CircuitBreaker:
    """Simple circuit breaker for external provider calls"""
    
    def __init__(self, name: str, config: CircuitConfig = None):
        self.name = name
        self.config = config or CircuitConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        self.next_attempt_time = 0
    
    def _should_attempt_call(self) -> bool:
        """Check if we should attempt the call based on circuit state"""
        now = time.time()
        
        if self.state == CircuitState.CLOSED:
            return True
        elif self.state == CircuitState.OPEN:
            if now >= self.next_attempt_time:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        elif self.state == CircuitState.HALF_OPEN:
            return True
        
        return False
    
    def _on_success(self):
        """Reset circuit on successful call"""
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        logger.info(f"Circuit {self.name} reset to CLOSED after success")
    
    def _on_failure(self):
        """Handle failure - possibly open circuit"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.config.failure_threshold:
            self.state = CircuitState.OPEN
            self.next_attempt_time = time.time() + self.config.timeout_seconds
            logger.warning(f"Circuit {self.name} OPENED after {self.failure_count} failures")
        
        logger.debug(f"Circuit {self.name} failure {self.failure_count}/{self.config.failure_threshold}")
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        if not self._should_attempt_call():
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503,
                detail=f"Service temporarily unavailable - {self.name} circuit is {self.state.value}"
            )
        
        # Try with retries and exponential backoff
        last_exception = None
        
        for attempt in range(self.config.max_retries + 1):
            try:
                if attempt > 0:
                    # Exponential backoff with jitter
                    delay = min(
                        self.config.base_delay_ms * (2 ** (attempt - 1)),
                        self.config.max_delay_ms
                    )
                    # Add jitter (±25%)
                    jitter = random.uniform(0.75, 1.25)
                    await asyncio.sleep((delay * jitter) / 1000)
                
                result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                self._on_success()
                return result
                
            except Exception as e:
                last_exception = e
                logger.warning(f"Circuit {self.name} attempt {attempt + 1} failed: {e}")
                
                if attempt == self.config.max_retries:
                    # Final failure
                    self._on_failure()
                    break
        
        # All retries exhausted
        raise last_exception

class ProviderGuard:
    """Global registry for circuit breakers per provider"""
    
    _circuits: Dict[str, CircuitBreaker] = {}
    
    @classmethod
    def get_circuit(cls, provider_name: str, config: CircuitConfig = None) -> CircuitBreaker:
        """Get or create circuit breaker for provider"""
        if provider_name not in cls._circuits:
            cls._circuits[provider_name] = CircuitBreaker(provider_name, config)
        return cls._circuits[provider_name]
    
    @classmethod
    async def call_provider(cls, provider_name: str, func: Callable, *args, **kwargs) -> Any:
        """Make guarded call to external provider"""
        circuit = cls.get_circuit(provider_name)
        
        # Audit the attempt
        from api import write_audit
        try:
            write_audit("system", "provider_call_attempt", "circuit_breaker", provider_name, {
                "state": circuit.state.value,
                "failure_count": circuit.failure_count
            })
        except Exception:
            pass  # Don't fail on audit errors
        
        return await circuit.call(func, *args, **kwargs)
    
    @classmethod
    def get_circuit_status(cls) -> Dict[str, Dict[str, Any]]:
        """Get status of all circuits for metrics"""
        return {
            name: {
                "state": circuit.state.value,
                "failure_count": circuit.failure_count,
                "last_failure_time": circuit.last_failure_time
            }
            for name, circuit in cls._circuits.items()
        }

# Convenience decorators for common providers
async def guarded_payment_call(func: Callable, *args, **kwargs):
    """Protected payment provider call"""
    return await ProviderGuard.call_provider("payment_provider", func, *args, **kwargs)

async def guarded_notification_call(func: Callable, *args, **kwargs):
    """Protected notification provider call"""
    return await ProviderGuard.call_provider("notification_provider", func, *args, **kwargs)

async def guarded_twilio_call(func: Callable, *args, **kwargs):
    """Protected Twilio API call"""
    return await ProviderGuard.call_provider("twilio", func, *args, **kwargs)