// ===============================================
// QUICK HEALTH CHECK - POST-FIXES VERIFICATION
// ===============================================

const { supabase } = require('../lib/supabase');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = (message, type = 'info') => {
  const color = type === 'success' ? colors.green : 
                type === 'error' ? colors.red : 
                type === 'warning' ? colors.yellow :
                type === 'header' ? colors.cyan : colors.reset;
  
  console.log(`${color}${message}${colors.reset}`);
};

// ===============================================
// HEALTH CHECK FUNCTIONS
// ===============================================

const checkDatabaseConnection = async () => {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw error;
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return { success: false, message: `Database connection failed: ${error.message}` };
  }
};

const checkRequiredColumns = async () => {
  const checks = [
    { table: 'profiles', column: 'is_verified' },
    { table: 'profiles', column: 'is_active' },
    { table: 'services', column: 'category' },
    { table: 'services', column: 'status' },
    { table: 'ai_models', column: 'accuracy_score' },
    { table: 'ai_models', column: 'status' }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      const { error } = await supabase
        .from(check.table)
        .select(check.column)
        .limit(1);
      
      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        results.push({ ...check, exists: false, error: error.message });
      } else {
        results.push({ ...check, exists: true });
      }
    } catch (error) {
      results.push({ ...check, exists: false, error: error.message });
    }
  }
  
  return results;
};

const checkEnvironmentVariables = () => {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'JWT_SECRET',
    'AGORA_APP_ID'
  ];

  const optional = [
    'STRIPE_SECRET_KEY',
    'OPENAI_API_KEY',
    'SMTP_HOST'
  ];

  const results = { required: [], optional: [] };

  required.forEach(envVar => {
    results.required.push({
      name: envVar,
      exists: !!process.env[envVar],
      value: process.env[envVar] ? `${process.env[envVar].substring(0, 10)}...` : 'NOT SET'
    });
  });

  optional.forEach(envVar => {
    results.optional.push({
      name: envVar,
      exists: !!process.env[envVar],
      value: process.env[envVar] ? `${process.env[envVar].substring(0, 10)}...` : 'NOT SET'
    });
  });

  return results;
};

const checkRequiredTables = async () => {
  const tables = [
    'profiles', 'services', 'bookings', 'payments', 'wallets',
    'messages', 'call_sessions', 'ai_models', 'ai_sessions'
  ];

  const results = [];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        results.push({ table, exists: false, error: error.message });
      } else {
        results.push({ table, exists: true });
      }
    } catch (error) {
      results.push({ table, exists: false, error: error.message });
    }
  }

  return results;
};

// ===============================================
// MAIN HEALTH CHECK
// ===============================================

const runQuickHealthCheck = async () => {
  log('🏥 RUNNING QUICK HEALTH CHECK', 'header');
  log('===============================', 'header');
  
  let overallStatus = 'HEALTHY';
  let criticalIssues = 0;
  let warnings = 0;

  // 1. Database Connection
  log('\n📡 Checking Database Connection...', 'header');
  const dbResult = await checkDatabaseConnection();
  if (dbResult.success) {
    log('✅ Database: Connected successfully', 'success');
  } else {
    log(`❌ Database: ${dbResult.message}`, 'error');
    criticalIssues++;
    overallStatus = 'CRITICAL';
  }

  // 2. Environment Variables
  log('\n🔧 Checking Environment Variables...', 'header');
  const envResults = checkEnvironmentVariables();
  
  envResults.required.forEach(env => {
    if (env.exists) {
      log(`✅ ${env.name}: ${env.value}`, 'success');
    } else {
      log(`❌ ${env.name}: NOT SET (REQUIRED)`, 'error');
      criticalIssues++;
      overallStatus = 'CRITICAL';
    }
  });

  envResults.optional.forEach(env => {
    if (env.exists) {
      log(`✅ ${env.name}: ${env.value}`, 'success');
    } else {
      log(`⚠️ ${env.name}: NOT SET (OPTIONAL)`, 'warning');
      warnings++;
    }
  });

  // 3. Database Tables
  log('\n🗄️ Checking Database Tables...', 'header');
  const tableResults = await checkRequiredTables();
  
  tableResults.forEach(result => {
    if (result.exists) {
      log(`✅ Table ${result.table}: Exists`, 'success');
    } else {
      log(`❌ Table ${result.table}: ${result.error}`, 'error');
      criticalIssues++;
      overallStatus = 'CRITICAL';
    }
  });

  // 4. Required Columns
  log('\n📊 Checking Required Columns...', 'header');
  const columnResults = await checkRequiredColumns();
  
  columnResults.forEach(result => {
    if (result.exists) {
      log(`✅ Column ${result.table}.${result.column}: Exists`, 'success');
    } else {
      log(`❌ Column ${result.table}.${result.column}: Missing`, 'error');
      criticalIssues++;
      if (overallStatus !== 'CRITICAL') overallStatus = 'NEEDS_FIXES';
    }
  });

  // 5. File System
  log('\n📁 Checking File System...', 'header');
  const fs = require('fs');
  
  const requiredDirs = ['logs', 'uploads', 'backups'];
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      log(`✅ Directory ${dir}: Exists`, 'success');
    } else {
      log(`⚠️ Directory ${dir}: Missing`, 'warning');
      warnings++;
    }
  });

  // Summary
  log('\n===============================', 'header');
  log('📋 HEALTH CHECK SUMMARY', 'header');
  log('===============================', 'header');

  if (overallStatus === 'HEALTHY') {
    log('🟢 SYSTEM STATUS: HEALTHY', 'success');
    log('🚀 Ready for production launch!', 'success');
  } else if (overallStatus === 'NEEDS_FIXES') {
    log('🟡 SYSTEM STATUS: NEEDS FIXES', 'warning');
    log('⚠️ Minor issues found - apply database fixes first', 'warning');
  } else {
    log('🔴 SYSTEM STATUS: CRITICAL', 'error');
    log('❌ Critical issues found - system not ready', 'error');
  }

  log(`\n📊 Issues Found:`, 'info');
  log(`   Critical: ${criticalIssues}`, criticalIssues > 0 ? 'error' : 'success');
  log(`   Warnings: ${warnings}`, warnings > 0 ? 'warning' : 'success');

  // Next Steps
  if (criticalIssues > 0) {
    log('\n🔧 NEXT STEPS:', 'header');
    
    if (columnResults.some(r => !r.exists)) {
      log('1. Apply database schema fixes via Supabase Dashboard', 'warning');
      log('   - Use the SQL script in database/apply-schema-fixes.md', 'info');
    }
    
    if (envResults.required.some(r => !r.exists)) {
      log('2. Set missing environment variables', 'warning');
    }
    
    if (tableResults.some(r => !r.exists)) {
      log('3. Run database migration scripts', 'warning');
    }
    
    log('4. Re-run this health check: npm run health:check', 'warning');
    log('5. Run seed data: npm run db:seed', 'warning');
    log('6. Run full verification: npm run deploy:check', 'warning');
  } else {
    log('\n🎉 READY FOR NEXT STEPS:', 'header');
    log('1. Run seed data: npm run db:seed', 'success');
    log('2. Run full verification: npm run deploy:check', 'success');
    log('3. Test user flows manually', 'success');
    log('4. Deploy to production! 🚀', 'success');
  }

  process.exit(criticalIssues > 0 ? 1 : 0);
};

// Run if called directly
if (require.main === module) {
  runQuickHealthCheck().catch(error => {
    log(`💥 Health check crashed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runQuickHealthCheck }; 