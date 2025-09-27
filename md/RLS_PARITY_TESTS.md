# RLS Parity Tests - Database-First Security Verification

## Overview
Ensure Row-Level Security (RLS) policies in the database match or exceed route guard restrictions. Database MUST deny unauthorized access even if route guards fail or are misconfigured.

## Test Philosophy: Deny-by-Default

**Critical Principle:** If RLS allows something that route guards block, that's acceptable (defense in depth). If RLS denies something that route guards allow, **that's a security hole**.

The database is the **single source of truth** for authorization.

---

## Test Categories

### 1. Horoscopes (Daily) - Public Access

#### Test: Public sees today-only approved horoscopes
```sql
-- Setup: Create test data
INSERT INTO horoscopes (id, scope, zodiac_sign, approved_at, created_at)
VALUES
  ('today-approved', 'daily', 'aries', NOW(), NOW()),
  ('today-pending', 'daily', 'taurus', NULL, NOW()),
  ('yesterday-approved', 'daily', 'gemini', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- Test: Anonymous user (no auth)
SET ROLE anon;

SELECT id FROM horoscopes WHERE scope = 'daily';
-- Expected: Only 'today-approved'
-- Actual result should contain 1 row

SELECT id FROM horoscopes WHERE id = 'today-pending';
-- Expected: 0 rows (not approved)

SELECT id FROM horoscopes WHERE id = 'yesterday-approved';
-- Expected: 0 rows (not today)
```

#### Test: Internal users see ≤60 days
```sql
-- Setup: Create old horoscope
INSERT INTO horoscopes (id, scope, zodiac_sign, approved_at, created_at)
VALUES ('old-horoscope', 'daily', 'leo', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days');

-- Test: Reader role
SET ROLE reader;
SET request.jwt.claim.user_id = 'reader-uuid';
SET request.jwt.claim.role = 'reader';

SELECT id FROM horoscopes WHERE created_at > NOW() - INTERVAL '60 days';
-- Expected: Should NOT include 'old-horoscope'

SELECT id FROM horoscopes WHERE created_at > NOW() - INTERVAL '30 days';
-- Expected: Should include recent horoscopes
```

---

### 2. Orders - Client Ownership

#### Test: Client sees only own orders
```sql
-- Setup
INSERT INTO orders (id, user_id, service_code, status)
VALUES
  ('order-1', 'client-a-uuid', 'tarot_basic', 'completed'),
  ('order-2', 'client-b-uuid', 'astrology', 'pending');

-- Test: Client A
SET ROLE authenticated;
SET request.jwt.claim.user_id = 'client-a-uuid';
SET request.jwt.claim.role = 'client';

SELECT id FROM orders;
-- Expected: Only 'order-1'

SELECT id FROM orders WHERE id = 'order-2';
-- Expected: 0 rows (belongs to client B)
```

#### Test: Reader sees only assigned orders
```sql
-- Setup
INSERT INTO orders (id, user_id, reader_id, service_code, status)
VALUES
  ('order-3', 'client-c-uuid', 'reader-x-uuid', 'tarot_basic', 'in_progress'),
  ('order-4', 'client-d-uuid', 'reader-y-uuid', 'astrology', 'in_progress');

-- Test: Reader X
SET ROLE authenticated;
SET request.jwt.claim.user_id = 'reader-x-uuid';
SET request.jwt.claim.role = 'reader';

SELECT id FROM orders;
-- Expected: Only 'order-3'

SELECT id FROM orders WHERE id = 'order-4';
-- Expected: 0 rows (assigned to reader Y)
```

---

### 3. Media Assets - Signed URLs Only

#### Test: Direct storage access denied
```sql
-- Setup
INSERT INTO media_assets (id, order_id, storage_path, media_type)
VALUES ('media-1', 'order-1', 'readings/order-1-audio.mp3', 'audio');

-- Test: Client tries direct read
SET ROLE authenticated;
SET request.jwt.claim.user_id = 'client-a-uuid';
SET request.jwt.claim.role = 'client';

SELECT storage_path FROM media_assets WHERE id = 'media-1';
-- Expected: Column 'storage_path' should be NULL or access denied
-- RLS MUST hide storage_path; only server issues signed URLs
```

#### Test: Signed URL generation is server-only
```sql
-- Test: Client cannot call create_signed_url function
SET ROLE authenticated;
SET request.jwt.claim.user_id = 'client-a-uuid';
SET request.jwt.claim.role = 'client';

SELECT create_signed_url('private-media', 'readings/order-1-audio.mp3', 900);
-- Expected: Permission denied or function does not exist for this role
```

---

### 4. Payment Intents - User Isolation

#### Test: Client sees only own payment intents
```sql
-- Setup
INSERT INTO payment_intents (id, order_id, user_id, amount, currency, status)
VALUES
  ('pi-1', 'order-1', 'client-a-uuid', 25.00, 'USD', 'succeeded'),
  ('pi-2', 'order-2', 'client-b-uuid', 35.00, 'USD', 'pending');

-- Test: Client A
SET ROLE authenticated;
SET request.jwt.claim.user_id = 'client-a-uuid';
SET request.jwt.claim.role = 'client';

SELECT id FROM payment_intents;
-- Expected: Only 'pi-1'

SELECT id FROM payment_intents WHERE id = 'pi-2';
-- Expected: 0 rows
```

---

### 5. Invoices - Signed URLs Only

#### Test: Invoice access via Signed URL only
```sql
-- Setup
INSERT INTO invoices (id, order_id, user_id, storage_path, amount)
VALUES ('inv-1', 'order-1', 'client-a-uuid', 'invoices/inv-1.pdf', 25.00);

-- Test: Client tries direct read
SET ROLE authenticated;
SET request.jwt.claim.user_id = 'client-a-uuid';
SET request.jwt.claim.role = 'client';

SELECT storage_path FROM invoices WHERE id = 'inv-1';
-- Expected: Column 'storage_path' hidden or denied
-- Server must issue signed URL via /api/payments/invoice/{order_id}
```

---

### 6. Audit Log - Superadmin Only

#### Test: Superadmin can read, no one else
```sql
-- Setup
INSERT INTO audit_log (action, resource_type, resource_id, actor_id, actor_role)
VALUES ('order_created', 'order', 'order-1', 'client-a-uuid', 'client');

-- Test: Client cannot read
SET ROLE authenticated;
SET request.jwt.claim.user_id = 'client-a-uuid';
SET request.jwt.claim.role = 'client';

SELECT * FROM audit_log;
-- Expected: 0 rows or permission denied

-- Test: Admin sees masked view
SET request.jwt.claim.role = 'admin';

SELECT * FROM audit_log_masked;
-- Expected: Allowed, but PII fields redacted

-- Test: Superadmin sees all
SET request.jwt.claim.role = 'superadmin';

SELECT * FROM audit_log;
-- Expected: Full access
```

#### Test: No updates or deletes allowed
```sql
SET ROLE authenticated;
SET request.jwt.claim.role = 'superadmin';

UPDATE audit_log SET action = 'modified' WHERE id = 'audit-1';
-- Expected: Permission denied

DELETE FROM audit_log WHERE id = 'audit-1';
-- Expected: Permission denied
```

---

### 7. Blocked Profiles - Monitor/Admin Only

#### Test: Client cannot see blocked list
```sql
-- Setup
INSERT INTO blocked_profiles (id, user_id, blocked_by, reason)
VALUES ('block-1', 'bad-user-uuid', 'monitor-uuid', 'Spam');

-- Test: Client
SET ROLE authenticated;
SET request.jwt.claim.user_id = 'client-a-uuid';
SET request.jwt.claim.role = 'client';

SELECT * FROM blocked_profiles;
-- Expected: 0 rows

-- Test: Monitor can read
SET request.jwt.claim.role = 'monitor';

SELECT * FROM blocked_profiles;
-- Expected: All rows visible
```

---

## Automated Test Framework (Python/pytest)

```python
import pytest
import psycopg2

@pytest.fixture
def db_connection():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    yield conn
    conn.close()

def set_role(conn, role, user_id=None):
    cursor = conn.cursor()
    cursor.execute(f"SET ROLE {role};")
    if user_id:
        cursor.execute(f"SET request.jwt.claim.user_id = '{user_id}';")
        cursor.execute(f"SET request.jwt.claim.role = '{role}';")
    conn.commit()

def test_public_sees_today_only(db_connection):
    set_role(db_connection, 'anon')
    cursor = db_connection.cursor()
    cursor.execute("SELECT id FROM horoscopes WHERE scope = 'daily'")
    results = cursor.fetchall()

    assert len(results) >= 1, "Public should see at least one today-approved horoscope"

    cursor.execute("SELECT id FROM horoscopes WHERE created_at < NOW() - INTERVAL '1 day'")
    old_results = cursor.fetchall()

    assert len(old_results) == 0, "Public should NOT see horoscopes older than today"

def test_client_sees_only_own_orders(db_connection):
    set_role(db_connection, 'authenticated', 'client-a-uuid')
    cursor = db_connection.cursor()
    cursor.execute("SELECT id FROM orders")
    results = cursor.fetchall()

    for row in results:
        cursor.execute("SELECT user_id FROM orders WHERE id = %s", (row[0],))
        user_id = cursor.fetchone()[0]
        assert user_id == 'client-a-uuid', "Client should only see own orders"

def test_storage_path_hidden_from_clients(db_connection):
    set_role(db_connection, 'authenticated', 'client-a-uuid')
    cursor = db_connection.cursor()

    try:
        cursor.execute("SELECT storage_path FROM media_assets LIMIT 1")
        result = cursor.fetchone()
        assert result is None or result[0] is None, "storage_path should be hidden"
    except psycopg2.ProgrammingError:
        pass

def test_audit_log_immutable(db_connection):
    set_role(db_connection, 'authenticated', 'superadmin-uuid')
    cursor = db_connection.cursor()

    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        cursor.execute("UPDATE audit_log SET action = 'modified' WHERE id = 'audit-1'")

    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        cursor.execute("DELETE FROM audit_log WHERE id = 'audit-1'")
```

---

## CI/CD Integration

### Add to CI Pipeline
```yaml
name: RLS Parity Tests

on: [push, pull_request]

jobs:
  rls-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install pytest psycopg2-binary
      - name: Run RLS parity tests
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
        run: |
          pytest tests/rls_parity_tests.py -v
```

---

## Acceptance Criteria

- [ ] Public `/api/horoscopes/daily` returns today-only approved
- [ ] Database denies direct reads of `storage_path` columns
- [ ] Clients see only own orders (RLS enforced)
- [ ] Readers see only assigned orders (RLS enforced)
- [ ] Audit log is append-only (no UPDATE/DELETE)
- [ ] Superadmin-only access to raw audit log
- [ ] Admin sees masked PII view only
- [ ] CI pipeline runs RLS parity tests on every PR
- [ ] All RLS tests pass before merge

---

## References

- **Supabase RLS:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **OWASP Database Security:** https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html