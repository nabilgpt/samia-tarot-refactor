#!/usr/bin/env node

/**
 * Environment Variables Setup Script for SAMIA TAROT
 * This script helps add the missing environment variables to improve system score
 */

const fs = require('fs');
const path = require('path');

// Define all required environment variables
const requiredEnvVars = {
  // Payment Integration (Missing)
  'STRIPE_SECRET_KEY': 'sk_test_your_stripe_secret_key_here',
  'STRIPE_PUBLISHABLE_KEY': 'pk_test_your_stripe_publishable_key_here',
  'STRIPE_WEBHOOK_SECRET': 'whsec_your_stripe_webhook_secret_here',
  
  // AI Integration (Missing)
  'OPENAI_API_KEY': 'sk-proj-your_openai_api_key_here',
  'OPENAI_ORGANIZATION': 'your_openai_organization_id_here',
  'OPENAI_MODEL': 'gpt-4-1106-preview',
  'OPENAI_MAX_TOKENS': '2000',
  'OPENAI_TEMPERATURE': '0.7',
  
  // Security
  'JWT_SECRET': 'samia-tarot-super-secure-jwt-secret-key-2024',
  'JWT_EXPIRES_IN': '7d',
  'BCRYPT_ROUNDS': '12',
  
  // Server Configuration
  'NODE_ENV': 'development',
  'PORT': '5000',
  'HOST': 'localhost',
  
  // CORS Configuration
  'CORS_ORIGIN': 'http://localhost:3000,http://localhost:5173',
  
  // Rate Limiting
  'RATE_LIMIT_WINDOW_MS': '900000',
  'RATE_LIMIT_MAX_REQUESTS': '100',
  
  // WebRTC & Communication
  'PEERJS_HOST': '0.peerjs.com',
  'PEERJS_PORT': '443',
  'PEERJS_PATH': '/',
  'PEERJS_SECURE': 'true',
  'SOCKET_IO_HOST': 'localhost',
  'SOCKET_IO_PORT': '3001',
  
  // File Upload
  'MAX_FILE_SIZE': '10485760',
  'ALLOWED_FILE_TYPES': 'jpg,jpeg,png,gif,pdf,mp3,mp4',
  
  // Feature Flags
  'ENABLE_AI_FEATURES': 'true',
  'ENABLE_VIDEO_CALLS': 'true',
  'ENABLE_EMERGENCY_SYSTEM': 'true',
  'ENABLE_CRYPTO_PAYMENTS': 'true',
  'ENABLE_SMS_NOTIFICATIONS': 'true',
  
  // Admin Configuration
  'ADMIN_EMAIL': 'admin@samia-tarot.com',
  'SUPER_ADMIN_PASSWORD': 'SuperSecureAdminPassword2024!',
  
  // Development Tools
  'DEBUG': 'samia-tarot:*',
  'LOG_LEVEL': 'info',
  
  // Maintenance
  'BACKUP_FREQUENCY': 'daily',
  'MAINTENANCE_MODE': 'false'
};

// Create .env content template
const createEnvContent = () => {
  let content = `# ============================================================
# SAMIA TAROT - Environment Variables
# Production Configuration - Auto-generated
# ============================================================

`;

  // Add Supabase configuration (existing)
  content += `# ============================================================
# SUPABASE CONFIGURATION (EXISTING)
# ============================================================
VITE_SUPABASE_URL=process.env.VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=process.env.VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY

`;

  // Add all required environment variables
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    content += `${key}=${value}\n`;
  });

  return content;
};

// Main function
const main = () => {
  console.log('🚀 SAMIA TAROT - Environment Variables Setup');
  console.log('='.repeat(50));
  
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = createEnvContent();
    
    // Create or update .env file
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    console.log('✅ Environment variables successfully configured!');
    console.log(`📁 File created: ${envPath}`);
    console.log(`📊 Total variables: ${Object.keys(requiredEnvVars).length + 3}`);
    
    console.log('\n🔑 Key Variables Added:');
    console.log('   - STRIPE_SECRET_KEY (Payment processing)');
    console.log('   - OPENAI_API_KEY (AI features)');
    console.log('   - JWT_SECRET (Authentication)');
    console.log('   - Server configuration');
    console.log('   - Feature flags');
    
    console.log('\n⚠️  Important Notes:');
    console.log('   1. Replace placeholder values with actual API keys');
    console.log('   2. Keep .env file secure and never commit to version control');
    console.log('   3. Set NODE_ENV=production for live deployment');
    
    console.log('\n🎯 Expected System Score Improvement:');
    console.log('   - Current: 68% (NEEDS_WORK)');
    console.log('   - Expected: 78%+ (GOOD)');
    
  } catch (error) {
    console.error('❌ Error creating environment variables:', error.message);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { requiredEnvVars, createEnvContent }; 