# 🔐 SAMIA TAROT - Environment Variables Setup Guide

## Required Environment Variables

Copy these variables to your `.env` file and fill in your actual values:

```bash
# =====================================================
# SAMIA TAROT - PRODUCTION ENVIRONMENT VARIABLES
# =====================================================

# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Admin/Service Role Key (CRITICAL - for backend operations only)
# WARNING: Keep this secret and never expose to frontend
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E

# AI Provider Configuration
VITE_OPENAI_API_KEY=your_openai_api_key_here

# App Configuration
VITE_APP_URL=https://your-domain.com
VITE_APP_NAME="SAMIA TAROT"

# Payment Gateway Configuration (if using)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Square Payment (if using)
VITE_SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_ACCESS_TOKEN=your_square_access_token

# Video Call Configuration (if using)
VITE_AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Email Configuration (if using)
SENDGRID_API_KEY=your_sendgrid_api_key
```

## 🚨 CRITICAL SECURITY NOTES

### 1. Environment File Security
- **NEVER** commit your actual `.env` file to version control
- Add `.env` to your `.gitignore` file
- Create a separate `.env.example` with placeholder values only

### 2. Key Management
- Use different keys for development, staging, and production
- Rotate keys regularly for security
- Store production keys in secure key management systems

### 3. Access Control
- `VITE_*` variables are exposed to the frontend - use only for public keys
- Non-VITE variables are server-side only - use for secrets
- Never expose service role keys to the frontend

## 📋 How to Get These Values

### Supabase Keys:
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### OpenAI API Key:
1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`) → `VITE_OPENAI_API_KEY`

### Stripe Keys:
1. Go to [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copy:
   - **Publishable key** (pk_live_ or pk_test_) → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (sk_live_ or sk_test_) → `STRIPE_SECRET_KEY`
3. For webhooks, go to Webhooks section and copy webhook secret → `STRIPE_WEBHOOK_SECRET`

### Square Keys:
1. Go to [https://developer.squareup.com/](https://developer.squareup.com/)
2. Navigate to your application
3. Copy:
   - **Application ID** → `VITE_SQUARE_APPLICATION_ID`
   - **Access Token** → `SQUARE_ACCESS_TOKEN`

## 🔧 Environment Setup Steps

### 1. Create `.env` File
```bash
# In your project root directory
touch .env
```

### 2. Add Variables
Copy the template above and fill in your actual values.

### 3. Verify Setup
Run the QA test script to verify your environment:
```bash
node scripts/production-qa-test.js
```

### 4. Test Application
Start your application and verify all integrations work:
```bash
npm run dev
```

## 🚀 Production Deployment

### Hosting Platforms:

#### Vercel:
```bash
# Add environment variables in Vercel dashboard
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
# ... add all other variables
```

#### Netlify:
```bash
# Add environment variables in Netlify dashboard
# Site settings > Environment variables
```

#### Docker:
```bash
# Use .env file or pass variables directly
docker run -e VITE_SUPABASE_URL=your_url your-app
```

## ⚠️ Troubleshooting

### Missing Environment Variables Error:
```
❌ Missing required environment variable: VITE_SUPABASE_URL
```
**Solution**: Ensure all required variables are set in your `.env` file.

### Invalid Key Errors:
```
❌ Authentication failed: Invalid API key
```
**Solution**: Verify your keys are correct and haven't expired.

### CORS Errors:
```
❌ CORS policy blocked the request
```
**Solution**: Add your domain to allowed origins in Supabase/API provider settings.

## 📞 Support

If you encounter issues:
1. Verify all environment variables are correctly set
2. Check that keys haven't expired
3. Ensure domains are whitelisted in API provider settings
4. Run the QA test script for automated validation

---

*Last Updated: Production Stabilization - January 2025* 