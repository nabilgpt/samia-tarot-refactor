# M45 — Admin Links-Only Validation Panel (Spec)
_Last updated: 2025-09-13 13:18:56Z_

## Goal
Add a **read-only, links-only** panel under Admin that shows:
- **Last validation run** for `run_store_validation.sh` (PASS/FAIL + timestamp)
- Links to **TestFlight** (latest build) and **Google Play Internal** (latest track)
- **No theme/UX changes**. Use existing components/layout. Code must be **maintainable & short**.

## Data Model (Option A: Settings Table)
Use existing `app_settings` key-value store:
- Key: `store.validation.last_run` → JSON payload (see schema)
- Key: `store.validation.links` → JSON payload (see schema)

## JSON Schema
```json
{
  "last_run": {
    "status": "PASS|FAIL|NONE",
    "started_at": "ISO8601",
    "finished_at": "ISO8601",
    "notes": "string"
  },
  "links": {
    "testflight": "https://...",
    "play_internal": "https://..."
  }
}
```

## Endpoints (Admin-only)
- `GET /api/admin/store-validation/summary` → returns the JSON above
- `POST /api/admin/store-validation/summary` → upsert same JSON (Admin only)
  - 400 if payload fails schema
  - 503 if secrets/config missing

## Security
- **RLS-first** on `app_settings` if table is RLS-protected; otherwise, database function with role checks.
- Route guards: Admin-only; all access **audit-logged** (who/when/what).

## Frontend Contract (Links-only)
- Reuse Admin page container and existing typography components
- Render 3 fields:
  1) `Last run: PASS|FAIL|NONE` with timestamp
  2) Link: `TestFlight`
  3) Link: `Play Internal`
- Show “No artifacts yet” when missing.

## Observability
Expose counters via `/api/ops/metrics`:
- `store_validation_updates_total`
- `store_validation_reads_total`

## Tests (Short)
- Non-admin → 403
- GET returns well-formed JSON matching schema
- POST rejects invalid schema; accepts valid payload
- Metrics counters increment
- Audit log contains read/write events

## Acceptance
- Panel shows last validation and two links (links only, no new styles)
- Admin-only access enforced
- Code diff is minimal; no theme changes
