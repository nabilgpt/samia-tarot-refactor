#!/usr/bin/env node

/**
 * SAMIA TAROT - Production QA Test Suite
 * Tests critical functionality after stabilization changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from the main .env file
dotenv.config();

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔮 SAMIA TAROT - Production QA Test Suite');
console.log('==========================================\n');

// Test Configuration
const testConfig = {
  timeout: 10000, // 10 seconds per test
  retries: 3
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// Create Supabase clients
let supabase, supabaseAdmin;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables. Please check your .env file.');
  }
  
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  if (serviceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  } else {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found - admin tests will be skipped\n');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase clients:', error.message);
  process.exit(1);
}

// Test helper functions
const runTest = async (testName, testFn, requiresAdmin = false) => {
  if (requiresAdmin && !supabaseAdmin) {
    console.log(`⏭️  SKIP: ${testName} (requires admin credentials)`);
    testResults.skipped++;
    return;
  }

  try {
    console.log(`🧪 Testing: ${testName}`);
    await Promise.race([
      testFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), testConfig.timeout)
      )
    ]);
    console.log(`✅ PASS: ${testName}\n`);
    testResults.passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${testName}`);
    console.log(`   Error: ${error.message}\n`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
  }
};

// Individual test functions
const tests = {
  // Test 1: Database Connection
  async testDatabaseConnection() {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error && !error.message.includes('0 rows')) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  },

  // Test 2: Enhanced Spread System Tables Exist
  async testEnhancedSpreadSystemTables() {
    const requiredTables = [
      'tarot_decks',
      'tarot_spreads',
      'spread_service_assignments', 
      'spread_approval_logs',
      'client_spread_selections',
      'reader_spread_notifications'
    ];

    for (const table of requiredTables) {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Table ${table} missing or inaccessible: ${error.message}`);
      }
    }
  },

  // Test 3: Environment Variables Security
  async testEnvironmentSecurity() {
    // Check that no hardcoded secrets are exposed
    const criticalEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    
    for (const envVar of criticalEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing critical environment variable: ${envVar}`);
      }
      
      // Check it's not a hardcoded test/placeholder value
      if (process.env[envVar].includes('your_') || process.env[envVar].includes('placeholder')) {
        throw new Error(`Environment variable ${envVar} appears to be a placeholder`);
      }
    }
  },

  // Test 4: Authentication Flow
  async testAuthenticationFlow() {
    // Test getting current session (should work even if no user logged in)
    const { data: session, error } = await supabase.auth.getSession();
    
    if (error) {
      throw new Error(`Authentication system error: ${error.message}`);
    }
    
    // Session can be null (no user logged in) - that's fine for this test
  }
};

// Main test runner
async function runQATests() {
  console.log('🚀 Starting Production QA Tests...\n');

  // Run all tests
  await runTest('Database Connection', tests.testDatabaseConnection);
  await runTest('Enhanced Spread System Tables', tests.testEnhancedSpreadSystemTables);
  await runTest('Environment Variables Security', tests.testEnvironmentSecurity);
  await runTest('Authentication Flow', tests.testAuthenticationFlow);

  // Print results
  console.log('📊 QA TEST RESULTS');
  console.log('==================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️  Skipped: ${testResults.skipped}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`   • ${test}: ${error}`);
    });
    console.log('\n🚨 PRODUCTION DEPLOYMENT NOT RECOMMENDED');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED - Ready for production!');
    
    if (testResults.skipped > 0) {
      console.log(`ℹ️  Note: ${testResults.skipped} tests were skipped due to missing admin credentials`);
    }
  }
}

// Run the tests
runQATests().catch(error => {
  console.error('💥 QA Test Suite crashed:', error.message);
  process.exit(1);
}); 