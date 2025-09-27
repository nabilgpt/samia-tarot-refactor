# RLS Parity Testing Framework

## Overview
This document defines the testing framework to ensure Row-Level Security (RLS) policies in PostgreSQL match the route guards in the application.

## Core Principle
**Database-first security:** RLS policies must deny unauthorized access even if route guards are misconfigured.

## Test Categories

### 1. Daily Horoscopes (Public Access)
**Policy:** Public users can only access today's approved daily horoscopes

**Tests:**
```sql
-- Should PASS: Fetch today's approved daily horoscope as anonymous
SELECT * FROM horoscopes
WHERE scope = 'daily'
  AND DATE(ref_date) = CURRENT_DATE
  AND approved_at IS NOT NULL;

-- Should FAIL: Fetch yesterday's horoscope as anonymous
SELECT * FROM horoscopes
WHERE scope = 'daily'
  AND DATE(ref_date) = CURRENT_DATE - 1;

-- Should FAIL: Fetch unapproved horoscope as anonymous
SELECT * FROM horoscopes
WHERE scope = 'daily'
  AND approved_at IS NULL;
```

### 2. Orders (Role-Based Access)
**Policy:** Clients see only their own orders; readers see only assigned orders; admins see all

**Tests:**
```sql
-- Should PASS: Client reads own order
SET LOCAL jwt.claims.sub = 'client-user-id';
SELECT * FROM orders WHERE user_id = 'client-user-id';

-- Should FAIL: Client reads another user's order
SET LOCAL jwt.claims.sub = 'client-user-id';
SELECT * FROM orders WHERE user_id = 'other-user-id';

-- Should PASS: Reader reads assigned order
SET LOCAL jwt.claims.sub = 'reader-user-id';
SELECT * FROM orders WHERE assigned_to = 'reader-user-id';

-- Should FAIL: Reader reads unassigned order
SET LOCAL jwt.claims.sub = 'reader-user-id';
SELECT * FROM orders WHERE assigned_to IS NULL OR assigned_to != 'reader-user-id';
```

### 3. Media Assets (Private Storage)
**Policy:** All media requires authentication; access controlled by order/horoscope ownership

**Tests:**
```sql
-- Should PASS: Client accesses media for their own order
SET LOCAL jwt.claims.sub = 'client-user-id';
SELECT * FROM media_assets
WHERE order_id IN (SELECT id FROM orders WHERE user_id = 'client-user-id');

-- Should FAIL: Client accesses media for another user's order
SET LOCAL jwt.claims.sub = 'client-user-id';
SELECT * FROM media_assets
WHERE order_id IN (SELECT id FROM orders WHERE user_id = 'other-user-id');
```

### 4. Audit Log (Superadmin Only)
**Policy:** Only superadmins can read audit logs; PII masked for admin

**Tests:**
```sql
-- Should PASS: Superadmin reads raw audit log
SET LOCAL jwt.claims.role = 'superadmin';
SELECT * FROM audit_log;

-- Should FAIL: Admin reads audit log (or receives masked version)
SET LOCAL jwt.claims.role = 'admin';
SELECT * FROM audit_log; -- Should return masked PII or fail

-- Should FAIL: Client reads audit log
SET LOCAL jwt.claims.role = 'client';
SELECT * FROM audit_log;
```

## Implementation Checklist

- [ ] Create SQL test suite in `sql/tests/rls_parity_tests.sql`
- [ ] Add test runner script: `python scripts/test_rls.py`
- [ ] Integrate into CI/CD pipeline (run before deploy)
- [ ] Add test coverage for all tables with RLS policies
- [ ] Document expected outcomes for each test case

## Running Tests

```bash
# Run all RLS parity tests
python scripts/test_rls.py

# Run specific category
python scripts/test_rls.py --category horoscopes

# Verbose output
python scripts/test_rls.py --verbose
```

## Success Criteria

✅ All unauthorized access attempts return zero rows or explicit errors
✅ Authorized access returns expected data only
✅ Tests pass consistently across environments
✅ Route guards mirror DB policies (documented in code comments)

## Maintenance

- Run tests on every schema migration
- Update tests when adding new tables or RLS policies
- Review quarterly for policy drift
- Add new test cases for discovered edge cases