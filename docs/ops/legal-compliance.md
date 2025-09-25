# Legal Compliance & Age Gate Operations (M38)

## Compliance Overview

| Regulation | Scope | Implementation | Status |
|------------|-------|----------------|--------|
| **GDPR** | EU users | Privacy controls, consent, deletion | ✅ Active |
| **CCPA** | California users | Data transparency, opt-out rights | ✅ Active |
| **COPPA** | Under 13 users | Strict age gate, parental consent | ✅ Active |
| **Platform Terms** | 18+ requirement | Age verification, account restrictions | ✅ Active |

## Age Verification System

### Age Gate Enforcement

**Database Schema:**
```sql
-- Age verification tracking
SELECT
    id,
    age_verified,
    age_verification_method,
    age_verification_date,
    birth_year,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, DATE(birth_year || '-01-01'))) as calculated_age
FROM profiles
WHERE age_verified = true;
```

**Verification Methods:**
1. **Self-Declaration**: User enters birth year
2. **ID Verification**: Document upload (future enhancement)
3. **Credit Card**: Payment method verification
4. **Third-Party**: External verification service

### Under-18 User Handling

**Immediate Actions:**
```sql
-- Identify under-18 users
SELECT id, email, birth_year, calculated_age
FROM (
    SELECT
        id,
        email,
        birth_year,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, DATE(birth_year || '-01-01'))) as calculated_age
    FROM profiles
    WHERE birth_year IS NOT NULL
) age_calc
WHERE calculated_age < 18;

-- Restrict under-18 accounts
UPDATE profiles
SET
    account_status = 'restricted',
    restriction_reason = 'age_verification_failed',
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM profiles
    WHERE EXTRACT(YEAR FROM AGE(CURRENT_DATE, DATE(birth_year || '-01-01'))) < 18
);
```

**Notification Template:**
```
Subject: Account Access Update Required

Dear User,

Our records indicate you may not meet the minimum age requirement (18+) for using SAMIA TAROT services.

To continue using our platform, please:
1. Verify your age through our verification process
2. Contact support if you believe this is an error

Your account has been temporarily restricted pending verification.

SAMIA TAROT Support Team
```

## Privacy Policy Updates

### Version Control System

**Policy Versioning:**
```sql
-- Track privacy policy versions
CREATE TABLE IF NOT EXISTS privacy_policy_versions (
    id BIGSERIAL PRIMARY KEY,
    version_number VARCHAR(10) NOT NULL,
    effective_date DATE NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    changes_summary TEXT,
    requires_reconsent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User consent tracking
CREATE TABLE IF NOT EXISTS user_consents (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    policy_version VARCHAR(10) NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL,
    consent_method VARCHAR(50) NOT NULL, -- 'signup', 'update', 'explicit'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Re-consent Triggers

**When to Trigger Re-consent:**
- Material changes to data collection
- New third-party integrations
- Expanded data usage purposes
- Change in data retention periods
- New cookies or tracking

**Re-consent Workflow:**
```sql
-- Mark users needing re-consent
UPDATE profiles
SET requires_consent_update = true
WHERE last_consent_date < (
    SELECT effective_date
    FROM privacy_policy_versions
    WHERE requires_reconsent = true
    ORDER BY effective_date DESC
    LIMIT 1
);

-- Get users requiring re-consent
SELECT id, email, last_consent_date
FROM profiles
WHERE requires_consent_update = true
LIMIT 100;
```

## Data Subject Rights

### GDPR Article 17 - Right to Erasure

**User Data Deletion Process:**
```sql
-- Complete user data deletion
CREATE OR REPLACE FUNCTION delete_user_data_gdpr(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Anonymize audit logs (keep for legal compliance)
    UPDATE audit_log
    SET
        actor = 'deleted_user_' || LEFT(MD5(actor), 8),
        meta = meta - 'email' - 'phone' - 'name' - 'address'
    WHERE actor = user_id::text;

    -- 2. Delete WhatsApp data
    DELETE FROM wa_messages WHERE profile_id = user_id;
    DELETE FROM wa_conversations WHERE profile_id = user_id;
    DELETE FROM wa_automation_flows WHERE profile_id = user_id;

    -- 3. Anonymize orders (keep for financial records)
    UPDATE orders
    SET
        customer_data = jsonb_build_object(
            'anonymized', true,
            'deletion_date', NOW()
        )
    WHERE customer_id = user_id;

    -- 4. Delete profile
    DELETE FROM profiles WHERE id = user_id;

    -- 5. Log deletion event
    INSERT INTO audit_log (actor, event, entity, entity_id, meta)
    VALUES (
        'system',
        'gdpr_user_deleted',
        'privacy',
        user_id::text,
        jsonb_build_object(
            'deletion_timestamp', NOW(),
            'regulation', 'GDPR Article 17'
        )
    );

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### CCPA - Right to Know

**Data Disclosure Report:**
```sql
-- Generate user data report
CREATE OR REPLACE FUNCTION generate_user_data_report(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'profile', row_to_json(p),
        'orders', (
            SELECT json_agg(row_to_json(o))
            FROM orders o
            WHERE o.customer_id = user_id
        ),
        'whatsapp_messages', (
            SELECT json_agg(row_to_json(w))
            FROM wa_messages w
            WHERE w.profile_id = user_id
        ),
        'audit_trail', (
            SELECT json_agg(
                jsonb_build_object(
                    'event', a.event,
                    'timestamp', a.created_at,
                    'entity', a.entity
                )
            )
            FROM audit_log a
            WHERE a.actor = user_id::text
        )
    ) INTO user_data
    FROM profiles p
    WHERE p.id = user_id;

    RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Cookie Compliance

### Cookie Categories

**Essential Cookies:**
- Session management
- Security tokens
- Load balancing

**Functional Cookies:**
- User preferences
- Language settings
- Theme selection

**Analytics Cookies:**
- Performance monitoring (M36)
- Error tracking
- Usage analytics

**Marketing Cookies:**
- Currently none (strict policy)

### Cookie Banner Implementation

**Client-Side Enforcement:**
```javascript
// Cookie consent implementation
const CookieConsent = {
    categories: ['essential', 'functional', 'analytics'],

    setConsent(categories) {
        localStorage.setItem('cookie_consent', JSON.stringify({
            categories: categories,
            timestamp: Date.now(),
            version: '1.0'
        }));

        // Enable/disable tracking based on consent
        this.applyConsent(categories);
    },

    applyConsent(categories) {
        // Analytics
        if (categories.includes('analytics')) {
            // Enable Core Web Vitals tracking (M36)
            window.enableWebVitals = true;
        } else {
            window.enableWebVitals = false;
        }

        // Functional
        if (!categories.includes('functional')) {
            // Disable non-essential features
            localStorage.removeItem('user_preferences');
        }
    }
};
```

## Age Gate Implementation

### Frontend Age Verification

**Age Gate Modal:**
```javascript
// Age verification component
const AgeGate = {
    verify(birthYear) {
        const age = new Date().getFullYear() - parseInt(birthYear);

        if (age < 13) {
            // COPPA compliance - hard block
            this.showCOPPABlock();
            return false;
        } else if (age < 18) {
            // Under 18 - parental consent required
            this.showParentalConsentForm();
            return false;
        } else {
            // 18+ - proceed
            this.recordAgeVerification(birthYear, 'self_declaration');
            return true;
        }
    },

    recordAgeVerification(birthYear, method) {
        fetch('/api/age-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                birth_year: birthYear,
                verification_method: method,
                timestamp: new Date().toISOString()
            })
        });
    }
};
```

### Backend Age Verification

**API Endpoint:**
```python
@app.post("/api/age-verify")
def verify_age(request: AgeVerificationRequest, x_user_id: str = Header(...)):
    try:
        # Calculate age
        current_year = datetime.now().year
        age = current_year - request.birth_year

        # COPPA check
        if age < 13:
            db_exec("""
                UPDATE profiles
                SET account_status = 'blocked',
                    restriction_reason = 'coppa_compliance'
                WHERE id = %s
            """, (x_user_id,))

            return {"verified": False, "reason": "coppa_violation"}

        # Under 18 check
        elif age < 18:
            db_exec("""
                UPDATE profiles
                SET account_status = 'restricted',
                    restriction_reason = 'under_18'
                WHERE id = %s
            """, (x_user_id,))

            return {"verified": False, "reason": "parental_consent_required"}

        # 18+ verification
        else:
            db_exec("""
                UPDATE profiles
                SET age_verified = true,
                    age_verification_method = %s,
                    age_verification_date = %s,
                    birth_year = %s
                WHERE id = %s
            """, (
                request.verification_method,
                datetime.utcnow(),
                request.birth_year,
                x_user_id
            ))

            return {"verified": True, "status": "age_verified"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Compliance Monitoring

### Automated Compliance Checks

**Daily Compliance Audit:**
```sql
-- Age gate compliance check
SELECT
    'Age Verification' as check_type,
    COUNT(CASE WHEN age_verified = true THEN 1 END) as compliant_count,
    COUNT(*) as total_count,
    ROUND(
        COUNT(CASE WHEN age_verified = true THEN 1 END)::numeric / COUNT(*)::numeric * 100,
        2
    ) as compliance_percentage
FROM profiles
WHERE account_status = 'active'

UNION ALL

-- Consent compliance check
SELECT
    'Privacy Consent' as check_type,
    COUNT(CASE WHEN requires_consent_update = false THEN 1 END) as compliant_count,
    COUNT(*) as total_count,
    ROUND(
        COUNT(CASE WHEN requires_consent_update = false THEN 1 END)::numeric / COUNT(*)::numeric * 100,
        2
    ) as compliance_percentage
FROM profiles
WHERE account_status = 'active';
```

### Compliance Alerts

**Siren Integration:**
```python
def check_compliance_status():
    # Check for under-age users
    underage_users = db_fetch_one("""
        SELECT COUNT(*) as count
        FROM profiles
        WHERE birth_year IS NOT NULL
        AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, DATE(birth_year || '-01-01'))) < 18
        AND account_status = 'active'
    """)

    if underage_users['count'] > 0:
        siren_service.trigger_incident(
            incident_type='compliance_violation',
            severity=1,
            source='age_verification',
            policy_name='Critical',
            context={'underage_active_users': underage_users['count']},
            variables={'regulation': 'COPPA/Platform_Terms'},
            created_by='compliance_monitor'
        )
```

## Legal Documentation

### Data Processing Records

**GDPR Article 30 - Records of Processing:**
```
Data Controller: SAMIA TAROT
Processing Purpose: Tarot reading services
Legal Basis: Contract performance, Legitimate interest
Data Categories: Contact info, Payment data, Communication records
Recipients: Payment processors, Communication providers
Retention: 7 years (financial), 2 years (marketing)
Security Measures: Encryption, RLS, Audit trails
```

### Privacy Impact Assessments

**Required for:**
- New data collection features
- Third-party integrations
- High-risk processing activities
- Cross-border data transfers

**Assessment Template:**
1. Processing description
2. Legal basis justification
3. Risk assessment
4. Mitigation measures
5. Stakeholder consultation
6. Review schedule

## Incident Response

### Data Breach Notification

**Timelines:**
- **Discovery to Assessment**: 2 hours
- **Supervisory Authority**: 72 hours (GDPR)
- **Data Subjects**: Without undue delay (if high risk)

**Breach Classification:**
```sql
-- Log breach incidents
INSERT INTO audit_log (actor, event, entity, entity_id, meta)
VALUES (
    'incident_response_team',
    'data_breach_detected',
    'privacy',
    'breach_' || generate_random_uuid(),
    jsonb_build_object(
        'detection_time', NOW(),
        'affected_records', 0,  -- To be updated
        'breach_type', 'unauthorized_access',
        'notification_required', true,
        'assessment_status', 'ongoing'
    )
);
```

### Regulatory Reporting

**Automated Report Generation:**
```python
def generate_compliance_report():
    report = {
        'reporting_period': {
            'start': '2024-01-01',
            'end': '2024-12-31'
        },
        'data_subjects': {
            'total_users': get_total_users(),
            'age_verified_users': get_age_verified_count(),
            'consent_status': get_consent_status()
        },
        'data_requests': {
            'access_requests': get_access_requests(),
            'deletion_requests': get_deletion_requests(),
            'portability_requests': get_portability_requests()
        },
        'security_incidents': get_security_incidents(),
        'third_party_processors': get_processor_list()
    }
    return report
```