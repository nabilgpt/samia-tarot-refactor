# 🚀 SAMIA‑TAROT — Store Readiness Verification Report (v2)
**Status**: Ready for Submission — **pending** screenshots upload + post‑publish synthetics  
**Date**: 2025-09-13  
**Modules**: M14/M15 Security Hardening + M39 Mobile Packaging

---

## What’s done
- **Security hardening (Prompt A)**: TTL ≤15m default + whitelist (invoice 60m, dsr_export 30m) with audit; unified `/api/payments/webhook` dispatcher with HMAC; idempotent payment intents; 503 guards.
- **TikTok legacy**: eradicated (code, schema, env, docs) + negative tests (410/404 + DB rejection).
- **M39 packaging**: PrivacyInfo.xcprivacy (iOS 2025), Play Data Safety, account deletion (in‑app + web), EN/AR store texts (RTL), TestFlight/Play Internal pipelines.

## Acceptance Gates (PASS/NEAR‑PASS)
| Gate | Criteria | Status |
|------|---------|--------|
| Public Daily Horoscopes | today + approved only (RLS parity) | PASS |
| Media/Invoices Access | Private buckets + short‑lived Signed URLs (≤15m default) | PASS |
| Payments | Intent → Webhook(HMAC) → Invoice (private) | PASS |
| Notifications | Templates/Prefs/Rate‑limits + 503 guards | PASS |
| Tests | Hardening + Rejection suites passing | PASS |
| Stores | **Screenshots uploaded to App Store Connect & Play Console** | **PENDING** |
| Synthetics | `run_store_validation.sh` PASS after TestFlight/Play Internal | **PENDING** |

## To‑Do → 100%
1) Upload **all screenshots** (iPhone/iPad/Android phones/tablets) per `store_screenshots_spec.md`.  
2) Publish **TestFlight** + **Play Internal**.  
3) Run `run_store_validation.sh` (health/login/horoscopes policy/payments) and archive PASS evidence.  
4) Flip M39 in Master: “Verified” after evidence is attached (links only; no UI changes).

## Notes
- No theme/UX changes. Code remains maintainable & short.
- Keep invoice/DSR TTL overrides **config‑driven** and monitored in audit logs.
