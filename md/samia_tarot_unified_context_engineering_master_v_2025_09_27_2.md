# SAMIA TAROT — Unified Context Engineering (Master v2025‑09‑27) — Addendum 2

> **Purpose:** finalize **real, production UI** microcopy and role apps; ensure **Front‑End is feature‑complete (no mocks)**; unify tone with the existing **cosmic/neon** theme. This addendum extends the Master doc with concrete strings, tooltips, and RBAC surfacing.

---

## A) UI Copy Kit — Short, Consistent, Cosmic ✨

> Keep text crisp, positive, and modern. Sentence case for English UI, title‑case for section headers. Avoid exclamation marks unless in hero. Respect `prefers-reduced-motion`—copy shouldn’t reference motion.

### A.1 Navbar (Client app)

* **Home**
* **Services**
* **Horoscopes**
* **My Orders**
* **Profile**
* **Login / Logout**

### A.2 Hero (Home)

* **Title:** *Unlock Your Cosmic Destiny*
* **Subtitle:** *Discover ancient wisdom with modern clarity. Connect with certified readers for personalized guidance.*
* **Primary CTA (button):** *Get Your Reading*
* **Secondary CTA (link):** *Daily Horoscopes*
* **Trust signals (right band):** *Private Audio* · *Secure Payments* · *18+ Only*

### A.3 Section Headers

* **Today’s Cosmic Guidance**
* **Featured Services**
* **Trusted by Seekers Worldwide**

### A.4 Horoscopes Preview (cards)

* **Card title:** *{Zodiac} Today*
* **CTA (grid footer):** *View all 12*
* **Empty state title:** *Today’s horoscopes are preparing.*
* **Empty state subtitle:** *Come back soon or explore services below.*

### A.5 Services (cards)

* **Primary CTA:** *Select*
* **Secondary (link):** *Learn more*
* **Badge (popular):** *Popular*
* **Badge (new):** *New*

### A.6 Checkout — Modes & Flows (controls)

* **Mode label:** *How would you like your reading?*

  * **Reading** — *Receive a written or audio reading later.*
  * **Calling** — *Talk to a reader by voice at a set time.*
* **Flow label (when applicable):** *When do you want it?*

  * **Scheduled** — *Pick a date and time.*
  * **Instant** — *Start now if the reader is online.*
  * **Emergency** — *Priority call. Reader must answer immediately.*

### A.7 Scheduling Form (fields)

* **Reader** — placeholder: *Choose a reader*
* **Service** — placeholder: *Choose a service*
* **Date** — placeholder: *Select date*
* **Time** — placeholder: *Select time*
* **Timezone** — helper: *Times shown in {TZ}*
* **Questions (optional)** — placeholder: *Add context or questions for your reader*
* **Phone (for calls)** — placeholder: *Enter a number we can reach you on*
* **Consent (18+)** — label: *I confirm I’m 18+ and agree to the terms.*
* **Notifications** — label: *Get updates via*

### A.8 Validation / Inline Errors

* *Please select a service.*
* *Please choose a reader or let us assign one.*
* *Please pick a date and time.*
* *Phone number is required for calls.*
* *Consent is required.*
* **Standard error block:** *We couldn’t complete that action.* `({code})` · *Ref:* `{correlation_id}` · [*Retry*]

### A.9 Order / Delivery

* **Timeline labels:** *Created* · *Assigned* · *In progress* · *Delivered*
* **Delivery block:** *Your reading is ready.* — **Buttons:** *Open Text* · *Play Audio* · *Download*
* **Invoice:** *View Invoice (PDF)*
* **Link expired:** *Link expired. Get a new one.*

### A.10 Buttons (system)

* **Primary:** *Continue* / *Pay* / *Create Order* / *Start Now*
* **Secondary:** *Back* / *Change selection* / *Cancel*

---

## B) Tooltips (Quick, Helpful)

* **Reading:** *We’ll deliver a written or audio reading within the promised timeframe.*
* **Calling:** *A voice session at the time you choose.*
* **Scheduled:** *Reserve a slot that fits your time.*
* **Instant:** *Begin immediately if the reader is online.*
* **Emergency:** *Highest priority call—reader must pick up now.*

---

## C) Five‑App Surface (Same Backend, Theme‑Locked)

> All apps share one backend and the same auth store. Each app exposes only what the role needs. Navigation labels below are the **visible** surfaces.

1. **Client App**

   * Navbar: Home, Services, Horoscopes, My Orders, Profile, Login/Logout
   * Capabilities: create orders, schedule/instant/emergency, pay, view deliveries, invoices, manage profile & notif prefs.

2. **Reader App**

   * Navbar: Queue, My Orders, Profile, Logout
   * Capabilities: see assigned orders, upload results, mark progress, see call sessions, limited profile.

3. **Monitor App**

   * Navbar: Review, Calls, Metrics (read), Logout
   * Capabilities: approve/reject readings/horoscopes, supervise calls (including force‑drop for emergency), view metrics snapshot.

4. **Admin App**

   * Navbar: Users, Services, Rate Limits, Metrics, Exports, Logout
   * Capabilities: manage users & roles (except superadmin), CRUD services (add/activate/deactivate), rate‑limit config, metrics, exports.

5. **Superadmin App**

   * Navbar: everything in Admin + Superadmin panel
   * Capabilities: full access incl. audit log, policy toggles, provider keys, global settings, DSR workflows.

> **Role Permissions (from Full APP):**

* **client:** own profile & orders only; read public horoscopes; download own invoices/media via Signed URLs.
* **reader:** assigned orders; upload results; view own call sessions/queue.
* **monitor:** approve/reject content; supervise calls; view ops metrics; no user management.
* **admin:** manage users (not superadmin), services, rate limits, metrics, exports; read audits.
* **superadmin:** all of the above + audit log raw, RLS/roles, providers/secrets, data exports/DSR.

---

## D) Front‑End Cohesion Checklist (No Mocks, Real Data)

* All pages render inside `AppLayout`; background mounted **once**.
* Buttons: **Primary** (solid) / **Secondary** (ghost) only; consistent `:focus-visible` states.
* Cards: equal height via grid; icons RTL‑safe; responsive ramps: Horoscopes 2→3→6, Services 1→2→3.
* Home **Hero CTA** routes to `/checkout?service=...` (no POST from hero).
* **Scheduling UI** present on Checkout (Mode/Flow + Date/Time/Timezone + Questions + Phone/Consent/Notifications). Uses real availability from `reader_slots`.
* **Instant/Emergency** flows implemented; Emergency triggers forced pickup & audit.
* **Invoices/Media** only via short‑lived Signed URLs (≤15m) with `Cache-Control: no-store`.
* **No console warnings** (fonts, keys); animations respect `prefers-reduced-motion`.

---

## E) Home Cleanup — Remove Flying Icons

> Replace decorative flying icons with the static trust band. Keep the cosmic background.

* Remove the floating icons container (motion/absolute group) from Home.
* Keep the gradient overlay only if it doesn’t spawn animated children.
* Example target to remove:

  ```html
  <div class="absolute inset-0 bg-gradient-to-br from-gold-primary/10 to-purple-500/5" style="box-shadow: rgba(212, 175, 55, 0.4) 0px 0px 19.8615px;"></div>
  ```

  If this node hosts moving icons, delete the child cluster or set `hidden` on that block. Trust signals remain as a **static** right‑side band.

---

## F) Admin→Services (Real Data Only)

* Add or edit services from **Admin → Services** (upsert + activate/deactivate).
* Frontend **must not** hard‑code services.

---

## G) Implementation Prompt (for engineers)

**Do not change the theme. Keep code maintainable & short.**

1. Apply the **UI Copy Kit** (A) across Home, Services, Checkout, Orders. Tooltips per (B).
2. Implement five app shells with role‑based navs (C) reading role from `/api/profile/me`.
3. Build **Scheduling UI** on Checkout with real availability and flows (scheduled/instant/emergency) per contracts (D).
4. Remove flying icons from Home (E); keep static trust band; ensure zero console warnings.
5. Ensure services list comes from **Admin → Services** only; no FE mocks (F).
6. Open invoices/media via short‑lived Signed URLs with `no-store` headers.

**Acceptance:** Frontend feature‑complete; all flows work E2E with real APIs; navs per role; Home clean (no flying icons); zero console warnings; same cosmic/neon theme preserved.

---

## H) No‑Mocks / Production‑Only Policy (Supabase is the single source of truth)

* **No mocks, no fixtures, no fake/test data or files** in production builds. Remove/disable any mock server, static JSON, or stub handlers.
* **Auth & users:** All **Sign up / Sign in** must go through **Supabase Auth**; users and roles are read from the real DB (`profiles` ↔ `roles`). No local dummy accounts or hard‑coded JWTs.
* **Catalog & content:** Services/horoscopes/orders/calls must come from **real APIs**. Any new service is added **only** from **Admin → Services** (upsert/activate/deactivate), not from the frontend.
* **Environment guard:** `NODE_ENV==='production'` and a `NO_MOCKS=1` flag must **hard‑fail** any attempt to import mock modules or call mock endpoints.
* **CI gate:** fail the build if tests detect references to `/mock`, `fixtures`, or static JSON under `src/**/data`. Lint rule: ban `msw`, `faker`, or in‑repo mock adapters in production bundle.
* **Acceptance:** Production bundle makes **only** real network calls; Supabase session present for authenticated flows; no console warnings.

### H.1 Engineer Prompt (No‑Mocks Enforcement)

**Do not change the theme. Keep code maintainable & short.**

* Remove/disable any mock server, fixtures, or stub data. Enforce `NO_MOCKS=1` in prod builds and add a guard that throws if a mock import is loaded.
* Ensure **Sign up / Sign in** use **Supabase** only; delete any local login bypass or hard‑coded tokens.
* Make the services list, readers, availability, orders, payments, calls, and invoices use the **real API**. Any new service must be created from **Admin → Services**.
* Verify that production bundle contains no mock code paths and that all requests hit `/api/*` only. Ensure zero console warnings.

---

## I) Layout & Style System — Home / Sign Up / Login (Theme‑Locked)

> Goal: a perfectly consistent look & feel across the public entry points. **No mocks, real data only.** Do not change the cosmic/neon theme.

### I.1 Global Layout Rules

* **Container:** `max-w-screen-xl`, horizontal padding `px-4 sm:px-6 lg:px-8`.
* **Vertical rhythm:** sections spaced by `py-12 sm:py-16 lg:py-20`.
* **Grid:** 1‑col on mobile, upgrade to 2‑col at `md`, 3‑col+ at `lg` where needed (Services/Horoscopes rules already defined in D).
* **Cards:** equal heights via grid; internal padding `p-5 sm:p-6`; subtle glassmorphism fits theme.
* **Typography scale:** use existing vars; headings

  * H1 (Hero): clamp to keep LCP stable
  * H2 sections: consistent weight 700; decorative gradient text allowed per theme
* **Focus/A11y:** use `:focus-visible` rings only; keyboard order follows visual order.
* **Motion:** all decorative motion must respect `@media (prefers-reduced-motion: reduce)`; no auto‑looping motion inside forms.

### I.2 Top Navbar (Home + Auth pages)

* **Structure:** sticky `top-0`, backdrop‑blur, subtle glass; height ~`64px`.
* **Left:** brand/logo (links to `/`).
* **Center (public):** `Home · Services · Horoscopes`.
* **Right (auth):** `Login` when logged‑out; `My Orders · Profile · Logout` when logged‑in.
* **Admin surfaces:** collapse into a single **Admin** menu (admin/superadmin only) to avoid clutter.
* **States:** active link underlined or tinted; hover subtle; focus ring prominent with `:focus-visible`.
* **No flying icons** inside navbar.

### I.3 Home Page Layout (final)

* **Hero:** full‑bleed band, min‑height ~`68vh` (not 100vh) to reduce CLS; primary CTA **Get Your Reading** routes to `/checkout?service=...`; secondary `Daily Horoscopes`.
* **Trust band (right):** static 3 badges (Private Audio · Secure Payments · 18+ Only).
* **Remove** any floating icons group; keep cosmic gradient background only.
* **Sections order:** Hero → Trust band → Horoscopes (6 of 12) → Services teaser (3) → CTA band.

### I.4 Forms — Field Layout & States (Sign Up / Login / Checkout)

* **Labeling:** labels always visible **above** inputs; **no placeholder‑as‑label** pattern.
* **Required mark:** `*` for required; helper text under the field; error text under helper.
* **Field grid:** mobile 1‑col; at `md` use 2‑col for long forms (Checkout); auth forms remain 1‑col.
* **Controls:**

  * Text: email, password, phone, questions (textarea)
  * Selects: service, reader, timezone, time slot
  * Radios/segmented: **Mode** (Reading/Calling), **Flow** (Scheduled/Instant/Emergency)
  * Checkbox: **18+ consent**
* **Validation states:**

  * Success: subtle border glow; Error: red border + icon; Focus ring unaffected
  * Inline error messages (short, precise); do not rely on alerts

### I.5 Auth Pages (Supabase only)

* **Sign Up fields:** Email, Password (min 8), optional **Name** (or collect later in Profile).
* **Sign In fields:** Email, Password; link **Forgot password?**
* **Buttons:** Primary `Create account` / `Sign in`; Secondary `Back`.
* **Copy:** short, friendly; avoid exclamation marks.
* **Post‑auth redirect:** to Home; navbar updates immediately (My Orders, Profile, Logout).
* **No mocks:** calls go through Supabase; remove any local login bypass.

### I.6 Microcopy — Auth

* **Sign Up title:** *Create your account*
* **Subtitle:** *Start your journey with certified readers.*
* **Sign In title:** *Welcome back*
* **Subtitle:** *Sign in to continue your readings.*
* **Errors:** *Invalid email or password.* / *Please check your inbox to verify your email.*

### I.7 Acceptance — UI polish

* Top navbar consistent across Home/Sign Up/Login; role menus correct.
* Auth forms centered, tidy, with proper spacing and zero console warnings.
* Home has no floating icons; trust band static; hero CTA navigates (no POST).
* Field labels, helpers, and errors render consistently across all forms.

---

## J) Role Apps — Navbar Definitions (recap)

* **Client:** Home, Services, Horoscopes, My Orders, Profile, Login/Logout
* **Reader:** Queue, My Orders, Profile, Logout
* **Monitor:** Review, Calls, Metrics (read), Logout
* **Admin:** Users, Services, Rate Limits, Metrics, Exports, Logout
* **Superadmin:** Admin + Superadmin panel

---

## K) Implementation Prompt — Layout & Auth polish

**Do not change the theme. Keep code maintainable & short.**

1. Apply the **Top Navbar spec** (I.2) to Home + Auth pages, with Admin menu collapsed for elevated roles.
2. Update **Home** to the final layout (I.3): static trust band, hero CTA routes, no floating icons.
3. Implement **Auth forms** per I.5/I.6 using Supabase only; remove any local bypass; add minimal inline validation.
4. Enforce **Form layout rules** (I.4) across Sign Up / Login / Checkout; labels above inputs; consistent error/help text.
5. Verify zero console warnings and that all pages render inside `AppLayout` with the cosmic/neon theme.

**Acceptance:** navbar consistent, forms tidy and accessible, hero clean, and all auth flows use real Supabase users (no mocks).

---

## L) Front‑End Patchset — Home, Login, Register (final UI polish)

> Target: perfect visuals for Home + Login + Register. Remove font console errors, tidy navbar, fix forms spacing, and keep only the static trust band on Home. **Production, no mocks.**

### L.1 Fonts (fix OTS errors)

**index.html — replace the fonts block with exactly this:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
```

**And remove** any `rel="preload"` to the Google Fonts **CSS** URL and any `@import` for Inter inside `src/index.css`.

### L.2 App shell (avoid duplicated navbar)

Ensure the navbar renders **once** from `AppLayout`, not inside pages.

```jsx
// src/layout/AppLayout.jsx
import { Outlet } from 'react-router-dom'
import Navigation from '@/components/Navigation'

export default function AppLayout(){
  return (
    <div className="min-h-screen bg-cosmic text-white">
      <Navigation />
      <main className="min-h-[calc(100vh-4rem)]"> 
        <Outlet />
      </main>
    </div>
  )
}
```

In `App.jsx` wrap `<Routes/>` inside `<AppLayout/>`, and **remove** any extra `<Navigation/>` calls inside pages.

### L.3 Navigation (clean, role‑aware, clutter‑free)

```jsx
// src/components/Navigation.jsx
export default function Navigation(){
  const { user, role, logout } = useAuth()
  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-black/40 border-b border-white/10">
      <div className="max-w-screen-xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link to="/" className="font-bold tracking-wide">SAMIA TAROT</Link>
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/horoscopes">Horoscopes</NavLink>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <NavLink to="/orders">My Orders</NavLink>
              <NavLink to="/profile">Profile</NavLink>
              {(role==='reader'||role==='monitor'||role==='admin'||role==='superadmin') && (
                <details className="relative">
                  <summary className="cursor-pointer">Admin</summary>
                  <div className="absolute right-0 mt-2 min-w-44 rounded-xl border border-white/10 bg-black/80 p-2 backdrop-blur">
                    {role==='reader'   && <NavLink to="/reader/queue">Reader Queue</NavLink>}
                    {role==='monitor'  && (<>
                      <NavLink to="/monitor/review">Review</NavLink>
                      <NavLink to="/monitor/calls">Calls</NavLink>
                    </>)}
                    {(role==='admin'||role==='superadmin') && (<>
                      <NavLink to="/admin/users">Users</NavLink>
                      <NavLink to="/admin/services">Services</NavLink>
                      <NavLink to="/admin/rate-limits">Rate Limits</NavLink>
                      <NavLink to="/admin/metrics">Metrics</NavLink>
                      <NavLink to="/admin/exports">Exports</NavLink>
                    </>)}
                    {role==='superadmin' && <NavLink to="/superadmin">Superadmin</NavLink>}
                  </div>
                </details>
              )}
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <NavLink to="/login">Login</NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}
```

### L.4 Home (remove flying icons, keep trust band)

Remove any absolute/motion layer that spawns decorative icons. Keep only the gradient background and the right‑side trust band. Example to remove:

```jsx
<div className="absolute inset-0 bg-gradient-to-br from-gold-primary/10 to-purple-500/5" style={{ boxShadow:'rgba(212,175,55,.4) 0 0 19.86px' }} />
```

**Hero CTA:** navigate to `/checkout?service=tarot_basic` (no POST). Sections order: Hero → Trust band → Horoscopes (6) → Services (3) → CTA band.

### L.5 Auth pages — tidy, consistent forms

```jsx
// src/pages/Login.jsx (structure)
export default function Login(){
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
      <p className="text-white/70 mb-6">Sign in to continue your readings.</p>
      <form className="space-y-5">
        <div>
          <label className="block mb-1">Email Address</label>
          <input type="email" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3" />
        </div>
        <div>
          <label className="block mb-1">Password</label>
          <input type="password" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" className="accent-current" />
            <span>Remember me</span>
          </label>
          <Link to="/forgot">Forgot password?</Link>
        </div>
        <button className="w-full rounded-2xl px-4 py-3 bg-purple-600 hover:bg-purple-500">Sign In</button>
        <p className="text-sm text-center">Don’t have an account? <Link to="/register" className="underline">Create Account</Link></p>
      </form>
    </div>
  )
}
```

```jsx
// src/pages/Register.jsx (structure)
export default function Register(){
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-2">Create your account</h1>
      <p className="text-white/70 mb-6">Start your journey with certified readers.</p>
      <form className="space-y-5">
        <div>
          <label className="block mb-1">Email Address</label>
          <input type="email" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3" />
        </div>
        <div>
          <label className="block mb-1">Password</label>
          <input type="password" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3" />
        </div>
        <div>
          <label className="block mb-1">Confirm Password</label>
          <input type="password" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3" />
        </div>
        <button className="w-full rounded-2xl px-4 py-3 bg-purple-600 hover:bg-purple-500">Create account</button>
        <p className="text-sm text-center">Already have an account? <Link to="/login" className="underline">Sign in</Link></p>
      </form>
    </div>
  )
}
```

### L.6 Quick QA

* Hard refresh after the `index.html` change.
* `/register` works and shows the tidy form.
* Navbar appears **once** across pages and brand isn’t duplicated.
* Home shows **no flying icons**; trust band static; hero CTA routes to Checkout.
* Console: no font OTS/keys warnings.
