# Backend API Alignment Package — SAMIA TAROT (Production)
**Generated:** 2025-08-18 07:36:07 Asia/Beirut

> **Hard rule:** Do NOT touch or change the app theme/branding. Keep code maintainable and short.

This package aligns backend API queries with the **flat public table schema** without changing API contracts or UI.
It uses **Supabase JavaScript client** with per-request auth (JWT) to preserve **RLS**. Admin flows may use Service Role
ONLY where necessary and safe.

## Flat Tables (public schema)
- `tarot_v2_card_selections`
- `tarot_v2_audit_logs`
- `deck_cards`
- `deck_uploads`
- `call_consent_logs`
- `call_emergency_extensions`
- `reader_availability`
- `reader_emergency_requests`
- `reader_availability_overrides`
- `payment_transactions`
- `user_wallets`

## Zero-Downtime Plan
1. Create branch `chore/backend-table-alignment`.
2. Run `scripts/align_tables.sh --dry-run` → review matches.
3. Run `scripts/align_tables.sh` → generates `.bak` backups.
4. Adopt central table constants: `src/db/tables.ts` (no hardcoded names).
5. Swap repositories to examples in `src/repos/` (incremental).
6. Tests → Staging smoke → Canary 10% → 25% → 50% → 100%.
7. (Optional) Apply `db/compat_views.sql` for instant rollback safety.

## Security
- Per-request Supabase client with **user JWT** ⇒ **RLS enforced**.
- Admin/SA actions can use **Service Role** with extreme caution (server-side only).
- AI drafts **never** exposed to clients; routes must validate role before querying.

## Feature Flags (expected defaults)
- `calls.video = OFF`
- `billing.emergencyProgressivePricing = OFF`
- `ui.rtlRefine = ON`, `uploads.deckBulk = ON`, `feature.readerInstant = ON`, `feature.emergencyExtension = ON`, `feature.tarotV2 = ON`, `feature.dailyZodiac = ON`

## Run
```bash
bash scripts/align_tables.sh --dry-run
bash scripts/align_tables.sh
# (optional) psql -f db/compat_views.sql
```
