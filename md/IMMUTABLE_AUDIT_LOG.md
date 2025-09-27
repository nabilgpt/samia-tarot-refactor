# Immutable Audit Log Implementation

## Overview
Append-only, hash-chained audit log for compliance and forensic integrity. Every sensitive action MUST be logged with cryptographic verification to prevent tampering.

## Core Principles

### 1. Append-Only
- No UPDATE or DELETE operations allowed
- All modifications create new entries
- Original entries preserved forever

### 2. Hash-Chained
- Each entry contains hash of previous entry
- Forms blockchain-like structure
- Tampering breaks the chain

### 3. Immutability Enforcement
- Database-level constraints
- RLS policies prevent modifications
- Only INSERT allowed, only for authorized roles

---

## Schema

### audit_log Table
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seq_num BIGSERIAL UNIQUE NOT NULL,
    prev_hash TEXT,
    current_hash TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,

    actor_id UUID NOT NULL,
    actor_role TEXT NOT NULL,

    metadata JSONB,

    ip_address INET,
    user_agent TEXT,

    legal_basis TEXT,

    CONSTRAINT audit_log_no_delete CHECK (false),
    CONSTRAINT audit_log_no_update CHECK (false)
);

CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
```

### Hash Chain Implementation
```sql
CREATE OR REPLACE FUNCTION compute_audit_hash(
    p_seq_num BIGINT,
    p_prev_hash TEXT,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_actor_id UUID,
    p_timestamp TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            COALESCE(p_prev_hash, '') ||
            p_seq_num::TEXT ||
            p_action ||
            p_resource_type ||
            COALESCE(p_resource_id, '') ||
            p_actor_id::TEXT ||
            extract(epoch from p_timestamp)::TEXT,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Trigger to Auto-Compute Hashes
```sql
CREATE OR REPLACE FUNCTION audit_log_hash_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_prev_hash TEXT;
    v_seq_num BIGINT;
BEGIN
    SELECT seq_num, current_hash INTO v_seq_num, v_prev_hash
    FROM audit_log
    ORDER BY seq_num DESC
    LIMIT 1;

    NEW.prev_hash := v_prev_hash;

    NEW.current_hash := compute_audit_hash(
        NEW.seq_num,
        NEW.prev_hash,
        NEW.action,
        NEW.resource_type,
        NEW.resource_id,
        NEW.actor_id,
        NEW.timestamp
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_hash_trigger
    BEFORE INSERT ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_hash_trigger();
```

---

## RLS Policies

### Insert Policy (System/Admin/Superadmin only)
```sql
CREATE POLICY audit_log_insert ON audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
        get_user_role() IN ('system', 'admin', 'superadmin')
    );
```

### Read Policy (Superadmin only; Admin sees masked PII)
```sql
CREATE POLICY audit_log_read_superadmin ON audit_log
    FOR SELECT
    TO authenticated
    USING (
        get_user_role() = 'superadmin'
    );

CREATE VIEW audit_log_masked AS
SELECT
    id,
    seq_num,
    timestamp,
    action,
    resource_type,
    resource_id,
    'REDACTED'::TEXT AS actor_id,
    actor_role,
    jsonb_set(metadata, '{pii}', '"REDACTED"') AS metadata,
    NULL::INET AS ip_address,
    NULL::TEXT AS user_agent
FROM audit_log;

GRANT SELECT ON audit_log_masked TO authenticated;
```

### Prevent All Updates/Deletes
```sql
CREATE POLICY audit_log_no_update ON audit_log
    FOR UPDATE
    USING (false);

CREATE POLICY audit_log_no_delete ON audit_log
    FOR DELETE
    USING (false);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

---

## Actions to Audit

### Authentication
- `user_login`
- `user_logout`
- `user_password_reset`
- `user_mfa_enabled`

### Authorization
- `role_assigned`
- `role_revoked`
- `permission_granted`
- `permission_denied`

### Orders
- `order_created`
- `order_assigned`
- `order_completed`
- `order_cancelled`

### Payments
- `payment_initiated`
- `payment_succeeded`
- `payment_failed`
- `refund_issued`

### Content Moderation
- `horoscope_approved`
- `horoscope_rejected`
- `content_flagged`
- `user_blocked`
- `user_unblocked`

### Data Access
- `export_pii_requested`
- `export_pii_completed`
- `dsr_submitted` (Data Subject Request)
- `dsr_fulfilled`
- `invoice_downloaded`

### Configuration
- `rate_limit_adjusted`
- `feature_flag_toggled`
- `webhook_secret_rotated`

---

## Usage Examples

### Python (FastAPI)
```python
async def audit_log_insert(
    action: str,
    resource_type: str,
    resource_id: str,
    actor_id: str,
    actor_role: str,
    metadata: dict = {},
    ip_address: str = None,
    user_agent: str = None,
    legal_basis: str = None
):
    query = """
        INSERT INTO audit_log (
            action, resource_type, resource_id,
            actor_id, actor_role,
            metadata, ip_address, user_agent, legal_basis
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        RETURNING id, seq_num, current_hash
    """

    result = await db.fetch_one(
        query,
        action, resource_type, resource_id,
        actor_id, actor_role,
        json.dumps(metadata), ip_address, user_agent, legal_basis
    )

    return result
```

### Example: Audit Order Creation
```python
@router.post("/orders")
async def create_order(
    order_data: OrderCreate,
    request: Request,
    user: User = Depends(require_auth)
):
    order = await db.insert_order(order_data, user.id)

    await audit_log_insert(
        action='order_created',
        resource_type='order',
        resource_id=order.id,
        actor_id=user.id,
        actor_role=user.role,
        metadata={
            'service_code': order_data.service_code,
            'amount': float(order_data.amount)
        },
        ip_address=request.client.host,
        user_agent=request.headers.get('user-agent')
    )

    return order
```

### Example: Audit PII Export
```python
@router.post("/ops/export")
async def export_data(
    export_req: ExportRequest,
    request: Request,
    user: User = Depends(require_superadmin)
):
    if export_req.include_pii:
        await audit_log_insert(
            action='export_pii_requested',
            resource_type='export',
            resource_id=None,
            actor_id=user.id,
            actor_role=user.role,
            metadata={
                'resource': export_req.resource,
                'date_range': f"{export_req.start_date} to {export_req.end_date}"
            },
            ip_address=request.client.host,
            user_agent=request.headers.get('user-agent'),
            legal_basis=export_req.legal_basis
        )

    export_url = await generate_export(export_req)

    await audit_log_insert(
        action='export_pii_completed',
        resource_type='export',
        resource_id=export_url.split('/')[-1],
        actor_id=user.id,
        actor_role=user.role,
        metadata={'file_size_bytes': export_url.size},
        ip_address=request.client.host
    )

    return export_url
```

---

## Hash Chain Verification

### Verify Entire Chain
```sql
CREATE OR REPLACE FUNCTION verify_audit_chain()
RETURNS TABLE(seq_num BIGINT, hash_valid BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    WITH chain AS (
        SELECT
            seq_num,
            prev_hash,
            current_hash,
            action,
            resource_type,
            resource_id,
            actor_id,
            timestamp
        FROM audit_log
        ORDER BY seq_num
    ),
    computed AS (
        SELECT
            seq_num,
            current_hash AS stored_hash,
            compute_audit_hash(
                seq_num,
                prev_hash,
                action,
                resource_type,
                resource_id,
                actor_id,
                timestamp
            ) AS computed_hash
        FROM chain
    )
    SELECT
        seq_num,
        stored_hash = computed_hash AS hash_valid
    FROM computed;
END;
$$ LANGUAGE plpgsql;
```

### Run Verification
```sql
SELECT * FROM verify_audit_chain() WHERE hash_valid = FALSE;
```

**Expected:** Zero rows (all hashes valid)

---

## Monitoring & Alerts

### Metrics
```python
from prometheus_client import Counter, Gauge

audit_entries_total = Counter(
    'audit_log_entries_total',
    'Total audit log entries',
    ['action', 'resource_type']
)

audit_chain_valid = Gauge(
    'audit_log_chain_valid',
    'Audit log chain integrity (1=valid, 0=broken)'
)
```

### Daily Chain Verification (Scheduled Job)
```python
async def verify_audit_chain_daily():
    result = await db.fetch_all("SELECT * FROM verify_audit_chain() WHERE hash_valid = FALSE")

    if result:
        audit_chain_valid.set(0)
        await alert_critical("Audit log chain broken!")
    else:
        audit_chain_valid.set(1)
```

### Alerts
```yaml
- alert: AuditChainBroken
  expr: audit_log_chain_valid == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Audit log hash chain integrity compromised"
    runbook_url: "https://wiki.example.com/runbooks/audit-chain-broken"

- alert: AuditLogGrowthAnomaly
  expr: rate(audit_entries_total[1h]) > 1000
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Audit log growth rate exceeds 1000 entries/hour"
```

---

## Retention & Archival

### Legal Retention: 7 Years
```sql
CREATE TABLE audit_log_archive (
    LIKE audit_log INCLUDING ALL
);

CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_log_archive
    SELECT * FROM audit_log
    WHERE timestamp < NOW() - INTERVAL '7 years';

    DELETE FROM audit_log
    WHERE timestamp < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;
```

### Cold Storage (S3/Glacier)
```python
async def export_audit_logs_to_cold_storage():
    cutoff_date = datetime.now() - timedelta(days=365)

    logs = await db.fetch_all(
        "SELECT * FROM audit_log WHERE timestamp < $1 ORDER BY seq_num",
        cutoff_date
    )

    s3_key = f"audit-logs/year={cutoff_date.year}.json.gz"
    await s3_client.upload_compressed_json(s3_key, logs)

    await db.execute(
        "DELETE FROM audit_log WHERE timestamp < $1",
        cutoff_date
    )
```

---

## Testing

### Test Hash Chain Integrity
```python
def test_audit_chain_integrity():
    audit_log.insert({
        'action': 'test_action_1',
        'resource_type': 'test',
        'actor_id': 'test-user-1'
    })

    audit_log.insert({
        'action': 'test_action_2',
        'resource_type': 'test',
        'actor_id': 'test-user-2'
    })

    result = db.fetch_all("SELECT * FROM verify_audit_chain() WHERE hash_valid = FALSE")
    assert len(result) == 0, "Audit chain integrity broken"
```

### Test Immutability
```python
def test_audit_log_immutable():
    entry = audit_log.insert({
        'action': 'test_action',
        'resource_type': 'test',
        'actor_id': 'test-user'
    })

    with pytest.raises(Exception):
        db.execute("UPDATE audit_log SET action = 'modified' WHERE id = $1", entry.id)

    with pytest.raises(Exception):
        db.execute("DELETE FROM audit_log WHERE id = $1", entry.id)
```

---

## Compliance

### GDPR Article 30
Audit log satisfies requirement for "records of processing activities"

### SOC 2 Compliance
- Immutability satisfies audit trail requirements
- Hash chain ensures integrity
- RLS prevents unauthorized access

### HIPAA (if applicable)
- Access logging for PHI
- Integrity verification
- Tamper-evident storage

---

## Checklist

- [ ] audit_log table created with hash chain columns
- [ ] Hash computation trigger installed
- [ ] RLS policies enforced (insert-only)
- [ ] All sensitive actions audited
- [ ] Superadmin-only read access
- [ ] Admin sees masked PII view
- [ ] Daily chain verification job scheduled
- [ ] Alerts configured for chain breaks
- [ ] 7-year retention policy documented
- [ ] Cold storage archival implemented
- [ ] Tests verify immutability
- [ ] Tests verify hash chain integrity