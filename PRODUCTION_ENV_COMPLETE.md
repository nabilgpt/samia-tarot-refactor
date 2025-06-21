# 🚀 SAMIA TAROT - PRODUCTION ENVIRONMENT TEMPLATE

## 📋 Complete Environment Variables Configuration

```env
# ============================================================================
# SAMIA TAROT - COMPREHENSIVE PRODUCTION ENVIRONMENT TEMPLATE
# ============================================================================
# 🚀 Complete configuration for production deployment
# 📋 Copy this template to .env and fill in your actual values
# ⚠️  NEVER commit .env files to version control!
# ============================================================================

# ============================================================================
# 🗄️  DATABASE & CORE INFRASTRUCTURE
# ============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ============================================================================
# 🔐 AUTHENTICATION & SECURITY
# ============================================================================
JWT_SECRET=your_ultra_secure_jwt_secret_minimum_64_characters_recommended
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# reCAPTCHA (for bot protection)
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
RECAPTCHA_SITE_KEY=your_recaptcha_site_key

# API Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
CORS_ORIGIN=https://your-domain.com

# ============================================================================
# 💳 PAYMENT GATEWAYS
# ============================================================================

# Stripe (Primary for EU/UAE)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Square (Primary for US/CA/AU/GB/JP)
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_APPLICATION_ID=your_square_application_id
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_ENVIRONMENT=production
SQUARE_WEBHOOK_SIGNATURE_KEY=your_square_webhook_signature_key

# ============================================================================
# 🪙 CRYPTOCURRENCY PAYMENTS
# ============================================================================

# USDT/Crypto Configuration
USDT_API_KEY=your_crypto_api_key
USDT_WALLET_ADDRESS=your_usdt_wallet_address
USDT_PRIVATE_KEY=your_usdt_private_key_encrypted
TRON_API_KEY=your_tron_api_key
TRON_NETWORK=mainnet

# ============================================================================
# 🌍 INTERNATIONAL TRANSFER SERVICES
# ============================================================================

# Western Union
WESTERN_UNION_API_KEY=your_western_union_api_key
WESTERN_UNION_API_SECRET=your_western_union_api_secret

# MoneyGram
MONEYGRAM_API_KEY=your_moneygram_api_key
MONEYGRAM_API_SECRET=your_moneygram_api_secret

# Ria Money Transfer
RIA_API_KEY=your_ria_api_key
RIA_API_SECRET=your_ria_api_secret

# ============================================================================
# 🏦 LEBANON-SPECIFIC PAYMENT METHODS
# ============================================================================

# OMT (Oman & Lebanon)
OMT_API_KEY=your_omt_api_key
OMT_API_SECRET=your_omt_api_secret

# Whish Money (Lebanon)
WHISH_API_KEY=your_whish_api_key
WHISH_API_SECRET=your_whish_api_secret

# BOB Finance (Bank of Beirut)
BOB_API_KEY=your_bob_api_key
BOB_API_SECRET=your_bob_api_secret

# ============================================================================
# 💾 BACKUP & STORAGE
# ============================================================================

# Backblaze B2 (Primary backup storage)
BACKBLAZE_KEY_ID=your_backblaze_key_id
BACKBLAZE_APP_KEY=your_backblaze_application_key
BACKBLAZE_BUCKET_NAME=samia-tarot-backups
BACKBLAZE_BUCKET_ID=your_bucket_id
BACKBLAZE_ENDPOINT=https://s3.us-west-004.backblazeb2.com

# AWS S3 (Alternative/Secondary storage)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=samia-tarot-storage

# Cloudinary (Image/Media CDN)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ============================================================================
# 🤖 AI & TEXT-TO-SPEECH SERVICES
# ============================================================================

# OpenAI (Primary AI provider)
OPENAI_API_KEY=sk-your_openai_api_key
OPENAI_ORG_ID=org-your_openai_organization_id
OPENAI_MODEL=gpt-4

# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_default_voice_id

# Google AI (Alternative/Backup)
GOOGLE_AI_API_KEY=your_google_ai_api_key
GOOGLE_PROJECT_ID=your_google_project_id

# ============================================================================
# 📞 REAL-TIME COMMUNICATION & CALLS
# ============================================================================

# Agora (Primary WebRTC provider)
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Twilio (SMS, Voice calls, Video backup)
TWILIO_ACCOUNT_SID=ACyour_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_API_KEY_SID=your_twilio_api_key_sid
TWILIO_API_KEY_SECRET=your_twilio_api_key_secret
TWILIO_PHONE_NUMBER=+1234567890

# ============================================================================
# 📧 EMAIL & NOTIFICATIONS
# ============================================================================

# SMTP (Primary email)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# SendGrid (Alternative email service)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@your-domain.com
SENDGRID_TEMPLATE_WELCOME=d-your_welcome_template_id

# ============================================================================
# 📱 SMS & ALTERNATIVE COMMUNICATION
# ============================================================================

# SMS Service Provider
SMS_SERVICE_PROVIDER=twilio

# Vonage (Alternative SMS provider)
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret

# ============================================================================
# 🔔 PUSH NOTIFICATIONS
# ============================================================================

# Firebase Cloud Messaging
FCM_SERVER_KEY=your_fcm_server_key
FCM_PROJECT_ID=your_firebase_project_id

# Apple Push Notification Service
APNS_KEY_ID=your_apns_key_id
APNS_TEAM_ID=your_apple_team_id
APNS_BUNDLE_ID=com.yourcompany.samia-tarot

# OneSignal (Alternative push notifications)
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key

# ============================================================================
# 📊 ANALYTICS & MONITORING
# ============================================================================

# Google Analytics
GOOGLE_ANALYTICS_ID=GA-your_tracking_id

# Mixpanel (Advanced analytics)
MIXPANEL_TOKEN=your_mixpanel_token

# Sentry (Error tracking & monitoring)
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id

# UptimeRobot (Uptime monitoring)
UPTIMEROBOT_API_KEY=ur_your_uptimerobot_api_key

# New Relic (Performance monitoring)
NEW_RELIC_LICENSE_KEY=your_new_relic_license_key

# ============================================================================
# 🗄️  CACHING & SESSION STORAGE
# ============================================================================

# Redis (Caching, sessions, real-time)
REDIS_URL=redis://your-redis-host:6379
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# ============================================================================
# 🌐 CDN & PERFORMANCE
# ============================================================================

# Cloudflare
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# ============================================================================
# 🎯 FRONTEND CONFIGURATION (VITE VARIABLES)
# ============================================================================

# Core Frontend Config
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_APP_ENV=production
VITE_API_BASE_URL=https://api.your-domain.com

# Payment Frontend Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
VITE_SQUARE_APPLICATION_ID=your_square_application_id

# Communication Frontend
VITE_AGORA_APP_ID=your_agora_app_id
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key

# AI Frontend (if needed)
VITE_OPENAI_API_KEY=sk-your_openai_api_key_for_frontend

# Analytics Frontend
VITE_GOOGLE_ANALYTICS_ID=GA-your_tracking_id
VITE_SENTRY_DSN=https://your_frontend_sentry_dsn@sentry.io/project_id

# Storage Frontend
VITE_B2_APPLICATION_KEY_ID=your_b2_key_id
VITE_B2_APPLICATION_KEY=your_b2_app_key
VITE_B2_BUCKET_ID=your_b2_bucket_id
VITE_B2_BUCKET_NAME=samia-tarot-uploads
VITE_B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com

# ============================================================================
# 🌍 REGIONAL & LOCALIZATION
# ============================================================================

# Currency & Language Settings
DEFAULT_CURRENCY=USD
DEFAULT_TIMEZONE=UTC
SUPPORTED_CURRENCIES=USD,EUR,GBP,AED,SAR,LBP
SUPPORTED_LANGUAGES=en,ar,fr,es

# ============================================================================
# 🚨 EMERGENCY & ESCALATION
# ============================================================================

# Emergency System Configuration
EMERGENCY_ESCALATION_TIMEOUT=300
EMERGENCY_ADMIN_EMAIL=emergency@your-domain.com
EMERGENCY_ADMIN_PHONE=+1234567890
MAX_DAILY_EMERGENCY_CALLS=10

# ============================================================================
# ⚙️  FEATURE FLAGS
# ============================================================================

# Core Features
ENABLE_AI_FEATURES=true
ENABLE_VIDEO_CALLS=true
ENABLE_EMERGENCY_CALLS=true
ENABLE_WALLET_SYSTEM=true
ENABLE_CRYPTO_PAYMENTS=true
ENABLE_REAL_TIME_CHAT=true

# Advanced Features
ENABLE_VOICE_NOTES=true
ENABLE_FILE_UPLOADS=true
ENABLE_CALL_RECORDING=false
ENABLE_AI_MODERATION=true

# ============================================================================
# 🔧 SYSTEM CONFIGURATION
# ============================================================================

# Application Settings
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info
MAINTENANCE_MODE=false

# Performance Settings
MAX_FILE_SIZE_MB=50
MAX_CONCURRENT_CALLS=100
MAX_UPLOAD_FILES=10

# Backup Settings
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key

# ============================================================================
# 👨‍💼 ADMIN CONFIGURATION
# ============================================================================

# Default Admin Account
ADMIN_DEFAULT_EMAIL=admin@your-domain.com
ADMIN_DEFAULT_PASSWORD=your_secure_admin_password
SUPER_ADMIN_SECRET=your_super_admin_secret_key

# ============================================================================
# 🧪 TESTING CONFIGURATION
# ============================================================================

# Test User Accounts (for staging/testing)
TEST_USER_EMAIL=testuser@your-domain.com
TEST_USER_PASSWORD=test_password_123
TEST_READER_EMAIL=testreader@your-domain.com
TEST_READER_PASSWORD=test_reader_password_123

# ============================================================================
# 🎨 CUSTOM INTEGRATIONS
# ============================================================================

# Add any custom third-party services here
# CUSTOM_SERVICE_API_KEY=your_custom_service_key
# CUSTOM_SERVICE_SECRET=your_custom_service_secret
```

## 🔍 Environment Checker Script

```javascript
const requiredVars = [
  // Core Infrastructure
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  
  // Payment Gateways
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'SQUARE_ACCESS_TOKEN',
  'SQUARE_APPLICATION_ID',
  
  // Communication
  'AGORA_APP_ID',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  
  // Storage & Backup
  'BACKBLAZE_KEY_ID',
  'BACKBLAZE_APP_KEY',
  
  // AI Services
  'OPENAI_API_KEY',
  'ELEVENLABS_API_KEY',
  
  // Email & Notifications
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'SENDGRID_API_KEY',
  
  // Monitoring
  'SENTRY_DSN',
  'GOOGLE_ANALYTICS_ID',
  
  // Frontend
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_AGORA_APP_ID'
];

function checkEnvironment() {
  const missing = [];
  const present = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });
  
  console.log('🔍 Environment Variables Check:');
  console.log(`✅ Present: ${present.length}/${requiredVars.length}`);
  console.log(`❌ Missing: ${missing.length}/${requiredVars.length}`);
  
  if (missing.length > 0) {
    console.log('\n❌ Missing Variables:');
    missing.forEach(varName => console.log(`   - ${varName}`));
    process.exit(1);
  }
  
  console.log('\n🚀 All required environment variables are present!');
}

module.exports = { checkEnvironment };
```

## 📝 Service Integration Checklist

### 🔥 Critical (Required for basic functionality)
- [ ] **Supabase** - Database & Authentication
- [ ] **JWT Secret** - Authentication security
- [ ] **Stripe/Square** - Payment processing
- [ ] **SMTP/SendGrid** - Email notifications

### ⚡ Important (Required for full functionality)
- [ ] **Agora/Twilio** - Video calls & WebRTC
- [ ] **OpenAI** - AI tarot readings
- [ ] **Backblaze B2** - File storage & backups
- [ ] **Sentry** - Error monitoring

### 📊 Recommended (Analytics & optimization)
- [ ] **Google Analytics** - Usage tracking
- [ ] **Redis** - Caching & performance
- [ ] **Cloudflare** - CDN & security
- [ ] **UptimeRobot** - Uptime monitoring

### 🎯 Optional (Enhanced features)
- [ ] **ElevenLabs** - Text-to-speech
- [ ] **Mixpanel** - Advanced analytics
- [ ] **OneSignal** - Push notifications
- [ ] **New Relic** - Performance monitoring

## 🛡️ Security Notes

1. **Never commit .env files** to version control
2. **Use different secrets** for staging/production
3. **Rotate API keys regularly** (quarterly recommended)
4. **Use strong JWT secrets** (64+ characters)
5. **Enable 2FA** on all service accounts
6. **Monitor API usage** to detect anomalies
7. **Use environment-specific keys** (test vs live)

## 🚨 Emergency Contacts

Configure emergency escalation for critical services:
- **Payment failures** → Admin email + SMS
- **Database outages** → Immediate escalation
- **Security incidents** → Emergency contact protocol

## 📈 Monitoring Setup

Essential monitoring for production:
- **Uptime monitoring** (UptimeRobot)
- **Error tracking** (Sentry)
- **Performance monitoring** (New Relic)
- **Analytics tracking** (Google Analytics)
- **Payment monitoring** (Stripe/Square dashboards)

---

**🎯 Production Readiness: Only deploy when ALL critical variables are configured and tested!** 