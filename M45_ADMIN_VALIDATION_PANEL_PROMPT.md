> **Global Prompt Preamble (MUST run first):**
> Before doing anything, read the ENTIRE files and confirm alignment:
> - C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-MASTER-M1-M46.md
> - C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-MASTER-M1-M46 2.md
> Do NOT touch or change the theme/UX (unless creating a NEW page — it MUST match the theme). Keep the code maintainable & short.

### Task — M45 Admin Links-Only Validation Panel (surgical)
1) Backend
   - Add endpoints:
     - GET /api/admin/store-validation/summary (admin-only)
     - POST /api/admin/store-validation/summary (admin-only)
   - Persist to `app_settings` with keys: `store.validation.last_run`, `store.validation.links`.
   - Enforce Admin-only guards and DB-first RLS (if applicable). Everything must be **audit-logged**.

2) Frontend (links-only, no styling changes)
   - Reuse existing Admin container/layout and typography.
   - Render:
     - Last run: PASS/FAIL/NONE with timestamps
     - Links: TestFlight, Play Internal
   - If missing → show “No artifacts yet” (text only).
   - **Do not** import new UI libs or change theme variables.

3) Observability
   - Add counters to `/api/ops/metrics`: store_validation_reads_total, store_validation_updates_total.

4) Tests (short)
   - Non-admin → 403
   - GET returns schema-compliant JSON
   - POST rejects invalid schema; accepts valid; increments metrics; audit entries present

5) Deliverables
   - Small PR with backend+frontend changes
   - Evidence screenshot (panel) attached in Admin (link-only); no style diffs
   - Update Master: mark M45 **DELIVERED** with a one-line changelog.
