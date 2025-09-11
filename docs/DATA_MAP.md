# Data Mapping & Processing Inventory
**Samia Tarot Platform - Comprehensive Data Registry**

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: July 2025  
**Owner**: Data Protection Team

---

## 1. Data Mapping Overview

This document provides a comprehensive mapping of all personal data processing activities within the Samia Tarot Platform, aligned with GDPR Article 30 requirements for records of processing activities.

### 1.1 Scope
- All personal data collected, processed, and stored
- Complete data lifecycle from collection to deletion
- Cross-system data flows and integrations
- Legal basis and retention schedules
- Data subject rights implementation

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Samia Tarot Platform                         │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Web App   │  │  Mobile App │  │  Admin Panel│            │
│  │   (React)   │  │(React Native│  │   (React)   │            │
│  └─────┬───────┘  └─────┬───────┘  └─────┬───────┘            │
│        │                │                │                     │
│        └────────────────┼────────────────┘                     │
│                         │                                      │
│  ┌─────────────────────┬┴───────────────────────────────────┐  │
│  │                     │           API Layer                │  │
│  │  Authentication    │        Business Logic             │  │
│  │  (Supabase Auth)   │        Route Guards                │  │
│  └─────────────────────┼────────────────────────────────────┘  │
│                         │                                      │
│  ┌─────────────────────┴────────────────────────────────────┐  │
│  │                  Database Layer                          │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │  │
│  │  │ PostgreSQL  │ │ Row-Level   │ │   Audit & Logging   │ │  │
│  │  │  (Primary)  │ │  Security   │ │     (Persistent)    │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Storage & Media                         │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │  │
│  │  │  Supabase   │ │   Private   │ │    Signed URLs      │ │  │
│  │  │   Storage   │ │   Buckets   │ │   (Time-Limited)    │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 External Integrations

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Payment Proc.  │    │   Communication  │    │   Push Notif.   │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐  │    │ ┌─────────────┐ │
│ │   Stripe    │ │    │ │   Twilio    │  │    │ │     FCM     │ │
│ │ (Primary EU)│ │    │ │ (SMS/Voice) │  │    │ │  (Android)  │ │
│ └─────────────┘ │    │ └─────────────┘  │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐  │    │ ┌─────────────┐ │
│ │   Square    │ │    │ │  WhatsApp   │  │    │ │    APNs     │ │
│ │ (Fallback)  │ │    │ │ (via Twilio)│  │    │ │    (iOS)    │ │
│ └─────────────┘ │    │ └─────────────┘  │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 3. Personal Data Inventory

### 3.1 Core Identity Data

#### 3.1.1 User Authentication & Profile
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `id` | `profiles` | UUID | Unique identifier | Auto-generated | Account lifetime |
| `email` | `profiles` | Text | Authentication, communication | User registration | Account lifetime + 30 days |
| `phone` | `profiles` | Text | SMS notifications, verification | User registration (optional) | Account lifetime + 30 days |
| `first_name` | `profiles` | Text | Personalization, service delivery | User registration | Account lifetime + 30 days |
| `last_name` | `profiles` | Text | Personalization, service delivery | User registration | Account lifetime + 30 days |
| `email_verified` | `profiles` | Boolean | Account security | Supabase Auth verification | Account lifetime |
| `phone_verified` | `profiles` | Boolean | SMS delivery capability | Twilio OTP verification | Account lifetime |
| `role_id` | `profiles` | Integer | Access control | Admin assignment | Account lifetime |

**Legal Basis**: Contract (GDPR 6.1.b) - Necessary for service provision  
**Special Categories**: None  
**Cross-Border**: EU/EEA only (Supabase Ireland)  
**RLS Policy**: User can read/update own profile; Admin/Superadmin full access

#### 3.1.2 Demographic & Preference Data
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `dob` | `profiles` | Date | Zodiac calculation, astro services | User registration | Account lifetime (essential) |
| `zodiac` | `profiles` | Text | Horoscope personalization | Auto-calculated from DOB | Account lifetime |
| `country` | `profiles` | Text | Service localization, payment routing | User selection | Account lifetime + 30 days |
| `country_code` | `profiles` | Text | SMS routing, timezone inference | Derived from country | Account lifetime + 30 days |
| `birth_place` | `profiles` | Text | Astro chart calculations | User input (optional) | Account lifetime + 30 days |
| `birth_time` | `profiles` | Time | Astro chart accuracy | User input (optional) | Account lifetime + 30 days |

**Legal Basis**: Contract (GDPR 6.1.b) + Consent for birth location/time  
**Special Categories**: Religious beliefs (inferred) - Explicit consent (GDPR 9.2.a)  
**Cross-Border**: EU/EEA only  
**RLS Policy**: User can read/update own data; Reader/Admin access as needed

### 3.2 Service Interaction Data

#### 3.2.1 Orders & Bookings
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `id` | `orders` | BigSerial | Order tracking | Auto-generated | 7 years (financial) |
| `user_id` | `orders` | UUID | Order ownership | FK to profiles | 7 years |
| `service_id` | `orders` | BigInt | Service type tracking | User selection | 7 years |
| `question_text` | `orders` | Text | Service delivery | User input | 90 days post-delivery |
| `status` | `orders` | Enum | Order lifecycle | System/admin updates | 7 years |
| `assigned_reader` | `orders` | UUID | Service fulfillment | Admin assignment | 7 years |
| `scheduled_at` | `orders` | Timestamp | Appointment booking | User/admin scheduling | 7 years |
| `delivered_at` | `orders` | Timestamp | Service completion | System update | 7 years |
| `is_gold` | `orders` | Boolean | Priority service | User selection/payment | 7 years |

**Legal Basis**: Contract (GDPR 6.1.b) - Service delivery  
**Special Categories**: Religious beliefs (tarot questions) - Explicit consent  
**Cross-Border**: EU/EEA only  
**RLS Policy**: User sees own orders; Reader sees assigned; Admin/Monitor full access

#### 3.2.2 Media Assets (Audio/Image)
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `id` | `media_assets` | BigSerial | Media identification | Auto-generated | Varies by type |
| `owner_id` | `media_assets` | UUID | Media ownership | FK to profiles | Same as media |
| `kind` | `media_assets` | Text | File type classification | System detection | Same as media |
| `url` | `media_assets` | Text | File location (signed) | Upload process | Same as media |
| `duration_sec` | `media_assets` | Integer | Audio length | System analysis | Same as media |
| `bytes` | `media_assets` | BigInt | File size tracking | System measurement | Same as media |
| `sha256` | `media_assets` | Text | Integrity verification | System hash | Same as media |

**Retention by Media Type**:
- **User Question Audio**: 90 days post-delivery
- **Reading Response Audio**: 60 days post-delivery  
- **Consultation Recordings**: 90 days post-session
- **Coffee Cup Images**: 30 days post-reading
- **System/Admin Media**: Per business requirement

**Legal Basis**: Contract (GDPR 6.1.b) - Service delivery  
**Special Categories**: Voice recordings contain biometric characteristics - Explicit consent  
**Cross-Border**: EU/EEA only (Supabase Storage EU)  
**RLS Policy**: Owner can access own; Reader for assigned orders; Admin full access

#### 3.2.3 Daily Horoscopes
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `id` | `horoscopes` | BigSerial | Content identification | Auto-generated | 60 days maximum |
| `scope` | `horoscopes` | Text | Content categorization | Admin classification | 60 days |
| `zodiac` | `horoscopes` | Text | Personalization targeting | Admin assignment | 60 days |
| `ref_date` | `horoscopes` | Date | Content relevance | Admin/system setting | 60 days |
| `audio_media_id` | `horoscopes` | BigInt | Content delivery | Admin upload | 60 days |
| `text_content` | `horoscopes` | Text | Alternative format | Admin input (optional) | 60 days |
| `tiktok_post_url` | `horoscopes` | Text | Source attribution | Admin reference | 60 days |
| `approved_by` | `horoscopes` | UUID | Quality control | Monitor approval | 60 days |
| `approved_at` | `horoscopes` | Timestamp | Publication control | System timestamp | 60 days |

**Legal Basis**: Legitimate Interest (GDPR 6.1.f) - Content delivery  
**Special Categories**: Religious beliefs (horoscope content) - Explicit consent  
**Cross-Border**: EU/EEA only  
**RLS Policy**: Public can read approved+today; Reader can access 60 days; Admin full access

### 3.3 Communication & Engagement Data

#### 3.3.1 Phone Verification
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `id` | `phone_verifications` | BigSerial | Verification tracking | Auto-generated | 90 days |
| `profile_id` | `phone_verifications` | UUID | User association | FK to profiles | 90 days |
| `phone` | `phone_verifications` | Text | Verification target | User input | 90 days |
| `status` | `phone_verifications` | Text | Verification outcome | Twilio response | 90 days |
| `provider_ref` | `phone_verifications` | Text | External tracking | Twilio reference | 90 days |

**Legal Basis**: Contract (GDPR 6.1.b) - Account verification  
**Cross-Border**: EU/US via Twilio (Standard Contractual Clauses)  
**RLS Policy**: User can see own verifications; Admin full access

#### 3.3.2 Calls & Sessions
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `id` | `calls` | BigSerial | Session tracking | Auto-generated | 2 years |
| `order_id` | `calls` | BigInt | Service linkage | FK to orders | 2 years |
| `started_at` | `calls` | Timestamp | Session lifecycle | System capture | 2 years |
| `ended_at` | `calls` | Timestamp | Session duration | System capture | 2 years |
| `end_reason` | `calls` | Text | Session outcome | System/user action | 2 years |

**Legal Basis**: Contract (GDPR 6.1.b) - Service delivery  
**Cross-Border**: EU/EEA only  
**RLS Policy**: User sees own calls; Reader sees assigned; Monitor/Admin full access

#### 3.3.3 Notification Campaigns (Future)
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `device_token` | `notification_devices` | Text | Push delivery | FCM/APNs registration | Until uninstall |
| `notification_preferences` | `profiles` | JSONB | Delivery preferences | User settings | Account lifetime |
| `opt_out_flags` | `notification_preferences` | JSONB | Consent management | User choice | Permanent |

**Legal Basis**: Consent (GDPR 6.1.a) - Marketing communications  
**Cross-Border**: EU/US via FCM/APNs (adequacy decisions)  
**RLS Policy**: User controls own preferences; Admin manages campaigns

### 3.4 Financial & Transaction Data

#### 3.4.1 Payment Processing
| Field | System | Type | Purpose | Collection Method | Retention |
|-------|--------|------|---------|------------------|-----------|
| `stripe_customer_id` | `payment_customers` | Text | Payment processing | Stripe integration | 7 years |
| `payment_intent_id` | `payment_transactions` | Text | Transaction tracking | Stripe/Square API | 7 years |
| `amount_cents` | `payment_transactions` | Integer | Financial records | Payment processor | 7 years |
| `currency` | `payment_transactions` | Text | Financial records | User/system setting | 7 years |
| `status` | `payment_transactions` | Text | Payment lifecycle | Payment processor | 7 years |
| `provider` | `payment_transactions` | Text | Processor identification | System routing | 7 years |

**Legal Basis**: Contract (GDPR 6.1.b) + Legal Obligation (GDPR 6.1.c) - Financial records  
**Cross-Border**: EU (Stripe) / US (Square fallback) - Adequacy decisions / SCCs  
**RLS Policy**: User sees own transactions; Admin/Superadmin full access  
**Special Handling**: PCI DSS compliance, no raw card data stored

#### 3.4.2 Cost Tracking (Internal)
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `service_name` | `finops_cost_usage` | Text | Cost attribution | System tracking | 2 years |
| `cost_type` | `finops_cost_usage` | Text | Cost categorization | System classification | 2 years |
| `cost_cents` | `finops_cost_usage` | BigInt | Financial tracking | Provider APIs | 2 years |
| `usage_metadata` | `finops_cost_usage` | JSONB | Context information | System measurement | 2 years |

**Legal Basis**: Legitimate Interest (GDPR 6.1.f) - Business operations  
**Cross-Border**: EU/EEA only  
**RLS Policy**: Admin/Superadmin only (sensitive business data)

### 3.5 Security & Audit Data

#### 3.5.1 Audit Trail
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `id` | `audit_log` | BigSerial | Event tracking | Auto-generated | 3 years |
| `actor` | `audit_log` | UUID | Accountability | System capture | 3 years |
| `actor_role` | `audit_log` | Text | Permission context | System lookup | 3 years |
| `event` | `audit_log` | Text | Action description | System classification | 3 years |
| `entity` | `audit_log` | Text | Target identification | System context | 3 years |
| `entity_id` | `audit_log` | Text | Specific target | System reference | 3 years |
| `meta` | `audit_log` | JSONB | Additional context | System data (no PII) | 3 years |

**Legal Basis**: Legitimate Interest (GDPR 6.1.f) - Security and compliance  
**Cross-Border**: EU/EEA only  
**RLS Policy**: Admin/Superadmin full access; Monitor relevant events  
**Special Handling**: No PII in meta fields, tamper-evident design

#### 3.5.2 Moderation Actions
| Field | Table | Type | Purpose | Collection Method | Retention |
|-------|-------|------|---------|------------------|-----------|
| `id` | `moderation_actions` | BigSerial | Action tracking | Auto-generated | 5 years |
| `actor_id` | `moderation_actions` | UUID | Moderator identification | System capture | 5 years |
| `target_kind` | `moderation_actions` | Text | Content classification | System category | 5 years |
| `target_id` | `moderation_actions` | Text | Content reference | System ID | 5 years |
| `action` | `moderation_actions` | Text | Action taken | Admin/Monitor choice | 5 years |
| `reason` | `moderation_actions` | Text | Justification | Moderator input | 5 years |

**Legal Basis**: Legitimate Interest (GDPR 6.1.f) - Platform safety  
**Cross-Border**: EU/EEA only  
**RLS Policy**: Monitor/Admin full access for relevant actions

#### 3.5.3 Technical Monitoring
| Field | System | Type | Purpose | Collection Method | Retention |
|-------|--------|------|---------|------------------|-----------|
| `ip_address` | `access_logs` | IP | Security monitoring | System capture | 30 days (then anonymized) |
| `user_agent` | `access_logs` | Text | Platform analytics | HTTP headers | 30 days |
| `session_id` | `session_store` | UUID | Session management | System generation | 30 days |
| `request_id` | `access_logs` | UUID | Request tracing | System generation | 30 days |

**Legal Basis**: Legitimate Interest (GDPR 6.1.f) - Security and service delivery  
**Cross-Border**: EU/EEA only  
**RLS Policy**: Admin/Superadmin only  
**Special Handling**: IP addresses anonymized after 30 days

---

## 4. Data Flow Analysis

### 4.1 User Registration Flow
```
User Input → Frontend Validation → Supabase Auth → Profile Creation → Email Verification
    ↓                                                                        ↓
Zodiac Calculation ← DOB Processing                            Audit Log Entry
    ↓
Welcome Email (Twilio) ← Notification Trigger
```

### 4.2 Service Request Flow
```
Service Selection → Order Creation → Payment Processing → Reader Assignment
    ↓                    ↓                    ↓                    ↓
Question Input    Audit Entry      Stripe/Square        Notification
    ↓                    ↓                    ↓                    ↓
Media Upload     Status Update    Payment Record      Reader Access
```

### 4.3 Content Delivery Flow
```
Admin Upload → Media Processing → Quality Review → Approval → Publication
    ↓               ↓                 ↓            ↓            ↓
Supabase S3    Metadata Extract   Monitor UI    Status Update  Public API
    ↓               ↓                 ↓            ↓            ↓
Encryption     Size/Duration     Content Check   Audit Log    User Access
```

### 4.4 Data Retention Flow
```
Creation → Active Use → Retention Period → Deletion Notice → Hard Delete
    ↓           ↓              ↓                ↓               ↓
Audit Log   Access Control   Scheduled Job   User Warning   Audit Entry
    ↓           ↓              ↓                ↓               ↓
Encryption  RLS Policies    Status Update   Final Backup   Confirmation
```

---

## 5. Cross-System Integration Mapping

### 5.1 Supabase Integration
**Data Types**: All personal data categories  
**Purpose**: Primary database and authentication  
**Location**: EU-West-1 (Ireland)  
**Transfer Mechanism**: No transfer (EU hosting)  
**Safeguards**: Encryption at rest/transit, RLS policies, audit logging  
**DPA Status**: ✅ Signed

### 5.2 Stripe Integration
**Data Types**: Payment data, basic profile (name, email)  
**Purpose**: EU payment processing  
**Location**: EU (varies by transaction)  
**Transfer Mechanism**: Adequacy decision  
**Safeguards**: PCI DSS Level 1, tokenization, webhook verification  
**DPA Status**: ✅ Signed

### 5.3 Square Integration (Fallback)
**Data Types**: Payment data, basic profile  
**Purpose**: US payment processing fallback  
**Location**: United States  
**Transfer Mechanism**: Standard Contractual Clauses  
**Safeguards**: PCI DSS, limited data scope, encryption  
**DPA Status**: ✅ Signed

### 5.4 Twilio Integration
**Data Types**: Phone numbers, SMS content, verification status  
**Purpose**: SMS notifications and phone verification  
**Location**: EU/US (varies by SMS routing)  
**Transfer Mechanism**: DPA + Standard Contractual Clauses  
**Safeguards**: Minimal data retention, encrypted transit, opt-out support  
**DPA Status**: ✅ Signed

### 5.5 FCM/APNs Integration
**Data Types**: Device tokens, notification content  
**Purpose**: Push notifications  
**Location**: EU/US  
**Transfer Mechanism**: Google/Apple adequacy decisions  
**Safeguards**: Tokenized identifiers, consent-based, temporary storage  
**DPA Status**: ✅ Platform agreements

---

## 6. Data Subject Rights Implementation Matrix

### 6.1 Right to Information (Art. 13-14)
| Data Category | Information Source | Update Mechanism |
|---------------|------------------|------------------|
| **All Categories** | Privacy Policy (public) | Website, app, registration flow |
| **Service-Specific** | Order confirmation | Email, in-app notification |
| **Processing Changes** | Direct communication | Email, app notification |

### 6.2 Right of Access (Art. 15)
| Data Category | Access Method | Response Format |
|---------------|---------------|-----------------|
| **Profile Data** | API endpoint `/me/profile` | JSON export |
| **Order History** | API endpoint `/me/orders` | JSON with media links |
| **Media Assets** | Signed URLs | Direct download links |
| **Payment History** | API endpoint `/me/payments` | JSON summary |
| **Communication** | Manual process | PDF report |

### 6.3 Right to Rectification (Art. 16)
| Data Category | Self-Service | Manual Process |
|---------------|--------------|----------------|
| **Profile Data** | ✅ User settings | Customer support |
| **Preferences** | ✅ Notification settings | Customer support |
| **Payment Data** | Payment provider | Customer support |
| **Historical Data** | Not applicable | Customer support |

### 6.4 Right to Erasure (Art. 17)
| Data Category | Automated Deletion | Manual Review Required |
|---------------|-------------------|----------------------|
| **Profile Data** | ✅ Account deletion | Complex integrations |
| **Service History** | ✅ Cascading delete | Legal hold periods |
| **Payment Data** | 7-year retention | Early deletion on request |
| **Audit Logs** | Pseudonymization | Legal/compliance review |

### 6.5 Right to Restriction (Art. 18)
| Scenario | Implementation Method | Access Control |
|----------|---------------------|----------------|
| **Processing Dispute** | Account suspension flag | Block service access |
| **Legal Challenge** | Data freeze flag | Prevent automated processing |
| **Consent Withdrawal** | Service limitation | Maintain essential processing only |

### 6.6 Right to Data Portability (Art. 20)
| Data Category | Format | Delivery Method |
|---------------|--------|-----------------|
| **Profile Data** | JSON | API endpoint |
| **Service History** | JSON | API endpoint |
| **Media Files** | Original format | Signed URLs |
| **Preferences** | JSON | API endpoint |

---

## 7. Retention Schedule Matrix

### 7.1 Legal Requirement Categories

#### 7.1.1 Financial Records (7 Years)
- Payment transactions and receipts
- Tax-related customer information
- Refund and chargeback records
- Financial audit trails

**Legal Basis**: Legal Obligation (GDPR 6.1.c) - Tax law compliance

#### 7.1.2 Service Delivery Records (Variable)
- Active account data: Account lifetime
- Order/service history: 2 years post-delivery
- Media assets: 30-90 days post-delivery
- Communication logs: 90 days

**Legal Basis**: Contract (GDPR 6.1.b) - Service provision

#### 7.1.3 Security & Compliance Records (3-5 Years)
- Audit trails: 3 years
- Moderation actions: 5 years
- Security incident records: 5 years
- Access logs: 30 days (then anonymized)

**Legal Basis**: Legitimate Interest (GDPR 6.1.f) - Security and compliance

### 7.2 Automated Retention Implementation

#### 7.2.1 Daily Cleanup Jobs
```sql
-- Media assets cleanup (older than retention period)
DELETE FROM media_assets 
WHERE created_at < now() - interval '90 days'
  AND kind = 'consultation_recording';

-- Expired phone verifications
DELETE FROM phone_verifications 
WHERE created_at < now() - interval '90 days';

-- Old access logs (anonymize IP addresses first)
UPDATE access_logs 
SET ip_address = '0.0.0.0' 
WHERE created_at < now() - interval '30 days';
```

#### 7.2.2 Weekly Cleanup Jobs
```sql
-- Horoscope content (60-day limit)
DELETE FROM horoscopes 
WHERE created_at < now() - interval '60 days';

-- Orphaned media assets
DELETE FROM media_assets m
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.input_media_id = m.id OR o.output_media_id = m.id
) AND created_at < now() - interval '30 days';
```

#### 7.2.3 Monthly Cleanup Jobs
```sql
-- Anonymize old audit logs (retain for compliance but remove personal identifiers)
UPDATE audit_log 
SET actor = NULL, meta = '{}'::jsonb
WHERE created_at < now() - interval '2 years';
```

### 7.3 User-Requested Deletion
#### 7.3.1 Account Deletion Process
1. **Immediate Actions**:
   - Disable account access
   - Cancel active services
   - Stop all communications

2. **30-Day Grace Period**:
   - Mark for deletion but retain data
   - Allow account recovery
   - Continue essential processing only

3. **Hard Deletion After 30 Days**:
   - Delete profile and preference data
   - Anonymize order/transaction records (retain for financial compliance)
   - Delete media assets immediately
   - Pseudonymize audit trail entries

#### 7.3.2 Right to Erasure Exceptions
- **Financial records**: Retained for 7 years per tax law
- **Legal disputes**: Retained until resolution
- **Safety/security**: Retained where legitimate interest outweighs erasure right
- **Anonymized data**: No personal data remaining, GDPR doesn't apply

---

## 8. Privacy by Design Implementation

### 8.1 Data Minimization Principles
- **Registration**: Only essential fields required
- **Service Delivery**: Collect only data necessary for specific service
- **Analytics**: Aggregated data preferred over individual tracking
- **Retention**: Automatic deletion at end of retention period

### 8.2 Purpose Limitation
- **Primary Purpose**: Service delivery (tarot readings, horoscopes)
- **Secondary Purposes**: Customer support, service improvement, legal compliance
- **Prohibited Uses**: No profiling for non-service purposes, no data sales

### 8.3 Storage Limitation
- **Active Data**: Database with encryption at rest
- **Media Files**: Private buckets with signed URL access
- **Backup Data**: Encrypted off-site backups with same retention periods
- **Archive Data**: Long-term financial records only

### 8.4 Accuracy Measures
- **User Controls**: Self-service profile editing
- **Verification**: Email/phone verification processes
- **Correction Mechanisms**: Customer support for data updates
- **Regular Reviews**: Annual data quality assessments

---

## 9. Technical Safeguards Summary

### 9.1 Encryption Implementation
- **At Rest**: AES-256 encryption for all database and storage
- **In Transit**: TLS 1.3 for all external communications
- **Application**: JWT tokens for authentication, bcrypt for passwords
- **Backup**: Encrypted backup storage with separate key management

### 9.2 Access Control Matrix
| Role | Database Access | Media Access | Admin Functions | Audit Access |
|------|----------------|--------------|----------------|--------------|
| **Public** | None | Signed URLs only | None | None |
| **Client** | Own data via RLS | Own media via API | Account settings | None |
| **Reader** | Assigned orders | Assigned media | None | None |
| **Monitor** | Moderation scope | Review access | Content moderation | Limited |
| **Admin** | Full via RLS | Full access | User management | Full |
| **Superadmin** | Full access | Full access | System config | Full |

### 9.3 Audit and Monitoring
- **Database Access**: All queries logged with user context
- **API Access**: Request/response logging (no PII)
- **File Access**: Media access logged with requesting user
- **Administrative Actions**: Full audit trail for all admin operations

---

## 10. Compliance Validation Checklist

### 10.1 GDPR Article 30 Requirements
- ✅ **Controller Details**: Documented with contact information
- ✅ **Processing Purposes**: Clearly defined for each data category
- ✅ **Data Categories**: Comprehensive inventory completed
- ✅ **Data Subject Categories**: Users, readers, administrators identified
- ✅ **Recipients**: All processors and third parties documented
- ✅ **International Transfers**: Documented with safeguards
- ✅ **Retention Periods**: Defined and implemented
- ✅ **Security Measures**: Technical and organizational measures described

### 10.2 Technical Implementation Validation
- ✅ **RLS Policies**: Implemented and tested for all personal data tables
- ✅ **API Security**: JWT authentication and authorization on all endpoints
- ✅ **Encryption**: At-rest and in-transit encryption verified
- ✅ **Backup Security**: Encrypted backups with separate key storage
- ✅ **Access Logging**: Comprehensive audit trail implemented
- ✅ **Data Validation**: Input validation and sanitization in place

### 10.3 Operational Process Validation
- ✅ **Rights Requests**: Procedures documented and tested
- ✅ **Incident Response**: Data breach procedures defined
- ✅ **Staff Training**: Privacy training program established
- ✅ **Vendor Management**: DPAs signed with all processors
- ✅ **Regular Reviews**: Annual review schedule established
- ✅ **Documentation**: All processing activities documented

---

## 11. Document Control and Updates

### 11.1 Review Schedule
- **Quarterly**: Data inventory updates
- **Semi-Annually**: Retention policy review
- **Annually**: Complete document review and update
- **Ad-Hoc**: System changes, new integrations, regulatory updates

### 11.2 Change Management
- **Minor Updates**: Technical team approval
- **Major Changes**: DPO and legal team approval
- **Regulatory Changes**: Immediate review and update
- **System Changes**: Impact assessment and documentation update

### 11.3 Version Control
- **Version**: 1.0 (Initial production release)
- **Next Review**: July 2025
- **Owner**: Data Protection Team
- **Approvals**: DPO, Legal Counsel, Technical Lead

---

**Document Classification**: Internal/Confidential  
**Document ID**: DM-SAMIA-2025-001  
**Last Updated**: January 2025  
**Next Review**: July 2025