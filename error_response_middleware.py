"""
Standardized Error Response Middleware for SAMIA-TAROT API
Ensures consistent error formatting and proper 429 Retry-After headers
"""

import time
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

class StandardErrorResponse:
    """Standard error response format"""

    @staticmethod
    def create_response(
        code: str,
        message: str,
        status_code: int,
        details: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
        retry_after: Optional[int] = None
    ) -> Dict[str, Any]:
        """Create standardized error response"""

        response = {
            "error": {
                "code": code,
                "message": message,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "correlation_id": correlation_id or str(uuid.uuid4())
            }
        }

        if details:
            response["error"]["details"] = details

        if retry_after:
            response["error"]["retry_after_seconds"] = retry_after

        return response

class ErrorCodes:
    """Standard error codes"""

    # Authentication & Authorization
    AUTH_REQUIRED = "AUTH_REQUIRED"
    AUTH_INVALID = "AUTH_INVALID"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    PERMISSION_DENIED = "PERMISSION_DENIED"

    # Rate Limiting
    RATE_LIMITED = "RATE_LIMITED"

    # Validation
    VALIDATION_FAILED = "VALIDATION_FAILED"
    INVALID_INPUT = "INVALID_INPUT"
    MISSING_FIELD = "MISSING_FIELD"

    # Resources
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    RESOURCE_GONE = "RESOURCE_GONE"

    # External Services
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    PROVIDER_NOT_CONFIGURED = "PROVIDER_NOT_CONFIGURED"

    # Internal Errors
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"

    # Business Logic
    ORDER_STATE_INVALID = "ORDER_STATE_INVALID"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"

class RateLimitHandler:
    """Handle rate limiting with proper Retry-After headers"""

    @staticmethod
    def calculate_retry_after(current_count: int, limit: int, window_seconds: int) -> int:
        """Calculate retry-after seconds based on rate limit state"""
        if current_count >= limit:
            # Return remaining time in current window
            return max(1, window_seconds // 4)  # Conservative estimate
        return 0

    @staticmethod
    def create_rate_limit_response(
        limit: int,
        window_seconds: int,
        current_count: int,
        retry_after_seconds: int
    ) -> Dict[str, Any]:
        """Create rate limit error response"""

        return StandardErrorResponse.create_response(
            code=ErrorCodes.RATE_LIMITED,
            message=f"Rate limit exceeded. {current_count}/{limit} requests in {window_seconds}s window.",
            status_code=429,
            details={
                "limit": limit,
                "window_seconds": window_seconds,
                "current_count": current_count,
                "reset_time": datetime.utcnow().isoformat() + "Z"
            },
            retry_after=retry_after_seconds
        )

class WebhookErrorHandler:
    """Handle webhook-specific errors"""

    @staticmethod
    def invalid_signature() -> Dict[str, Any]:
        """Invalid webhook signature error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.AUTH_INVALID,
            message="Invalid webhook signature",
            status_code=400,
            details={"webhook_verification": "failed"}
        )

    @staticmethod
    def provider_not_configured(provider: str) -> Dict[str, Any]:
        """Provider not configured error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.PROVIDER_NOT_CONFIGURED,
            message=f"Provider {provider} is not configured",
            status_code=503,
            details={"provider": provider, "status": "not_configured"}
        )

class ValidationErrorHandler:
    """Handle validation errors"""

    @staticmethod
    def validation_failed(errors: Dict[str, str]) -> Dict[str, Any]:
        """Validation failed error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.VALIDATION_FAILED,
            message="Input validation failed",
            status_code=400,
            details={"validation_errors": errors}
        )

    @staticmethod
    def missing_field(field_name: str) -> Dict[str, Any]:
        """Missing required field error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.MISSING_FIELD,
            message=f"Required field '{field_name}' is missing",
            status_code=400,
            details={"missing_field": field_name}
        )

class ResourceErrorHandler:
    """Handle resource-related errors"""

    @staticmethod
    def not_found(resource_type: str, resource_id: str) -> Dict[str, Any]:
        """Resource not found error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.RESOURCE_NOT_FOUND,
            message=f"{resource_type} not found",
            status_code=404,
            details={"resource_type": resource_type, "resource_id": resource_id}
        )

    @staticmethod
    def gone(resource_type: str, reason: str = "expired") -> Dict[str, Any]:
        """Resource gone/expired error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.RESOURCE_GONE,
            message=f"{resource_type} is no longer available",
            status_code=410,
            details={"resource_type": resource_type, "reason": reason}
        )

class ServiceErrorHandler:
    """Handle service errors"""

    @staticmethod
    def service_unavailable(service_name: str, retry_after: int = 60) -> Dict[str, Any]:
        """Service unavailable error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.SERVICE_UNAVAILABLE,
            message=f"{service_name} is temporarily unavailable",
            status_code=503,
            details={"service": service_name, "status": "unavailable"},
            retry_after=retry_after
        )

    @staticmethod
    def external_service_error(service_name: str, error_detail: str) -> Dict[str, Any]:
        """External service error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.EXTERNAL_SERVICE_ERROR,
            message=f"External service error: {service_name}",
            status_code=502,
            details={"service": service_name, "error": error_detail}
        )

class BusinessLogicErrorHandler:
    """Handle business logic errors"""

    @staticmethod
    def order_state_invalid(order_id: str, current_state: str, required_state: str) -> Dict[str, Any]:
        """Invalid order state error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.ORDER_STATE_INVALID,
            message=f"Order state invalid for this operation",
            status_code=409,
            details={
                "order_id": order_id,
                "current_state": current_state,
                "required_state": required_state
            }
        )

    @staticmethod
    def payment_failed(payment_id: str, reason: str) -> Dict[str, Any]:
        """Payment failed error"""
        return StandardErrorResponse.create_response(
            code=ErrorCodes.PAYMENT_FAILED,
            message="Payment processing failed",
            status_code=402,
            details={"payment_id": payment_id, "reason": reason}
        )

# FastAPI middleware integration
def create_fastapi_error_handler():
    """Create FastAPI-compatible error handler"""

    from fastapi import Request, HTTPException
    from fastapi.responses import JSONResponse

    async def error_handler(request: Request, exc: HTTPException):
        """Handle HTTPException with standardized format"""

        error_response = StandardErrorResponse.create_response(
            code=getattr(exc, 'error_code', 'HTTP_ERROR'),
            message=exc.detail,
            status_code=exc.status_code,
            details=getattr(exc, 'details', None),
            retry_after=getattr(exc, 'retry_after', None)
        )

        headers = {}
        if hasattr(exc, 'retry_after') and exc.retry_after:
            headers['Retry-After'] = str(exc.retry_after)

        return JSONResponse(
            status_code=exc.status_code,
            content=error_response,
            headers=headers
        )

    return error_handler

# Usage examples for FastAPI integration
"""
from fastapi import FastAPI, HTTPException
from error_response_middleware import (
    create_fastapi_error_handler,
    RateLimitHandler,
    ErrorCodes
)

app = FastAPI()

# Add error handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return await create_fastapi_error_handler()(request, exc)

# Rate limiting example
@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    # Check rate limit
    if is_rate_limited(request):
        retry_after = calculate_retry_after_seconds()
        error_response = RateLimitHandler.create_rate_limit_response(
            limit=100,
            window_seconds=3600,
            current_count=150,
            retry_after_seconds=retry_after
        )
        return JSONResponse(
            status_code=429,
            content=error_response,
            headers={'Retry-After': str(retry_after)}
        )

    return await call_next(request)
"""