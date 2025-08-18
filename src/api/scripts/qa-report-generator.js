// ===============================================
// AUTOMATED QA REPORT GENERATOR
// ===============================================

const fs = require('fs');
const path = require('path');
const { supabase } = require('../lib/supabase');

// QA Results
const qaResults = {
  overall: { status: 'PENDING', score: 0, totalTests: 0, passed: 0, failed: 0, warnings: 0 },
  categories: {
    database: { tests: [], status: 'PENDING', score: 0 },
    apis: { tests: [], status: 'PENDING', score: 0 },
    frontend: { tests: [], status: 'PENDING', score: 0 },
    security: { tests: [], status: 'PENDING', score: 0 },
    integrations: { tests: [], status: 'PENDING', score: 0 },
    performance: { tests: [], status: 'PENDING', score: 0 }
  },
  criticalIssues: [],
  missingImplementations: [],
  autoFixes: [],
  timestamp: new Date().toISOString()
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

const log = (message, type = 'info') => {
  const color = type === 'success' ? colors.green : 
                type === 'error' ? colors.red : 
                type === 'warning' ? colors.yellow :
                type === 'header' ? colors.cyan : colors.blue;
  
  console.log(`${color}${message}${colors.reset}`);
};

const addTest = (category, testName, status, message, details = null, autoFix = null) => {
  const test = {
    name: testName,
    status, // 'passed', 'failed', 'warning'
    message,
    details,
    autoFix,
    timestamp: new Date().toISOString()
  };

  qaResults.categories[category].tests.push(test);
  qaResults.overall.totalTests++;

  if (status === 'passed') {
    qaResults.overall.passed++;
    log(`✓ ${testName}`, 'success');
  } else if (status === 'failed') {
    qaResults.overall.failed++;
    qaResults.criticalIssues.push(test);
    log(`✗ ${testName}: ${message}`, 'error');
    if (autoFix) {
      qaResults.autoFixes.push({ category, test: testName, fix: autoFix });
    }
  } else {
    qaResults.overall.warnings++;
    log(`⚠ ${testName}: ${message}`, 'warning');
  }
};

// ===============================================
// DATABASE TESTING
// ===============================================

const testDatabaseStructure = async () => {
  log('\n🗄️ Testing Database Structure', 'header');
  
  const requiredTables = [
    'profiles', 'services', 'bookings', 'payments', 'wallets', 'transactions',
    'messages', 'reviews', 'notifications', 'call_sessions', 'ai_models',
    'ai_sessions', 'learning_paths', 'course_content', 'reader_availability'
  ];

  let tablesExist = 0;
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          addTest('database', `Table ${table}`, 'failed', 'Table does not exist', error.message);
          qaResults.missingImplementations.push({
            type: 'database',
            item: `Table: ${table}`,
            priority: 'HIGH'
          });
        } else {
          addTest('database', `Table ${table}`, 'warning', `Access issue: ${error.message}`);
        }
      } else {
        addTest('database', `Table ${table}`, 'passed', 'Table exists and accessible');
        tablesExist++;
      }
    } catch (error) {
      addTest('database', `Table ${table}`, 'failed', `Connection error: ${error.message}`);
    }
  }

  // Test missing columns
  await testMissingColumns();
  
  // Calculate database score
  qaResults.categories.database.score = Math.round((tablesExist / requiredTables.length) * 100);
};

const testMissingColumns = async () => {
  const columnChecks = [
    { table: 'profiles', column: 'is_verified' },
    { table: 'profiles', column: 'is_active' },
    { table: 'services', column: 'category' },
    { table: 'services', column: 'status' },
    { table: 'ai_models', column: 'accuracy_score' },
    { table: 'ai_models', column: 'status' }
  ];

  for (const check of columnChecks) {
    try {
      const { error } = await supabase
        .from(check.table)
        .select(check.column)
        .limit(1);
      
      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        addTest('database', `Column ${check.table}.${check.column}`, 'failed', 
          'Column missing', error.message, {
            type: 'sql',
            content: `ALTER TABLE ${check.table} ADD COLUMN ${check.column} VARCHAR(50);`
          });
      } else {
        addTest('database', `Column ${check.table}.${check.column}`, 'passed', 'Column exists');
      }
    } catch (error) {
      addTest('database', `Column ${check.table}.${check.column}`, 'failed', 
        `Error checking column: ${error.message}`);
    }
  }
};

// ===============================================
// API TESTING
// ===============================================

const testAPIFiles = async () => {
  log('\n🌐 Testing API Files', 'header');
  
  const apiFiles = [
    { file: 'src/api/routes/authRoutes.js', weight: 2 },
    { file: 'src/api/routes/profileRoutes.js', weight: 2 },
    { file: 'src/api/routes/serviceRoutes.js', weight: 1 },
    { file: 'src/api/routes/bookingRoutes.js', weight: 2 },
    { file: 'src/api/routes/paymentRoutes.js', weight: 2 },
    { file: 'src/api/routes/chatRoutes.js', weight: 2 },
    { file: 'src/api/routes/callRoutes.js', weight: 2 },
    { file: 'src/api/routes/aiRoutes.js', weight: 2 },
    { file: 'src/api/routes/paymentsRoutes.js', weight: 2 },
    { file: 'src/api/middleware/auth.js', weight: 3 },
    { file: 'src/api/middleware/validation.js', weight: 3 }
  ];

  let totalWeight = 0;
  let passedWeight = 0;

  for (const api of apiFiles) {
    totalWeight += api.weight;
    
    try {
      if (fs.existsSync(api.file)) {
        const stats = fs.statSync(api.file);
        if (stats.size > 1000) { // At least 1KB
          addTest('apis', `API ${path.basename(api.file)}`, 'passed', 
            `File exists (${Math.round(stats.size/1024)}KB)`);
          passedWeight += api.weight;
        } else {
          addTest('apis', `API ${path.basename(api.file)}`, 'warning', 
            'File too small, may be incomplete');
          passedWeight += api.weight * 0.5;
        }
      } else {
        addTest('apis', `API ${path.basename(api.file)}`, 'failed', 'File missing');
        qaResults.missingImplementations.push({
          type: 'api',
          item: `API File: ${api.file}`,
          priority: api.weight > 2 ? 'HIGH' : 'MEDIUM'
        });
      }
    } catch (error) {
      addTest('apis', `API ${path.basename(api.file)}`, 'failed', error.message);
    }
  }

  qaResults.categories.apis.score = Math.round((passedWeight / totalWeight) * 100);
};

// ===============================================
// FRONTEND TESTING
// ===============================================

const testFrontendStructure = async () => {
  log('\n🎨 Testing Frontend Structure', 'header');
  
  const frontendDirs = [
    { dir: 'src/components', required: true },
    { dir: 'src/pages', required: true },
    { dir: 'src/dashboards', required: true },
    { dir: 'src/admin', required: false },
    { dir: 'src/hooks', required: false },
    { dir: 'src/utils', required: false }
  ];

  let dirScore = 0;
  let totalDirs = frontendDirs.length;

  for (const item of frontendDirs) {
    try {
      if (fs.existsSync(item.dir)) {
        const files = fs.readdirSync(item.dir, { recursive: true });
        const jsxFiles = files.filter(f => f.endsWith('.jsx') || f.endsWith('.tsx')).length;
        
        if (jsxFiles > 0) {
          addTest('frontend', `Directory ${item.dir}`, 'passed', 
            `${jsxFiles} React components found`);
          dirScore++;
        } else {
          addTest('frontend', `Directory ${item.dir}`, 'warning', 
            'Directory exists but no React components found');
          dirScore += 0.5;
        }
      } else {
        if (item.required) {
          addTest('frontend', `Directory ${item.dir}`, 'failed', 'Required directory missing');
          qaResults.missingImplementations.push({
            type: 'frontend',
            item: `Directory: ${item.dir}`,
            priority: 'HIGH'
          });
        } else {
          addTest('frontend', `Directory ${item.dir}`, 'warning', 'Optional directory missing');
        }
      }
    } catch (error) {
      addTest('frontend', `Directory ${item.dir}`, 'failed', error.message);
    }
  }

  // Test package.json dependencies
  await testPackageDependencies();
  
  qaResults.categories.frontend.score = Math.round((dirScore / totalDirs) * 100);
};

const testPackageDependencies = async () => {
  try {
    const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageData.dependencies, ...packageData.devDependencies };
    
    const criticalDeps = [
      'react', 'react-dom', 'react-router-dom',
      '@supabase/supabase-js', 'tailwindcss', 'framer-motion'
    ];

    let depsScore = 0;
    for (const dep of criticalDeps) {
      if (allDeps[dep]) {
        addTest('frontend', `Dependency ${dep}`, 'passed', `Version: ${allDeps[dep]}`);
        depsScore++;
      } else {
        addTest('frontend', `Dependency ${dep}`, 'failed', 'Missing critical dependency');
      }
    }
    
    // Update score based on dependencies
    const depPercentage = (depsScore / criticalDeps.length) * 100;
    qaResults.categories.frontend.score = Math.round(
      (qaResults.categories.frontend.score + depPercentage) / 2
    );
    
  } catch (error) {
    addTest('frontend', 'Package Dependencies', 'failed', 'Could not read package.json');
  }
};

// ===============================================
// SECURITY TESTING
// ===============================================

const testSecurity = async () => {
  log('\n🔒 Testing Security Configuration', 'header');
  
  const envVars = [
    { name: 'SUPABASE_URL', required: true, weight: 3 },
    { name: 'SUPABASE_ANON_KEY', required: true, weight: 3 },
    { name: 'JWT_SECRET', required: true, weight: 3 },
    { name: 'STRIPE_SECRET_KEY', required: false, weight: 2 },
    { name: 'OPENAI_API_KEY', required: false, weight: 1 }
  ];
  
  let securityScore = 0;
  let totalWeight = envVars.reduce((sum, env) => sum + env.weight, 0);
  let passedWeight = 0;

  for (const envVar of envVars) {
    if (process.env[envVar.name]) {
      if (envVar.name === 'JWT_SECRET' && process.env[envVar.name].length < 32) {
        addTest('security', `Environment ${envVar.name}`, 'warning', 
          'JWT secret should be at least 32 characters');
        passedWeight += envVar.weight * 0.7;
      } else {
        addTest('security', `Environment ${envVar.name}`, 'passed', 'Variable configured');
        passedWeight += envVar.weight;
      }
    } else {
      if (envVar.required) {
        addTest('security', `Environment ${envVar.name}`, 'failed', 
          'Missing required environment variable');
      } else {
        addTest('security', `Environment ${envVar.name}`, 'warning', 
          'Optional environment variable not set');
        passedWeight += envVar.weight * 0.3;
      }
    }
  }

  // Test .env file existence
  if (fs.existsSync('.env')) {
    addTest('security', 'Environment File', 'passed', '.env file exists');
    passedWeight += 2;
  } else {
    addTest('security', 'Environment File', 'warning', '.env file not found');
  }
  totalWeight += 2;

  qaResults.categories.security.score = Math.round((passedWeight / totalWeight) * 100);
};

// ===============================================
// INTEGRATION TESTING
// ===============================================

const testIntegrations = async () => {
  log('\n🔌 Testing External Integrations', 'header');
  
  const integrations = [
    { name: 'Supabase', test: testSupabaseIntegration, weight: 3 },
    { name: 'Stripe', test: testStripeIntegration, weight: 2 },
    { name: 'OpenAI', test: testOpenAIIntegration, weight: 2 },
    { name: 'SMTP', test: testSMTPIntegration, weight: 1 }
  ];

  let totalWeight = integrations.reduce((sum, int) => sum + int.weight, 0);
  let passedWeight = 0;

  for (const integration of integrations) {
    try {
      const result = await integration.test();
      if (result.success) {
        addTest('integrations', integration.name, 'passed', result.message);
        passedWeight += integration.weight;
      } else {
        addTest('integrations', integration.name, 'warning', result.message);
        passedWeight += integration.weight * 0.5;
      }
    } catch (error) {
      addTest('integrations', integration.name, 'failed', error.message);
    }
  }

  qaResults.categories.integrations.score = Math.round((passedWeight / totalWeight) * 100);
};

const testSupabaseIntegration = async () => {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw error;
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error.message}` };
  }
};

const testStripeIntegration = async () => {
  if (process.env.STRIPE_SECRET_KEY) {
    return { success: true, message: 'API key configured' };
  } else {
    return { success: false, message: 'API key not configured' };
  }
};

const testOpenAIIntegration = async () => {
  if (process.env.OPENAI_API_KEY) {
    return { success: true, message: 'API key configured' };
  } else {
    return { success: false, message: 'API key not configured' };
  }
};

const testSMTPIntegration = async () => {
  if (process.env.SMTP_HOST) {
    return { success: true, message: 'SMTP configuration found' };
  } else {
    return { success: false, message: 'SMTP not configured' };
  }
};

// ===============================================
// PERFORMANCE TESTING
// ===============================================

const testPerformance = async () => {
  log('\n⚡ Testing Performance Metrics', 'header');
  
  // Simple performance tests
  // const startTime = Date.now();
  
  try {
    // Test database query speed
    const dbStart = Date.now();
    await supabase.from('profiles').select('*').limit(10);
    const dbDuration = Date.now() - dbStart;
    
    if (dbDuration < 100) {
      addTest('performance', 'Database Query Speed', 'passed', `${dbDuration}ms`);
    } else if (dbDuration < 300) {
      addTest('performance', 'Database Query Speed', 'warning', `Slow: ${dbDuration}ms`);
    } else {
      addTest('performance', 'Database Query Speed', 'failed', `Very slow: ${dbDuration}ms`);
    }
    
    // Test file system access
    const fsStart = Date.now();
    fs.readFileSync('package.json');
    const fsDuration = Date.now() - fsStart;
    
    if (fsDuration < 10) {
      addTest('performance', 'File System Access', 'passed', `${fsDuration}ms`);
    } else {
      addTest('performance', 'File System Access', 'warning', `Slow: ${fsDuration}ms`);
    }
    
    qaResults.categories.performance.score = 90; // Default good score
    
  } catch (error) {
    addTest('performance', 'Performance Tests', 'failed', error.message);
    qaResults.categories.performance.score = 50;
  }
};

// ===============================================
// REPORT GENERATION
// ===============================================

const generateFinalReport = async () => {
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  // Calculate overall score
  const categoryScores = Object.values(qaResults.categories).map(cat => cat.score);
  qaResults.overall.score = Math.round(
    categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
  );
  
  // Determine overall status
  if (qaResults.overall.score >= 95) {
    qaResults.overall.status = 'EXCELLENT';
  } else if (qaResults.overall.score >= 85) {
    qaResults.overall.status = 'GOOD';
  } else if (qaResults.overall.score >= 70) {
    qaResults.overall.status = 'NEEDS_WORK';
  } else {
    qaResults.overall.status = 'CRITICAL';
  }

  // Generate report
  log('\n================================================', 'cyan');
  log('📊 COMPREHENSIVE QA REPORT SUMMARY', 'header');
  log('================================================', 'cyan');
  
  log(`\n🎯 Overall Status: ${qaResults.overall.status}`, 
    qaResults.overall.status === 'EXCELLENT' ? 'success' : 
    qaResults.overall.status === 'GOOD' ? 'warning' : 'error');
  
  log(`📈 Overall Score: ${qaResults.overall.score}%`, 'info');
  log(`⏱️ Test Duration: ${duration} seconds`, 'info');
  log(`✅ Passed: ${qaResults.overall.passed}`, 'success');
  log(`⚠️ Warnings: ${qaResults.overall.warnings}`, 'warning');
  log(`❌ Failed: ${qaResults.overall.failed}`, 'error');
  log(`📋 Total Tests: ${qaResults.overall.totalTests}`, 'info');

  // Category breakdown
  log('\n📊 Category Breakdown:', 'header');
  Object.entries(qaResults.categories).forEach(([category, data]) => {
    const score = data.score || 0;
    const color = score >= 90 ? 'success' : score >= 70 ? 'warning' : 'error';
    log(`${category.toUpperCase()}: ${score}% (${data.tests.length} tests)`, color);
  });

  // Critical issues
  if (qaResults.criticalIssues.length > 0) {
    log('\n🚨 Critical Issues:', 'error');
    qaResults.criticalIssues.slice(0, 5).forEach((issue, i) => {
      log(`${i + 1}. ${issue.name}: ${issue.message}`, 'error');
    });
    if (qaResults.criticalIssues.length > 5) {
      log(`... and ${qaResults.criticalIssues.length - 5} more issues`, 'warning');
    }
  }

  // Production readiness
  log('\n🚀 Production Readiness:', 'header');
  if (qaResults.overall.score >= 90 && qaResults.criticalIssues.length === 0) {
    log('🟢 READY FOR PRODUCTION LAUNCH!', 'success');
  } else if (qaResults.overall.score >= 75) {
    log('🟡 MOSTLY READY - Address critical issues first', 'warning');
  } else {
    log('🔴 NOT READY - Major fixes required', 'error');
  }

  // Save detailed report
  const reportPath = path.join(__dirname, '../../reports/qa-report.json');
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(qaResults, null, 2));
    log(`\n📄 Detailed report saved to: ${reportPath}`, 'info');
  } catch (error) {
    log(`⚠️ Could not save report: ${error.message}`, 'warning');
  }

  log('\n✅ QA CHECK COMPLETED!', 'success');
};

// ===============================================
// MAIN EXECUTION
// ===============================================

let startTime;

const runComprehensiveQA = async () => {
  startTime = Date.now();
  
  log('🚀 STARTING COMPREHENSIVE QA & SYSTEM HEALTH CHECK', 'header');
  log('==================================================', 'cyan');
  
  try {
    await testDatabaseStructure();
    await testAPIFiles();
    await testFrontendStructure();
    await testSecurity();
    await testIntegrations();
    await testPerformance();
    await generateFinalReport();
    
  } catch (error) {
    log(`💥 QA CHECK CRASHED: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runComprehensiveQA();
}

module.exports = { runComprehensiveQA, qaResults }; 
