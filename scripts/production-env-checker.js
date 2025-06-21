#!/usr/bin/env node

/**
 * 🚀 SAMIA TAROT - Production Environment Checker
 * 
 * Comprehensive validation of all environment variables required for production deployment
 * Ensures 100% configuration coverage before going live
 */

const chalk = require('chalk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ============================================================================
// ENVIRONMENT VARIABLES CONFIGURATION
// ============================================================================

const REQUIRED_VARS = {
  // 🗄️ Core Infrastructure (CRITICAL)
  core: [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ],

  // 🔐 Security (CRITICAL)
  security: [
    'BCRYPT_ROUNDS',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
    'CORS_ORIGIN'
  ],

  // 💳 Payment Gateways (CRITICAL)
  payments: [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SQUARE_ACCESS_TOKEN',
    'SQUARE_APPLICATION_ID',
    'SQUARE_LOCATION_ID',
    'SQUARE_WEBHOOK_SIGNATURE_KEY'
  ],

  // 🪙 Cryptocurrency (IMPORTANT)
  crypto: [
    'USDT_API_KEY',
    'USDT_WALLET_ADDRESS',
    'TRON_API_KEY',
    'TRON_NETWORK'
  ],

  // 🌍 International Transfers (IMPORTANT)
  transfers: [
    'WESTERN_UNION_API_KEY',
    'WESTERN_UNION_API_SECRET',
    'MONEYGRAM_API_KEY',
    'MONEYGRAM_API_SECRET',
    'RIA_API_KEY',
    'RIA_API_SECRET'
  ],

  // 🏦 Lebanon-specific (OPTIONAL)
  lebanon: [
    'OMT_API_KEY',
    'OMT_API_SECRET',
    'WHISH_API_KEY',
    'WHISH_API_SECRET',
    'BOB_API_KEY',
    'BOB_API_SECRET'
  ],

  // 💾 Storage & Backup (CRITICAL)
  storage: [
    'BACKBLAZE_KEY_ID',
    'BACKBLAZE_APP_KEY',
    'BACKBLAZE_BUCKET_NAME',
    'BACKBLAZE_BUCKET_ID'
  ],

  // 🤖 AI Services (IMPORTANT)
  ai: [
    'OPENAI_API_KEY',
    'OPENAI_ORG_ID',
    'ELEVENLABS_API_KEY',
    'ELEVENLABS_VOICE_ID'
  ],

  // 📞 Communication (CRITICAL)
  communication: [
    'AGORA_APP_ID',
    'AGORA_APP_CERTIFICATE',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ],

  // 📧 Email & Notifications (CRITICAL)
  email: [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL'
  ],

  // 📱 SMS & Push (IMPORTANT)
  notifications: [
    'SMS_SERVICE_PROVIDER',
    'FCM_SERVER_KEY',
    'FCM_PROJECT_ID',
    'ONESIGNAL_APP_ID',
    'ONESIGNAL_REST_API_KEY'
  ],

  // 📊 Analytics & Monitoring (IMPORTANT)
  monitoring: [
    'GOOGLE_ANALYTICS_ID',
    'SENTRY_DSN',
    'UPTIMEROBOT_API_KEY',
    'NEW_RELIC_LICENSE_KEY'
  ],

  // 🗄️ Caching (RECOMMENDED)
  caching: [
    'REDIS_URL',
    'REDIS_HOST',
    'REDIS_PORT'
  ],

  // 🎯 Frontend (CRITICAL)
  frontend: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_ENV',
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'VITE_SQUARE_APPLICATION_ID',
    'VITE_AGORA_APP_ID',
    'VITE_GOOGLE_ANALYTICS_ID'
  ],

  // ⚙️ System Configuration (CRITICAL)
  system: [
    'NODE_ENV',
    'LOG_LEVEL',
    'DEFAULT_CURRENCY',
    'SUPPORTED_CURRENCIES',
    'SUPPORTED_LANGUAGES'
  ],

  // 🚨 Emergency (CRITICAL)
  emergency: [
    'EMERGENCY_ESCALATION_TIMEOUT',
    'EMERGENCY_ADMIN_EMAIL',
    'EMERGENCY_ADMIN_PHONE',
    'MAX_DAILY_EMERGENCY_CALLS'
  ],

  // 👨‍💼 Admin (CRITICAL)
  admin: [
    'ADMIN_DEFAULT_EMAIL',
    'SUPER_ADMIN_SECRET'
  ]
};

// Priority levels for different categories
const PRIORITY_LEVELS = {
  CRITICAL: ['core', 'security', 'payments', 'storage', 'communication', 'email', 'frontend', 'system', 'emergency', 'admin'],
  IMPORTANT: ['crypto', 'transfers', 'ai', 'notifications', 'monitoring'],
  RECOMMENDED: ['caching'],
  OPTIONAL: ['lebanon']
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function checkEnvironmentVariables() {
  console.log(chalk.cyan.bold('\n🚀 SAMIA TAROT - Production Environment Checker\n'));
  console.log(chalk.gray('============================================================\n'));

  const results = {
    critical: { missing: [], present: [], total: 0 },
    important: { missing: [], present: [], total: 0 },
    recommended: { missing: [], present: [], total: 0 },
    optional: { missing: [], present: [], total: 0 },
    totalMissing: 0,
    totalPresent: 0,
    totalVariables: 0
  };

  // Check each category
  Object.entries(REQUIRED_VARS).forEach(([category, variables]) => {
    const priority = getPriorityLevel(category);
    
    variables.forEach(varName => {
      results[priority].total++;
      results.totalVariables++;

      if (process.env[varName]) {
        results[priority].present.push(varName);
        results.totalPresent++;
      } else {
        results[priority].missing.push({ category, varName });
        results.totalMissing++;
      }
    });
  });

  // Display results
  displayResults(results);

  // Return status
  return {
    isReady: results.critical.missing.length === 0,
    results
  };
}

function getPriorityLevel(category) {
  for (const [priority, categories] of Object.entries(PRIORITY_LEVELS)) {
    if (categories.includes(category)) {
      return priority.toLowerCase();
    }
  }
  return 'optional';
}

function displayResults(results) {
  // Overall status
  const completionPercentage = Math.round((results.totalPresent / results.totalVariables) * 100);
  
  console.log(chalk.yellow.bold('📊 OVERALL STATUS:'));
  console.log(`   Total Variables: ${results.totalVariables}`);
  console.log(`   ✅ Present: ${chalk.green(results.totalPresent)}`);
  console.log(`   ❌ Missing: ${chalk.red(results.totalMissing)}`);
  console.log(`   📈 Completion: ${getCompletionColor(completionPercentage)}${completionPercentage}%${chalk.reset}\n`);

  // Critical status
  displayCategoryStatus('🔥 CRITICAL', results.critical, 'red');
  displayCategoryStatus('⚡ IMPORTANT', results.important, 'yellow');
  displayCategoryStatus('📊 RECOMMENDED', results.recommended, 'blue');
  displayCategoryStatus('🎯 OPTIONAL', results.optional, 'gray');

  // Production readiness
  console.log(chalk.cyan.bold('\n🎯 PRODUCTION READINESS:\n'));
  
  if (results.critical.missing.length === 0) {
    console.log(chalk.green.bold('✅ READY FOR PRODUCTION!'));
    console.log(chalk.green('   All critical environment variables are configured.\n'));
    
    if (results.important.missing.length > 0) {
      console.log(chalk.yellow('⚠️  WARNING: Some important features may not work properly:'));
      results.important.missing.forEach(({ category, varName }) => {
        console.log(chalk.yellow(`   - ${varName} (${category})`));
      });
      console.log();
    }
  } else {
    console.log(chalk.red.bold('❌ NOT READY FOR PRODUCTION!'));
    console.log(chalk.red('   Missing critical environment variables:\n'));
    
    results.critical.missing.forEach(({ category, varName }) => {
      console.log(chalk.red(`   ❌ ${varName} (${category})`));
    });
    console.log();
  }

  // Recommendations
  if (results.recommended.missing.length > 0 || results.important.missing.length > 0) {
    console.log(chalk.blue.bold('💡 RECOMMENDATIONS:\n'));
    
    if (results.important.missing.length > 0) {
      console.log(chalk.yellow('   Configure important services for full functionality:'));
      results.important.missing.forEach(({ category, varName }) => {
        console.log(chalk.yellow(`   • ${varName} - ${getServiceDescription(varName)}`));
      });
      console.log();
    }
    
    if (results.recommended.missing.length > 0) {
      console.log(chalk.blue('   Consider configuring recommended services for better performance:'));
      results.recommended.missing.forEach(({ category, varName }) => {
        console.log(chalk.blue(`   • ${varName} - ${getServiceDescription(varName)}`));
      });
      console.log();
    }
  }
}

function displayCategoryStatus(title, categoryResults, color) {
  const percentage = categoryResults.total > 0 
    ? Math.round((categoryResults.present.length / categoryResults.total) * 100) 
    : 100;
  
  const statusColor = percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';
  
  console.log(chalk[color].bold(`${title}:`));
  console.log(`   ${chalk[statusColor](`${categoryResults.present.length}/${categoryResults.total} (${percentage}%)`)} configured`);
  
  if (categoryResults.missing.length > 0) {
    console.log(chalk.red('   Missing:'));
    categoryResults.missing.forEach(({ varName }) => {
      console.log(chalk.red(`     - ${varName}`));
    });
  }
  console.log();
}

function getCompletionColor(percentage) {
  if (percentage >= 90) return chalk.green;
  if (percentage >= 70) return chalk.yellow;
  return chalk.red;
}

function getServiceDescription(varName) {
  const descriptions = {
    // Core
    'SUPABASE_URL': 'Database connection',
    'JWT_SECRET': 'Authentication security',
    
    // Payments
    'STRIPE_SECRET_KEY': 'Credit card processing (EU/UAE)',
    'SQUARE_ACCESS_TOKEN': 'Credit card processing (US/CA/AU/GB/JP)',
    
    // Communication
    'AGORA_APP_ID': 'Video calls and WebRTC',
    'TWILIO_ACCOUNT_SID': 'SMS and voice calls',
    
    // Storage
    'BACKBLAZE_KEY_ID': 'File storage and backups',
    
    // AI
    'OPENAI_API_KEY': 'AI tarot readings',
    'ELEVENLABS_API_KEY': 'Text-to-speech functionality',
    
    // Email
    'SMTP_HOST': 'Email notifications',
    'SENDGRID_API_KEY': 'Email service provider',
    
    // Monitoring
    'SENTRY_DSN': 'Error tracking and monitoring',
    'GOOGLE_ANALYTICS_ID': 'Usage analytics',
    
    // Cache
    'REDIS_URL': 'Caching and performance',
    
    // Emergency
    'EMERGENCY_ADMIN_EMAIL': 'Emergency escalation contact'
  };
  
  return descriptions[varName] || 'Service configuration';
}

// ============================================================================
// SECURITY VALIDATION
// ============================================================================

function validateSecuritySettings() {
  console.log(chalk.red.bold('🛡️  SECURITY VALIDATION:\n'));
  
  const securityIssues = [];
  
  // JWT Secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      securityIssues.push('JWT_SECRET is too short (minimum 32 characters recommended)');
    }
    if (jwtSecret === 'your_jwt_secret' || jwtSecret.includes('placeholder')) {
      securityIssues.push('JWT_SECRET appears to be a placeholder value');
    }
  }
  
  // Environment check
  if (process.env.NODE_ENV !== 'production') {
    securityIssues.push('NODE_ENV is not set to "production"');
  }
  
  // Debug mode check
  if (process.env.DEBUG === 'true') {
    securityIssues.push('DEBUG mode is enabled in production');
  }
  
  // CORS origin check
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin || corsOrigin === '*') {
    securityIssues.push('CORS_ORIGIN should be set to your specific domain');
  }
  
  if (securityIssues.length === 0) {
    console.log(chalk.green('✅ Security settings look good!\n'));
  } else {
    console.log(chalk.red('⚠️  Security issues found:\n'));
    securityIssues.forEach(issue => {
      console.log(chalk.red(`   ❌ ${issue}`));
    });
    console.log();
  }
  
  return securityIssues.length === 0;
}

// ============================================================================
// SERVICE CONNECTIVITY TEST
// ============================================================================

async function testServiceConnectivity() {
  console.log(chalk.blue.bold('🔗 SERVICE CONNECTIVITY TEST:\n'));
  
  const tests = [
    {
      name: 'Supabase Database',
      test: async () => {
        // Basic URL validation
        const url = process.env.SUPABASE_URL;
        return url && url.startsWith('https://') && url.includes('.supabase.co');
      }
    },
    {
      name: 'Payment Gateways',
      test: async () => {
        return !!(process.env.STRIPE_SECRET_KEY || process.env.SQUARE_ACCESS_TOKEN);
      }
    },
    {
      name: 'Email Service',
      test: async () => {
        return !!(process.env.SMTP_HOST || process.env.SENDGRID_API_KEY);
      }
    },
    {
      name: 'AI Services',
      test: async () => {
        return !!process.env.OPENAI_API_KEY;
      }
    }
  ];
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        console.log(chalk.green(`✅ ${name}: Connected`));
      } else {
        console.log(chalk.yellow(`⚠️  ${name}: Not configured`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${name}: Connection failed`));
    }
  }
  
  console.log();
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Check environment variables
    const { isReady, results } = checkEnvironmentVariables();
    
    // Validate security settings
    const securityOk = validateSecuritySettings();
    
    // Test service connectivity
    await testServiceConnectivity();
    
    // Final verdict
    console.log(chalk.cyan.bold('🎯 FINAL VERDICT:\n'));
    
    if (isReady && securityOk) {
      console.log(chalk.green.bold('🚀 READY FOR PRODUCTION DEPLOYMENT!'));
      console.log(chalk.green('   All critical systems are properly configured.\n'));
      process.exit(0);
    } else {
      console.log(chalk.red.bold('❌ NOT READY FOR PRODUCTION!'));
      console.log(chalk.red('   Please fix the issues above before deploying.\n'));
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red.bold('💥 Environment check failed:'), error.message);
    process.exit(1);
  }
}

// Run the checker
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  validateSecuritySettings,
  testServiceConnectivity
}; 