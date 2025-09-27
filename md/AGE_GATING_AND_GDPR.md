# Age Gating & GDPR Compliance

## Overview
Ensure legal compliance for 18+ age requirement and GDPR data protection regulations.

---

## Age Gating (18+)

### Legal Requirement
Service restricted to users 18 years or older due to nature of content (tarot readings, spiritual services).

### Implementation

#### 1. Profile Schema
```sql
ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN age_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN age_verified_at TIMESTAMPTZ;

CREATE INDEX idx_profiles_age_verified ON profiles(age_verified);
```

#### 2. Age Verification Endpoint
```python
@router.post("/profile/complete")
async def complete_profile(
    profile_data: ProfileComplete,
    user: User = Depends(require_auth)
):
    dob = profile_data.date_of_birth
    age = calculate_age(dob)

    if age < 18:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "AGE_REQUIREMENT_NOT_MET",
                "message": "You must be 18 or older to use this service."
            }
        )

    await db.execute(
        """
        UPDATE profiles
        SET date_of_birth = $1,
            age_verified = TRUE,
            age_verified_at = NOW()
        WHERE user_id = $2
        """,
        dob, user.id
    )

    await audit_log.insert({
        'action': 'age_verified',
        'resource_type': 'profile',
        'resource_id': user.id,
        'actor_id': user.id,
        'actor_role': user.role,
        'metadata': {'age': age}
    })

    return {"verified": True, "age": age}

def calculate_age(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
```

#### 3. Age Gate Middleware
```python
async def age_gate_middleware(request: Request, call_next):
    if request.url.path in ['/api/auth/sync', '/api/profile/complete', '/api/ops/health']:
        return await call_next(request)

    if hasattr(request.state, 'user_id'):
        profile = await db.fetch_one(
            "SELECT age_verified FROM profiles WHERE user_id = $1",
            request.state.user_id
        )

        if not profile or not profile['age_verified']:
            return JSONResponse(
                status_code=403,
                content={
                    "code": "AGE_VERIFICATION_REQUIRED",
                    "message": "Please complete age verification to access this service."
                }
            )

    return await call_next(request)
```

#### 4. Frontend Age Gate
```javascript
const AgeGate = ({ children }) => {
  const [ageVerified, setAgeVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAgeVerification = async () => {
      try {
        const profile = await api.profile.get();
        setAgeVerified(profile.age_verified);
      } catch (err) {
        console.error('Failed to check age verification', err);
      } finally {
        setLoading(false);
      }
    };

    checkAgeVerification();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!ageVerified) {
    return <AgeVerificationForm onVerified={() => setAgeVerified(true)} />;
  }

  return children;
};
```

#### 5. Legal Disclaimer
```jsx
const AgeVerificationForm = ({ onVerified }) => {
  return (
    <div className="age-gate">
      <h2>Age Verification Required</h2>
      <p>
        This service is restricted to individuals 18 years of age or older.
        By providing your date of birth, you confirm that you meet this requirement.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Date of Birth:
          <input type="date" name="dob" required max={getMaxDate()} />
        </label>

        <label>
          <input type="checkbox" required />
          I confirm that I am 18 years of age or older
        </label>

        <button type="submit">Verify Age</button>
      </form>

      <p className="disclaimer">
        We collect your date of birth solely for age verification purposes
        in compliance with legal requirements. See our Privacy Policy for details.
      </p>
    </div>
  );
};

const getMaxDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().split('T')[0];
};
```

---

## GDPR Compliance

### Data Protection Principles

#### 1. Lawfulness, Fairness, Transparency
- Clear privacy policy
- Explicit consent for data processing
- Transparent data usage

#### 2. Purpose Limitation
- Data collected only for specified purposes
- No secondary use without consent

#### 3. Data Minimization
- Collect only necessary data
- No excessive data collection

#### 4. Accuracy
- Users can update their data
- Mechanisms to correct inaccurate data

#### 5. Storage Limitation
- Retention policies enforced
- Automated deletion after retention period

#### 6. Integrity & Confidentiality
- Encryption at rest and in transit
- Access controls (RLS)
- Audit logging

---

## Data Subject Rights (DSR)

### 1. Right to Access (Article 15)
**Implementation:**
```python
@router.get("/dsr/access")
async def dsr_access(user: User = Depends(require_auth)):
    data = {
        'profile': await db.fetch_one("SELECT * FROM profiles WHERE user_id = $1", user.id),
        'orders': await db.fetch_all("SELECT * FROM orders WHERE user_id = $1", user.id),
        'payments': await db.fetch_all("SELECT * FROM payment_intents WHERE user_id = $1", user.id),
        'notifications': await db.fetch_all("SELECT * FROM notif_log WHERE user_id = $1", user.id)
    }

    await audit_log.insert({
        'action': 'dsr_access_requested',
        'resource_type': 'profile',
        'resource_id': user.id,
        'actor_id': user.id,
        'actor_role': user.role,
        'legal_basis': 'GDPR Article 15'
    })

    return data
```

---

### 2. Right to Rectification (Article 16)
**Implementation:**
```python
@router.patch("/profile")
async def update_profile(
    updates: ProfileUpdate,
    user: User = Depends(require_auth)
):
    await db.execute(
        "UPDATE profiles SET email = $1, phone = $2 WHERE user_id = $3",
        updates.email, updates.phone, user.id
    )

    await audit_log.insert({
        'action': 'profile_updated',
        'resource_type': 'profile',
        'resource_id': user.id,
        'actor_id': user.id,
        'actor_role': user.role
    })

    return {"updated": True}
```

---

### 3. Right to Erasure (Article 17)
**Implementation:**
```python
@router.post("/dsr/delete")
async def dsr_delete(user: User = Depends(require_auth)):
    await audit_log.insert({
        'action': 'dsr_deletion_requested',
        'resource_type': 'profile',
        'resource_id': user.id,
        'actor_id': user.id,
        'actor_role': user.role,
        'legal_basis': 'GDPR Article 17'
    })

    async with db.transaction():
        await db.execute("UPDATE profiles SET email = 'deleted@example.com', phone = NULL, date_of_birth = NULL WHERE user_id = $1", user.id)
        await db.execute("DELETE FROM orders WHERE user_id = $1", user.id)
        await db.execute("DELETE FROM notif_prefs WHERE user_id = $1", user.id)

        await supabase.storage.from_('private-media').remove([
            f"users/{user.id}/*"
        ])

    await audit_log.insert({
        'action': 'dsr_deletion_completed',
        'resource_type': 'profile',
        'resource_id': user.id,
        'actor_id': user.id,
        'actor_role': user.role
    })

    return {"deleted": True}
```

**Note:** Some data must be retained for legal/financial reasons (e.g., invoices for tax compliance).

---

### 4. Right to Data Portability (Article 20)
**Implementation:**
```python
@router.get("/dsr/export")
async def dsr_export(user: User = Depends(require_auth)):
    data = {
        'profile': await db.fetch_one("SELECT * FROM profiles WHERE user_id = $1", user.id),
        'orders': await db.fetch_all("SELECT * FROM orders WHERE user_id = $1", user.id),
        'horoscopes_viewed': await db.fetch_all("SELECT * FROM horoscope_views WHERE user_id = $1", user.id)
    }

    export_file = generate_json_export(data)

    signed_url = await storage.create_signed_url(
        bucket='exports',
        path=f"user-exports/{user.id}-{datetime.now().isoformat()}.json",
        expires_in=3600
    )

    await audit_log.insert({
        'action': 'dsr_export_completed',
        'resource_type': 'profile',
        'resource_id': user.id,
        'actor_id': user.id,
        'actor_role': user.role,
        'legal_basis': 'GDPR Article 20'
    })

    return {"export_url": signed_url, "expires_in": 3600}
```

---

### 5. Right to Object (Article 21)
**Implementation:**
```python
@router.post("/notif/prefs")
async def update_notification_preferences(
    prefs: NotificationPreferences,
    user: User = Depends(require_auth)
):
    await db.execute(
        """
        UPDATE notif_prefs
        SET email = $1, sms = $2, whatsapp = $3, push = $4
        WHERE user_id = $5
        """,
        prefs.email, prefs.sms, prefs.whatsapp, prefs.push, user.id
    )

    await audit_log.insert({
        'action': 'notification_prefs_updated',
        'resource_type': 'profile',
        'resource_id': user.id,
        'actor_id': user.id,
        'actor_role': user.role
    })

    return {"updated": True}
```

---

## Consent Management

### Schema
```sql
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(user_id),
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_user_consents_user ON user_consents(user_id);
```

### Consent Types
- `terms_of_service`
- `privacy_policy`
- `marketing_emails`
- `data_processing`

### Recording Consent
```python
async def record_consent(
    user_id: str,
    consent_type: str,
    granted: bool,
    ip_address: str,
    user_agent: str
):
    await db.execute(
        """
        INSERT INTO user_consents (user_id, consent_type, granted, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
        """,
        user_id, consent_type, granted, ip_address, user_agent
    )
```

---

## Privacy Policy Requirements

### Must Include:
- **Data Controller:** Company name and contact info
- **Data Collected:** List all PII collected (name, email, DOB, etc.)
- **Purpose:** Why data is collected
- **Legal Basis:** GDPR lawful basis (consent, contract, legitimate interest)
- **Retention Period:** How long data is kept
- **Third Parties:** Payment processors, email providers, etc.
- **User Rights:** How to exercise DSR rights
- **Data Transfers:** If data leaves EU/EEA
- **Contact:** DPO or privacy contact email

---

## Breach Notification

### GDPR Article 33: Must notify within 72 hours

**Incident Response Plan:**
```python
async def report_data_breach(
    breach_type: str,
    affected_users: list,
    description: str,
    severity: str
):
    await db.execute(
        """
        INSERT INTO security_incidents (type, affected_count, description, severity)
        VALUES ($1, $2, $3, $4)
        """,
        breach_type, len(affected_users), description, severity
    )

    if severity in ['high', 'critical']:
        await notify_dpo(breach_type, affected_users, description)

    await audit_log.insert({
        'action': 'data_breach_reported',
        'resource_type': 'security_incident',
        'metadata': {
            'type': breach_type,
            'affected_count': len(affected_users),
            'severity': severity
        }
    })
```

---

## Testing

### Test Age Verification
```python
def test_underage_rejected():
    dob = date.today() - timedelta(days=365 * 17)
    response = client.post("/api/profile/complete", json={"date_of_birth": str(dob)})
    assert response.status_code == 403
    assert response.json()['code'] == 'AGE_REQUIREMENT_NOT_MET'

def test_age_verified():
    dob = date.today() - timedelta(days=365 * 25)
    response = client.post("/api/profile/complete", json={"date_of_birth": str(dob)})
    assert response.status_code == 200
    assert response.json()['verified'] == True
```

### Test DSR Export
```python
def test_dsr_export():
    response = client.get("/api/dsr/export", headers=auth_headers)
    assert response.status_code == 200
    assert 'export_url' in response.json()
```

---

## Checklist

- [ ] Age verification enforced at profile completion
- [ ] Users under 18 blocked from service
- [ ] Age verification audited
- [ ] Privacy policy published and linked
- [ ] Terms of service published and linked
- [ ] Consent recorded with IP and timestamp
- [ ] DSR endpoints implemented (access, rectification, erasure, portability)
- [ ] Notification preferences allow opt-out
- [ ] Data retention policies enforced
- [ ] Breach notification process documented
- [ ] DPO contact available
- [ ] GDPR audit log entries for all DSR actions
- [ ] Tests verify age gating
- [ ] Tests verify DSR functionality