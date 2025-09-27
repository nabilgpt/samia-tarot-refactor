# 🧪 SAMIA‑TAROT — Local Run & Smoke Test Guide
_Last updated: 2025-09-13 12:01:41Z_

> Goal: run the backend locally, apply migrations, seed minimal data, and execute smoke tests — **without** changing the theme/UX. Keep code small & maintainable.

## 0) Prereqs
- Python 3.11+ (or 3.10 if project pins it), `pip`/`poetry`, `virtualenv`
- PostgreSQL 14+ (local) or a test Supabase project
- `ffmpeg` (for audio ops if needed), `openssl` (for HMAC tests)
- (Optional) Docker for one‑shot Postgres

## 1) Environment
Create `.env.local` from this template:
```
APP_ENV=local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/samia_tarot
JWT_SECRET=dev_secret_change_me
PAY_PROVIDER=stripe
STRIPE_SECRET=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SIGNED_URL_DEFAULT_TTL_MIN=15
SIGNED_URL_TTL_WHITELIST=invoice:60,dsr_export:30
STORAGE_BUCKET_PRIVATE=media-private
```
> Policy: **DB‑first RLS**, **Private storage + short‑lived Signed URLs**, **no TikTok ingestion**.

## 2) Database
- Start Postgres (Docker):
```
docker run --name samia-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
```
- Apply migrations (order matters):
```
python migrate.py audit
python migrate.py up
```
(Ensure `009_remove_tiktok.sql` is included.)

## 3) Run API
```
uvicorn api:app --reload --port 8000
```
Check:
- `GET /api/ops/health` → 200
- `GET /api/horoscopes/daily` → only **today+approved**
- Payments webhook:
```
curl -X POST http://localhost:8000/api/payments/webhook -H "Stripe-Signature: invalid" -d '{}'
# expect 400 and audit signature_valid=false
```

## 4) Tests (must pass)
```
pytest -q -k "hardening or tiktok or payments or horoscopes"
```
- `test_security_hardening.py` — TTL policy, expired URL denial, webhook HMAC, idempotency
- `test_tiktok_rejection.py` — legacy 410/404, DB rejection of TikTok URLs

## 5) Store Checks
- Fill screenshots per `store_screenshots_spec.md`
- Publish TestFlight/Play Internal
- Run:
```
bash run_store_validation.sh
```
Archive PASS evidence and link it in Admin (link‑only, no UI changes).

## 6) Done
Once synthetics are PASS and screenshots are uploaded, flip M39 → **Verified** in Master.
