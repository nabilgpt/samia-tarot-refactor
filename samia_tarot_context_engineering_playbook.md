# SAMIA TAROT — Context Engineering Playbook

> **Golden rule:** Do **not** change the existing Theme/UX. Any **new** page must exactly match the current **cosmic/neon** theme. Copy the theme **as-is** from the Windows project: `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`. Keep all code **maintainable & short**. **Repository hygiene (MANDATORY):** Don’t flood the repo — **no 1000 files**. Keep the number of code files **as low as possible**. Prefer a single service, flat structure, and **small, clear, maintainable** modules/components. Avoid over‑scaffolding, deep nesting, and unnecessary abstractions.

---

## 0) TL;DR (Executive Summary)

- Backend is strong and nearly complete: DB + routes + security + payments + notifications + ops.
- Main gap: **Frontend** (primary React app + Admin/Monitor dashboards) and productionization (CI/CD, containers).
- Close 4 critical ops/security items: RLS gaps, default ≤15m Signed URL TTL, webhook timing‑safe HMAC, and standardized error schema.
- Six‑phase plan to reach 100% with acceptance criteria per phase.

---

## 1) Architecture Overview

- **Backend:** FastAPI (single service) + psycopg2 pooling (SQL‑first, no ORM). JWT guards and role checks.
- **DB:** PostgreSQL (Supabase Session Pooler). Extensions: pgcrypto, (optional pgvector for KB).
- **Storage:** Supabase Buckets **Private‑only** + short‑lived Signed URLs.
- **Jobs/Automations:** n8n (timers/webhooks) + optional internal AI (server‑side only).
- **Voice/Calls:** Twilio webhooks (HMAC + IP allowlisting).
- **Observability:** `/api/ops/health|snapshot|metrics` + Golden Signals + Alerts.
- **Frontend:** API consumer only. **Do not alter** Theme/UX. Every new page must use the exact tokens/spacing/radius/neon accents from the Windows project path.

**Risk Notes**

- Public UI is missing → we must bind cleanly to existing APIs without touching the theme.
- Multi‑provider comms/payments require circuit breakers + consistent `503` guards.

---

## 2) Roles & Permissions (RBAC)

- Roles: `client, reader, monitor, admin, superadmin`.
- **Least Privilege** and strict **RLS parity**: no endpoint may exceed DB policies.

**Role Capabilities**

- Client: create orders, receive deliveries, invoices via Signed URL.
- Reader: see assigned orders only, upload audio, use internal assist tools.
- Monitor: approve/reject content, drop live calls, block profiles.
- Admin: manage users, unblock, ops snapshots/exports, adjust rate limits.
- Superadmin: full access + raw PII (with legal justification) + sensitive changes.

---

## 3) Data Model (ERD – condensed)

**Core:** roles, profiles, services, orders, order\_events, media\_assets

**Horoscopes:** horoscopes, (approvals inline via `approved_at/by` or a separate table)

**Calls:** calls, call\_events

**Security/Moderation:** moderation\_actions, blocked\_profiles, audit\_log (hash‑chained), api\_rate\_limits, app\_settings

**Payments:** payment\_intents, payment\_events, invoices, refunds, promo\_codes

**Notifications:** notif\_templates, notif\_prefs, notif\_log

**Knowledge Base (optional):** kb\_docs, kb\_chunks (pgvector)

**Storage Policy:** Private buckets only; access via short‑lived Signed URLs ≤15 minutes, centrally enforced.

---

## 4) RLS & Retention (Daily Horoscopes)

- Public: **today only** + **approved** items.
- Internal (reader/admin/superadmin): access to **≤60 days** via server‑issued short‑lived Signed URLs.
- `>60` days: **hard‑delete** from DB and Storage by scheduled job (cron/n8n).
- Route guards must mirror RLS exactly (**parity tests required**).

**Checks to close**

- Ensure all policies active; no broad selects that bypass `scope/time` constraints.
- Add indexes on predicates (`scope, zodiac, ref_date`).

---

## 5) API Surface (Operational Route Map)

### Auth & Verify

- `POST /api/auth/sync` — sync user/role
- `POST /api/verify/phone` — OTP via Twilio (rate‑limited)

### Profiles & Meta

- `GET /api/meta/countries`, `GET /api/meta/zodiacs`
- `POST /api/profile/complete` — compute zodiac from DOB

### Orders Workflow

- `POST /api/orders` (create)
- `GET /api/orders/{id}` (details)
- `POST /api/orders/{id}/assign` (admin)
- `POST /api/orders/{id}/result` (reader uploads audio)
- `POST /api/orders/{id}/approve|reject` (monitor)
- `POST /api/orders/{id}/deliver` (finalize + notify)

### Horoscopes

- `POST /api/horoscopes/ingest` (admin‑only upload)
- `POST /api/horoscopes/{id}/approve|reject` (monitor)
- `GET /api/horoscopes/daily` (Public: today only)
- `GET /api/horoscopes/{id}/media` (Internal via Signed URL)

### Calls (Twilio)

- `POST /api/calls/schedule`
- `POST /api/calls/initiate`
- `POST /api/calls/terminate` (monitor/admin)
- `POST /api/calls/webhook` (HMAC + allowlist)

### Payments (M14)

- `POST /api/payments/intent` (client)
- `POST /api/payments/webhook` (public, HMAC verify)
- `POST /api/payments/refund` (admin/superadmin)
- `GET /api/payments/invoice/{order_id}` (Signed URL)

### Notifications (M15)

- `POST /api/notifs/templates/upsert` (admin)
- `POST /api/notifs/send` (internal triggers)
- `GET/POST /api/notifs/prefs`

### Assist (Internal)

- `POST /api/assist/draft`, `POST /api/assist/search`, `POST /api/assist/knowledge/upsert`

### Moderation

- `POST /api/moderation/block|unblock`
- `POST /api/moderation/review`

### Ops

- `GET /api/ops/health`, `/snapshot`, `/metrics`
- `POST /api/ops/export`

---

## 6) Core Workflows

- **Order lifecycle:** client → assign → reader upload → monitor approve → deliver (+notifications).
- **Daily Horoscope:** admin upload → monitor approval → public (today only) → retention purge at 60 days.
- **Calls:** schedule/initiate/terminate (monitor can drop) + audit trail.
- **Payments:** intent → webhook state transitions → invoice PDF (private) → Signed URL delivery to client.
- **Notifications:** event‑driven (order states, payment outcomes, call reminders, emergencies).
- **DSR/GDPR:** export/delete via dedicated service + audit + grace windows.

---

## 7) Observability & Ops

- **Golden Signals:** latency, errors, traffic, saturation.
- **429 discipline:** always include `Retry-After`; expose counters in `/api/ops/metrics`.
- Alerts wired to SLOs + synthetic probes for public endpoints and webhooks.
- Runbooks: health/snapshot/metrics usage + migrate.py (audit|up).

---

## 8) Security & Compliance (18+)

- Age gate 18+, consent management, COPPA safeguards.
- **Immutable audit** (hash‑chained). PII masked by default; raw PII exposed to Superadmin only with legal reason.
- Key rotation ≤90 days.

---

## 9) Mobile (M39)

- Packaging/manifests/release channels + crash reporting + versioning.

---

## 10) Automations (n8n / internal)

- **Daily:** horoscope pruning (>60d), invoice cleanup, rate‑limit resets.
- **Monthly:** TTL policy checks, voice token refresh.
- **On‑event:** payment webhooks, call events, moderation → audit.
- **Emergency:** siren escalation (SMS/WhatsApp/Email).

---

## 11) Personalization (M25 — internal only)

- Server‑side features/ranks; **no client‑facing AI text**. Deterministic; opt‑out supported.

---

## 12) Community (M24 — Feature Flag OFF)

- Comments/Reactions with RLS + moderation. Keep feature OFF by default.

---

## 13) Analytics & KPIs (M23)

- `events_raw` → `metrics_daily_*` (no PII). `/api/ops/metrics` exposes key counters.

---

## 14) Execution Status (Roadmap M1→M46)

- Specs/acceptance exist for M14/15/23/24/25/38/39/40 with ready‑to‑run prompts.

---

## 15) High‑Level Acceptance Checklist

- RLS parity.
- Daily Horoscopes **today‑only** for public.
- Media/Invoices via **short‑lived Signed URLs**.
- Payments: `503` when env missing, HMAC webhooks, admin‑only refunds, invoice PDF by Signed URL.
- Notifications: rate‑limited, prefs honored, `503` when providers missing.
- `/api/ops/metrics` exposes counters; Alerts wired; 429 `Retry-After` consistent.
- Audit trail is tamper‑evident (hash‑chained).

---

## 16) Ready‑to‑Use Prompts (for internal agents)

> **Reminder:** Do **not** touch the global Theme/UX. If you create a **new page**, it must **copy** the theme exactly from `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`. Keep code **maintainable & short**., and keep the repository lean: **no 1000 files** — minimize file count and prefer small, clear, maintainable modules.

**P1 — Lock Daily Horoscope RLS & Signed URLs** "Before doing anything, first read and strictly comply with all SAMIA‑TAROT master context files. Do NOT touch the global theme. Keep the code maintainable & short. Task: Enforce DB‑first RLS for `horoscopes` (public today+approved; internal ≤60d via server‑issued short‑lived Signed URLs; >60d hard‑delete DB+Storage). Mirror parity in route guards. Add concise tests for DB denial and media access via Signed URLs. Keep edits surgical."

**P2 — Observability & 429** "Read all master context docs. Do NOT change the theme. Keep code maintainable & short. Task: Expose key metrics at `/api/ops/metrics`, wire alert rules for golden signals and 429 Retry‑After, add a short synthetic probe, and provide a minimal runbook."

**P3 — Payments M14 Minimal** "Read all master context docs. Do NOT change the theme. Keep code maintainable & short. Task: Implement `007_payments.sql` and endpoints (intent, webhook with timing‑safe HMAC verify, refund admin‑only, invoice Signed URL). Enforce `503` on missing env. Add minimal tests and runbook notes."

**P4 — Notifications M15 Minimal** "Read all master context docs. Do NOT change the theme. Keep code maintainable & short. Task: Implement `008_notifications.sql` and endpoints for templates, prefs, and send with rate‑limits. Providers missing ⇒ `503`. Trigger on order transitions and payment outcomes."

---

## 17) Gap Analysis

### 17.1 Backend

- **RLS gaps:** expand/verify policies (especially secondary joins).
- **Webhook HMAC:** enforce constant‑time comparisons everywhere.
- **Signed URL TTL:** centralize and enforce default ≤15 minutes.
- **Error Schema:** unify error shape (code/message/details/correlation\_id).

### 17.2 Frontend

- Currently **0% implemented**: need primary React app + Admin/Monitor dashboards **matching the exact theme**.
- Bind to APIs with Auth headers; ensure RTL/AR parity.

### 17.3 DevOps/Prod

- **Containerization:** Docker multi‑stage + healthchecks + runtime envs.
- **CI/CD:** GitHub Actions: lint/test/migrate/deploy + secrets.
- **Load Balancer/Edge:** Nginx/Cloudflare rules (CSP/HSTS/CORS) + IP allowlist for webhooks.

### 17.4 Docs

- Full OpenAPI/Swagger + User/Operator manuals + Release/Rollback guides.

---

## 18) Plan to 100% (Six Phases)

**Phase 1 — Backend Fixes (1–2 days)**

1. Close RLS policies (targeted tables) + parity tests.
2. Retention job for horoscopes (>60d) + Storage purge.
3. Standardize error schema + consistent `Retry-After` for rate limits.
4. Timing‑safe HMAC verification for all webhooks.
5. Enforce Signed URL TTL ≤15m via a central helper.

**Phase 2 — Frontend (5–7 days)**

- **React app** using the **exact** theme from `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`.
- Routes: `/` (home + daily zodiac audio), `/orders`, `/checkout`, `/profile`, `/invoices`.
- Auth + Profile completion + Order creation/tracking + Payments UI + Daily Horoscope page.

**Phase 3 — Admin Dashboard (2–3 days)**

- Login + Orders management + Horoscope ingest/approval + Moderation tools + Metrics/Exports.

**Phase 4 — Mobile (3–5 days)**

- Capacitor packaging + Push handling + Offline basics + Store assets.

**Phase 5 — Production (2–3 days)**

- Dockerfiles + CI/CD + LB/Edge config + Monitoring dashboards.

**Phase 6 — Docs & Tests (1–2 days)**

- OpenAPI + Runbooks + User manuals + Perf benchmarks + Security audit docs.

---

## 19) Operational Guides by Role

### Client

- Sign up/verify (Email/Twilio) → complete profile → create order (tarot/coffee/astro/healing/direct\_call) → pay → receive audio/invoice via Signed URL.

### Reader

- See **assigned** orders only → upload audio → use internal Assist → handoff to Monitor.

### Monitor

- Review/approve/reject results + horoscopes → can drop live calls → block abusive users.

### Admin

- User management (unblock only), adjust rate limits, monitor `/ops/*`, run exports.

### Superadmin

- Everything above + raw PII export with legal reason + sensitive config changes.

---

## 20) Screens & Pages (without changing the theme)

- **Public:** Home (daily zodiac today‑only audio cards), Pricing/Services, Legal (Terms/Privacy/Refund).
- **Client:** Orders, Payments/Invoices, Profile.
- **Reader:** Assigned Orders, Uploads, Assist tools.
- **Monitor:** Review queues, Calls control, Moderation.
- **Admin/Superadmin:** Users, Rate Limits, Metrics/Snapshot, Exports, Feature Flags.

> Every new page must exactly reuse the cosmic/neon theme, including RTL.

---

## 21) Acceptance Tests (E2E – examples)

- Public `/horoscopes/daily` returns today+approved only.
- Reader cannot access non‑assigned orders.
- Signed URLs expire within ≤15 minutes; renewal is server‑side only.
- Payment webhook with invalid signature → 400 + logged event.
- Refund is admin‑only and recorded in audit/moderation.
- `/api/ops/metrics` exposes 429 counters; Alerts trigger accordingly.

---

## 22) Risks & Mitigations

- **Front‑end debt:** address via fast scaffolding + strict API binding.
- **Policy drift:** run RLS parity validator on every release (M43).
- **Provider outages:** circuit breakers + degraded modes + clear comms.

---

## 23) Copy‑Paste Prompts (execution)

> Do NOT change the theme/UX. If creating a new page, **copy** the theme from `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`. Keep code **maintainable & short**. Read all master context files before coding. Keep the repository lean (**no 1000 files**): minimize file count; avoid over‑scaffolding; keep modules small and clear.

### Prompt A — RLS Lock + Signed URLs (Daily Horoscopes)

"Before doing anything, first read and strictly comply with all SAMIA‑TAROT master context files. Do NOT touch the global theme. Keep the code maintainable & short. Task: Enforce DB‑first RLS for `horoscopes` (public today+approved; internal ≤60d via server‑issued short‑lived Signed URLs; >60d hard‑delete DB+Storage). Mirror parity in route guards. Add concise tests proving DB‑level denial and Signed‑URL‑only media access. Keep edits surgical."

### Prompt B — Observability & 429

"Read all master docs. Do NOT change the theme. Keep code maintainable & short. Task: Expose key metrics at `/api/ops/metrics`, wire alert rules for golden signals + 429 Retry‑After, add a short synthetic probe, and provide a minimal runbook."

### Prompt C — Payments M14

"Read all master docs. Do NOT change the theme. Keep code maintainable & short. Task: Implement `007_payments.sql` and endpoints (intent, webhook with timing‑safe HMAC verify, refund admin‑only, invoice Signed URL). Enforce `503` on missing env. Add minimal tests and runbook notes."

### Prompt D — Notifications M15

"Read all master docs. Do NOT change the theme. Keep code maintainable & short. Task: Implement `008_notifications.sql` and endpoints for templates, prefs, and send with rate‑limits. Providers missing ⇒ `503`. Trigger on order transitions and payment outcomes."

---

## 24) Go‑Live Gate (Pre‑launch Checklist)

- RLS parity validator: **green**.
- Synthetics (login/checkout/emergency/horoscopes): **green**.
- Alerts on golden signals active.
- Docker images signed & scanned.
- CI/CD: migrate → deploy → smoke → rollback plan.
- DPIA/Data Map/Retention Matrix uploaded.

---

## 25) What’s Next

- Execute Phase 1 immediately (RLS/TTL/HMAC/Error schema) and start Frontend binding with the **copied** theme from the Windows project path.
- Prepare CI/CD + Nginx/CF edge + SLO dashboards.
- Run M44 zodiac pipeline in production after M43 data‑freeze.

> **Bottom line:** Backend is ready for binding. After closing the security gaps and building UIs on **the exact existing theme**, we get to a safe, production‑grade launch.



---

## 26) Frontend Binding Plan — Minimal Files & Contracts

**Goal:** Bind the DB/API to the UI with **the exact theme**, using **as few files as possible** and clear, maintainable code.

### 26.1 Router fixes (screenshot shows `No routes matched /horoscopes`)

- **Action:** Add a concrete route for `/horoscopes` and ensure the link points to exactly that path. Keep routing minimal; do not over‑scaffold.
- Example (do not change theme):

```jsx
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <Routes>
    <Route path="/" element={<Home/>} />
    <Route path="/horoscopes" element={<Horoscopes/>} />
    {/* add more only when needed */}
  </Routes>
</BrowserRouter>
```

### 26.2 Minimal file structure (hard cap)

- `src/lib/api.ts` — tiny fetch helpers only.
- `src/pages/Home.jsx` — hero + services + daily preview (uses api).
- `src/pages/Horoscopes.jsx` — the grid page (optional if you keep it inside Home initially).
- Keep everything else inside existing files. **No 1000 files.**

### 26.3 API bindings (contracts)

- `GET /api/horoscopes/daily` → `{ date: string, count: number, horoscopes: Horoscope[] }`
- `POST /api/orders` (body: `{ service_id, question?, metadata? }`) → `{ id }`
- `GET /api/orders/{id}` → order details/state timeline
- `POST /api/payments/intent` (body: `{ order_id }`) → provider client params
- `GET /api/payments/invoice/{order_id}` → returns **Signed URL** to PDF
- If there is no public services endpoint yet, use a small local constant for cards for now.

### 26.4 Tiny fetch wrapper (safe defaults)

```ts
const j = async (res: Response) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
export const api = {
  dailyHoroscopes: () => fetch('/api/horoscopes/daily').then(j).then(d => Array.isArray(d?.horoscopes) ? d.horoscopes : []),
  createOrder: (payload) => fetch('/api/orders', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(j),
  getOrder: (id) => fetch(`/api/orders/${id}`).then(j),
  paymentIntent: (order_id) => fetch('/api/payments/intent', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ order_id })}).then(j),
  invoiceUrl: (order_id) => fetch(`/api/payments/invoice/${order_id}`).then(j),
};
```

> Use simple `useEffect` + `useState` in pages; fallback to `[]`/`null` on errors. No extra libraries.

### 26.5 UI stitching (without touching the theme)

- **Home**: load daily horoscopes (preview 6 items) + services cards linking to `/checkout?service=...` (or a simple modal for now).
- **Horoscopes page**: full grid from `api.dailyHoroscopes()`, with empty‑state when none.
- **Order flow (MVP)**: CTA → `api.createOrder({ service_id,... })` → navigate to `/orders/:id` → poll `api.getOrder(id)` until delivered → show Signed Invoice link via `api.invoiceUrl(id)`.

### 26.6 Acceptance (UI ↔ API)

- `/horoscopes` renders with no router warnings; empty‑state visible when `count=0`.
- Creating an order returns an `id` and navigates to detail view.
- Invoice link opens a **Signed URL** (expires ≤15m) — do not cache client‑side.
- All fetch calls check `response.ok` and handle errors gracefully.

### 26.7 Repository hygiene (re‑affirmed)

- Keep routes/pages **to the minimum**. Avoid deep folder trees and abstractions. Keep modules small, clear, and short.



---

## 27) UI/UX Polish & API Binding — Action Plan (Pro‑level, Minimal Files)

**Context:** Theme/background are correct. Next we need professional UI/UX and robust API binding without increasing file count.

### 27.1 Fix 404 on POST /api/orders (proxy canonicalization)

- **Vite proxy (no rewrite):**

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/api": { target: "http://localhost:8001", changeOrigin: true, secure: false },
    },
  },
});
```

- **Frontend base:** keep `const BASE = '/api'` and call `${BASE}/orders`.
- **Acceptance:** `curl -i http://localhost:5173/api/horoscopes/daily` → `200` via proxy; `curl -i -X POST http://localhost:5173/api/orders` → route exists (not 404). If backend expects `/orders` (no prefix), add `rewrite: (p)=>p.replace(/^\/api/, '')` and keep frontend calls unchanged. Verify in `http://localhost:8001/docs` which path exists.

### 27.2 Page structure (polish without altering theme)

- **Navbar (sticky, slim):** brand at left; minimal links at right; active state under‑glow.
- **Hero:** 2‑line headline, subcopy ≤ 80ch, two CTAs (primary solid, secondary outline) aligned to grid; subtle `motion` fade/slide.
- **Services (/services):** grid cards (2–3 cols) with consistent spacing, price badge, icon, and one clear CTA; small skeletons while loading; error inline, not alert box.
- **Horoscopes (/horoscopes):** if empty → show 12 zodiac placeholders dimmed; otherwise responsive grid; keep "Back to Home" anchor compact.
- **Order detail (/orders/****:id****):** timeline (Created → Assigned → In Progress → Delivered); polling with backoff; invoice button opens **Signed URL** (≤15m) without caching.
- **Login (/login):** minimal form, client‑side validation; reuse cosmic inputs/buttons.

### 27.3 Accessibility & performance (must‑do, theme‑safe)

- Respect `prefers-reduced-motion` (CSS `@media (prefers-reduced-motion: reduce)` + `useReducedMotion()` in Motion).
- tsParticles tuning: `fpsLimit: 45–60`, `pauseOnBlur: true`, `pauseOnOutsideViewport: true`, adjust `number.value` & `move.speed` for weaker GPUs.
- Focus states visible; headings hierarchy consistent; buttons have `aria-busy` during API calls.

### 27.4 Minimal code snippets (keep tiny & clear)

```ts
// src/lib/api.ts
const j = async (r: Response) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };
const BASE = '/api';
export const api = {
  dailyHoroscopes: () => fetch(`${BASE}/horoscopes/daily`).then(j).then(d => Array.isArray(d?.horoscopes)? d.horoscopes: []),
  createOrder: (payload: any) => fetch(`${BASE}/orders`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(j),
  getOrder: (id: string) => fetch(`${BASE}/orders/${id}`).then(j),
  invoiceUrl: (id: string) => fetch(`${BASE}/payments/invoice/${id}`).then(j),
};
```

```jsx
// Respect reduced motion (example)
import { useReducedMotion, m } from 'framer-motion';
export function Hero() {
  const reduce = useReducedMotion();
  const anim = reduce ? { opacity: 1 } : { opacity: 1, y: [8,0] };
  return <m.h1 animate={anim} transition={{ duration: .6 }}>{/* ... */}</m.h1>;
}
```

```css
/* Accessibility: reduce motion */
@media (prefers-reduced-motion: reduce) {
  .floating, .parallax, .orb { animation: none !important; transition: none !important; }
}
```

```js
// tsParticles options (excerpt)
const options = { fpsLimit: 60, pauseOnBlur: true, pauseOnOutsideViewport: true, detectRetina: true };
```

### 27.5 Acceptance (visual + functional)

- No 404 from `/api/orders`; router free of warnings; network calls show `200/201`.
- Home/Services/Horoscopes/Orders pages render with consistent spacing, typography, and CTAs—all reusing the **exact** theme.
- Reduced‑motion users see simplified animations; particles pause on blur.
- Invoice opens via short‑lived Signed URL; never stored in client state.

> Keep repository lean: no extra folders, no over‑abstractions. **Do not change the theme.**



---

## 28) Homepage Review — Pro Polish Checklist (Theme-Pure)

**Status (from screenshots):** Theme/background correct; layout/spacing/hierarchy need pro pass. API binding OK.

### Actions (Keep files minimal)

1. Container width & rhythm: apply a single `.container` with max‑width and section vertical rhythm (top/bottom padding tokens) for Hero/Services.
2. CTAs: primary/secondary sizes unified; consistent icon/label spacing; keyboard focus visible.
3. Services grid: 3‑col on desktop, equal card heights, price badge fixed position; skeletons on load; inline error (no alerts).
4. Horoscopes: 12 placeholders when empty; responsive grid when data exists; compact “Back to Home”.
5. A11y: `@media (prefers-reduced-motion: reduce)` and Motion `useReducedMotion()` in animated components; visible `:focus-visible` styles.
6. Particles perf: `fpsLimit 45–60`, `pauseOnBlur`, `pauseOnOutsideViewport`.
7. Router: v7 future flags enabled to eliminate warnings.

### Acceptance

- No console warnings; no 404 on `/api/orders`.
- Clear typographic hierarchy; section spacing consistent; CTAs aligned to grid.
- Keyboard navigation shows proper focus rings; reduced‑motion paths respected.
- Pages: Home, Services, Horoscopes, Orders detail — all consistent and reusing **exact** theme.

> Non‑negotiable: Do not change the theme. Keep code **maintainable & short** and the repository lean (no 1000 files).



---

## 29) Theme Consistency Enforcement — One Layout, One Background

**Non‑negotiable:** Every page must use the **exact same theme, colors, styles, and background** as the source project. Do **not** introduce page‑specific overrides.

### 29.1 Global Layout wrapper (mount once)

- Create a tiny `AppLayout` that imports the cosmic theme CSS and mounts the **single** background/particles/orbs.
- Router uses nested **layout route** so all pages render inside this wrapper.

```jsx
// AppLayout.jsx (keep tiny)
import { Outlet } from 'react-router-dom';
import '../index.css'; // cosmic variables & styles (source theme)
import { CosmicBackground } from './CosmicBackground'; // or inline if already present

export default function AppLayout(){
  return (
    <div className="cosmic-root">
      <CosmicBackground />
      <main className="container"> <Outlet/> </main>
    </div>
  );
}
```

```jsx
// router (minimal)
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <Routes>
    <Route element={<AppLayout/>}>
      <Route path="/" element={<Home/>} />
      <Route path="/services" element={<Services/>} />
      <Route path="/horoscopes" element={<Horoscopes/>} />
      <Route path="/orders/:id" element={<Order/>} />
      <Route path="/login" element={<Login/>} />
    </Route>
  </Routes>
</BrowserRouter>
```

### 29.2 Tokens & rules (CSS variables only)

- Colors/spacing/typography/borders must come **only** from existing CSS variables in `:root`.
- Pages/components may **not** hard‑code colors or shadows; use `var(--*)` values from the theme.

```css
/* example: consuming tokens */
.card{ background: var(--cosmic-panel); color: var(--cosmic-ink); border-radius: var(--radius-xl); }
.cta-primary{ background: var(--accent-gold); }
```

### 29.3 One background policy

- Background starfield/particles/orbs mounted **once** in `AppLayout`. Pages must **not** duplicate or override.
- Respect reduced motion in background (pause or simplify when `prefers-reduced-motion`).

### 29.4 Acceptance

- Visual diff across Home/Services/Horoscopes/Orders/Login shows **identical background** and typography scale.
- No inline styles overriding tokens; computed styles show `var(--*)` usage.
- Router free of warnings; all pages render within `AppLayout`.

> Keep repository lean: add only `AppLayout.jsx` if missing; otherwise reuse existing layout file. Do not add extra folders. Do not change the theme.



---

## 30) Frontend UAT & Launch Gate (Lean, Theme-Safe)

**Goal:** Final verification that the UI/UX, routing, and API bindings meet production quality—without changing the theme and with minimum files.

### 30.1 UAT Checklist

- **Visual Consistency:** All pages render inside `AppLayout` with one background; no page-level overrides; typography scale unified.
- **Navigation:** Navbar sticky; active state visible; keyboard focus via `:focus-visible` works on links and buttons.
- **Horoscopes Empty/Loaded:** 12 placeholders when empty; grid when data exists; no layout shift.
- **Services Grid:** 3 cols desktop (collapse responsively), equal card heights, price badge consistent, hover micro-interactions.
- **Order Flow:** `POST /api/orders` → navigates to `/orders/:id`; status polling with backoff; invoice opens via short‑lived **Signed URL** (≤15m); no client-side caching of private URLs.
- **Auth Flow:** Login validates client-side; error shown inline; respects reduced motion.
- **Motion/Particles:** `prefers-reduced-motion` supported; particles paused on blur/outside viewport; fpsLimit ≤ 60.

### 30.2 Quick Smoke (dev)

```bash
# health
curl -sS http://localhost:5173/ > /dev/null && echo OK-frontend
curl -sS http://localhost:5173/api/horoscopes/daily | jq '.count,.horoscopes|type'
# create order (adjust payload as needed)
curl -sS -X POST http://localhost:5173/api/orders -H 'Content-Type: application/json' -d '{"service_id":"tarot_basic"}'
```

### 30.3 Performance & A11y (lightweight)

- **CLS/LCP**: verify no layout jumps (use container rhythm); hero images (if any) have dimensions.
- **A11y**: tab through critical CTAs; ensure visible focus and proper aria labels; confirm reduced-motion path.

### 30.4 Sign‑off Criteria

- Zero console warnings during normal navigation.
- All smoke checks return `2xx` and render correct empty/loaded states.
- No hard‑coded colors/shadows; only `var(--*)` tokens.
- Repo remains lean (no new folders added for this phase).

---

## 31) Post‑UAT Handover (Docs to include)

- **Routes Map:** current URLs with ownership.
- **Components Map (tiny):** file list (≤ the current set) with brief responsibility lines.
- **API Contracts:** inputs/outputs for calls used by the frontend.
- **Theming Rules:** single background, tokens-only, reduced-motion policy.
- **Runbook (frontend):** how to dev, build, and troubleshoot proxy/particles.

> Reminder: Do **not** change the theme. Keep code maintainable & short. Keep repository lean—no unnecessary files.



---

## 32) Auth Binding (Fix 404) — Supabase Client on Frontend (Lean & Theme-Safe)

**Problem (from screenshots):** `/api/auth/login` returns **404** → backend route not present. **Do not** add more backend code now. Bind login via **Supabase client** on the frontend using the **anon** key, keep repo lean, and (optionally) call `/api/auth/sync` after sign‑in if the backend provides it.

### 32.1 Env (Vite)

Create `.env.local` (not committed):

```
VITE_SUPABASE_URL=... 
VITE_SUPABASE_ANON_KEY=...
```

> Use Vite `import.meta.env.VITE_*` vars. Never expose **service\_role** on the client.

### 32.2 Tiny client (1 file)

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
```

### 32.3 Minimal auth helpers (co-located, no bloat)

```ts
// src/lib/auth.ts
import { supabase } from './supabase';
export const signIn = (email:string, password:string) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();
export const getUser = () => supabase.auth.getUser(); // validated via server
```

### 32.4 Update Login.jsx (replace 404 call)

- Remove calls to `/api/auth/login`.
- On submit → `await signIn(email,password)`.
- On success: optionally `await api.authSync()` if available, then route to role landing.
- Respect reduced motion & theme; show inline error (no alerts).

```tsx
// Login.jsx (excerpt)
const onSubmit = async (e) => {
  e.preventDefault();
  setBusy(true);
  const { data, error } = await signIn(email, password);
  setBusy(false);
  if (error) setErr(error.message); else navigate('/');
};
```

### 32.5 Acceptance

- Submitting the form no longer hits `/api/auth/login`; network shows **200** from Supabase Auth.
- Session persists by default; `getUser()` returns the signed‑in user; role UI shows accordingly.
- No console errors; theme untouched; **no new folders** added.

> Non‑negotiable: Do not change the theme; keep code **maintainable & short**; keep repository lean.



---

## 33) Auth Guards & Role-Gated Navigation (Supabase Client)

**Goal:** Protect routes and gate UI by role using the existing Supabase client. Keep it minimal; do not touch the theme.

### 33.1 RequireAuth (tiny)

```tsx
// src/components/RequireAuth.jsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getUser } from '../lib/auth';
export default function RequireAuth(){
  const [u,setU] = useState(null), [done,setDone] = useState(false);
  useEffect(()=>{ getUser().then(({ data })=>{ setU(data?.user||null); setDone(true); }); },[]);
  if(!done) return null; // keep UI clean; layout stays
  return u ? <Outlet/> : <Navigate to="/login" replace/>;
}
```

### 33.2 RoleGate (tiny)

```tsx
// src/components/RoleGate.jsx
import { useEffect, useState } from 'react';
import { getUser } from '../lib/auth';
export default function RoleGate({ allow = [], children }){
  const [ok,setOk] = useState(false);
  useEffect(()=>{ getUser().then(({ data })=>{
    const r = data?.user?.user_metadata?.role; setOk(r && allow.includes(r));
  }); },[allow]);
  return ok ? children : null; // or a small inline 403 message
}
```

### 33.3 Router wiring

```jsx
// router excerpt
<Route element={<RequireAuth/>}>
  <Route path="/orders/:id" element={<Order/>} />
  <Route path="/admin" element={<RoleGate allow={["admin","superadmin"]}><Admin/></RoleGate>} />
</Route>
```

### 33.4 State sync (optional)

- If backend exposes `/api/auth/sync`, call it once after sign-in to ensure profile/role mirrors Auth.

### 33.5 Storage rule (must)

- Do **not** store tokens manually. Supabase persists the session. If you need to cache UI bits, store only non‑sensitive display data.

### Acceptance

- Unauthenticated users hitting protected routes are redirected to `/login`.
- Admin routes are visible only for allowed roles.
- Navbar updates via `onAuthStateChange` without reload.
- No new folders added; code remains small and clear. Theme untouched.



---

## 34) Final Main Page UI/UX — Production‑Level Spec (Theme‑Pure)

**Non‑negotiable:** Do **not** change the theme. Reuse the cosmic/neon tokens, spacing, radii, shadows, and background from the Windows project. Keep components **short, clear, maintainable**, and avoid new folders.

### 34.1 Structure (above the fold → below the fold)

1. **Navbar (sticky):** left brand; right links (Home, Services, Horoscopes, Sign In/Out); hamburger at <768px; active link under‑glow.
2. **Hero (2 lines):** headline ≤ 80ch; supporting copy ≤ 120ch; two CTAs (Primary = Get Your Reading, Secondary = Daily Horoscopes) with icon+label spacing; subtle entry motion respecting reduced‑motion.
3. **Signals/Trust (optional, single row):** small icons & 1‑liners (Private Audio • Secure Payments • 18+ Only) — same typography scale.
4. **Daily Preview:** 6 zodiac cards from `GET /api/horoscopes/daily`; if empty → placeholder grid of 12 zodiac icons.
5. **Services Teaser:** 3 featured cards (tarot/astro/numerology) with price badge and CTA → `/services`.
6. **Footer (compact):** links to Terms/Privacy/Refund/Contact; copyright.

### 34.2 Components (tiny)

- `HeroCTA`: button pair with shared class names; `aria-busy` on fetch; uses CSS tokens only.
- `ZodiacPreview`: fetch once, show empty state grid when `count=0`.
- `ServiceCard`: equal heights via layout CSS (no JS). One CTA per card.

### 34.3 Motion & A11y

- Global reduced‑motion: CSS media query + `useReducedMotion()` for Hero/preview.
- Keyboard: visible `:focus-visible`; tabindex on CTAs; skip links optional.

### 34.4 Acceptance (Main Page)

- Layout does not shift after load; consistent section rhythm; CTAs aligned to grid.
- Empty vs loaded states render cleanly; no alerts popups.
- No inline colors/shadows; only theme tokens (`var(--*)`).

---

## 35) Pages Inventory & Route Map (All Roles, Minimal Files)

> Keep routes flat; use **layout route** with `AppLayout` and the single mounted background.

### 35.1 Public

- `/` Home (hero + daily preview + services teaser)
- `/services` Services grid (3 cols desktop)
- `/horoscopes` Full daily grid (12 when empty)
- `/login` Sign in form (Supabase Auth)
- `/legal/terms` • `/legal/privacy` • `/legal/refund` (simple content pages)

### 35.2 Client

- `/orders` My Orders (list)
- `/orders/:id` Order detail (timeline + invoice link)
- `/checkout` Create order & pay (intent → provider)
- `/profile` Profile (DOB → zodiac compute; contact prefs)

### 35.3 Reader

- `/reader/queue` Assigned orders only
- `/reader/orders/:id` Upload result (audio) + notes

### 35.4 Monitor

- `/monitor/review` Results & horoscopes approval queue
- `/monitor/calls` Live calls control (terminate)

### 35.5 Admin/Superadmin

- `/admin/users` User list (unblock only)
- `/admin/rate-limits` Limits & 429 counters
- `/admin/metrics` KPIs snapshot
- `/admin/exports` CSV exports & audit trail link

### 35.6 Auth/Guards

- Wrap protected clusters with `RequireAuth`; gate admin routes with `RoleGate allow={["admin","superadmin"]}`.

---

## 36) Wiring Matrix — Page ↔ API (Contracts at a Glance)

| Page/Feature    | Endpoint(s)                                                  | Notes                                                 |          |                          |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------- | -------- | ------------------------ |
| Home → Preview  | `GET /api/horoscopes/daily`                                  | show 6; empty state renders 12 placeholders           |          |                          |
| Services        | (local config or `GET /api/services` if present)             | one CTA per card → `/checkout?service=...`            |          |                          |
| Checkout        | `POST /api/orders`, `POST /api/payments/intent`              | on success → `/orders/:id`                            |          |                          |
| Order detail    | `GET /api/orders/:id`, `GET /api/payments/invoice/:order_id` | polling with backoff; never cache Signed URL          |          |                          |
| Reader upload   | `POST /api/orders/:id/result`                                | attach audio blob; server stores private; emits notif |          |                          |
| Monitor review  | \`POST /api/horoscopes/\:id/approve                          | reject`, `POST /api/orders/\:id/approve               | reject\` | inline comments optional |
| Calls (monitor) | `POST /api/calls/terminate`                                  | audit trail                                           |          |                          |
| Admin metrics   | `GET /api/ops/metrics`, `GET /api/ops/snapshot`              | golden signals & counters                             |          |                          |

**Client Auth:** Supabase `signInWithPassword`/`getUser` for session; optional `/api/auth/sync` after sign‑in.

---

## 37) One‑Shot Build Plan (Finish Line)

**Objective:** Ship the entire UI surface and bindings in a single focused update without altering theme or expanding file count.

### 37.1 Implement/Polish (Frontend)

- Finalize Main Page per §34.
- Build `/services`, `/horoscopes`, `/orders`, `/orders/:id`, `/checkout`, `/profile`, `/login` with the shared layout and tokens only.
- Add `RequireAuth` + `RoleGate` wrappers (per §33) for client/reader/admin paths.
- Add inline error blocks and loading skeletons only where remote data exists.

### 37.2 Bindings (API)

- Ensure Vite proxy `/api/*` → backend (no rewrite unless needed). Base path constant.
- Use `src/lib/api.ts` helper (check `response.ok` before `.json()`); keep functions tiny.
- Poll order status with capped exponential backoff; open invoice via short‑lived Signed URL; do not store it in state.

### 37.3 Acceptance (Global)

- No console warnings; all routes render inside `AppLayout` with one background.
- All listed pages reachable; guards/roles work; login updates navbar live.
- Network panel: all calls return 2xx; 404/5xx surfaced as inline error blocks.
- Repo diff minimal; no new folders unrelated to this scope.

---

## 38) Final Execution Prompt (Copy‑Paste for Agent)

**Do not change the theme.** Keep the repository lean (**no 1000 files**) and code **maintainable & short**.

"Read all SAMIA‑TAROT master context files and Sections 34–37 of this playbook. Do NOT touch the global theme; every new page must exactly match the cosmic/neon design.

**Scope (one update):**

1. Finish the main page per §34 (hero, daily preview with empty state, services teaser, footer).
2. Implement the remaining pages and routes per §35 using the `AppLayout` single background:
   - Public: `/`, `/services`, `/horoscopes`, `/login`, `/legal/*`
   - Client: `/orders`, `/orders/:id`, `/checkout`, `/profile`
   - Reader: `/reader/queue`, `/reader/orders/:id`
   - Monitor: `/monitor/review`, `/monitor/calls`
   - Admin: `/admin/users`, `/admin/rate-limits`, `/admin/metrics`, `/admin/exports`
3. Wire all pages to APIs following the Wiring Matrix (§36) using the tiny `src/lib/api.ts` helper.
4. Use Supabase Auth on the client only (anon key) for login and session (`signInWithPassword`, `getUser`, `onAuthStateChange`), and gate routes via `RequireAuth`/`RoleGate`.
5. Add inline error blocks and minimal skeletons; no alerts. Respect reduced‑motion.
6. Ensure Vite proxy `/api/*` → backend; keep a single base path constant.

**Acceptance:**

- No console warnings. All routes render inside `AppLayout` with identical theme/background.
- Public/Client/Reader/Monitor/Admin flows load and call the right endpoints with 2xx.
- Order flow: create → detail → polling with capped backoff → invoice via short‑lived Signed URL (not cached).
- Repo remains lean—no new folders beyond what this scope requires.

Ship the full update in a single PR with a concise changelog."



---

## 39) One‑PR, One‑Pass — Merge & Verify Checklist

**Scope:** Implement Sections 34–37 exactly; no theme changes; minimal diffs; single PR.

### 39.1 PR Metadata

- **Title:** `feat(ui): finish main page + full pages & wiring (one‑pass)`
- **Labels:** `frontend`, `theme-locked`, `one-pass`
- **Changelog (short):**
  - add: public pages (home/services/horoscopes/login/legal)
  - add: client pages (orders/orders\:id/checkout/profile)
  - add: reader/monitor/admin pages per §35
  - add: auth guards (RequireAuth/RoleGate)
  - fix: api bindings + invoice signed-url handling
  - chore: tiny api helper, router glue; no theme changes

### 39.2 Diff Boundaries (must NOT exceed)

- **Allowed files:** router, AppLayout, pages listed in §35, `src/lib/api.ts`, \`src
