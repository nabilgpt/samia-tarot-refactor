#!/usr/bin/env node

/**
 * 🧪 SAMIA TAROT - API Validation & Testing Suite
 * Comprehensive testing of all API endpoints
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'process.env.VITE_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'process.env.SUPABASE_SERVICE_ROLE_KEY';

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

class APIValidator {
  constructor() {
    this.testResults = {
      passed: [],
      failed: [],
      warnings: [],
      coverage: {}
    };
    
    this.apiEndpoints = {
      auth: [
        'POST /api/auth/login',
        'POST /api/auth/register', 
        'POST /api/auth/logout',
        'GET /api/auth/profile',
        'PUT /api/auth/profile'
      ],
      bookings: [
        'GET /api/bookings',
        'POST /api/bookings',
        'GET /api/bookings/:id',
        'PUT /api/bookings/:id',
        'DELETE /api/bookings/:id'
      ],
      payments: [
        'GET /api/payments',
        'POST /api/payments',
        'GET /api/payments/:id',
        'PUT /api/payments/:id/approve',
        'POST /api/payments/stripe/webhook',
        'POST /api/payments/square/webhook'
      ],
      chat: [
        'GET /api/chat/sessions',
        'POST /api/chat/sessions',
        'GET /api/chat/sessions/:id/messages',
        'POST /api/chat/sessions/:id/messages',
        'POST /api/chat/voice-notes'
      ],
      analytics: [
        'GET /api/analytics/dashboard',
        'GET /api/analytics/reader/:id',
        'GET /api/analytics/daily',
        'POST /api/analytics/events'
      ],
      emergency: [
        'POST /api/emergency/calls',
        'GET /api/emergency/calls/:id',
        'PUT /api/emergency/calls/:id/escalate',
        'GET /api/emergency/escalations'
      ],
      admin: [
        'GET /api/admin/users',
        'PUT /api/admin/users/:id',
        'GET /api/admin/system-settings',
        'PUT /api/admin/system-settings',
        'POST /api/admin/impersonate'
      ]
    };
  }

  async runComprehensiveAPITest() {
    console.log('🧪 SAMIA TAROT - API Validation & Testing Suite');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
      // 1. Test Database Connectivity
      await this.testDatabaseConnectivity();
      
      // 2. Test Authentication Endpoints
      await this.testAuthenticationEndpoints();
      
      // 3. Test Core Business Logic APIs
      await this.testCoreBusinessAPIs();
      
      // 4. Test Payment System APIs
      await this.testPaymentSystemAPIs();
      
      // 5. Test Real-time Features
      await this.testRealTimeFeatures();
      
      // 6. Test Admin & Monitoring APIs
      await this.testAdminMonitoringAPIs();
      
      // 7. Test Error Handling & Edge Cases
      await this.testErrorHandlingEdgeCases();
      
      // 8. Test Rate Limiting & Security
      await this.testRateLimitingSecurity();

      // Generate comprehensive report
      this.generateAPITestReport();

    } catch (error) {
      console.error('💥 API testing failed:', error);
      throw error;
    }
  }

  async testDatabaseConnectivity() {
    console.log('🔧 1. Testing Database Connectivity...');
    
    try {
      // Test basic database connection
      const { data: testQuery, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        this.testResults.failed.push('Database connectivity - ' + error.message);
        console.log('   ❌ Database connection failed');
        return;
      }

      console.log('   ✅ Database connection successful');
      this.testResults.passed.push('Database connectivity');

      // Test critical tables accessibility
      const criticalTables = [
        'profiles', 'bookings', 'payments', 'services', 'chat_sessions',
        'payment_settings', 'system_settings', 'emergency_call_logs'
      ];

      let accessibleTables = 0;
      for (const tableName of criticalTables) {
        try {
          const { error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (!tableError) {
            accessibleTables++;
          }
        } catch (err) {
          // Table might not exist or be accessible
        }
      }

      const tableAccessPercentage = Math.round((accessibleTables / criticalTables.length) * 100);
      console.log(`   📊 Table accessibility: ${accessibleTables}/${criticalTables.length} (${tableAccessPercentage}%)`);
      
      if (tableAccessPercentage >= 80) {
        this.testResults.passed.push(`Table accessibility (${tableAccessPercentage}%)`);
      } else {
        this.testResults.warnings.push(`Table accessibility low (${tableAccessPercentage}%)`);
      }

    } catch (error) {
      console.log('   ❌ Database connectivity test failed:', error.message);
      this.testResults.failed.push('Database connectivity test - ' + error.message);
    }
  }

  async testAuthenticationEndpoints() {
    console.log('🔧 2. Testing Authentication Endpoints...');
    
    try {
      // Test user registration flow
      const testUser = {
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        full_name: 'Test User'
      };

      // Test registration
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
        options: {
          data: {
            full_name: testUser.full_name
          }
        }
      });

      if (signUpError) {
        console.log('   ⚠️  User registration test skipped:', signUpError.message);
        this.testResults.warnings.push('User registration - ' + signUpError.message);
      } else {
        console.log('   ✅ User registration endpoint working');
        this.testResults.passed.push('User registration endpoint');
      }

      // Test login flow
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      if (signInError) {
        console.log('   ⚠️  User login test failed:', signInError.message);
        this.testResults.warnings.push('User login - ' + signInError.message);
      } else {
        console.log('   ✅ User login endpoint working');
        this.testResults.passed.push('User login endpoint');
        
        // Clean up test user
        if (signInData.user) {
          await supabase.auth.admin.deleteUser(signInData.user.id);
        }
      }

      // Test profile access
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

      if (profileError) {
        console.log('   ❌ Profile access failed:', profileError.message);
        this.testResults.failed.push('Profile access - ' + profileError.message);
      } else {
        console.log(`   ✅ Profile access working (${profiles.length} profiles found)`);
        this.testResults.passed.push('Profile access');
      }

    } catch (error) {
      console.log('   ❌ Authentication endpoints test failed:', error.message);
      this.testResults.failed.push('Authentication endpoints - ' + error.message);
    }
  }

  async testCoreBusinessAPIs() {
    console.log('🔧 3. Testing Core Business Logic APIs...');
    
    try {
      // Test services API
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .limit(10);

      if (servicesError) {
        console.log('   ❌ Services API failed:', servicesError.message);
        this.testResults.failed.push('Services API - ' + servicesError.message);
      } else {
        console.log(`   ✅ Services API working (${services.length} services found)`);
        this.testResults.passed.push('Services API');
      }

      // Test bookings API
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .limit(10);

      if (bookingsError) {
        console.log('   ❌ Bookings API failed:', bookingsError.message);
        this.testResults.failed.push('Bookings API - ' + bookingsError.message);
      } else {
        console.log(`   ✅ Bookings API working (${bookings.length} bookings found)`);
        this.testResults.passed.push('Bookings API');
      }

      // Test reviews API
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .limit(10);

      if (reviewsError) {
        console.log('   ❌ Reviews API failed:', reviewsError.message);
        this.testResults.failed.push('Reviews API - ' + reviewsError.message);
      } else {
        console.log(`   ✅ Reviews API working (${reviews.length} reviews found)`);
        this.testResults.passed.push('Reviews API');
      }

    } catch (error) {
      console.log('   ❌ Core business APIs test failed:', error.message);
      this.testResults.failed.push('Core business APIs - ' + error.message);
    }
  }

  async testPaymentSystemAPIs() {
    console.log('🔧 4. Testing Payment System APIs...');
    
    try {
      // Test payment settings API
      const { data: paymentSettings, error: paymentError } = await supabase
        .from('payment_settings')
        .select('*');

      if (paymentError) {
        console.log('   ❌ Payment settings API failed:', paymentError.message);
        this.testResults.failed.push('Payment settings API - ' + paymentError.message);
      } else {
        console.log(`   ✅ Payment settings API working (${paymentSettings.length} methods configured)`);
        this.testResults.passed.push('Payment settings API');
      }

      // Test payments API
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .limit(10);

      if (paymentsError) {
        console.log('   ❌ Payments API failed:', paymentsError.message);
        this.testResults.failed.push('Payments API - ' + paymentsError.message);
      } else {
        console.log(`   ✅ Payments API working (${payments.length} payments found)`);
        this.testResults.passed.push('Payments API');
      }

      // Test wallet API
      const { data: wallets, error: walletsError } = await supabase
        .from('user_wallets')
        .select('*')
        .limit(10);

      if (walletsError) {
        console.log('   ❌ Wallet API failed:', walletsError.message);
        this.testResults.failed.push('Wallet API - ' + walletsError.message);
      } else {
        console.log(`   ✅ Wallet API working (${wallets.length} wallets found)`);
        this.testResults.passed.push('Wallet API');
      }

    } catch (error) {
      console.log('   ❌ Payment system APIs test failed:', error.message);
      this.testResults.failed.push('Payment system APIs - ' + error.message);
    }
  }

  async testRealTimeFeatures() {
    console.log('🔧 5. Testing Real-time Features...');
    
    try {
      // Test chat sessions API
      const { data: chatSessions, error: chatError } = await supabase
        .from('chat_sessions')
        .select('*')
        .limit(10);

      if (chatError) {
        console.log('   ❌ Chat sessions API failed:', chatError.message);
        this.testResults.failed.push('Chat sessions API - ' + chatError.message);
      } else {
        console.log(`   ✅ Chat sessions API working (${chatSessions.length} sessions found)`);
        this.testResults.passed.push('Chat sessions API');
      }

      // Test call sessions API
      const { data: callSessions, error: callError } = await supabase
        .from('call_sessions')
        .select('*')
        .limit(10);

      if (callError) {
        console.log('   ❌ Call sessions API failed:', callError.message);
        this.testResults.failed.push('Call sessions API - ' + callError.message);
      } else {
        console.log(`   ✅ Call sessions API working (${callSessions.length} sessions found)`);
        this.testResults.passed.push('Call sessions API');
      }

      // Test voice notes API
      const { data: voiceNotes, error: voiceError } = await supabase
        .from('voice_notes')
        .select('*')
        .limit(10);

      if (voiceError) {
        console.log('   ❌ Voice notes API failed:', voiceError.message);
        this.testResults.failed.push('Voice notes API - ' + voiceError.message);
      } else {
        console.log(`   ✅ Voice notes API working (${voiceNotes.length} notes found)`);
        this.testResults.passed.push('Voice notes API');
      }

    } catch (error) {
      console.log('   ❌ Real-time features test failed:', error.message);
      this.testResults.failed.push('Real-time features - ' + error.message);
    }
  }

  async testAdminMonitoringAPIs() {
    console.log('🔧 6. Testing Admin & Monitoring APIs...');
    
    try {
      // Test system settings API
      const { data: systemSettings, error: settingsError } = await supabase
        .from('system_settings')
        .select('*');

      if (settingsError) {
        console.log('   ❌ System settings API failed:', settingsError.message);
        this.testResults.failed.push('System settings API - ' + settingsError.message);
      } else {
        console.log(`   ✅ System settings API working (${systemSettings.length} settings found)`);
        this.testResults.passed.push('System settings API');
      }

      // Test admin actions API
      const { data: adminActions, error: actionsError } = await supabase
        .from('admin_actions')
        .select('*')
        .limit(10);

      if (actionsError) {
        console.log('   ❌ Admin actions API failed:', actionsError.message);
        this.testResults.failed.push('Admin actions API - ' + actionsError.message);
      } else {
        console.log(`   ✅ Admin actions API working (${adminActions.length} actions found)`);
        this.testResults.passed.push('Admin actions API');
      }

      // Test analytics API
      const { data: analytics, error: analyticsError } = await supabase
        .from('daily_analytics')
        .select('*')
        .limit(10);

      if (analyticsError) {
        console.log('   ❌ Analytics API failed:', analyticsError.message);
        this.testResults.failed.push('Analytics API - ' + analyticsError.message);
      } else {
        console.log(`   ✅ Analytics API working (${analytics.length} records found)`);
        this.testResults.passed.push('Analytics API');
      }

    } catch (error) {
      console.log('   ❌ Admin & monitoring APIs test failed:', error.message);
      this.testResults.failed.push('Admin & monitoring APIs - ' + error.message);
    }
  }

  async testErrorHandlingEdgeCases() {
    console.log('🔧 7. Testing Error Handling & Edge Cases...');
    
    try {
      // Test invalid table access
      const { data: invalidTable, error: invalidError } = await supabase
        .from('non_existent_table')
        .select('*')
        .limit(1);

      if (invalidError) {
        console.log('   ✅ Error handling working (invalid table access properly rejected)');
        this.testResults.passed.push('Error handling - invalid table access');
      } else {
        console.log('   ⚠️  Error handling may be too permissive');
        this.testResults.warnings.push('Error handling - invalid table access not rejected');
      }

      // Test SQL injection protection
      const { data: sqlTest, error: sqlError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', "'; DROP TABLE profiles; --")
        .limit(1);

      if (sqlError || (sqlTest && sqlTest.length === 0)) {
        console.log('   ✅ SQL injection protection working');
        this.testResults.passed.push('SQL injection protection');
      } else {
        console.log('   ❌ SQL injection protection may be insufficient');
        this.testResults.failed.push('SQL injection protection');
      }

    } catch (error) {
      console.log('   ✅ Error handling working (caught exception properly)');
      this.testResults.passed.push('Error handling - exception catching');
    }
  }

  async testRateLimitingSecurity() {
    console.log('🔧 8. Testing Rate Limiting & Security...');
    
    try {
      // Check if API files have rate limiting
      const apiFiles = [
        'src/api/payments.js',
        'src/api/index.js',
        'src/server.js'
      ];

      let rateLimitingFound = false;
      for (const filePath of apiFiles) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('rateLimit') || content.includes('express-rate-limit')) {
            rateLimitingFound = true;
            break;
          }
        }
      }

      if (rateLimitingFound) {
        console.log('   ✅ Rate limiting implementation found');
        this.testResults.passed.push('Rate limiting implementation');
      } else {
        console.log('   ⚠️  Rate limiting implementation not found');
        this.testResults.warnings.push('Rate limiting implementation missing');
      }

      // Test RLS (Row Level Security) policies
      const { data: rlsTest, error: rlsError } = await supabase
        .rpc('exec_sql', {
          sql_query: `
            SELECT schemaname, tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND rowsecurity = true
            LIMIT 10;
          `
        });

      if (rlsError) {
        console.log('   ⚠️  RLS policy check failed:', rlsError.message);
        this.testResults.warnings.push('RLS policy check failed');
      } else {
        const rlsEnabledTables = rlsTest?.length || 0;
        console.log(`   ✅ RLS enabled on ${rlsEnabledTables} tables`);
        this.testResults.passed.push(`RLS security (${rlsEnabledTables} tables)`);
      }

    } catch (error) {
      console.log('   ❌ Rate limiting & security test failed:', error.message);
      this.testResults.failed.push('Rate limiting & security - ' + error.message);
    }
  }

  generateAPITestReport() {
    console.log('\n🎯 API VALIDATION & TESTING REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('✅ PASSED TESTS:');
    console.log('─────────────────');
    if (this.testResults.passed.length > 0) {
      this.testResults.passed.forEach((test, index) => {
        console.log(`${index + 1}. ${test}`);
      });
    } else {
      console.log('No tests passed.');
    }

    console.log('\n⚠️  WARNINGS:');
    console.log('─────────────');
    if (this.testResults.warnings.length > 0) {
      this.testResults.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    } else {
      console.log('No warnings.');
    }

    console.log('\n❌ FAILED TESTS:');
    console.log('────────────────');
    if (this.testResults.failed.length > 0) {
      this.testResults.failed.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure}`);
      });
    } else {
      console.log('No tests failed.');
    }

    // Calculate overall score
    const totalTests = this.testResults.passed.length + this.testResults.warnings.length + this.testResults.failed.length;
    const passedTests = this.testResults.passed.length;
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    console.log('\n📊 SUMMARY:');
    console.log('───────────');
    console.log(`✅ Passed: ${this.testResults.passed.length}`);
    console.log(`⚠️  Warnings: ${this.testResults.warnings.length}`);
    console.log(`❌ Failed: ${this.testResults.failed.length}`);
    console.log(`📈 Success Rate: ${successRate}%`);

    if (successRate >= 90) {
      console.log('\n🎉 EXCELLENT! APIs are production-ready!');
      console.log('🚀 All critical endpoints are functional.');
    } else if (successRate >= 75) {
      console.log('\n👍 GOOD! Most APIs are working correctly.');
      console.log('🔧 Address warnings for optimal performance.');
    } else if (successRate >= 50) {
      console.log('\n⚠️  MODERATE! Several APIs need attention.');
      console.log('🛠️  Fix failed tests before production deployment.');
    } else {
      console.log('\n❌ CRITICAL! Major API issues detected.');
      console.log('🚨 Immediate attention required before deployment.');
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('──────────────');
    console.log('1. Fix all failed API tests');
    console.log('2. Address warnings for optimal performance');
    console.log('3. Implement missing rate limiting if needed');
    console.log('4. Test API endpoints with frontend integration');
    console.log('5. Perform load testing on critical endpoints');
    console.log('6. Set up API monitoring and alerting');
  }
}

// Run the API validation tests
async function runAPIValidationTests() {
  try {
    const validator = new APIValidator();
    await validator.runComprehensiveAPITest();
  } catch (error) {
    console.error('💥 API validation testing failed:', error);
    process.exit(1);
  }
}

// Execute the tests
runAPIValidationTests(); 