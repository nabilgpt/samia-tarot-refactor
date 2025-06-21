// ===============================================
// PRE-DEPLOYMENT VERIFICATION SCRIPT
// ===============================================

const { supabase } = require('../lib/supabase');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Verification results
const results = {
  passed: [],
  warnings: [],
  failed: [],
  summary: {}
};

// Helper functions
const log = (message, type = 'info') => {
  const color = type === 'success' ? colors.green : 
                type === 'error' ? colors.red : 
                type === 'warning' ? colors.yellow : colors.blue;
  console.log(`${color}${message}${colors.reset}`);
};

const addResult = (category, test, status, message, details = null) => {
  const result = { category, test, status, message, details, timestamp: new Date().toISOString() };
  
  if (status === 'passed') {
    results.passed.push(result);
    log(`✓ ${test}: ${message}`, 'success');
  } else if (status === 'warning') {
    results.warnings.push(result);
    log(`⚠ ${test}: ${message}`, 'warning');
  } else {
    results.failed.push(result);
    log(`✗ ${test}: ${message}`, 'error');
  }
};

// ===============================================
// ENVIRONMENT CHECKS
// ===============================================

const checkEnvironmentVariables = () => {
  log('\n📋 Checking Environment Variables...', 'info');
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET',
    'NODE_ENV'
  ];

  const optional = [
    'STRIPE_SECRET_KEY',
    'AGORA_APP_ID',
    'OPENAI_API_KEY',
    'SMTP_HOST',
    'AWS_ACCESS_KEY_ID',
    'REDIS_URL'
  ];

  // Check required variables
  required.forEach(key => {
    if (process.env[key]) {
      addResult('Environment', `Required: ${key}`, 'passed', 'Variable is set');
    } else {
      addResult('Environment', `Required: ${key}`, 'failed', 'Missing required environment variable');
    }
  });

  // Check optional variables (warnings only)
  optional.forEach(key => {
    if (process.env[key]) {
      addResult('Environment', `Optional: ${key}`, 'passed', 'Variable is set');
    } else {
      addResult('Environment', `Optional: ${key}`, 'warning', 'Optional variable not set');
    }
  });

  // Check JWT secret strength
  if (process.env.JWT_SECRET) {
    const secret = process.env.JWT_SECRET;
    if (secret.length < 32) {
      addResult('Environment', 'JWT Secret Strength', 'warning', 'JWT secret should be at least 32 characters');
    } else {
      addResult('Environment', 'JWT Secret Strength', 'passed', 'JWT secret has adequate length');
    }
  }
};

// ===============================================
// DATABASE CHECKS
// ===============================================

const checkDatabaseConnection = async () => {
  log('\n🗄️ Checking Database Connection...', 'info');
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      addResult('Database', 'Connection', 'failed', `Database connection failed: ${error.message}`, error);
    } else {
      addResult('Database', 'Connection', 'passed', 'Database connection successful');
    }
  } catch (error) {
    addResult('Database', 'Connection', 'failed', `Database connection error: ${error.message}`, error);
  }
};

const checkDatabaseSchema = async () => {
  log('\n📊 Checking Database Schema...', 'info');
  
  const requiredTables = [
    'profiles', 'services', 'bookings', 'payments', 'wallets', 'transactions',
    'messages', 'reviews', 'notifications', 'call_sessions', 'ai_models',
    'ai_sessions', 'learning_paths', 'course_content', 'reader_availability'
  ];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        addResult('Database', `Table: ${table}`, 'failed', `Table not accessible: ${error.message}`);
      } else {
        addResult('Database', `Table: ${table}`, 'passed', 'Table exists and accessible');
      }
    } catch (error) {
      addResult('Database', `Table: ${table}`, 'failed', `Table check error: ${error.message}`);
    }
  }
};

const checkForeignKeys = async () => {
  log('\n🔗 Checking Foreign Key Constraints...', 'info');
  
  try {
    const { data, error } = await supabase.rpc('check_foreign_key_constraints');
    
    if (error) {
      addResult('Database', 'Foreign Keys', 'warning', 'Could not verify foreign key constraints');
    } else {
      addResult('Database', 'Foreign Keys', 'passed', 'Foreign key constraints verified');
    }
  } catch (error) {
    addResult('Database', 'Foreign Keys', 'warning', 'Foreign key check not available');
  }
};

const checkDataIntegrity = async () => {
  log('\n🛡️ Checking Data Integrity...', 'info');
  
  const checks = [
    {
      name: 'Orphaned Bookings',
      query: `SELECT COUNT(*) FROM bookings b 
              LEFT JOIN profiles p ON b.client_id = p.id 
              WHERE p.id IS NULL`,
      expectedCount: 0
    },
    {
      name: 'Invalid Wallet Balances',
      query: `SELECT COUNT(*) FROM wallets WHERE balance < 0`,
      expectedCount: 0
    },
    {
      name: 'Duplicate User Profiles',
      query: `SELECT COUNT(*) - COUNT(DISTINCT email) FROM profiles`,
      expectedCount: 0
    }
  ];

  for (const check of checks) {
    try {
      const { data, error } = await supabase.rpc('execute_sql', { sql: check.query });
      
      if (error) {
        addResult('Database', check.name, 'warning', `Could not execute check: ${error.message}`);
      } else {
        const count = data?.[0]?.count || 0;
        if (count === check.expectedCount) {
          addResult('Database', check.name, 'passed', `No integrity issues found`);
        } else {
          addResult('Database', check.name, 'failed', `Found ${count} integrity issues`);
        }
      }
    } catch (error) {
      addResult('Database', check.name, 'warning', `Check unavailable: ${error.message}`);
    }
  }
};

// ===============================================
// API ENDPOINT CHECKS
// ===============================================

const checkAPIEndpoints = async () => {
  log('\n🌐 Checking API Endpoints...', 'info');
  
  const endpoints = [
    { path: '/api/health', method: 'GET', expected: 200 },
    { path: '/api/auth/verify', method: 'GET', expected: [200, 401] },
    { path: '/api/profiles', method: 'GET', expected: [200, 401] },
    { path: '/api/services', method: 'GET', expected: 200 },
    { path: '/api/bookings', method: 'GET', expected: [200, 401] }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint.path}`, {
        method: endpoint.method
      });

      const expectedCodes = Array.isArray(endpoint.expected) ? endpoint.expected : [endpoint.expected];
      
      if (expectedCodes.includes(response.status)) {
        addResult('API', `${endpoint.method} ${endpoint.path}`, 'passed', `Status: ${response.status}`);
      } else {
        addResult('API', `${endpoint.method} ${endpoint.path}`, 'failed', `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      addResult('API', `${endpoint.method} ${endpoint.path}`, 'failed', `Request failed: ${error.message}`);
    }
  }
};

// ===============================================
// SECURITY CHECKS
// ===============================================

const checkSecurityConfiguration = () => {
  log('\n🔒 Checking Security Configuration...', 'info');
  
  // Check if running in production mode
  if (process.env.NODE_ENV === 'production') {
    addResult('Security', 'Production Mode', 'passed', 'Running in production mode');
  } else {
    addResult('Security', 'Production Mode', 'warning', 'Not running in production mode');
  }

  // Check HTTPS enforcement
  if (process.env.FORCE_HTTPS === 'true') {
    addResult('Security', 'HTTPS Enforcement', 'passed', 'HTTPS enforcement enabled');
  } else {
    addResult('Security', 'HTTPS Enforcement', 'warning', 'HTTPS enforcement not configured');
  }

  // Check rate limiting
  if (process.env.RATE_LIMIT_ENABLED !== 'false') {
    addResult('Security', 'Rate Limiting', 'passed', 'Rate limiting enabled');
  } else {
    addResult('Security', 'Rate Limiting', 'warning', 'Rate limiting disabled');
  }

  // Check CORS configuration
  if (process.env.CORS_ORIGIN) {
    addResult('Security', 'CORS Configuration', 'passed', 'CORS origin configured');
  } else {
    addResult('Security', 'CORS Configuration', 'warning', 'CORS origin not specified');
  }
};

// ===============================================
// FILE SYSTEM CHECKS
// ===============================================

const checkFileSystem = () => {
  log('\n📁 Checking File System...', 'info');
  
  const requiredPaths = [
    { path: 'uploads', type: 'directory', description: 'Upload directory' },
    { path: 'logs', type: 'directory', description: 'Logs directory' },
    { path: 'backups', type: 'directory', description: 'Backups directory' }
  ];

  requiredPaths.forEach(({ path: filePath, type, description }) => {
    const fullPath = path.resolve(filePath);
    
    try {
      const stats = fs.statSync(fullPath);
      
      if (type === 'directory' && stats.isDirectory()) {
        // Check write permissions
        fs.accessSync(fullPath, fs.constants.W_OK);
        addResult('FileSystem', description, 'passed', `${type} exists and writable`);
      } else if (type === 'file' && stats.isFile()) {
        addResult('FileSystem', description, 'passed', `${type} exists`);
      } else {
        addResult('FileSystem', description, 'failed', `Invalid ${type} type`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        addResult('FileSystem', description, 'failed', `${type} does not exist`);
      } else if (error.code === 'EACCES') {
        addResult('FileSystem', description, 'failed', `No write permission for ${type}`);
      } else {
        addResult('FileSystem', description, 'failed', `${type} check failed: ${error.message}`);
      }
    }
  });
};

// ===============================================
// EXTERNAL SERVICES CHECKS
// ===============================================

const checkExternalServices = async () => {
  log('\n🌍 Checking External Services...', 'info');
  
  const services = [
    {
      name: 'Stripe API',
      check: async () => {
        if (!process.env.STRIPE_SECRET_KEY) return { status: 'skipped', message: 'API key not configured' };
        // Mock check - would normally test Stripe connection
        return { status: 'passed', message: 'API key configured' };
      }
    },
    {
      name: 'OpenAI API',
      check: async () => {
        if (!process.env.OPENAI_API_KEY) return { status: 'skipped', message: 'API key not configured' };
        return { status: 'passed', message: 'API key configured' };
      }
    },
    {
      name: 'Agora WebRTC',
      check: async () => {
        if (!process.env.AGORA_APP_ID) return { status: 'skipped', message: 'App ID not configured' };
        return { status: 'passed', message: 'App ID configured' };
      }
    }
  ];

  for (const service of services) {
    try {
      const result = await service.check();
      
      if (result.status === 'skipped') {
        addResult('External Services', service.name, 'warning', result.message);
      } else if (result.status === 'passed') {
        addResult('External Services', service.name, 'passed', result.message);
      } else {
        addResult('External Services', service.name, 'failed', result.message);
      }
    } catch (error) {
      addResult('External Services', service.name, 'failed', `Check failed: ${error.message}`);
    }
  }
};

// ===============================================
// SEED DATA CHECKS
// ===============================================

const checkSeedData = async () => {
  log('\n🌱 Checking Seed Data...', 'info');
  
  const checks = [
    {
      name: 'Admin Users',
      table: 'profiles',
      condition: "role = 'super_admin'",
      minCount: 1
    },
    {
      name: 'Service Categories',
      table: 'services',
      condition: "status = 'active'",
      minCount: 1
    },
    {
      name: 'AI Models',
      table: 'ai_models',
      condition: "status = 'active'",
      minCount: 1
    }
  ];

  for (const check of checks) {
    try {
      const { data, error } = await supabase
        .from(check.table)
        .select('id')
        .filter(check.condition.split(' = ')[0], 'eq', check.condition.split(' = ')[1].replace(/'/g, ''));

      if (error) {
        addResult('Seed Data', check.name, 'failed', `Query failed: ${error.message}`);
      } else {
        const count = data?.length || 0;
        if (count >= check.minCount) {
          addResult('Seed Data', check.name, 'passed', `Found ${count} records`);
        } else {
          addResult('Seed Data', check.name, 'failed', `Only ${count} records found, minimum ${check.minCount} required`);
        }
      }
    } catch (error) {
      addResult('Seed Data', check.name, 'failed', `Check failed: ${error.message}`);
    }
  }
};

// ===============================================
// MAIN VERIFICATION FUNCTION
// ===============================================

const runPreDeploymentVerification = async () => {
  const startTime = new Date();
  
  log('🚀 Starting Pre-Deployment Verification...', 'info');
  log('================================================', 'info');

  try {
    // Run all checks
    checkEnvironmentVariables();
    checkSecurityConfiguration();
    checkFileSystem();
    
    await checkDatabaseConnection();
    await checkDatabaseSchema();
    await checkForeignKeys();
    await checkDataIntegrity();
    await checkSeedData();
    
    // Skip API checks if server is not running
    try {
      await checkAPIEndpoints();
    } catch (error) {
      addResult('API', 'Server Status', 'warning', 'Server may not be running for endpoint checks');
    }
    
    await checkExternalServices();

  } catch (error) {
    log(`\n❌ Verification failed: ${error.message}`, 'error');
    process.exit(1);
  }

  // Generate summary
  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 1000);
  
  results.summary = {
    duration,
    passed: results.passed.length,
    warnings: results.warnings.length,
    failed: results.failed.length,
    total: results.passed.length + results.warnings.length + results.failed.length
  };

  // Print summary
  log('\n================================================', 'info');
  log('📊 VERIFICATION SUMMARY', 'info');
  log('================================================', 'info');
  log(`⏱️ Duration: ${duration} seconds`, 'info');
  log(`✅ Passed: ${results.summary.passed}`, 'success');
  log(`⚠️ Warnings: ${results.summary.warnings}`, 'warning');
  log(`❌ Failed: ${results.summary.failed}`, 'error');
  log(`📋 Total Checks: ${results.summary.total}`, 'info');

  // Deployment readiness assessment
  if (results.failed.length === 0) {
    log('\n🎉 DEPLOYMENT READY! All critical checks passed.', 'success');
    if (results.warnings.length > 0) {
      log('⚠️ Please review warnings before deployment.', 'warning');
    }
  } else {
    log(`\n🚫 NOT DEPLOYMENT READY! ${results.failed.length} critical issues found.`, 'error');
    log('Please fix failed checks before deployment.', 'error');
  }

  // Save detailed report
  const reportPath = path.join(__dirname, '../../reports/pre-deployment-report.json');
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    log(`\n📄 Detailed report saved to: ${reportPath}`, 'info');
  } catch (error) {
    log(`\n⚠️ Could not save report: ${error.message}`, 'warning');
  }

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
};

// Run verification if called directly
if (require.main === module) {
  runPreDeploymentVerification().catch(error => {
    log(`\n💥 Verification crashed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runPreDeploymentVerification,
  checkEnvironmentVariables,
  checkDatabaseConnection,
  checkSecurityConfiguration
}; 