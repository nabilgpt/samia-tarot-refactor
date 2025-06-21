#!/usr/bin/env node

/**
 * 🚀 SAMIA TAROT - Quick Environment Setup
 * 
 * Interactive setup script for new developers
 * Helps configure the environment step by step
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n🚀 SAMIA TAROT - Environment Setup Wizard\n');
  console.log('============================================\n');

  // Check if .env already exists
  if (fs.existsSync('.env')) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('🎯 Setting up your SAMIA TAROT development environment...\n');

  // Core configuration
  console.log('🗄️  CORE CONFIGURATION (Required)');
  const supabaseUrl = await question('Enter your Supabase URL: ');
  const supabaseAnonKey = await question('Enter your Supabase Anon Key: ');
  const supabaseServiceKey = await question('Enter your Supabase Service Role Key: ');
  
  // Generate JWT secret if not provided
  let jwtSecret = await question('Enter JWT Secret (or press Enter to generate): ');
  if (!jwtSecret) {
    jwtSecret = require('crypto').randomBytes(64).toString('hex');
    console.log(`✅ Generated JWT Secret: ${jwtSecret.substring(0, 20)}...`);
  }

  console.log('\n💳 PAYMENT CONFIGURATION (Optional for development)');
  const usePayments = await question('Configure payment gateways? (y/N): ');
  
  let stripeKey = '', stripePublic = '', squareToken = '', squareAppId = '';
  if (usePayments.toLowerCase() === 'y') {
    stripeKey = await question('Stripe Secret Key (test): ');
    stripePublic = await question('Stripe Publishable Key (test): ');
    squareToken = await question('Square Access Token (optional): ');
    squareAppId = await question('Square Application ID (optional): ');
  }

  console.log('\n🤖 AI SERVICES (Optional)');
  const useAI = await question('Configure AI services? (y/N): ');
  
  let openaiKey = '', elevenlabsKey = '';
  if (useAI.toLowerCase() === 'y') {
    openaiKey = await question('OpenAI API Key: ');
    elevenlabsKey = await question('ElevenLabs API Key (optional): ');
  }

  console.log('\n📧 EMAIL CONFIGURATION (Recommended)');
  const useEmail = await question('Configure email? (y/N): ');
  
  let smtpHost = '', smtpUser = '', smtpPass = '';
  if (useEmail.toLowerCase() === 'y') {
    smtpHost = await question('SMTP Host (e.g., smtp.gmail.com): ');
    smtpUser = await question('SMTP Username: ');
    smtpPass = await question('SMTP Password: ');
  }

  // Generate .env file
  const envContent = generateEnvFile({
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
    jwtSecret,
    stripeKey,
    stripePublic,
    squareToken,
    squareAppId,
    openaiKey,
    elevenlabsKey,
    smtpHost,
    smtpUser,
    smtpPass
  });

  // Write .env file
  fs.writeFileSync('.env', envContent);
  console.log('\n✅ .env file created successfully!');

  // Run environment check
  console.log('\n🔍 Running environment check...\n');
  
  try {
    require('../check-production-env.js');
  } catch (error) {
    console.log('Environment check completed with warnings.');
  }

  console.log('\n🎉 Setup complete! Next steps:');
  console.log('   1. npm install');
  console.log('   2. npm run dev');
  console.log('   3. Configure additional services as needed\n');

  rl.close();
}

function generateEnvFile(config) {
  return `# ============================================================================
# 🚀 SAMIA TAROT - AUTO-GENERATED ENVIRONMENT
# ============================================================================
# Generated on: ${new Date().toISOString()}
# ============================================================================

# ============================================================================
# 🗄️ CORE INFRASTRUCTURE (CRITICAL)
# ============================================================================
SUPABASE_URL=${config.supabaseUrl}
SUPABASE_ANON_KEY=${config.supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${config.supabaseServiceKey}
JWT_SECRET=${config.jwtSecret}

# ============================================================================
# 🔐 SECURITY (CRITICAL)
# ============================================================================
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
CORS_ORIGIN=http://localhost:3000

# ============================================================================
# 💳 PAYMENT GATEWAYS (OPTIONAL FOR DEV)
# ============================================================================
STRIPE_SECRET_KEY=${config.stripeKey || 'sk_test_your_stripe_secret'}
STRIPE_PUBLISHABLE_KEY=${config.stripePublic || 'pk_test_your_stripe_public'}
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SQUARE_ACCESS_TOKEN=${config.squareToken || 'your_square_access_token'}
SQUARE_APPLICATION_ID=${config.squareAppId || 'your_square_app_id'}
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_WEBHOOK_SIGNATURE_KEY=your_square_webhook_key

# ============================================================================
# 🪙 CRYPTOCURRENCY (OPTIONAL)
# ============================================================================
USDT_API_KEY=your_crypto_api_key
USDT_WALLET_ADDRESS=your_usdt_wallet_address
TRON_API_KEY=your_tron_api_key
TRON_NETWORK=testnet

# ============================================================================
# 🌍 INTERNATIONAL TRANSFERS (OPTIONAL)
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
# 💾 STORAGE & BACKUP (RECOMMENDED)
# ============================================================================
BACKBLAZE_KEY_ID=your_b2_key_id
BACKBLAZE_APP_KEY=your_b2_app_key
BACKBLAZE_BUCKET_NAME=samia-tarot-dev
BACKBLAZE_BUCKET_ID=your_bucket_id

# ============================================================================
# 🤖 AI SERVICES (RECOMMENDED)
# ============================================================================
OPENAI_API_KEY=${config.openaiKey || 'sk-your_openai_key'}
OPENAI_ORG_ID=org-your_openai_org
ELEVENLABS_API_KEY=${config.elevenlabsKey || 'your_elevenlabs_key'}
ELEVENLABS_VOICE_ID=your_voice_id

# ============================================================================
# 📞 COMMUNICATION (RECOMMENDED)
# ============================================================================
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_cert
TWILIO_ACCOUNT_SID=ACyour_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# ============================================================================
# 📧 EMAIL & NOTIFICATIONS (RECOMMENDED)
# ============================================================================
SMTP_HOST=${config.smtpHost || 'smtp.gmail.com'}
SMTP_USER=${config.smtpUser || 'your_email@gmail.com'}
SMTP_PASS=${config.smtpPass || 'your_app_password'}
SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@your-domain.com

# ============================================================================
# 📱 PUSH NOTIFICATIONS (OPTIONAL)
# ============================================================================
SMS_SERVICE_PROVIDER=twilio
FCM_SERVER_KEY=your_fcm_server_key
FCM_PROJECT_ID=your_firebase_project
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_key

# ============================================================================
# 📊 ANALYTICS & MONITORING (OPTIONAL)
# ============================================================================
GOOGLE_ANALYTICS_ID=GA-your_tracking_id
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project
UPTIMEROBOT_API_KEY=ur_your_uptimerobot_key
NEW_RELIC_LICENSE_KEY=your_newrelic_key

# ============================================================================
# 🗄️ CACHING (OPTIONAL)
# ============================================================================
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# ============================================================================
# 🎯 FRONTEND (CRITICAL)
# ============================================================================
VITE_SUPABASE_URL=${config.supabaseUrl}
VITE_SUPABASE_ANON_KEY=${config.supabaseAnonKey}
VITE_APP_ENV=development
VITE_STRIPE_PUBLISHABLE_KEY=${config.stripePublic || 'pk_test_your_stripe_public'}
VITE_SQUARE_APPLICATION_ID=${config.squareAppId || 'your_square_app_id'}
VITE_AGORA_APP_ID=your_agora_app_id
VITE_GOOGLE_ANALYTICS_ID=GA-your_tracking_id

# ============================================================================
# ⚙️ SYSTEM (CRITICAL)
# ============================================================================
NODE_ENV=development
LOG_LEVEL=debug
DEFAULT_CURRENCY=USD
SUPPORTED_CURRENCIES=USD,EUR,GBP,AED,SAR,LBP
SUPPORTED_LANGUAGES=en,ar,fr,es

# ============================================================================
# 🚨 EMERGENCY (REQUIRED)
# ============================================================================
EMERGENCY_ESCALATION_TIMEOUT=300
EMERGENCY_ADMIN_EMAIL=admin@your-domain.com
EMERGENCY_ADMIN_PHONE=+1234567890
MAX_DAILY_EMERGENCY_CALLS=10

# ============================================================================
# 👨‍💼 ADMIN (REQUIRED)
# ============================================================================
ADMIN_DEFAULT_EMAIL=admin@your-domain.com
SUPER_ADMIN_SECRET=${require('crypto').randomBytes(32).toString('hex')}

# ============================================================================
# 🔧 DEVELOPMENT ONLY
# ============================================================================
DEBUG=true
DEVELOPMENT_MODE=true
`;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateEnvFile }; 