# SAMIA TAROT - Monorepo

> **Complete implementation following:**
> - `samia_tarot_backend_core_consolidated_master.md`
> - `samia_tarot_dev_implementation_pack.md`
> - `samia_tarot_frontend_consolidated_master.md`

---

## ✅ **IMPLEMENTATION STATUS**

### **Completed Core Foundation**

✅ Monorepo structure (`/apps`, `/libs`, `/packages`, `/functions`)
✅ Database migrations (M011-M019) with RLS
✅ Edge Functions (auth, webhooks, zodiac, webrtc)
✅ Twilio Verify OTP helpers
✅ SendGrid automation scripts
✅ LiveKit integration backend
✅ Comprehensive `.env.example`
✅ Root `package.json` + `turbo.json`
✅ Documentation (DNS, Verify, LiveKit)

### **In Progress**

🚧 Shared UI libraries
🚧 5 PWA applications
🚧 Payment orchestration UI
🚧 n8n workflows

---

## 🏗️ **Architecture**

```
/
├── apps/                    # 5 PWAs
│   ├── client/             # Client PWA + Capacitor
│   ├── reader/             # Reader PWA (Back-Office)
│   ├── monitor/            # Monitor PWA (Back-Office)
│   ├── admin/              # Admin PWA (Back-Office)
│   └── superadmin/         # SuperAdmin PWA (Back-Office)
│
├── libs/                    # Shared UI libraries
│   ├── ui-kit/             # Components
│   ├── auth/               # Auth flows
│   ├── payments/           # Payment UI
│   ├── realtime/           # LiveKit hooks
│   ├── i18n/               # i18next + RTL
│   ├── zodiac/             # Zodiac components
│   └── utils/              # Helpers
│
├── packages/                # Backend services
│   ├── backend/            # API routes
│   ├── realtime/           # LiveKit adapters
│   ├── payments/           # Payment orchestration
│   ├── i18n/               # Translation automation
│   └── shared/             # Types & utils
│
├── functions/               # Supabase Edge Functions (Deno)
│   ├── auth/               # signup, verify-email, verify-wa
│   ├── webrtc/             # token generation
│   ├── webhooks/           # stripe, square (idempotent)
│   ├── zodiac/             # audio-url (KSA boundary)
│   ├── payments/           # checkout, USDT
│   └── wallet/             # cashout workflow
│
├── sql/                     # Database migrations
│   ├── M011_wallet_payouts.sql
│   ├── M012_rewards.sql
│   ├── M013_i18n_translations.sql
│   ├── M015_auth_profiles.sql
│   ├── M016_auth_verifications.sql
│   ├── M017_auth_mfa.sql
│   ├── M018_daily_zodiac.sql
│   └── M019_rls_policies.sql
│
├── scripts/                 # Automation
│   ├── sendgrid_auth_create.sh
│   ├── sendgrid_auth_validate.sh
│   └── cloudflare_upsert_dns.sh
│
└── docs/                    # Guides
    ├── dns-manual-steps.md
    ├── verify-setup.md
    └── livekit-region-pinning.md
```

---

## 🚀 **Quick Start**

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local
# Fill in your credentials

# 3. Run database migrations
npm run migration:up

# 4. Deploy Edge Functions
npm run supabase:functions:deploy

# 5. Setup SendGrid (see docs/dns-manual-steps.md)
bash scripts/sendgrid_auth_create.sh
# Add 3 CNAMEs to your DNS provider
bash scripts/sendgrid_auth_validate.sh

# 6. Start development
npm run dev              # All apps
npm run dev:client       # Client only (port 3000)
npm run dev:reader       # Reader only (port 3001)
```

---

## 📦 **Scripts**

| Command | Description |
|---------|-------------|
| `npm run dev` | Run all apps in parallel |
| `npm run build` | Build all apps for production |
| `npm run lint` | Lint all packages |
| `npm run typecheck` | TypeScript type checking |
| `npm run migration:up` | Apply database migrations |
| `npm run supabase:functions:deploy` | Deploy Edge Functions |
| `npm run mobile:build:client` | Build Client mobile app |

---

## 🔐 **Security**

- ✅ **RLS**: Enabled on all tables
- ✅ **Rate Limiting**: 5 tries/10m → 15m lockout
- ✅ **MFA**: Staff required, clients optional
- ✅ **Age Gate**: ≥18 enforced
- ✅ **CSP**: Cloudflare + strict allowlists
- ✅ **Secrets**: Supabase Vault (never in frontend)

---

## 🎯 **Core Features**

### **Auth**
- Dual verification (Email + WhatsApp, SMS fallback)
- Mandatory fields (name, gender, marital status, DOB, WhatsApp E.164, country, timezone, language)
- TOTP/WebAuthn MFA
- Passkeys support

### **Wallet & Cashouts**
- Client wallet: Store credit only
- Reader/Staff: Full cashout workflow
- Payout methods: Bank, PayPal, Wise, Crypto

### **Rewards**
- Points earning: Rating=50%, Comment=50%, Both=100%
- Redeem at checkout
- 365-day expiry (configurable)

### **Payments**
- Stripe primary (SCA/3DS auto)
- Square auto-switch (after 2 Stripe failures)
- USDT TRC20 via Bybit
- Manual transfers (Western Union, OMT, etc.)
- Always-USD billing

### **Daily Zodiac (KSA Boundary)**
- Day definition: Asia/Riyadh
- Clients: Own sign, today only
- Staff: All signs, last 60 days
- Signed URLs: TTL until next KSA midnight
- On-demand audio generation
- Auto-cleanup (>60 days)

### **Realtime (LiveKit)**
- Region pinning: EU (Frankfurt)
- JWT token generation
- Server-side recording (egress)
- Storage: Supabase Storage

### **i18n**
- Machine translation via n8n → Google Translation v3
- Admin override support
- Fallback to source locale
- RTL support for Arabic

---

## 📊 **Business Rules**

| Rule | Value |
|------|-------|
| Refund cutoff | ≥2h before appointment |
| Reader revenue share | 50% |
| Age gate | ≥18 years |
| Reward points (rating) | 50% |
| Reward points (comment) | 50% |
| Reward points (both) | 100% |
| Reward expiry | 365 days |
| Zodiac retention | 60 days |
| Default timezone | Asia/Riyadh |

---

## 📚 **Documentation**

- **DNS Setup**: `docs/dns-manual-steps.md`
- **Twilio Verify**: `docs/verify-setup.md`
- **LiveKit Region Pinning**: `docs/livekit-region-pinning.md`
- **Backend Spec**: `samia_tarot_backend_core_consolidated_master.md`
- **Dev Pack**: `samia_tarot_dev_implementation_pack.md`
- **Frontend Spec**: `samia_tarot_frontend_consolidated_master.md`

---

## 🚨 **Troubleshooting**

### Database Issues
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"
```

### Edge Functions
```bash
# View logs
supabase functions logs

# Redeploy
npm run supabase:functions:deploy
```

### SendGrid
```bash
# Validate domain
bash scripts/sendgrid_auth_validate.sh

# Check DNS
dig em.samiatarot.com CNAME
```

### LiveKit
```bash
# Check latency
ping fra.livekit.io

# Verify ports 443, 7881 are open
```

---

## 📝 **License**

MIT

---

**Built with ❤️ following SAMIA TAROT specifications**