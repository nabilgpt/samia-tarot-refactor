# 🛡️ SAMIA TAROT ADMIN API DOCUMENTATION

## Overview

The SAMIA TAROT Admin API provides comprehensive management capabilities for super admins and admins to oversee all core aspects of the platform. This API follows enterprise-grade security practices with JWT authentication, role-based authorization, comprehensive audit logging, and input validation.

## Table of Contents
- [Authentication & Authorization](#authentication--authorization)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Audit Logging](#audit-logging)
- [Usage Examples](#usage-examples)

## Authentication & Authorization

### JWT Token Required
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Role Requirements
- **Admin**: Can access most endpoints (user management, bookings, payments, etc.)
- **Super Admin**: Can access all endpoints including role changes and sensitive operations

### Security Features
- ✅ JWT Token Validation
- ✅ Role-Based Access Control (RBAC)
- ✅ Rate Limiting (General: 200/15min, Sensitive: 10/1min)
- ✅ Input Validation with Joi
- ✅ Comprehensive Audit Logging
- ✅ SQL Injection Protection
- ✅ XSS Prevention

---

## API Endpoints

### 1. User Management

#### GET `/api/admin/users`
Get all users with filtering and pagination

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Query Parameters**:
```typescript
{
  page?: number (default: 1)
  limit?: number (default: 20, max: 100)
  role?: 'client' | 'reader' | 'monitor' | 'admin' | 'super_admin'
  status?: 'active' | 'inactive'
  search?: string (searches name and email)
  sort_by?: 'created_at' | 'updated_at' | 'first_name' | 'last_name'
  sort_order?: 'asc' | 'desc'
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "client",
      "is_active": true,
      "avatar_url": "https://...",
      "country": "USA",
      "timezone": "America/New_York",
      "languages": ["en", "ar"],
      "bio": "User bio",
      "specialties": ["tarot", "astrology"],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "last_seen": "2024-01-01T00:00:00Z",
      "statistics": {
        "total_bookings": 5,
        "total_spent": 150.00,
        "last_booking": null
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### PUT `/api/admin/users/:id`
Edit user profile (status, name, email, phone, etc)

**Authorization**: Admin, Super Admin  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "first_name": "Updated Name",
  "last_name": "Updated Last",
  "email": "newemail@example.com",
  "phone": "+1987654321",
  "is_active": true,
  "bio": "Updated bio",
  "country": "Canada",
  "timezone": "America/Toronto",
  "languages": ["en", "fr"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "first_name": "Updated Name",
    // ... updated user data
  },
  "message": "User profile updated successfully"
}
```

#### PATCH `/api/admin/users/:id/role`
Change user role

**Authorization**: Super Admin Only  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "role": "reader",
  "reason": "User has demonstrated expertise in tarot reading"
}
```

**Valid Roles**: `client`, `reader`, `monitor`, `admin`, `super_admin`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "role": "reader",
    // ... updated user data
  },
  "message": "User role changed to reader successfully"
}
```

#### DELETE `/api/admin/users/:id`
Disable (soft delete) a user account

**Authorization**: Super Admin Only  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "reason": "Violation of terms of service"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_active": false,
    // ... updated user data
  },
  "message": "User account disabled successfully"
}
```

---

### 2. Booking Management

#### GET `/api/admin/bookings`
List all bookings with filtering

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Query Parameters**:
```typescript
{
  page?: number
  limit?: number
  status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  date_from?: string (ISO date)
  date_to?: string (ISO date)
  reader_id?: string (UUID)
  client_id?: string (UUID)
  service_type?: 'tarot' | 'astrology' | 'psychic' | 'numerology' | 'energy_healing' | 'other'
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "reader_id": "uuid",
      "service_id": "uuid",
      "scheduled_at": "2024-01-01T14:00:00Z",
      "status": "confirmed",
      "notes": "Special requirements noted",
      "is_emergency": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "client": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "reader": {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane@example.com"
      },
      "service": {
        "name": "Tarot Card Reading",
        "type": "tarot",
        "price": 50.00,
        "duration_minutes": 60
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### PUT `/api/admin/bookings/:id`
Update booking status, notes, or assigned reader

**Authorization**: Admin, Super Admin  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "status": "confirmed",
  "notes": "Updated notes",
  "reader_id": "new-reader-uuid",
  "scheduled_at": "2024-01-02T15:00:00Z",
  "service_id": "new-service-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "confirmed",
    // ... updated booking data with relations
  },
  "message": "Booking updated successfully"
}
```

#### DELETE `/api/admin/bookings/:id`
Cancel booking

**Authorization**: Admin, Super Admin  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "reason": "Reader unavailability due to emergency"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "cancelled",
    // ... updated booking data
  },
  "message": "Booking cancelled successfully"
}
```

---

### 3. Payment Management

#### GET `/api/admin/payments`
Get all payments with filtering

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Query Parameters**:
```typescript
{
  page?: number
  limit?: number
  method?: 'credit_card' | 'bank_transfer' | 'wallet' | 'crypto'
  status?: 'pending' | 'completed' | 'failed' | 'refunded'
  user_id?: string (UUID)
  date_from?: string (ISO date)
  date_to?: string (ISO date)
  amount_from?: number
  amount_to?: number
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "booking_id": "uuid",
      "user_id": "uuid",
      "amount": 50.00,
      "currency": "USD",
      "method": "credit_card",
      "transaction_id": "tx_123456",
      "transaction_hash": "hash123",
      "receipt_url": "https://...",
      "status": "completed",
      "admin_notes": "Manually verified",
      "metadata": {},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "booking": {
        "id": "uuid",
        "scheduled_at": "2024-01-01T14:00:00Z",
        "service": {
          "name": "Tarot Reading",
          "type": "tarot"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 200,
    "pages": 10
  },
  "summary": {
    "total_amount": 10000.00,
    "pending_amount": 500.00,
    "completed_amount": 9500.00,
    "by_method": {
      "credit_card": 8000.00,
      "bank_transfer": 1500.00,
      "wallet": 500.00
    },
    "by_status": {
      "completed": 9500.00,
      "pending": 500.00
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### PATCH `/api/admin/payments/:id/approve`
Approve payment (manual transfers)

**Authorization**: Admin, Super Admin  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "admin_notes": "Bank transfer verified manually"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "admin_notes": "Bank transfer verified manually",
    // ... updated payment data
  },
  "message": "Payment approved successfully"
}
```

#### PATCH `/api/admin/payments/:id/reject`
Reject payment

**Authorization**: Admin, Super Admin  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "reason": "Invalid bank transfer details",
  "admin_notes": "Transfer details do not match our records"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "failed",
    "admin_notes": "Invalid bank transfer details. Transfer details do not match our records",
    // ... updated payment data
  },
  "message": "Payment rejected successfully"
}
```

---

### 4. Service & Reader Management

#### GET `/api/admin/services`
List all services

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Query Parameters**:
```typescript
{
  page?: number
  limit?: number
  type?: 'tarot' | 'astrology' | 'psychic' | 'numerology' | 'energy_healing' | 'other'
  is_active?: boolean
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tarot Card Reading",
      "description": "Professional tarot card reading session",
      "type": "tarot",
      "price": 50.00,
      "duration_minutes": 60,
      "is_vip": false,
      "is_ai": false,
      "is_active": true,
      "created_by": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### PUT `/api/admin/services/:id`
Edit service details (name, price, enabled)

**Authorization**: Admin, Super Admin  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "name": "Premium Tarot Reading",
  "description": "Enhanced tarot reading with detailed insights",
  "price": 75.00,
  "duration_minutes": 90,
  "is_active": true,
  "type": "tarot"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Premium Tarot Reading",
    "price": 75.00,
    // ... updated service data
  },
  "message": "Service updated successfully"
}
```

#### GET `/api/admin/readers`
List all readers with statistics

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Query Parameters**:
```typescript
{
  page?: number
  limit?: number
  is_active?: boolean
  rating_min?: number (0-5)
  rating_max?: number (0-5)
  sort_by?: 'created_at' | 'first_name' | 'last_name'
  sort_order?: 'asc' | 'desc'
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "is_active": true,
      "avatar_url": "https://...",
      "bio": "Professional tarot reader with 10 years experience",
      "specialties": ["tarot", "astrology"],
      "languages": ["en", "es"],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "statistics": {
        "total_bookings": 150,
        "completed_bookings": 140,
        "average_rating": 4.8,
        "total_reviews": 125,
        "total_earnings": 7000.00,
        "completion_rate": 93.33
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  },
  "summary": {
    "total_readers": 25,
    "active_readers": 20,
    "average_rating": 4.6,
    "top_performers": [
      {
        "id": "uuid",
        "name": "Jane Smith",
        "rating": 4.9
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

### 5. Analytics & Monitoring

#### GET `/api/admin/analytics`
Return detailed statistics

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Query Parameters**:
```typescript
{
  date_from?: string (ISO date)
  date_to?: string (ISO date)
  include_charts?: boolean (default: false)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_users": 1000,
      "total_readers": 50,
      "total_bookings": 500,
      "total_revenue": 25000.00,
      "active_sessions": 10,
      "pending_approvals": 5
    },
    "revenue": {
      "total": 25000.00,
      "by_method": {
        "credit_card": 20000.00,
        "bank_transfer": 3000.00,
        "wallet": 2000.00
      },
      "growth_rate": 15.5
    },
    "bookings": {
      "total": 500,
      "by_status": {
        "completed": 450,
        "pending": 30,
        "cancelled": 20
      },
      "completion_rate": 90.0
    },
    "users": {
      "total": 1000,
      "by_role": {
        "client": 940,
        "reader": 50,
        "admin": 8,
        "super_admin": 2
      },
      "new_this_month": 85
    },
    "top_services": [
      {
        "id": "uuid",
        "name": "Tarot Reading",
        "type": "tarot",
        "bookings": [{"id": "uuid"}]
      }
    ],
    "charts": {
      "user_registrations": [],
      "revenue_trends": [],
      "booking_trends": [],
      "reader_performance": []
    }
  },
  "generated_at": "2024-01-01T00:00:00Z"
}
```

---

### 6. Audit & Logs

#### GET `/api/admin/logs`
Get audit logs of all admin actions

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Query Parameters**:
```typescript
{
  page?: number (default: 1)
  limit?: number (default: 50, max: 100)
  user_id?: string (UUID - filter by admin user)
  action?: string (filter by action type)
  date_from?: string (ISO date)
  date_to?: string (ISO date)
  resource_type?: string ('users', 'bookings', 'payments', etc.)
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "admin_id": "uuid",
      "action": "UPDATE_USER_PROFILE",
      "resource_type": "users",
      "resource_id": "uuid",
      "metadata": {
        "updated_fields": ["first_name", "email"],
        "old_data": {},
        "new_data": {},
        "timestamp": "2024-01-01T00:00:00Z",
        "user_agent": "Admin API",
        "ip_address": "192.168.1.1"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "admin": {
        "first_name": "Admin",
        "last_name": "User",
        "email": "admin@example.com",
        "role": "admin"
      },
      "action_description": "Updated user profile for John Doe",
      "severity": "medium",
      "category": "User Management"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "pages": 20
  },
  "summary": {
    "total_actions": 1000,
    "unique_admins": 5,
    "actions_today": 25
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET `/api/admin/logs/summary`
Get audit summary for dashboard

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Query Parameters**:
```typescript
{
  days?: number (default: 7)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "Last 7 days",
    "total_actions": 150,
    "unique_admins": 3,
    "high_risk_actions": 10,
    "actions_by_category": {
      "User Management": 50,
      "Payment Management": 30,
      "Booking Management": 40,
      "Service Management": 15,
      "Analytics": 15
    },
    "actions_by_admin": {
      "John Admin": 80,
      "Jane Super Admin": 70
    },
    "daily_breakdown": {
      "Mon Jan 01 2024": 25,
      "Tue Jan 02 2024": 20,
      // ... more days
    },
    "most_active_admin": "John Admin",
    "recent_high_risk": [
      {
        "action": "DISABLE_USER_ACCOUNT",
        "admin": "Jane Super Admin",
        "timestamp": "2024-01-01T00:00:00Z",
        "description": "Disabled user account: Terms violation"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET `/api/admin/logs/suspicious/:adminId`
Check for suspicious admin activity

**Authorization**: Super Admin Only  
**Rate Limit**: 10 requests per minute

**Query Parameters**:
```typescript
{
  hours?: number (default: 24)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "admin_id": "uuid",
    "period": "Last 24 hours",
    "total_actions": 45,
    "high_risk_actions": 3,
    "risk_level": "low",
    "flags": [],
    "recommendations": [
      "Activity appears normal, continue monitoring"
    ],
    "recent_actions": [
      {
        "action": "GET_ALL_USERS",
        "resource_type": "users",
        "timestamp": "2024-01-01T00:00:00Z",
        "severity": "low"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST `/api/admin/logs/export`
Export audit data for compliance

**Authorization**: Super Admin Only  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "date_from": "2024-01-01T00:00:00Z",
  "date_to": "2024-01-31T23:59:59Z",
  "admin_id": "uuid",
  "include_metadata": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "export_info": {
      "generated_at": "2024-01-01T00:00:00Z",
      "total_records": 500,
      "date_range": {
        "date_from": "2024-01-01T00:00:00Z",
        "date_to": "2024-01-31T23:59:59Z"
      },
      "admin_filter": "uuid",
      "includes_metadata": true
    },
    "data": [
      {
        "audit_id": "uuid",
        "timestamp": "2024-01-01T00:00:00Z",
        "admin_name": "John Admin",
        "admin_email": "john@example.com",
        "admin_role": "admin",
        "action": "UPDATE_USER_PROFILE",
        "action_description": "Updated user profile for Jane Doe",
        "resource_type": "users",
        "resource_id": "uuid",
        "severity": "medium",
        "category": "User Management",
        "metadata": "{\"updated_fields\":[\"email\"]}"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

### 7. Complaints & Feedback

#### GET `/api/admin/complaints`
Get all client complaints or reports

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Query Parameters**:
```typescript
{
  page?: number
  limit?: number
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  date_from?: string (ISO date)
  date_to?: string (ISO date)
  type?: 'complaint' | 'feedback' | 'report' | 'suggestion'
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "feedback_type": "complaint",
      "message": "Reader was late to the session",
      "rating": 2,
      "status": "open",
      "priority": "medium",
      "resolved_at": null,
      "resolved_by": null,
      "resolution_notes": null,
      "created_at": "2024-01-01T00:00:00Z",
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  },
  "summary": {
    "total": 50,
    "by_status": {
      "open": 20,
      "in_progress": 10,
      "resolved": 20
    },
    "by_priority": {
      "low": 15,
      "medium": 25,
      "high": 8,
      "urgent": 2
    },
    "by_type": {
      "complaint": 30,
      "feedback": 15,
      "report": 3,
      "suggestion": 2
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### PUT `/api/admin/complaints/:id/resolve`
Mark complaint as resolved

**Authorization**: Admin, Super Admin  
**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "resolution_notes": "Contacted reader and issued refund to client. Reader has been reminded of punctuality requirements.",
  "resolution_action": "refunded"
}
```

**Valid Resolution Actions**: `resolved`, `escalated`, `dismissed`, `refunded`, `compensated`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "resolved",
    "resolution_notes": "Contacted reader and issued refund to client...",
    "resolution_action": "refunded",
    "resolved_by": "uuid",
    "resolved_at": "2024-01-01T00:00:00Z",
    // ... updated complaint data
  },
  "message": "Complaint resolved successfully"
}
```

---

### 8. Dashboard & Overview

#### GET `/api/admin/dashboard`
Get admin dashboard overview

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_users": 1000,
      "total_readers": 50,
      "total_bookings": 500,
      "total_revenue": 25000.00,
      "active_sessions": 10,
      "pending_approvals": 5
    },
    "recent_analytics": {
      "revenue": {
        "total": 25000.00,
        "by_method": {},
        "growth_rate": 15.5
      },
      "bookings": 500,
      "users": 1000
    },
    "audit_summary": {
      "total_actions": 150,
      "unique_admins": 3,
      "high_risk_actions": 10
    },
    "admin_info": {
      "id": "uuid",
      "role": "admin",
      "name": "John Admin",
      "last_login": "2024-01-01T00:00:00Z"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET `/api/admin/health`
System health check for admin panel

**Authorization**: Admin, Super Admin  
**Rate Limit**: 200 requests per 15 minutes

**Response**:
```json
{
  "success": true,
  "data": {
    "system_status": "operational",
    "database_status": "healthy",
    "api_status": "healthy",
    "admin_activity": "active",
    "last_check": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": [], // Optional validation details
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Common Error Codes

| Code | Description | Status |
|------|-------------|--------|
| `AUTH_TOKEN_MISSING` | Authorization token not provided | 401 |
| `AUTH_TOKEN_INVALID` | Invalid or expired token | 403 |
| `INSUFFICIENT_PERMISSIONS` | User lacks required admin role | 403 |
| `VALIDATION_ERROR` | Request data validation failed | 400 |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist | 404 |
| `ADMIN_RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `SENSITIVE_RATE_LIMIT_EXCEEDED` | Too many sensitive operations | 429 |
| `INTERNAL_ERROR` | Server-side error | 500 |

---

## Rate Limiting

### Standard Rate Limits
- **General Admin Operations**: 200 requests per 15 minutes
- **Sensitive Operations**: 10 requests per 1 minute

### Sensitive Operations Include:
- User profile updates
- Role changes
- Account disabling
- Booking cancellations
- Payment approvals/rejections
- Service updates
- Complaint resolutions

---

## Audit Logging

Every admin action is automatically logged with:

- ✅ **Admin ID & Details**: Who performed the action
- ✅ **Action Type**: What was done
- ✅ **Resource Info**: What was affected
- ✅ **Metadata**: Detailed context and changes
- ✅ **Timestamp**: When it occurred
- ✅ **IP Address**: Where it came from
- ✅ **Severity Level**: Risk assessment

### Severity Levels

- **High**: Account disabling, role changes, booking cancellations, payment rejections
- **Medium**: Profile updates, booking updates, payment approvals, service updates
- **Low**: View operations, analytics generation

---

## Usage Examples

### Example 1: Get All Users with Filtering

```bash
# Get active readers, sorted by creation date
curl -X GET "https://api.samia-tarot.com/api/admin/users?role=reader&status=active&sort_by=created_at&sort_order=desc&page=1&limit=10" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

### Example 2: Change User Role

```bash
# Promote user to reader role
curl -X PATCH "https://api.samia-tarot.com/api/admin/users/user-uuid/role" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "reader",
    "reason": "User has demonstrated expertise and passed verification"
  }'
```

### Example 3: Approve Payment

```bash
# Approve a pending payment
curl -X PATCH "https://api.samia-tarot.com/api/admin/payments/payment-uuid/approve" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "admin_notes": "Bank transfer verified - reference number BT123456"
  }'
```

### Example 4: Get Analytics Report

```bash
# Get analytics for the last 30 days with charts
curl -X GET "https://api.samia-tarot.com/api/admin/analytics?date_from=2024-01-01T00:00:00Z&date_to=2024-01-31T23:59:59Z&include_charts=true" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

### Example 5: Resolve Complaint

```bash
# Resolve a user complaint
curl -X PUT "https://api.samia-tarot.com/api/admin/complaints/complaint-uuid/resolve" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution_notes": "Investigated the issue and issued full refund. Reader has been counseled on punctuality requirements.",
    "resolution_action": "refunded"
  }'
```

### Example 6: Export Audit Logs

```bash
# Export audit logs for compliance
curl -X POST "https://api.samia-tarot.com/api/admin/logs/export" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date_from": "2024-01-01T00:00:00Z",
    "date_to": "2024-01-31T23:59:59Z",
    "include_metadata": true
  }'
```

### Example 7: JavaScript/Node.js Usage

```javascript
// Admin API client example
class AdminAPIClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, endpoint, data = null) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : null
    });

    return response.json();
  }

  // Get all users
  async getUsers(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request('GET', `/api/admin/users?${params}`);
  }

  // Change user role
  async changeUserRole(userId, role, reason) {
    return this.request('PATCH', `/api/admin/users/${userId}/role`, {
      role,
      reason
    });
  }

  // Approve payment
  async approvePayment(paymentId, adminNotes) {
    return this.request('PATCH', `/api/admin/payments/${paymentId}/approve`, {
      admin_notes: adminNotes
    });
  }

  // Get analytics
  async getAnalytics(dateFrom, dateTo, includeCharts = false) {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      include_charts: includeCharts
    });
    return this.request('GET', `/api/admin/analytics?${params}`);
  }
}

// Usage
const adminAPI = new AdminAPIClient('https://api.samia-tarot.com', 'your-jwt-token');

// Get active readers
const readers = await adminAPI.getUsers({ 
  role: 'reader', 
  status: 'active' 
});

// Promote user to reader
const result = await adminAPI.changeUserRole(
  'user-uuid', 
  'reader', 
  'User demonstrated expertise'
);

console.log('Users:', readers);
console.log('Role change result:', result);
```

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT tokens regularly** (recommended: 24 hours)
3. **Monitor audit logs** for suspicious activity
4. **Implement IP whitelisting** for admin access
5. **Use strong passwords** and 2FA for admin accounts
6. **Regularly review admin permissions**
7. **Keep API tokens secure** and never expose in client-side code

---

## Support

For technical support or questions about the Admin API:

- **Documentation**: This document
- **Error Logging**: Check audit logs for detailed error tracking
- **Health Check**: Use `/api/admin/health` endpoint for system status

---

*This API documentation is for SAMIA TAROT Admin API v1.0.0*