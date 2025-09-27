# Standardized Error Response Format

## Overview
All API endpoints MUST return errors in a consistent shape with correlation IDs for tracing across distributed systems.

---

## Error Shape (Mandatory)

```typescript
interface ErrorResponse {
  code: string;              // Machine-readable error code (UPPER_SNAKE_CASE)
  message: string;           // Human-readable error message
  details?: any;             // Optional additional context
  correlation_id: string;    // UUID v4 for distributed tracing
}
```

---

## HTTP Status Codes

### 400 Bad Request
**Use when:** Client sent invalid input (validation errors, malformed payload)

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "field": "email",
    "error": "Must be a valid email address"
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 401 Unauthorized
**Use when:** Missing or invalid authentication token

```json
{
  "code": "AUTHENTICATION_REQUIRED",
  "message": "Valid authentication token required",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

### 403 Forbidden
**Use when:** Authenticated but not authorized (role/permission check fails)

```json
{
  "code": "INSUFFICIENT_PERMISSIONS",
  "message": "You do not have permission to access this resource",
  "details": {
    "required_role": "admin",
    "current_role": "client"
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

### 404 Not Found
**Use when:** Resource does not exist or user lacks access

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "The requested order does not exist",
  "details": {
    "resource_type": "order",
    "resource_id": "ord_12345"
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440003"
}
```

### 409 Conflict
**Use when:** State conflict (e.g., duplicate resource, idempotency key reuse)

```json
{
  "code": "DUPLICATE_ORDER",
  "message": "An order with this idempotency key already exists",
  "details": {
    "existing_order_id": "ord_67890",
    "idempotency_key": "idem_abc123"
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440004"
}
```

### 429 Too Many Requests
**Use when:** Rate limit exceeded

**MUST include `Retry-After` header**

```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "details": {
    "limit": 100,
    "window": "1 minute",
    "retry_after": 45
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440005"
}
```

**Headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1695822345
```

### 500 Internal Server Error
**Use when:** Unexpected server error (caught exception)

```json
{
  "code": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred. Please try again later.",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440006"
}
```

**NEVER expose stack traces or internal details in production**

### 503 Service Unavailable
**Use when:** External dependency is down (payment provider, storage, database)

```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Payment provider temporarily unavailable. Please try again in a few minutes.",
  "details": {
    "service": "stripe",
    "retry_after": 120
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440007"
}
```

**Headers:**
```
HTTP/1.1 503 Service Unavailable
Retry-After: 120
```

---

## Error Codes (Catalog)

### Authentication & Authorization
- `AUTHENTICATION_REQUIRED` - Missing/invalid token
- `TOKEN_EXPIRED` - JWT expired
- `INSUFFICIENT_PERMISSIONS` - Role check failed
- `AGE_VERIFICATION_REQUIRED` - User not 18+

### Validation
- `VALIDATION_ERROR` - Generic validation failure
- `MISSING_REQUIRED_FIELD` - Required field not provided
- `INVALID_FORMAT` - Field format invalid (e.g., email, phone)
- `VALUE_OUT_OF_RANGE` - Numeric value outside acceptable range

### Resource Management
- `RESOURCE_NOT_FOUND` - Resource doesn't exist or no access
- `DUPLICATE_RESOURCE` - Unique constraint violation
- `RESOURCE_LOCKED` - Resource in use by another operation

### Business Logic
- `INSUFFICIENT_BALANCE` - Not enough credits/balance
- `ORDER_NOT_ELIGIBLE` - Order cannot transition to requested state
- `PAYMENT_FAILED` - Payment processing failed
- `REFUND_NOT_ALLOWED` - Refund window expired or not eligible

### Rate Limiting
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `CONCURRENT_REQUEST_LIMIT` - Too many simultaneous requests

### External Services
- `SERVICE_UNAVAILABLE` - Dependency down (503)
- `PAYMENT_PROVIDER_ERROR` - Stripe/Square error
- `STORAGE_ERROR` - S3/Supabase storage error
- `NOTIFICATION_DELIVERY_FAILED` - Email/SMS failed

### Webhooks
- `WEBHOOK_SIGNATURE_MISSING` - No signature header
- `WEBHOOK_SIGNATURE_INVALID` - Signature verification failed
- `WEBHOOK_TIMESTAMP_EXPIRED` - Timestamp too old (Stripe)

---

## Implementation

### Python (FastAPI)
```python
from fastapi import HTTPException, Request
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

class StandardHTTPException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict = None,
        correlation_id: str = None
    ):
        self.correlation_id = correlation_id or str(uuid4())
        self.code = code
        self.details = details

        detail = {
            "code": code,
            "message": message,
            "correlation_id": self.correlation_id
        }

        if details:
            detail["details"] = details

        super().__init__(status_code=status_code, detail=detail)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = str(uuid4())

    logger.error(
        f"Unhandled exception: {exc}",
        extra={
            "correlation_id": correlation_id,
            "path": request.url.path,
            "method": request.method
        },
        exc_info=True
    )

    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please try again later.",
            "correlation_id": correlation_id
        }
    )

@app.exception_handler(StandardHTTPException)
async def standard_exception_handler(request: Request, exc: StandardHTTPException):
    logger.warning(
        f"HTTP {exc.status_code}: {exc.code}",
        extra={
            "correlation_id": exc.correlation_id,
            "path": request.url.path,
            "method": request.method,
            "code": exc.code
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )
```

### Usage Example
```python
@app.post("/api/orders")
async def create_order(order_data: OrderCreate, user: User = Depends(require_auth)):
    if not user.age_verified:
        raise StandardHTTPException(
            status_code=403,
            code="AGE_VERIFICATION_REQUIRED",
            message="Please complete age verification to place an order"
        )

    try:
        order = await db.insert_order(order_data, user.id)
        return order
    except ValueError as e:
        raise StandardHTTPException(
            status_code=400,
            code="VALIDATION_ERROR",
            message=str(e),
            details={"field": "service_code"}
        )
```

### Node.js/Express
```javascript
const { v4: uuidv4 } = require('uuid');

class StandardError extends Error {
  constructor(statusCode, code, message, details = null, correlationId = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.correlationId = correlationId || uuidv4();
  }
}

app.use((err, req, res, next) => {
  const correlationId = err.correlationId || uuidv4();

  if (err instanceof StandardError) {
    console.warn(`HTTP ${err.statusCode}: ${err.code}`, {
      correlationId,
      path: req.path,
      method: req.method
    });

    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
      correlation_id: correlationId
    });
  }

  console.error('Unhandled exception', {
    correlationId,
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred. Please try again later.',
    correlation_id: correlationId
  });
});
```

---

## Frontend Handling

### JavaScript/React
```javascript
import api from './api';

const handleApiError = (error) => {
  const { code, message, details, correlationId } = error;

  console.error(`[${correlationId}] API Error: ${code}`, { message, details });

  switch (code) {
    case 'AUTHENTICATION_REQUIRED':
      window.location.href = '/login';
      break;

    case 'AGE_VERIFICATION_REQUIRED':
      window.location.href = '/verify-age';
      break;

    case 'RATE_LIMIT_EXCEEDED':
      const retryAfter = details?.retry_after || 60;
      showToast(`Too many requests. Please wait ${retryAfter} seconds.`, 'warning');
      break;

    case 'SERVICE_UNAVAILABLE':
      showToast('Service temporarily unavailable. Please try again later.', 'error');
      break;

    case 'VALIDATION_ERROR':
      showToast(message, 'error');
      break;

    default:
      showToast('An unexpected error occurred. Please try again.', 'error');
  }
};

const createOrder = async (orderData) => {
  try {
    const order = await api.createOrder(orderData);
    return order;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};
```

---

## Logging & Monitoring

### Structured Logging
```python
logger.error(
    "Order creation failed",
    extra={
        "correlation_id": correlation_id,
        "user_id": user.id,
        "service_code": order_data.service_code,
        "error_code": "VALIDATION_ERROR",
        "details": {"field": "service_code"}
    }
)
```

### Metrics
```python
from prometheus_client import Counter

error_counter = Counter(
    'api_errors_total',
    'Total API errors',
    ['endpoint', 'status_code', 'error_code']
)

error_counter.labels(
    endpoint=request.url.path,
    status_code=exc.status_code,
    error_code=exc.code
).inc()
```

---

## Testing

### Unit Test
```python
def test_error_response_shape():
    response = client.post('/api/orders', json={})
    assert response.status_code == 400

    data = response.json()
    assert 'code' in data
    assert 'message' in data
    assert 'correlation_id' in data
    assert data['code'] == 'VALIDATION_ERROR'
```

### Integration Test
```python
def test_correlation_id_propagation():
    response = client.post('/api/orders', json={})
    correlation_id = response.json()['correlation_id']

    logs = get_logs_by_correlation_id(correlation_id)
    assert len(logs) > 0
    assert logs[0]['correlation_id'] == correlation_id
```

---

## Checklist

- [ ] All endpoints return errors in standardized shape
- [ ] Correlation IDs generated for every error
- [ ] 429 responses include `Retry-After` header
- [ ] 503 responses include `Retry-After` when applicable
- [ ] Error codes are machine-readable (UPPER_SNAKE_CASE)
- [ ] Sensitive details (stack traces, internal paths) excluded in production
- [ ] Errors logged with correlation_id
- [ ] Frontend handles common error codes gracefully
- [ ] Tests verify error response shape
- [ ] Metrics track errors by code and endpoint

---

## References

- **HTTP Status Codes (RFC 9110):** https://www.rfc-editor.org/rfc/rfc9110.html
- **MDN HTTP Status:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- **OWASP Error Handling:** https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
- **RFC 6585 (429):** https://www.rfc-editor.org/rfc/rfc6585.html