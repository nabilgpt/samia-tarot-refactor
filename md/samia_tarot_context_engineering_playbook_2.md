# SAMIA TAROT — Context Engineering Playbook (Addendum)

> **Continuation from §39.2 onward.** Non‑negotiables remain: **Do not change the cosmic/neon theme** (copy exactly from `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`). Keep code **maintainable & short**. Keep the repo **lean** (no 1000 files). One background mounted once in `AppLayout`. All pages must share identical tokens, spacing, and motion rules. Desktop, tablet, and mobile breakpoints must be verified.

---

## 39.2 Diff Boundaries (must NOT exceed)

**Goal:** Ship the entire UI surface (public + client + reader + monitor + admin) in a **single, minimal PR** without bloating the repo or touching the theme.

### 39.2.1 Allowed file paths (strict)
- `src/App.jsx` (or `src/router.jsx`) — router glue only.
- `src/components/AppLayout.jsx` — single background + `<Outlet/>`.
- `src/components/RequireAuth.jsx`, `src/components/RoleGate.jsx` — tiny guards.
- `src/lib/api.ts`, `src/lib/supabase.ts`, `src/lib/auth.ts` — tiny helpers only.
- `src/pages/` (flat, no deep folders):
  - `Home.jsx`, `Services.jsx`, `Horoscopes.jsx`, `Login.jsx`
  - `Orders.jsx` (list), `Order.jsx` (detail), `Checkout.jsx`, `Profile.jsx`
  - `AdminUsers.jsx`, `AdminRateLimits.jsx`, `AdminMetrics.jsx`, `AdminExports.jsx`
  - `ReaderQueue.jsx`, `ReaderOrder.jsx`, `MonitorReview.jsx`, `MonitorCalls.jsx`
- `index.css` — **may consume existing variables only**. **Do not add or change tokens.**
- `vite.config.ts` — proxy `/api/*` only (no other build changes).
- Optional E2E: `e2e/smoke.spec.ts` (single file) — if repo already has Playwright/Cypress.

### 39.2.2 Max additive footprint
- **New files:** ≤ **18** (pages + 3 tiny libs + 2 guards). No extra folders besides `pages`, `components`, `lib`, and optional `e2e`.
- **Assets:** ≤ **4** SVG icons (if needed). Prefer Lucide/inline SVG. **No images** > 100KB.
- **Deps:** Allowed only if missing: `react-router-dom`, `framer-motion`, `@supabase/supabase-js`. **No UI frameworks**, **no CSS libs**, **no state libs**.
- **ENV:** Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client). **No service_role on client.**

### 39.2.3 Forbidden
- Adding/changing theme tokens, colors, shadows, radii.
- Duplicating background/particles per page.
- New design systems, component libraries, or global CSS resets.
- Deep folder trees, barrel files, or generic utils graveyards.
- Caching or persisting **Signed URLs**. Never log PII.

### 39.2.4 Device breakpoints (must pass)
- **Desktop ≥ 1280px:** 3‑col Services, 6‑wide daily preview grid.
- **Tablet 768–1279px:** 2‑col Services, 3‑wide daily preview grid.
- **Mobile ≤ 767px:** 1‑col stack, compact navbar with hamburger, cards full‑width.
- Motion respects `prefers-reduced-motion`. Focus rings visible. No horizontal scrollbars.

---

## 39.3 Code Review Checklist (One‑Pass)

**Theme & Layout**
- Uses **only** `var(--*)` tokens from the cosmic theme. **Zero hex colors** or inline shadows.
- Single background mounted in `AppLayout`. No page duplicates.
- Consistent container rhythm (vertical spacing tokens). No CLS on hero/sections.

**Accessibility**
- `:focus-visible` clearly styled. Tab order logical. Forms have labels.
- Reduced motion path implemented via CSS + `useReducedMotion()`.
- Icons have `aria-hidden` when decorative; images have meaningful `alt`.

**Security/Privacy**
- All fetches check `response.ok` before parsing. Errors sanitized.
- No tokens stored manually. No Signed URL stored/cached/logged.
- Role gates enforced (`RequireAuth`, `RoleGate`) and links hidden when unauthorized.

**Performance**
- Particles: `fpsLimit ≤ 60`, `pauseOnBlur`, `pauseOnOutsideViewport`.
- Avoid heavy re‑renders; memoize large lists if needed. No console warnings.
- Bundle does not add heavy deps. Images sized with width/height to avoid layout shift.

**Routing**
- All routes render under `AppLayout`. No v6→v7 warnings (future flags enabled).
- 404s handled by a small `NotFound` component (optional, theme‑compliant).

---

## 39.4 E2E Smoke (Dev) — Minimal

**Terminal quick checks**
```bash
# Frontend reachable
curl -sS http://localhost:5173/ > /dev/null && echo OK-frontend
# Daily endpoint via proxy (should be 200, count>=0)
curl -sS http://localhost:5173/api/horoscopes/daily | jq '{date, count}'
# Create order (adjust service_id)
curl -sS -X POST http://localhost:5173/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"service_id":"tarot_basic"}' | jq '{id}'
```

**Auth (Supabase, UI)**
1. Open `/login`, sign in with seeded accounts.
2. Verify navbar changes, `RequireAuth` grants/denies routes by role.

**Order Flow**
1. From Services/Checkout → `POST /api/orders` → redirect to `/orders/:id`.
2. Poll status (capped backoff) until `completed`.
3. Click **Invoice** → opens **short‑lived Signed URL** (≤15m).

---

## 39.5 Rollback Plan (Fast, Safe)
- **If PR breaks UI:** `git revert <merge-commit>`; re‑deploy.
- **Feature containment:** admin/reader/monitor pages are guard‑gated; can be hot‑hidden by removing links while keeping routes protected.
- **ENV restore:** remove/rotate `VITE_SUPABASE_*` if auth misconfigures.
- **Cache purge:** clear CDN/edge caches if used; invalidate `/assets/*`.

---

## 39.6 Post‑Merge Housekeeping
- Tag release: `v0.9-ui-onepass` with short notes.
- Open follow‑up issues (if any): copy deck for docs, add missing tests, etc.
- Update `FRONTEND_HANDOVER.md` with final routes map and pages list.
- Ensure monitors/alerts for `/api/ops/metrics` are green post‑deploy.

---

## 39.7 Release Notes (Template)
```
Highlights
- Finished main page polish; unified AppLayout background; responsive breakpoints.
- Implemented all public/client/reader/monitor/admin pages per playbook §35.
- Bound to APIs with safe fetch helpers; Supabase Auth client; role-gated routes.

Security & Compliance
- No theme changes; RLS parity enforced server-side; Signed URLs short-lived and never cached.

Known Limits
- Community feature remains OFF by flag; mobile apps packaged next (§41).
```

---

## 39.8 Ownership & On‑Call
- **UI Owner:** Frontend lead (routes/pages/glue).
- **Backend Owner:** API/DB lead (contracts, metrics, retention).
- **Release Captain:** Coordinates PR, rollout, smoke, and rollback.
- **On‑Call:** Pager for 500s, 429 spikes, auth failures.

---

## 40) CI/CD & Release Gate (Theme‑Locked)

**Pipeline (GitHub Actions)**
1. **lint/test** → **build** (Vite) → **dockerize** (multi‑stage) → **deploy** → **smoke**.
2. Fails if:
   - Console warnings detected in CI smoke run.
   - Lighthouse budgets fail (LCP ≤ 3.0s, CLS ≤ 0.1, TBT ≤ 200ms on mid‑tier device).
   - `/api/ops/health` or `/api/ops/metrics` not 200.

**Docker (outline)**
- Builder stage: `npm ci && npm run build`.
- Runtime stage: serve static with Nginx; copy `/dist` → `/usr/share/nginx/html`.
- Nginx: CSP locked, gzip/brotli on, cache headers for static; **no caching** for `/api/*` or Signed URLs.

**Edge/LB**
- Enforce HSTS, strict CORS, proxy `/api/*` to backend, IP allowlist for webhooks.

---

## 41) Mobile Packaging (Follow‑up to Web)
- Capacitor shell wrapping the built web app; same theme and tokens.
- Permissions minimal; splash/icons generated; links open externally when needed.
- Push notifications wired to existing notifications service when applicable.

---

## 42) Appendices

### 42.1 CSS Token Glossary (read‑only)
Use existing tokens only (examples): `--cosmic-bg`, `--cosmic-ink`, `--accent-gold`, `--accent-purple`, `--radius-xl`, `--space-lg`.

### 42.2 Routes × Roles (quick matrix)
- **Public:** `/`, `/services`, `/horoscopes`, `/login`, `/legal/*`
- **Client:** `/orders`, `/orders/:id`, `/checkout`, `/profile`
- **Reader:** `/reader/queue`, `/reader/orders/:id`
- **Monitor:** `/monitor/review`, `/monitor/calls`
- **Admin:** `/admin/users`, `/admin/rate-limits`, `/admin/metrics`, `/admin/exports`

### 42.3 Error Shape (frontend expectation)
```json
{
  "code": "string",         // machine code
  "message": "human message", // safe for UI
  "details": {"field": "..."},
  "correlation_id": "uuid"
}
```

---

## 43) One‑Pass Final Prompt (Copy‑Paste for Agent)
> **Do not change the theme. Keep code maintainable & short. Keep the repo lean — no unnecessary files.**

"Read all master context docs plus this Addendum (§39.2–§43). In one update, finish the UI build and wiring:

1) Respect §39.2 **Diff Boundaries** (allowed files, max new files ≤18, no theme edits).  
2) Implement/verify all routes from §42.2 inside `AppLayout` (one background).  
3) Ensure desktop/tablet/mobile breakpoints pass §39.2.4 acceptance.  
4) Bind to APIs using `src/lib/api.ts`; Supabase Auth client for login; use `RequireAuth`/`RoleGate`.  
5) Inline error blocks only; no alerts; Signed URLs never cached.  
6) CI smoke passes; no console warnings; Lighthouse budgets met.  

Ship as **one PR** with the title from §39.1 and a short changelog."


---

## 44) Cards & Buttons — Final Polish Spec (Theme‑Pure)
**Do not change the theme.** Use only existing tokens and the single AppLayout background. Keep components **short**.

### 44.1 Buttons (two types only)
- **Primary (filled)** and **Secondary (outlined)**. Same height across the app.
- Sizes: `sm`, `md` (default). Minimum tap target: 24×24 CSS px. Horizontal gap between buttons: 8–16px.
- States: default, hover, focus-visible, disabled. Focus ring visible; outline uses theme tokens.
- No third style unless feature-flagged (e.g., ghost/link). No custom colors.

### 44.2 Cards (services/horoscopes/orders)
- Structure: `Icon/Badge → Title (1 line) → Meta/Description (≤2 lines) → Price/CTA`.
- Equal height via CSS (no JS). Spacing grid = 8pt multiples.
- Hover: subtle elevate/outline using tokens only. Reduce motion when user prefers.
- Error/empty: inline message inside the card area (no alerts).

### 44.3 Acceptance
- All primary CTAs across Home/Services/Checkout look identical in size and states.
- Services/horoscopes grids compute equal heights without script.
- No hard-coded colors/shadows. All spacing multiples of 8.

---

## 45) Home Content Blocks — Final Layout
- **Hero**: `h1` ≤2 lines (fluid with `clamp()`), `lede` ≤2 lines, row of Primary/Secondary CTAs, then a 3‑item trust row (icons + short labels).
- **Daily Preview**: 2/3/6 responsive grid, 6 items; empty state shows 12 placeholders with skeleton that hints layout.
- **Services Teaser**: 3 equal cards; price badge and CTA per card.
- **Footer**: compact legal links + copyright.

**Acceptance**: no layout shift after load; CTAs aligned to the container grid; trust row not floating.

---

## 46) Forms & Auth UI (Login/Profile/Reader Upload)
- Labels always visible; helper text for errors below the field (no alerts).
- Submit buttons disable on pending; show inline progress text.
- `:focus-visible` on all inputs; keyboard navigation predictable.
- Profile: DOB (compute zodiac client-side), contact prefs toggles, save inline.

**Acceptance**: validation messages never overlap layout; screen readers announce errors; reduced motion respected.

---

## 47) Checkout & Payments UI (Stripe/Square)
- **Flow**: choose service → `/checkout` summary → confirm → `POST /api/orders` → `POST /api/payments/intent` → redirect to `/orders/:id`.
- Order page polls with capped backoff; show timeline (`pending → processing → completed`).
- Invoice action opens **Signed URL** (≤15m). Never cache or store the URL.

**Acceptance**: payment buttons disabled during intent; failure shows inline error with retry; invoice link opens in new tab.

---

## 48) Orders — List & Detail
- **List**: compact rows (status pill, service, createdAt, CTA). Sort newest first.
- **Detail**: timeline + metadata + actions (invoice/download, contact support if enabled).
- **Reader**: upload result (audio) + short notes; progress indicator and success state.

**Acceptance**: list virtualization not required now; empty state guidance; status colors from tokens only.

---

## 49) Admin / Monitor / Reader — Minimal Dashboards
- **Admin**: Users (role, state, unblock), Rate‑limits (view+reset counters), Metrics snapshot, Exports (CSV links).
- **Monitor**: Review (approve/reject readings & horoscopes), Calls (terminate).
- **Reader**: Queue (assigned only), Order detail (upload result).
- All actions inline; confirmation uses small modal/panel consistent with theme tokens.

**Acceptance**: routes gated with `RequireAuth`/`RoleGate`; links hidden when unauthorized.

---

## 50) Loading, Errors, and Empty States
- Prefer **layout‑hinting skeletons** for grids/lists; small inline spinners for button‑level pending.
- Errors: show inline blocks with safe copy; never leak PII; include correlation id if returned.
- Empty: clear message + primary next step.

**Acceptance**: no alert popups; skeletons reflect final layout; recoverable errors show retry.

---

## 51) Performance & Budgets (Lighthouse Gate)
- **Budgets (mid‑tier device)**: LCP ≤ 3.0s, CLS ≤ 0.1, TBT ≤ 200ms.
- Particles: `fpsLimit ≤ 60`, `pauseOnBlur`, `pauseOnOutsideViewport`.
- Images: width/height set; no layout shift. Avoid heavy deps.

**Acceptance**: CI Lighthouse passes; console clean.

---

## 52) Accessibility Final Pass
- `:focus-visible` everywhere; headings in order; landmarks present.
- Touch targets ≥ 24×24 CSS px or equivalent spacing on mobile.
- `prefers-reduced-motion` respected across components; decorative motion paused.

**Acceptance**: keyboard navigable end‑to‑end; no WCAG 2.2 2.5.8 violations on key screens.

---

## 53) Internationalization Hooks (light)
- All user‑facing strings wrapped in i18n utility already present; keep ICU messages.
- RTL ready: containers and icon flips where applicable.

**Acceptance**: no hard‑coded English in components; dates/numbers localizable.

---

## 54) Observability (Front‑End)
- Console error boundary catches and logs only safe info.
- Minimal event hooks: page view + order completed (no PII), feature‑flagged.

**Acceptance**: logs do not include user tokens, emails, or Signed URLs.

---

## 55) Minimal File Additions Allowed (recap)
- If needed only: `src/styles/layout.css` and (optional) `src/hooks/useBreakpoint.ts`.
- Everything else stays inside current pages/components/libs.

---

## 56) Final Acceptance Checklist (All Surfaces)
- Theme untouched; one background; only `var(--*)` tokens used.
- All routes from the matrix exist and are reachable with proper guards.
- Main page meets §45; cards/buttons meet §44.
- Responsive at 375×667, 768×1024, 1440×900; no horizontal scroll.
- Error/empty/loading states match §50; invoices via short‑lived Signed URLs only.
- CI passes: build, docker, deploy, smoke, Lighthouse budgets.

---

## 57) Ship Prompt — Full Completion (Copy‑Paste)
**Do not change the theme. Keep code maintainable & short. Keep the repo lean (no unnecessary files).**

"Read all master docs and Addendum §§39.2–57. Ship a single one‑pass PR that:
1) Final‑polishes the **main page** per §45 and standardizes **cards & buttons** per §44.  
2) Implements & verifies every route in the matrix (§42.2) under `AppLayout` with one background.  
3) Completes **Checkout/Payments** bindings and **Orders** list/detail per §§47–48, including polling and invoice (short‑lived Signed URL).  
4) Applies responsive layout across desktop/tablet/mobile (§§39.2.4, 40) and passes **A11y** (§52).  
5) Implements loading/error/empty patterns (§50); no alerts; inline only.  
6) Meets **Performance budgets** (§51) and keeps console clean.  
7) Preserves theme tokens and minimal file policy (§55).  

Submit one PR with the title from §39.1 and a concise changelog; attach updated FRONTEND_HANDOVER.md and release notes template from §39.7."
