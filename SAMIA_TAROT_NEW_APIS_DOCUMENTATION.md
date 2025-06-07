# SAMIA TAROT - NEW BACKEND APIS DOCUMENTATION

## Overview
This document provides comprehensive documentation for the 7 new backend APIs built for the SAMIA TAROT platform. These APIs extend the platform's capabilities with advanced monitoring, real-time notifications, emergency response, AI moderation, support system, subscription management, and secure media handling.

## Table of Contents
1. [Monitor API](#1-monitor-api)
2. [Real-Time Notification API](#2-real-time-notification-api)
3. [Emergency Call/Service API](#3-emergency-callservice-api)
4. [AI Moderation & Monitoring API](#4-ai-moderation--monitoring-api)
5. [Support & Helpdesk API](#5-support--helpdesk-api)
6. [Subscription & Plans API](#6-subscription--plans-api)
7. [Media & Uploads API](#7-media--uploads-api)

---

## 1. Monitor API

### Base URL: `/api/monitor`

The Monitor API provides comprehensive session monitoring, content approval, and real-time oversight capabilities for users with the `monitor` role.

### Key Features:
- **Active Session Monitoring**: View and manage all ongoing calls, chats, and bookings
- **Content Approval Queue**: Review and approve/reject reader messages and voice notes
- **Session Control**: Lock or terminate sessions in real-time
- **Reported Content Management**: Handle flagged messages and content
- **Audit Logging**: All monitor actions are logged for compliance

### Core Endpoints:

#### Session Management
```
GET    /api/monitor/sessions/active        # Get all active sessions
GET    /api/monitor/sessions/queue         # Get sessions requiring attention
POST   /api/monitor/sessions/:id/lock      # Lock a session
POST   /api/monitor/sessions/:id/terminate # Terminate a session
PUT    /api/monitor/sessions/:id/priority  # Update session priority
```

#### Content Moderation
```
GET    /api/monitor/content/pending        # Get content pending approval
POST   /api/monitor/content/:id/approve    # Approve content
POST   /api/monitor/content/:id/reject     # Reject content
GET    /api/monitor/content/flagged        # Get flagged content
POST   /api/monitor/content/:id/escalate   # Escalate to admin
```

#### Real-time Monitoring
```
GET    /api/monitor/dashboard              # Real-time monitor dashboard
GET    /api/monitor/alerts                 # Active monitoring alerts
POST   /api/monitor/heartbeat              # Update monitor status
GET    /api/monitor/stats                  # Monitoring statistics
```

### Authentication & Permissions:
- Requires JWT authentication
- Requires `monitor`, `admin`, or `super_admin` role
- All actions logged in audit trail

---

## 2. Real-Time Notification API

### Base URL: `/api/notifications`

The Notification API provides instant, role-based notifications with Socket.IO integration for real-time delivery across multiple channels.

### Key Features:
- **Multi-Channel Delivery**: Socket, email, SMS, push notifications
- **Role-Based Routing**: Different notification types per user role
- **Real-Time Socket Integration**: WebSocket connections for instant delivery
- **Template System**: Configurable notification templates
- **Delivery Tracking**: Track notification delivery status and failures

### Core Endpoints:

#### User Notifications
```
GET    /api/notifications                  # Get user notifications
GET    /api/notifications/unread-count     # Get unread count
PUT    /api/notifications/:id/read         # Mark as read
PUT    /api/notifications/mark-all-read    # Mark all as read
DELETE /api/notifications/:id              # Delete notification
```

#### Sending Notifications
```
POST   /api/notifications/send             # Send to specific users
POST   /api/notifications/send-to-role     # Send to user role
POST   /api/notifications/send-bulk        # Bulk notifications (admin)
POST   /api/notifications/broadcast        # Broadcast to all (super admin)
```

#### Real-Time Features
```
POST   /api/notifications/realtime/join-room    # Join notification room
POST   /api/notifications/realtime/leave-room   # Leave notification room
GET    /api/notifications/realtime/active-rooms # Get active rooms
POST   /api/notifications/realtime/test         # Send test notification
```

#### Emergency & Priority
```
POST   /api/notifications/emergency        # Send emergency notification
POST   /api/notifications/priority         # Send high-priority notification
GET    /api/notifications/emergency/active # Get active emergency notifications
```

### Notification Types by Role:
- **Client**: Booking confirmations, payment receipts, reader availability, session reminders
- **Reader**: New bookings, client messages, schedule changes, payment notifications
- **Admin**: System alerts, user reports, financial summaries, emergency notifications
- **Monitor**: Content flags, session alerts, policy violations, escalations

---

## 3. Emergency Call/Service API

### Base URL: `/api/emergency`

The Emergency API handles urgent requests with highest priority routing, real-time alerts, and comprehensive emergency response management.

### Key Features:
- **Priority Routing**: Automatic routing to available emergency responders
- **Panic Button**: Immediate highest priority emergency triggering
- **Escalation System**: Multi-level emergency escalation protocols
- **Real-Time Alerts**: Instant siren/alert notifications to all responders
- **Response Tracking**: Complete timeline and response logging

### Core Endpoints:

#### Emergency Requests
```
POST   /api/emergency/request              # Create emergency request
POST   /api/emergency/anonymous-request    # Anonymous emergency (guests)
POST   /api/emergency/panic-button         # Trigger panic button
POST   /api/emergency/session/:id/escalate # Escalate session to emergency
```

#### Response Management
```
GET    /api/emergency/pending              # Get pending emergencies
GET    /api/emergency/active               # Get active emergency responses
POST   /api/emergency/:id/accept           # Accept emergency response
POST   /api/emergency/:id/respond          # Update emergency response
POST   /api/emergency/:id/assign           # Assign to specific responder
```

#### Emergency Escalation
```
POST   /api/emergency/:id/escalate         # Escalate emergency level
POST   /api/emergency/:id/alert            # Send additional alerts
POST   /api/emergency/:id/siren            # Trigger emergency siren
POST   /api/emergency/broadcast-alert      # Broadcast to all staff
```

#### Resolution & Follow-up
```
POST   /api/emergency/:id/resolve          # Mark as resolved
POST   /api/emergency/:id/close            # Close emergency case
POST   /api/emergency/:id/follow-up        # Add follow-up action
PUT    /api/emergency/:id/status           # Update status
```

### Emergency Severity Levels:
- **Low**: General concerns requiring attention
- **Medium**: Moderate issues requiring prompt response
- **High**: Urgent situations requiring immediate attention
- **Critical**: Life-threatening or high-risk situations

---

## 4. AI Moderation & Monitoring API

### Base URL: `/api/ai-moderation`

The AI Moderation API provides automated content scanning, policy violation detection, and intelligent content moderation with machine learning capabilities.

### Key Features:
- **Content Scanning**: Real-time text and voice content analysis
- **Policy Detection**: Automatic detection of policy violations
- **Confidence Scoring**: AI confidence levels for all detections
- **Human Review Integration**: Seamless handoff to human moderators
- **Model Training**: Continuous improvement through feedback loops

### Core Endpoints:

#### Content Scanning
```
POST   /api/ai-moderation/scan/text        # Scan text content
POST   /api/ai-moderation/scan/voice       # Scan voice transcription
POST   /api/ai-moderation/scan/conversation # Scan entire conversation
POST   /api/ai-moderation/scan/bulk        # Bulk scan (admin)
POST   /api/ai-moderation/scan/realtime    # Real-time scanning
```

#### Flagged Content Management
```
GET    /api/ai-moderation/flagged          # Get flagged content
GET    /api/ai-moderation/flagged/:id      # Get flagged content details
POST   /api/ai-moderation/flagged/:id/review # Review flagged content
POST   /api/ai-moderation/flagged/:id/escalate # Escalate to human
PUT    /api/ai-moderation/flagged/:id/dismiss # Dismiss false positive
```

#### Real-Time Monitoring
```
GET    /api/ai-moderation/alerts/active    # Get active AI alerts
POST   /api/ai-moderation/alerts/:id/acknowledge # Acknowledge alert
GET    /api/ai-moderation/monitor/dashboard # AI monitoring dashboard
GET    /api/ai-moderation/monitor/trends   # AI detection trends
```

#### AI Model Management
```
GET    /api/ai-moderation/models           # Get AI models
POST   /api/ai-moderation/models/train     # Train AI model
PUT    /api/ai-moderation/models/:id/activate # Activate model
GET    /api/ai-moderation/models/:id/performance # Model performance
```

### AI Detection Categories:
- **Inappropriate Content**: Sexual, violent, or offensive material
- **Spam**: Repetitive or promotional content
- **Harassment**: Bullying, threats, or abusive language
- **Fraud**: Scam attempts or financial fraud
- **Policy Violations**: Terms of service violations

---

## 5. Support & Helpdesk API

### Base URL: `/api/support`

The Support API provides a complete ticketing system for customer support, complaint handling, and help request management with knowledge base integration.

### Key Features:
- **Ticket Management**: Complete ticket lifecycle from creation to resolution
- **Staff Assignment**: Automatic and manual ticket assignment
- **Knowledge Base**: Searchable help articles and FAQs
- **Escalation System**: Multi-level support escalation
- **Customer Feedback**: Satisfaction ratings and feedback collection

### Core Endpoints:

#### Ticket Management
```
POST   /api/support/tickets                # Create support ticket
GET    /api/support/tickets                # Get support tickets
GET    /api/support/tickets/:id            # Get specific ticket
PUT    /api/support/tickets/:id            # Update ticket
DELETE /api/support/tickets/:id            # Delete/cancel ticket
```

#### Ticket Communication
```
POST   /api/support/tickets/:id/responses  # Add ticket response
GET    /api/support/tickets/:id/responses  # Get response history
PUT    /api/support/tickets/:id/responses/:response_id # Update response
DELETE /api/support/tickets/:id/responses/:response_id # Delete response
```

#### Staff Operations
```
POST   /api/support/tickets/:id/assign     # Assign to staff
PUT    /api/support/tickets/:id/status     # Update ticket status
POST   /api/support/tickets/:id/escalate   # Escalate ticket
POST   /api/support/tickets/:id/resolve    # Mark as resolved
POST   /api/support/tickets/:id/close      # Close ticket
```

#### Knowledge Base
```
GET    /api/support/knowledge-base         # Get knowledge articles
GET    /api/support/knowledge-base/:id     # Get specific article
POST   /api/support/knowledge-base         # Create article (staff)
PUT    /api/support/knowledge-base/:id     # Update article (staff)
DELETE /api/support/knowledge-base/:id     # Delete article (admin)
```

### Ticket Categories:
- **Technical Issues**: Platform bugs, login problems, feature issues
- **Billing & Payments**: Payment disputes, refund requests, billing questions
- **Account Management**: Profile updates, account access, verification
- **Service Quality**: Reader complaints, session issues, service feedback
- **General Inquiries**: Questions, suggestions, feature requests

---

## 6. Subscription & Plans API

### Base URL: `/api/subscriptions`

The Subscription API manages subscription plans, billing, payment processing, and feature access control with comprehensive subscription lifecycle management.

### Key Features:
- **Plan Management**: Multiple subscription tiers with different features
- **Payment Processing**: Secure payment method handling and processing
- **Feature Access Control**: Dynamic feature access based on subscription
- **Usage Tracking**: Monitor feature usage and limits
- **Automated Billing**: Recurring payment processing and invoice generation

### Core Endpoints:

#### Subscription Plans
```
GET    /api/subscriptions/plans            # Get available plans
GET    /api/subscriptions/plans/:id        # Get specific plan
POST   /api/subscriptions/plans            # Create plan (admin)
PUT    /api/subscriptions/plans/:id        # Update plan (admin)
DELETE /api/subscriptions/plans/:id        # Deactivate plan (admin)
```

#### User Subscriptions
```
GET    /api/subscriptions/my-subscription  # Get user's subscription
POST   /api/subscriptions/subscribe/:plan_id # Subscribe to plan
POST   /api/subscriptions/upgrade/:plan_id # Upgrade subscription
POST   /api/subscriptions/downgrade/:plan_id # Downgrade subscription
POST   /api/subscriptions/cancel           # Cancel subscription
```

#### Payment Methods
```
GET    /api/subscriptions/payment-methods  # Get payment methods
POST   /api/subscriptions/payment-methods  # Add payment method
PUT    /api/subscriptions/payment-methods/:id # Update payment method
DELETE /api/subscriptions/payment-methods/:id # Remove payment method
```

#### Billing & Invoices
```
GET    /api/subscriptions/billing-history  # Get billing history
GET    /api/subscriptions/invoices         # Get invoices
GET    /api/subscriptions/invoices/:id     # Get specific invoice
GET    /api/subscriptions/invoices/:id/download # Download invoice PDF
POST   /api/subscriptions/invoices/:id/pay # Pay outstanding invoice
```

#### Feature Access
```
GET    /api/subscriptions/features         # Get subscription features
GET    /api/subscriptions/feature-usage    # Get feature usage
POST   /api/subscriptions/check-access/:feature # Check feature access
POST   /api/subscriptions/track-usage      # Track feature usage
```

### Subscription Tiers:
- **Free**: Basic access with limited features
- **Premium**: Enhanced features for regular users
- **Professional**: Advanced features for power users
- **Enterprise**: Full feature access for business users

---

## 7. Media & Uploads API

### Base URL: `/api/media`

The Media API provides secure file upload, processing, and management capabilities with virus scanning, image processing, and comprehensive file organization.

### Key Features:
- **Secure Upload**: Multi-file upload with validation and scanning
- **File Processing**: Image resize, crop, thumbnail generation
- **Security Scanning**: Virus and malware detection
- **Storage Management**: Quota tracking and cleanup
- **File Sharing**: Secure file sharing with permissions

### Core Endpoints:

#### File Upload
```
POST   /api/media/upload                   # Upload single file
POST   /api/media/upload-multiple          # Upload multiple files
POST   /api/media/upload-avatar            # Upload user avatar
POST   /api/media/upload-session-media     # Upload session media
POST   /api/media/upload-voice-note        # Upload voice note
```

#### File Retrieval
```
GET    /api/media/files                    # Get user's files
GET    /api/media/files/:id                # Get file details
GET    /api/media/files/:id/download       # Download file
GET    /api/media/files/:id/stream         # Stream audio/video
GET    /api/media/session/:session_id/files # Get session files
```

#### File Operations
```
PUT    /api/media/files/:id                # Update file metadata
POST   /api/media/files/:id/copy           # Copy file
POST   /api/media/files/:id/move           # Move file
DELETE /api/media/files/:id                # Delete file
POST   /api/media/files/:id/restore        # Restore deleted file
```

#### Image Processing
```
POST   /api/media/files/:id/resize         # Resize image
POST   /api/media/files/:id/thumbnail      # Generate thumbnail
POST   /api/media/files/:id/crop           # Crop image
GET    /api/media/files/:id/thumbnails     # Get thumbnails
```

#### Security & Scanning
```
POST   /api/media/files/:id/scan           # Scan file for threats
GET    /api/media/files/:id/scan-results   # Get scan results
POST   /api/media/bulk-scan                # Bulk scan files (admin)
GET    /api/media/quarantine               # Get quarantined files (admin)
```

### Supported File Types:
- **Images**: JPEG, PNG, GIF, WebP (max 50MB)
- **Audio**: MP3, WAV, MP4, WebM (max 50MB)
- **Documents**: PDF, TXT (max 50MB)
- **Session Media**: Coffee cups, palmistry images, dream journals

---

## Security & Authentication

### JWT Authentication
All APIs require JWT authentication via the `Authorization: Bearer <token>` header.

### Role-Based Access Control
- **Client**: Basic access to own data and services
- **Reader**: Access to reading services and client interactions
- **Monitor**: Content moderation and session monitoring
- **Support**: Support ticket management and customer service
- **Admin**: Full system administration capabilities
- **Super Admin**: Complete system access and configuration

### Rate Limiting
Each API has specific rate limits to prevent abuse:
- General API calls: 100-200 requests per 15 minutes
- File uploads: 50 uploads per hour
- Emergency requests: 3 requests per hour
- Payment operations: 5 attempts per 15 minutes

### Data Privacy & Compliance
- All personal data is encrypted at rest and in transit
- GDPR compliant data handling and retention
- Comprehensive audit logging for all operations
- Role-based data access restrictions

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED`: Missing or invalid JWT token
- `INSUFFICIENT_PERMISSIONS`: User lacks required role/permissions
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `VALIDATION_ERROR`: Request validation failed
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `INTERNAL_SERVER_ERROR`: Server-side error occurred

## Database Schema

All new APIs use the following database tables (see `NEW_APIS_DATABASE_TABLES.sql`):

### Monitor API Tables:
- `monitor_actions` - Monitor user actions
- `monitor_session_flags` - Flagged sessions
- `content_moderation_actions` - Content moderation history
- `content_approval_queue` - Content awaiting approval

### Notification API Tables:
- `notifications` - User notifications
- `notification_settings` - User notification preferences
- `notification_templates` - System notification templates
- `notification_delivery_log` - Delivery tracking

### Emergency API Tables:
- `emergency_requests` - Emergency requests
- `emergency_response_log` - Response history
- `emergency_responders` - Available responders
- `emergency_alerts` - Emergency alerts

### AI Moderation API Tables:
- `ai_moderation_models` - AI model configurations
- `ai_content_scans` - Content scan results
- `ai_moderation_rules` - Moderation rules
- `ai_training_data` - Training data for AI models
- `ai_moderation_alerts` - AI-generated alerts

### Support API Tables:
- `support_tickets` - Support tickets
- `ticket_responses` - Ticket communication
- `support_categories` - Ticket categories
- `knowledge_base_articles` - Help articles

### Subscription API Tables:
- `subscription_plans` - Available plans
- `user_subscriptions` - User subscriptions
- `payment_methods` - Payment methods
- `subscription_invoices` - Billing invoices
- `feature_usage_tracking` - Usage analytics

### Media API Tables:
- `media_files` - File metadata
- `file_shares` - File sharing permissions
- `media_scans` - Security scan results
- `storage_quotas` - User storage limits

## Testing & Development

### API Testing
Use the provided Postman collection or test with curl:

```bash
# Example: Get user notifications
curl -H "Authorization: Bearer <token>" \
     "http://localhost:5000/api/notifications"

# Example: Upload file
curl -H "Authorization: Bearer <token>" \
     -F "file=@example.jpg" \
     -F "description=Test upload" \
     "http://localhost:5000/api/media/upload"
```

### Environment Variables
Ensure these environment variables are configured:
- `JWT_SECRET` - JWT signing secret
- `SUPABASE_URL` - Supabase database URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key
- `UPLOAD_PATH` - File upload directory
- `MAX_FILE_SIZE` - Maximum file size limit

## Deployment & Monitoring

### Health Checks
Monitor API health via `/health` endpoint:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "apis": {
    "monitor": "active",
    "notifications": "active",
    "emergency": "active",
    "ai_moderation": "active",
    "support": "active",
    "subscriptions": "active",
    "media": "active"
  }
}
```

### Performance Monitoring
- Response time tracking for all endpoints
- Database query performance monitoring
- File upload/download speed metrics
- Real-time notification delivery rates

---

This completes the comprehensive documentation for all 7 new backend APIs built for the SAMIA TAROT platform. Each API is production-ready with proper authentication, validation, error handling, and security measures. 