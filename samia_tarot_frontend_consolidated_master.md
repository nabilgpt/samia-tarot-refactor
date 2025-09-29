# SAMIA TAROT — Frontend (Consolidated Master)

*Version: 2025‑09‑28*

> Scope: The authoritative frontend context for the 5 apps (Client, Reader, Monitor, Admin, Super‑Admin). Covers navigation, flows, i18n & RTL/LTR, realtime UX, payments UI, daily zodiac UI, accessibility/performance, build/structure, packaging, and prompts. **No theme constraints; evolve UI freely.**

---

## 0) Principles

- One codebase → **5 PWAs**. Mobile via **Capacitor**: **Client** packaged standalone; **Back‑Office** (Reader/Admin/Monitor/Super‑Admin) packaged as one app.
- **Short & maintainable**: minimal components, clear contracts, reusable libs.
- **No secrets in FE**. All provider calls go through Edge Functions.

---

## 1) Monorepo & FE Folders

```
/ (repo root)
  /apps
    /client          # PWA + Capacitor target
    /reader          # PWA (Back‑Office pack)
    /monitor         # PWA (Back‑Office pack)
    /admin           # PWA (Back‑Office pack)
    /superadmin      # PWA (Back‑Office pack)
  /libs
    /ui-kit          # shared components (buttons, modals, forms, cards)
    /auth            # FE auth flows (OTP UI, passkeys, MFA)
    /payments        # UI adapters (Stripe/Square), wallet/redeem, idempotent UX
    /realtime        # LiveKit room hooks, DataChannel/WS fallback utils
    /i18n            # i18next config, dir helpers, locale switch
    /zodiac          # card/modal, signed URL fetcher, SW refresh helpers
    /utils           # general helpers (zodiac from DOB, phone formatting)
```

> **Do not create files outside this structure without approval.**

---

## 2) App Navigation (high‑level)

### Client

Home (Daily Zodiac) · Explore Readers · Book (Async/Live/Immediate) · My Sessions · Wallet & Payments · Support · Profile

### Reader (Back‑Office)

My Schedule · My Services · Sessions · Inbox/Chat/Voice · AI Assistant (private) · Earnings & Wallet · Compliance Tips

### Monitor (Back‑Office)

Live Surveillance · Alerts & Flags · Approval Queue · Incidents · Quality Analytics

### Admin (Back‑Office)

Operations · Users · Services & Catalog · Readers · Payments · Moderation · Reports

### Super‑Admin (Back‑Office)

Overview · Users & Roles · Providers & Secrets · Payments Orchestration · Content & Services · Compliance & Privacy · Observability · Emergency Control

---

## 3) Auth UI — Sign‑Up & Login

- **Mandatory fields**: first/last, gender, marital status, email, WhatsApp (E.164, auto country code), country, time zone/city, DOB (autofill **zodiac**), language.
- **Dual verification**: Email (OTP/magic link) + WhatsApp OTP; **fallback SMS** if WA fails.
- **Passkeys**: offer at login & after signup (client optional; staff recommended).
- **MFA (staff)**: enforce TOTP/WebAuthn enrollment on first login.
- **Throttling/Lockout**: 5 attempts/10m → 15m lockout.
- **Age gate**: ≥18 before proceeding.

### UI niceties

- Phone input with libphonenumber formatting.
- If country has a single time zone, auto‑fill and hide City; else show City/Timezone selector.
- DOB → compute zodiac (tropical ranges) and show read‑only badge.

---

## 4) Daily Zodiac — FE Behavior (KSA boundary)

- **Home shows ONE card**: the user’s own sign, in current language.
- Tapping opens **Modal**: full text + **Play** button. **No autoplay**.
- **Signed URL**: fetched via `/zodiac/audio-url`; FE sets an expiry refresh aligned with **KSA midnight**.
- **Service Worker**: cache today’s response up to 24h; revalidate after KSA midnight.
- **RTL/LTR**: flip via `dir` or `:dir()`; switch content on language toggle.

---

## 5) Payments UI (Always‑USD)

- Show USD price + optional **≈local FX** (display‑only with timestamp).
- **Cards**: Stripe UI components first; if two consecutive failures in session → prompt and auto‑switch to Square UI.
- **USDT**: show the selected network (TRC20). Display address/memo with copy, QR, and confirmation count hint.
- **Manual remittances**: guided upload (image/PDF), progress, and status badge (pending → approved/rejected).
- **Wallet/Rewards**: show available store credit and redeemable points; apply as discount; reflect final USD.

**UX safeguards**

- All submits carry an **Idempotency‑Key** (uuid v4) stored per checkout attempt.
- A receipts screen shows final USD and (≈local FX at display time).

---

## 6) Realtime UX (Calls / Live Tarot)

- Join/Host buttons with state machine: `connecting → in-room → ending`.
- **DataChannel** sync for tarot/runes reveal (client‑driven/auto‑draw/free‑pick); **WS fallback** with seq/ack.
- Call controls: mute/cam/share, end, and “share spread”.
- Recordings are server‑side; FE only shows status and links to history when available.

---

## 7) i18n (FE)

- i18next with `locale` propagation; fallback to source.
- **Directionality**: apply `dir="rtl"` for Arabic; use logical CSS and `:dir()` selectors.
- Admin UI includes translation override screens (read‑only in FE; edits go through backend endpoints).

---

## 8) Accessibility & Performance

- Modal: focus trap, ARIA labels, Escape to close, scroll locking.
- Forms: labels/ids, error summaries, keyboard navigability.
- **IntersectionObserver** to lazy‑load media; prefetch next views conservatively.
- Avoid heavy bundles; code‑split routes; cache HTTP aggressively for static assets.

---

## 9) Build, Packaging & CI

- **Nx** for task graph & caching; per‑app builds.
- **PWA**: manifest/icons; install prompts; offline fallbacks.
- **Capacitor**: package **Client** as a standalone mobile app; **Back‑Office** as a separate mobile app. Android via FCM; iOS via APNs.
- **CI**: typecheck, lint, unit tests (no mocks for data—use staging), build, and bundle‑size guard.

---

## 10) Frontend Prompts

> **Always add:** “Keep code maintainable & short. Do not create files not listed in the context without approval.”

- **P‑FE‑AUTH‑01** — *Sign‑Up Form* "Build a signup form with mandatory fields (first/last, gender, marital status, email, WhatsApp E.164 with auto country code, country, time zone/city, DOB→zodiac, language). Implement dual verification (email + WhatsApp, SMS fallback). Keep code maintainable & short."

- **P‑FE‑ZOD‑01** — *Home Zodiac Card* "Render a single zodiac card (user’s sign). On tap, open a modal with full text and a Play button. No autoplay. Fetch signed audio URL via `/zodiac/audio-url` and refresh at KSA midnight. Keep code maintainable & short."

- **P‑FE‑PAY‑01** — *Checkout with Auto‑Switch* "Implement USD checkout with Stripe first; after two consecutive failures in the same session, switch to Square seamlessly. Include FX display (approximate). Use an Idempotency‑Key per attempt. Keep code maintainable & short."

- **P‑FE‑RTC‑01** — *Live Tarot Sync* "Sync tarot/runes reveal over RTCDataChannel with ordered WS fallback and UI indicators. Keep code maintainable & short."

- **P‑FE‑A11Y‑01** — *Modal Accessibility* "Modal must trap focus, provide ARIA labels, close on Escape, and restore focus. Keep code maintainable & short."

