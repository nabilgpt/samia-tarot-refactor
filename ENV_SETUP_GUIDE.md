# 🔧 PRODUCTION ENVIRONMENT SETUP GUIDE
## SAMIA TAROT Platform - Complete Environment Configuration

**Priority:** 🔴 **CRITICAL** - Required for production deployment  
**Estimated Time:** 1-2 hours  
**Status:** Not configured  

---

## 📋 **QUICK SETUP CHECKLIST**

### ✅ **Step 1: Create Environment Files**
```bash
# Create production environment file
cp .env.example .env

# Create development environment file  
cp .env.example .env.local

# Create production-specific file
cp .env.example .env.production
```

### ✅ **Step 2: Database Configuration**
```bash
# Required for Supabase connection
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### ✅ **Step 3: Payment Gateway Setup**
```bash
# Stripe (REQUIRED for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Square (REQUIRED for Square payments)
SQUARE_ACCESS_TOKEN=your-square-token
SQUARE_APPLICATION_ID=your-app-id
SQUARE_WEBHOOK_SECRET=your-webhook-secret
```

### ✅ **Step 4: AI Services Configuration**
```bash
# OpenAI (REQUIRED for AI readings)
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION=org-...
OPENAI_MODEL=gpt-4
```

### ✅ **Step 5: Security Configuration**
```bash
# JWT Security (REQUIRED)
JWT_SECRET=your-super-secure-32-character-minimum-secret
RECAPTCHA_SECRET_KEY=your-recaptcha-secret
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

---

## 🚀 **COMPLETE ENVIRONMENT TEMPLATE**

### **Create `.env` file with these variables:**

```bash
# =============================================================================
# DATABASE CONFIGURATION (REQUIRED)
# =============================================================================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# =============================================================================
# PAYMENT GATEWAYS (REQUIRED FOR PAYMENTS)
# =============================================================================

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Square Configuration
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_APPLICATION_ID=your-square-application-id
SQUARE_WEBHOOK_SECRET=your-square-webhook-secret
SQUARE_ENVIRONMENT=production

# USDT/Cryptocurrency (OPTIONAL)
USDT_WALLET_ADDRESS=your-usdt-wallet-address
CRYPTO_API_KEY=your-crypto-api-key

# Traditional Payment Methods (OPTIONAL)
WESTERN_UNION_API_KEY=your-western-union-key
MONEYGRAM_API_KEY=your-moneygram-key
RIA_API_KEY=your-ria-key
OMT_API_KEY=your-omt-key
WHISH_MONEY_API_KEY=your-whish-key
BOB_FINANCE_API_KEY=your-bob-key

# =============================================================================
# AI SERVICES (REQUIRED FOR AI READINGS)
# =============================================================================
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ORGANIZATION=org-your-organization-id
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# =============================================================================
# COMMUNICATION SERVICES (REQUIRED FOR NOTIFICATIONS)
# =============================================================================

# Email (SendGrid)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@samia-tarot.com
SENDGRID_FROM_NAME=SAMIA TAROT

# SMS/Voice (Twilio)
TWILIO_ACCOUNT_SID=AC-your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# =============================================================================
# SECURITY & AUTHENTICATION (REQUIRED)
# =============================================================================
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=7d
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
RECAPTCHA_SITE_KEY=your-recaptcha-site-key

# =============================================================================
# FILE STORAGE & CDN (OPTIONAL BUT RECOMMENDED)
# =============================================================================
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=samia-tarot-uploads

# Cloudinary (alternative)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# =============================================================================
# MONITORING & ANALYTICS (RECOMMENDED)
# =============================================================================
SENTRY_DSN=your-sentry-dsn-url
GOOGLE_ANALYTICS_ID=GA-your-tracking-id
MIXPANEL_TOKEN=your-mixpanel-token

# =============================================================================
# DEVELOPMENT/PRODUCTION FLAGS (REQUIRED)
# =============================================================================
NODE_ENV=production
VITE_APP_ENV=production
DEBUG=false
MAINTENANCE_MODE=false

# API Configuration
API_BASE_URL=https://api.samia-tarot.com
FRONTEND_URL=https://samia-tarot.com
CORS_ORIGIN=https://samia-tarot.com

# =============================================================================
# RATE LIMITING & PERFORMANCE (RECOMMENDED)
# =============================================================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
REDIS_URL=redis://localhost:6379

# =============================================================================
# EMERGENCY & ESCALATION (REQUIRED FOR EMERGENCY FEATURES)
# =============================================================================
EMERGENCY_ESCALATION_TIMEOUT=300
EMERGENCY_NOTIFICATION_EMAIL=emergency@samia-tarot.com
EMERGENCY_NOTIFICATION_PHONE=+1234567890

# =============================================================================
# CUSTOM BUSINESS LOGIC (REQUIRED)
# =============================================================================
MINIMUM_BOOKING_AMOUNT=10.00
DEFAULT_CURRENCY=USD
EMERGENCY_CALL_RATE=50.00
READER_COMMISSION_RATE=0.70
PLATFORM_FEE_RATE=0.30

# =============================================================================
# FEATURE FLAGS (OPTIONAL)
# =============================================================================
ENABLE_AI_READINGS=true
ENABLE_EMERGENCY_CALLS=true
ENABLE_VOICE_NOTES=true
ENABLE_VIDEO_CALLS=true
ENABLE_CRYPTOCURRENCY=true
ENABLE_SOCIAL_FEATURES=false

# =============================================================================
# COMPLIANCE & LEGAL (RECOMMENDED)
# =============================================================================
GDPR_COMPLIANCE=true
PCI_DSS_COMPLIANCE=true
DATA_RETENTION_DAYS=2555
COOKIE_CONSENT_REQUIRED=true
```

---

## 🔑 **HOW TO GET API KEYS**

### **1. Supabase Configuration**
1. Go to [supabase.com](https://supabase.com)
2. Create/access your project
3. Go to Settings → API
4. Copy `URL`, `anon key`, and `service_role key`

### **2. Stripe Setup**
1. Go to [stripe.com](https://stripe.com)
2. Create account and verify business
3. Go to Developers → API keys
4. Copy `Publishable key` and `Secret key`
5. Set up webhooks for payment events

### **3. Square Setup**
1. Go to [developer.squareup.com](https://developer.squareup.com)
2. Create application
3. Get `Application ID` and `Access Token`
4. Configure webhook endpoints

### **4. OpenAI Setup**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create account and add payment method
3. Go to API keys section
4. Generate new API key
5. Note your organization ID

### **5. SendGrid Setup**
1. Go to [sendgrid.com](https://sendgrid.com)
2. Create account and verify domain
3. Go to Settings → API Keys
4. Create new API key with full access

### **6. Twilio Setup**
1. Go to [twilio.com](https://twilio.com)
2. Create account and verify phone number
3. Get `Account SID` and `Auth Token`
4. Purchase phone number for SMS/voice

---

## ⚠️ **SECURITY BEST PRACTICES**

### **Environment File Security**
```bash
# NEVER commit .env files to git
echo ".env*" >> .gitignore

# Use different keys for development/production
# Rotate keys regularly (every 90 days)
# Use strong, unique secrets for JWT
```

### **JWT Secret Generation**
```bash
# Generate secure JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use online generator: https://jwt.io/
```

### **API Key Management**
- Store production keys in secure environment (not in code)
- Use environment-specific keys (dev/staging/prod)
- Enable API key restrictions where possible
- Monitor API key usage and set alerts

---

## 🧪 **ENVIRONMENT VALIDATION**

### **Test Configuration Script**
```javascript
// Create test-env.js
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'OPENAI_API_KEY',
  'JWT_SECRET'
];

const missing = requiredVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`  - ${key}`));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set!');
}
```

### **Run Validation**
```bash
node test-env.js
```

---

## 🚀 **DEPLOYMENT CHECKLIST**

### **Before Going Live:**
- [ ] All required environment variables set
- [ ] API keys tested and working
- [ ] Database connection verified
- [ ] Payment gateways tested
- [ ] Email/SMS notifications working
- [ ] Security headers configured
- [ ] HTTPS/SSL certificates installed
- [ ] Domain and DNS configured
- [ ] Monitoring and error tracking enabled

### **Post-Deployment:**
- [ ] Smoke tests passed
- [ ] All critical flows tested
- [ ] Performance monitoring active
- [ ] Error alerts configured
- [ ] Backup systems verified

---

## 📞 **SUPPORT & TROUBLESHOOTING**

### **Common Issues:**
1. **Database Connection Failed**
   - Verify Supabase URL and keys
   - Check network connectivity
   - Confirm RLS policies

2. **Payment Processing Errors**
   - Verify API keys are for correct environment
   - Check webhook endpoints
   - Confirm business verification status

3. **AI Services Not Working**
   - Verify OpenAI API key and billing
   - Check rate limits and quotas
   - Confirm model availability

### **Getting Help:**
- Check logs in `/logs` directory
- Review error messages in Sentry
- Contact support with specific error details

---

**🎯 NEXT STEP: Create your `.env` file and configure all required variables above!** 