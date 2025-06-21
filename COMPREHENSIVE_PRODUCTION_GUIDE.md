# 🚀 SAMIA TAROT - COMPREHENSIVE PRODUCTION DEPLOYMENT GUIDE

## 📋 Complete Environment Variables Setup

### 🎯 Quick Start Checklist

```bash
# 1. Copy environment template
cp .env.production.template .env

# 2. Fill in your actual API keys and secrets
nano .env

# 3. Run production environment checker
node check-production-env.js

# 4. Deploy only if all checks pass
```

---

## 🔥 CRITICAL SERVICES (Must Configure)

### 🗄️ Database & Core
- **SUPABASE_URL** - Your Supabase project URL
- **SUPABASE_ANON_KEY** - Public anon key from Supabase
- **SUPABASE_SERVICE_ROLE_KEY** - Service role key (keep secret!)
- **JWT_SECRET** - Ultra-secure random string (64+ chars)

### 💳 Payment Processing
- **STRIPE_SECRET_KEY** - For EU/UAE credit cards
- **STRIPE_PUBLISHABLE_KEY** - Frontend Stripe key
- **SQUARE_ACCESS_TOKEN** - For US/CA/AU/GB/JP cards
- **SQUARE_APPLICATION_ID** - Square app identifier

### 📞 Communication
- **AGORA_APP_ID** - Video calls and WebRTC
- **TWILIO_ACCOUNT_SID** - SMS and voice calls
- **TWILIO_AUTH_TOKEN** - Twilio authentication

### 💾 Storage & Backup
- **BACKBLAZE_KEY_ID** - B2 storage access key
- **BACKBLAZE_APP_KEY** - B2 application key
- **BACKBLAZE_BUCKET_NAME** - Your backup bucket

### 📧 Email & Notifications
- **SMTP_HOST** - Email server host
- **SMTP_USER** - Email username
- **SMTP_PASS** - Email password
- **SENDGRID_API_KEY** - Alternative email service

---

## ⚡ IMPORTANT SERVICES (Recommended)

### 🤖 AI Services
- **OPENAI_API_KEY** - AI tarot readings
- **ELEVENLABS_API_KEY** - Text-to-speech

### 🪙 Cryptocurrency
- **USDT_API_KEY** - Crypto payment processing
- **USDT_WALLET_ADDRESS** - Your USDT wallet

### 🌍 International Transfers
- **WESTERN_UNION_API_KEY** - Money transfer service
- **MONEYGRAM_API_KEY** - Global money transfer
- **RIA_API_KEY** - International remittance

### 📊 Analytics & Monitoring
- **GOOGLE_ANALYTICS_ID** - Usage tracking
- **SENTRY_DSN** - Error monitoring
- **UPTIMEROBOT_API_KEY** - Uptime monitoring

---

## 📝 COMPLETE ENVIRONMENT TEMPLATE

```env
# ============================================================================
# 🗄️ CORE INFRASTRUCTURE (CRITICAL)
# ============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_ultra_secure_jwt_secret_64_characters_minimum

# ============================================================================
# 🔐 SECURITY (CRITICAL)
# ============================================================================
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
CORS_ORIGIN=https://your-domain.com

# ============================================================================
# 💳 PAYMENT GATEWAYS (CRITICAL)
# ============================================================================
# Stripe (EU/UAE)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_public
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Square (US/CA/AU/GB/JP)
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_WEBHOOK_SIGNATURE_KEY=your_square_webhook_key

# ============================================================================
# 🪙 CRYPTOCURRENCY (IMPORTANT)
# ============================================================================
USDT_API_KEY=your_crypto_api_key
USDT_WALLET_ADDRESS=your_usdt_wallet_address
TRON_API_KEY=your_tron_api_key
TRON_NETWORK=mainnet

# ============================================================================
# 🌍 INTERNATIONAL TRANSFERS (IMPORTANT)
# ============================================================================
WESTERN_UNION_API_KEY=your_wu_api_key
WESTERN_UNION_API_SECRET=your_wu_secret
MONEYGRAM_API_KEY=your_mg_api_key
MONEYGRAM_API_SECRET=your_mg_secret
RIA_API_KEY=your_ria_api_key
RIA_API_SECRET=your_ria_secret

# ============================================================================
# 🏦 LEBANON-SPECIFIC (OPTIONAL)
# ============================================================================
OMT_API_KEY=your_omt_api_key
OMT_API_SECRET=your_omt_secret
WHISH_API_KEY=your_whish_api_key
WHISH_API_SECRET=your_whish_secret
BOB_API_KEY=your_bob_api_key
BOB_API_SECRET=your_bob_secret

# ============================================================================
# 💾 STORAGE & BACKUP (CRITICAL)
# ============================================================================
# Backblaze B2
BACKBLAZE_KEY_ID=your_b2_key_id
BACKBLAZE_APP_KEY=your_b2_app_key
BACKBLAZE_BUCKET_NAME=samia-tarot-backups
BACKBLAZE_BUCKET_ID=your_bucket_id
BACKBLAZE_ENDPOINT=https://s3.us-west-004.backblazeb2.com

# AWS S3 (Alternative)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=samia-tarot-storage

# Cloudinary (CDN)
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# ============================================================================
# 🤖 AI SERVICES (IMPORTANT)
# ============================================================================
OPENAI_API_KEY=sk-your_openai_key
OPENAI_ORG_ID=org-your_openai_org
OPENAI_MODEL=gpt-4
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id

# ============================================================================
# 📞 COMMUNICATION (CRITICAL)
# ============================================================================
# Agora (Video calls)
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_cert

# Twilio (SMS/Voice)
TWILIO_ACCOUNT_SID=ACyour_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# ============================================================================
# 📧 EMAIL & NOTIFICATIONS (CRITICAL)
# ============================================================================
# SMTP
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass

# SendGrid
SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@your-domain.com

# ============================================================================
# 📱 PUSH NOTIFICATIONS (IMPORTANT)
# ============================================================================
FCM_SERVER_KEY=your_fcm_server_key
FCM_PROJECT_ID=your_firebase_project
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_key

# ============================================================================
# 📊 ANALYTICS & MONITORING (IMPORTANT)
# ============================================================================
GOOGLE_ANALYTICS_ID=GA-your_tracking_id
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project
UPTIMEROBOT_API_KEY=ur_your_uptimerobot_key
NEW_RELIC_LICENSE_KEY=your_newrelic_key

# ============================================================================
# 🗄️ CACHING (RECOMMENDED)
# ============================================================================
REDIS_URL=redis://your-redis-host:6379
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# ============================================================================
# 🎯 FRONTEND (CRITICAL)
# ============================================================================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_ENV=production
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_public
VITE_SQUARE_APPLICATION_ID=your_square_app_id
VITE_AGORA_APP_ID=your_agora_app_id
VITE_GOOGLE_ANALYTICS_ID=GA-your_tracking_id

# ============================================================================
# ⚙️ SYSTEM (CRITICAL)
# ============================================================================
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info
DEFAULT_CURRENCY=USD
SUPPORTED_CURRENCIES=USD,EUR,GBP,AED,SAR,LBP
SUPPORTED_LANGUAGES=en,ar,fr,es

# ============================================================================
# 🚨 EMERGENCY (CRITICAL)
# ============================================================================
EMERGENCY_ESCALATION_TIMEOUT=300
EMERGENCY_ADMIN_EMAIL=emergency@your-domain.com
EMERGENCY_ADMIN_PHONE=+1234567890
MAX_DAILY_EMERGENCY_CALLS=10

# ============================================================================
# 👨‍💼 ADMIN (CRITICAL)
# ============================================================================
ADMIN_DEFAULT_EMAIL=admin@your-domain.com
ADMIN_DEFAULT_PASSWORD=your_secure_admin_password
SUPER_ADMIN_SECRET=your_super_admin_secret
```

---

## 🔍 Environment Checker Usage

```bash
# Install dependencies
npm install

# Run the environment checker
node check-production-env.js

# Expected output:
# 🚀 SAMIA TAROT - Production Environment Checker
# ============================================================
# 
# 📊 OVERALL STATUS:
#    Total Variables: 89
#    ✅ Present: 89
#    ❌ Missing: 0
#    📈 Completion: 100%
# 
# 🔥 CRITICAL:
#    35/35 (100%) configured
# 
# ⚡ IMPORTANT:
#    28/28 (100%) configured
# 
# 🎯 PRODUCTION READINESS:
# 
# ✅ READY FOR PRODUCTION!
#    All critical systems are properly configured.
# 
# 🛡️ SECURITY VALIDATION:
# 
# ✅ Security settings look good!
# 
# 🎯 FINAL VERDICT:
# 
# 🚀 READY FOR PRODUCTION DEPLOYMENT!
#    All critical systems are properly configured.
```

---

## 🛡️ Security Best Practices

### 🔐 API Keys Security
1. **Never commit .env files** to version control
2. **Use different keys** for staging/production
3. **Rotate keys quarterly** for security
4. **Enable 2FA** on all service accounts
5. **Monitor API usage** for anomalies

### 🔒 JWT Configuration
- **Minimum 64 characters** for JWT_SECRET
- **No placeholder values** in production
- **Regular rotation** of secrets

### 🌐 CORS & Network Security
- **Specific domain** for CORS_ORIGIN (never use *)
- **HTTPS only** in production
- **Rate limiting** enabled

---

## 📊 Service Integration Priority

### 🔥 Deploy Immediately (Critical)
- ✅ Supabase Database
- ✅ JWT Authentication
- ✅ Stripe/Square Payments
- ✅ Email Notifications
- ✅ File Storage

### ⚡ Deploy Soon (Important)
- 🔄 Video Calls (Agora/Twilio)
- 🔄 AI Services (OpenAI)
- 🔄 Error Monitoring (Sentry)
- 🔄 Analytics (Google Analytics)

### 📊 Deploy Later (Recommended)
- 🔄 Redis Caching
- 🔄 Advanced Analytics
- 🔄 Push Notifications

### 🎯 Deploy Optional (Nice to have)
- 🔄 Lebanon-specific payments
- 🔄 Additional monitoring tools

---

## 🚨 Emergency Checklist

Before going live, ensure:

- [ ] **All critical environment variables** are configured
- [ ] **Security validation** passes
- [ ] **Database migrations** are complete
- [ ] **Payment gateways** are tested
- [ ] **Email system** is working
- [ ] **Backup system** is active
- [ ] **Monitoring** is enabled
- [ ] **Emergency contacts** are configured

---

## 📞 Support & Escalation

### 🆘 Emergency Contacts
- **Technical Issues**: emergency@your-domain.com
- **Payment Issues**: payments@your-domain.com
- **Security Issues**: security@your-domain.com

### 📊 Monitoring Dashboards
- **Uptime**: UptimeRobot dashboard
- **Errors**: Sentry dashboard
- **Analytics**: Google Analytics
- **Payments**: Stripe/Square dashboards

---

**🎯 Remember: Only deploy to production when ALL critical checks pass!**

## 🚀 Final Deployment Command

```bash
# 1. Check environment
node check-production-env.js

# 2. Run tests
npm test

# 3. Build production
npm run build

# 4. Deploy
npm run deploy:production
```

---

**✨ Your SAMIA TAROT platform is now ready for production! 🌟** 