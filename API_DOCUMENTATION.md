# SAMIA TAROT - API Documentation

## Overview
The SAMIA TAROT API provides comprehensive RESTful endpoints for all platform functionality with JWT authentication, role-based access control, and comprehensive error handling.

## Table of Contents
1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [User Management APIs](#user-management-apis)
4. [Tarot Reading APIs](#tarot-reading-apis)
5. [Communication APIs](#communication-apis)
6. [Payment APIs](#payment-apis)
7. [Admin APIs](#admin-apis)
8. [Analytics APIs](#analytics-apis)
9. [Configuration APIs](#configuration-apis)
10. [Error Handling](#error-handling)

## API Overview

### Base Information
- **Base URL**: `https://api.samia-tarot.com/api/v1`
- **Protocol**: HTTPS only
- **Format**: JSON
- **Authentication**: JWT Bearer tokens
- **Rate Limiting**: 1000 requests/hour per user

### Common Headers
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-API-Version: 1.0
X-Request-ID: <unique_request_id>
```

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2024-12-01T12:00:00Z",
  "requestId": "req_123456789"
}
```

## Authentication

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "role": "client",
  "phone_number": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "client"
    },
    "message": "Registration successful. Please verify your email."
  }
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "client"
    },
    "expiresIn": "24h"
  }
}
```

### Refresh Token
```http
POST /auth/refresh
```

**Headers:**
```http
Authorization: Bearer <current_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expiresIn": "24h"
  }
}
```

### Logout
```http
POST /auth/logout
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

## User Management APIs

### Get User Profile
```http
GET /users/profile
```

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "client",
      "profile_image_url": "https://...",
      "phone_number": "+1234567890",
      "created_at": "2024-01-01T00:00:00Z",
      "preferences": {
        "language": "en",
        "timezone": "UTC"
      }
    }
  }
}
```

### Update User Profile
```http
PUT /users/profile
```

**Request Body:**
```json
{
  "full_name": "John Smith",
  "phone_number": "+1234567890",
  "preferences": {
    "language": "en",
    "timezone": "America/New_York"
  }
}
```

### Change Password
```http
PUT /users/change-password
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

### Upload Profile Image
```http
POST /users/upload-avatar
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `image`: File (max 5MB, jpg/png)

## Tarot Reading APIs

### Get Available Spreads
```http
GET /tarot/spreads
```

**Query Parameters:**
- `category`: Filter by category
- `difficulty`: Filter by difficulty level
- `custom`: Include custom spreads (boolean)

**Response:**
```json
{
  "success": true,
  "data": {
    "spreads": [
      {
        "id": "uuid",
        "name": "Celtic Cross",
        "description": "Traditional 10-card spread",
        "card_count": 10,
        "difficulty_level": "advanced",
        "layout_data": {
          "positions": [
            {
              "index": 0,
              "label": "Present Situation",
              "x": 50,
              "y": 50
            }
          ]
        }
      }
    ]
  }
}
```

### Start Reading Session
```http
POST /tarot/readings/start
```

**Request Body:**
```json
{
  "question": "What should I focus on this month?",
  "spread_id": "uuid",
  "reading_type": "ai"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "spread": {
      "name": "Three Card Spread",
      "positions": 3
    },
    "status": "started"
  }
}
```

### Draw Cards
```http
POST /tarot/readings/{session_id}/draw
```

**Request Body:**
```json
{
  "cards": [
    {
      "card_id": "uuid",
      "position": 0,
      "reversed": false
    },
    {
      "card_id": "uuid",
      "position": 1,
      "reversed": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "interpretation": {
      "overview": "Your reading reveals...",
      "card_interpretations": [
        {
          "position": 0,
          "card": {
            "name": "The Fool",
            "meaning": "New beginnings..."
          },
          "interpretation": "This card suggests..."
        }
      ],
      "guidance": "Based on your cards...",
      "summary": "Key takeaways..."
    }
  }
}
```

### Get Reading History
```http
GET /tarot/readings/history
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `start_date`: Filter from date
- `end_date`: Filter to date

**Response:**
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "id": "uuid",
        "question": "Career guidance",
        "spread_name": "Celtic Cross",
        "completed_at": "2024-01-01T12:00:00Z",
        "satisfaction_rating": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### Get Reading Details
```http
GET /tarot/readings/{reading_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reading": {
      "id": "uuid",
      "question": "What should I focus on?",
      "cards_drawn": [
        {
          "card": {
            "name": "The Fool",
            "image_url": "https://..."
          },
          "position": 0,
          "reversed": false
        }
      ],
      "interpretation": {
        "overview": "Your reading reveals...",
        "guidance": "Focus on..."
      },
      "completed_at": "2024-01-01T12:00:00Z"
    }
  }
}
```

## Communication APIs

### Create Chat Room
```http
POST /chat/rooms
```

**Request Body:**
```json
{
  "room_type": "direct",
  "participants": ["user_id_1", "user_id_2"],
  "name": "Reading Session Chat"
}
```

### Get Chat Rooms
```http
GET /chat/rooms
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "uuid",
        "name": "Reading Session",
        "room_type": "direct",
        "participants": ["uuid1", "uuid2"],
        "last_activity": "2024-01-01T12:00:00Z",
        "unread_count": 3
      }
    ]
  }
}
```

### Get Chat Messages
```http
GET /chat/rooms/{room_id}/messages
```

**Query Parameters:**
- `page`: Page number
- `limit`: Messages per page
- `before`: Get messages before timestamp

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "sender_id": "uuid",
        "sender_name": "John Doe",
        "content": "Hello!",
        "message_type": "text",
        "created_at": "2024-01-01T12:00:00Z",
        "read_at": null
      }
    ]
  }
}
```

### Send Message
```http
POST /chat/rooms/{room_id}/messages
```

**Request Body:**
```json
{
  "content": "Hello, how are you?",
  "message_type": "text"
}
```

### Upload File
```http
POST /chat/upload
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File (max 10MB)
- `room_id`: Target room ID

## Payment APIs

### Get Wallet Balance
```http
GET /wallet/balance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 150.00,
    "currency": "USD",
    "daily_limit": 1000.00,
    "monthly_limit": 10000.00
  }
}
```

### Add Funds
```http
POST /wallet/add-funds
```

**Request Body:**
```json
{
  "amount": 50.00,
  "payment_method_id": "uuid",
  "currency": "USD"
}
```

### Get Transactions
```http
GET /wallet/transactions
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `type`: Transaction type filter
- `start_date`: Filter from date
- `end_date`: Filter to date

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "deposit",
        "amount": 50.00,
        "currency": "USD",
        "status": "completed",
        "description": "Wallet top-up",
        "created_at": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "total": 25
    }
  }
}
```

### Process Payment
```http
POST /payments/process
```

**Request Body:**
```json
{
  "amount": 25.00,
  "currency": "USD",
  "payment_method_id": "uuid",
  "description": "Tarot reading payment",
  "reading_session_id": "uuid"
}
```

### Get Payment Methods
```http
GET /payments/methods
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_methods": [
      {
        "id": "uuid",
        "type": "card",
        "display_name": "Visa ending in 4242",
        "last_four": "4242",
        "brand": "visa",
        "is_default": true
      }
    ]
  }
}
```

### Add Payment Method
```http
POST /payments/methods
```

**Request Body:**
```json
{
  "provider": "stripe",
  "provider_method_id": "pm_1234567890",
  "display_name": "My Visa Card",
  "is_default": false
}
```

## Admin APIs

### Get Dashboard Stats
```http
GET /admin/dashboard/stats
```

**Headers:**
```http
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 1250,
    "active_readers": 45,
    "total_revenue": 15750.00,
    "completed_sessions": 3420,
    "growth_metrics": {
      "user_growth": 12.5,
      "revenue_growth": 8.3
    }
  }
}
```

### Get Users (Admin)
```http
GET /admin/users
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `role`: Filter by role
- `status`: Filter by status
- `search`: Search term

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "full_name": "John Doe",
        "role": "client",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "total": 1250
    }
  }
}
```

### Update User (Admin)
```http
PUT /admin/users/{user_id}
```

**Request Body:**
```json
{
  "role": "reader",
  "is_active": true,
  "notes": "Promoted to reader status"
}
```

### Bulk User Actions
```http
POST /admin/users/bulk
```

**Request Body:**
```json
{
  "action": "update_role",
  "user_ids": ["uuid1", "uuid2"],
  "parameters": {
    "role": "reader"
  }
}
```

### Get Analytics Data
```http
GET /admin/analytics
```

**Query Parameters:**
- `metric`: Specific metric name
- `start_date`: Start date
- `end_date`: End date
- `granularity`: hour/day/week/month

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "revenue": [
        {
          "date": "2024-01-01",
          "value": 1250.00
        }
      ],
      "users": [
        {
          "date": "2024-01-01",
          "value": 45
        }
      ]
    }
  }
}
```

## Analytics APIs

### Track Event
```http
POST /analytics/track
```

**Request Body:**
```json
{
  "event_name": "reading_completed",
  "properties": {
    "reading_id": "uuid",
    "spread_type": "celtic_cross",
    "duration_minutes": 15
  },
  "user_id": "uuid"
}
```

### Get User Analytics
```http
GET /analytics/user
```

**Query Parameters:**
- `start_date`: Start date
- `end_date`: End date
- `metrics`: Comma-separated metric names

**Response:**
```json
{
  "success": true,
  "data": {
    "readings_completed": 12,
    "total_spent": 150.00,
    "average_session_duration": 18.5,
    "favorite_spread": "three_card"
  }
}
```

## Configuration APIs

### Get Configuration
```http
GET /config/categories
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "reading_settings",
        "name": "Reading Settings",
        "description": "Configure reading parameters"
      }
    ]
  }
}
```

### Get Category Configuration
```http
GET /config/category/{category}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configurations": [
      {
        "key": "default_reading_time",
        "value": "30",
        "type": "number",
        "description": "Default reading duration in minutes"
      }
    ]
  }
}
```

### Update Configuration (Admin)
```http
PUT /config/{config_key}
```

**Request Body:**
```json
{
  "value": "45",
  "description": "Updated reading duration"
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Email format is invalid"
    }
  },
  "timestamp": "2024-12-01T12:00:00Z",
  "requestId": "req_123456789"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Rate Limiting
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Try again later."
  }
}
```

### Webhook Endpoints

### Payment Webhook
```http
POST /webhooks/payments/stripe
```

**Headers:**
```http
Stripe-Signature: <signature>
```

### Chat Message Webhook
```http
POST /webhooks/chat/message
```

**Request Body:**
```json
{
  "event": "message.sent",
  "data": {
    "room_id": "uuid",
    "message_id": "uuid",
    "sender_id": "uuid"
  }
}
```

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: SAMIA TAROT Development Team 