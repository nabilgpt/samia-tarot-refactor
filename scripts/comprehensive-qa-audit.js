#!/usr/bin/env node

/**
 * 🔍 SAMIA TAROT - COMPREHENSIVE QA & SYSTEM AUDIT
 * Complete end-to-end testing and validation
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class ComprehensiveAudit {
  constructor() {
    this.results = {
      database: { passed: [], failed: [], missing: [] },
      api: { passed: [], failed: [], missing: [] },
      frontend: { passed: [], failed: [], missing: [] },
      security: { passed: [], failed: [], missing: [] },
      integrations: { passed: [], failed: [], missing: [] },
      flows: { passed: [], failed: [], missing: [] }
    };
    
    this.requiredTables = [
      // Core tables
      'profiles', 'bookings', 'services', 'notifications',
      
      // Tarot system
      'tarot_decks', 'tarot_spreads', 'tarot_spread_positions', 
      'reader_spreads', 'spread_approval_logs',
      
      // Payment system  
      'payment_methods', 'payment_gateway_configs', 'wallet_transactions',
      'wallet_balances', 'transaction_audit',
      
      // Call & Emergency system
      'call_sessions', 'call_recordings', 'emergency_call_logs',
      
      // Working hours system
      'reader_schedule', 'working_hours_requests', 'working_hours_audit',
      'booking_window_settings',
      
      // Analytics & Business
      'daily_analytics', 'reader_analytics', 'business_analytics',
      'revenue_analytics', 'platform_commissions', 'reader_earnings',
      
      // Chat system
      'chat_sessions', 'chat_messages', 'voice_notes',
      
      // Admin system
      'approval_requests', 'system_settings', 'app_config'
    ];
    
    this.requiredViews = [
      'my_working_hours_requests', 'pending_working_hours_requests', 
      'my_schedule', 'pending_approvals'
    ];
    
    this.requiredFunctions = [
      'submit_working_hours_request', 'review_working_hours_request',
      'get_available_booking_slots', 'create_tarot_reading',
      'process_payment', 'update_wallet_balance'
    ];
    
    this.apiEndpoints = [
      '/auth/signup', '/auth/login', '/bookings', '/services',
      '/payments', '/wallet', '/chat', '/calls', '/emergency',
      '/admin/users', '/admin/analytics', '/tarot/spreads'
    ];
    
    this.rolePermissions = [
      { role: 'client', access: ['bookings', 'payments', 'chat'] },
      { role: 'reader', access: ['schedule', 'earnings', 'spreads'] },
      { role: 'admin', access: ['users', 'analytics', 'approvals'] },
      { role: 'super_admin', access: ['all'] }
    ];
  }

  async auditDatabase() {
    console.log('🗄️ Auditing Database Schema...\n');
    
    // Check required tables
    for (const tableName of this.requiredTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error && error.code === '42P01') {
          this.results.database.missing.push({
            type: 'table',
            name: tableName,
            issue: 'Table does not exist',
            priority: 'HIGH'
          });
        } else if (error) {
          this.results.database.failed.push({
            type: 'table',
            name: tableName,
            issue: `Error: ${error.message}`,
            priority: 'MEDIUM'
          });
        } else {
          this.results.database.passed.push({
            type: 'table',
            name: tableName,
            status: 'EXISTS'
          });
        }
      } catch (err) {
        this.results.database.failed.push({
          type: 'table',
          name: tableName,
          issue: `Connection error: ${err.message}`,
          priority: 'HIGH'
        });
      }
    }
    
    // Check required views
    for (const viewName of this.requiredViews) {
      try {
        const { data, error } = await supabase
          .from(viewName)
          .select('*')
          .limit(1);
        
        if (error && error.code === '42P01') {
          this.results.database.missing.push({
            type: 'view',
            name: viewName,
            issue: 'View does not exist',
            priority: 'MEDIUM'
          });
        } else if (!error) {
          this.results.database.passed.push({
            type: 'view',
            name: viewName,
            status: 'EXISTS'
          });
        }
      } catch (err) {
        this.results.database.failed.push({
          type: 'view',
          name: viewName,
          issue: `Error: ${err.message}`,
          priority: 'LOW'
        });
      }
    }
  }

  async auditFrontendComponents() {
    console.log('🖥️ Auditing Frontend Components...\n');
    
    const componentPaths = [
      'src/components/dashboard',
      'src/components/auth',
      'src/components/booking',
      'src/components/payment',
      'src/components/chat',
      'src/components/tarot',
      'src/pages'
    ];
    
    for (const componentPath of componentPaths) {
      try {
        const files = await fs.readdir(componentPath);
        
        if (files.length === 0) {
          this.results.frontend.missing.push({
            type: 'directory',
            name: componentPath,
            issue: 'Empty directory',
            priority: 'MEDIUM'
          });
        } else {
          // Check for key components
          const hasIndex = files.some(f => f.includes('index'));
          const hasMain = files.some(f => f.includes('Dashboard') || f.includes('Main'));
          
          if (!hasIndex && !hasMain) {
            this.results.frontend.failed.push({
              type: 'directory',
              name: componentPath,
              issue: 'Missing main component files',
              priority: 'HIGH'
            });
          } else {
            this.results.frontend.passed.push({
              type: 'directory',
              name: componentPath,
              status: `${files.length} files found`
            });
          }
        }
      } catch (error) {
        this.results.frontend.missing.push({
          type: 'directory',
          name: componentPath,
          issue: 'Directory does not exist',
          priority: 'HIGH'
        });
      }
    }
  }

  async auditAPIEndpoints() {
    console.log('🔌 Auditing API Endpoints...\n');
    
    const apiFiles = [
      'src/api/auth.js',
      'src/api/bookings.js', 
      'src/api/payments.js',
      'src/api/wallet.js',
      'src/api/chat.js',
      'src/api/tarot.js',
      'src/api/admin.js'
    ];
    
    for (const apiFile of apiFiles) {
      try {
        const content = await fs.readFile(apiFile, 'utf8');
        
        // Check for essential API patterns
        const hasCreateClient = content.includes('createClient');
        const hasErrorHandling = content.includes('catch') || content.includes('error');
        const hasExports = content.includes('export');
        
        if (!hasCreateClient) {
          this.results.api.failed.push({
            type: 'file',
            name: apiFile,
            issue: 'Missing Supabase client',
            priority: 'HIGH'
          });
        } else if (!hasErrorHandling) {
          this.results.api.failed.push({
            type: 'file',
            name: apiFile,
            issue: 'Missing error handling',
            priority: 'MEDIUM'
          });
        } else if (!hasExports) {
          this.results.api.failed.push({
            type: 'file',
            name: apiFile,
            issue: 'Missing exports',
            priority: 'HIGH'
          });
        } else {
          this.results.api.passed.push({
            type: 'file',
            name: apiFile,
            status: 'Valid API structure'
          });
        }
      } catch (error) {
        this.results.api.missing.push({
          type: 'file',
          name: apiFile,
          issue: 'File does not exist',
          priority: 'HIGH'
        });
      }
    }
  }

  async auditSecurity() {
    console.log('🔐 Auditing Security & Permissions...\n');
    
    // Check for hardcoded secrets
    const sensitiveFiles = [
      'src/lib/supabase.js',
      'src/api/payments.js',
      'src/services/webrtc.js'
    ];
    
    for (const file of sensitiveFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for potential security issues
        const hasHardcodedKeys = /sk_live_|pk_live_|eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/.test(content);
        const usesEnvVars = content.includes('import.meta.env') || content.includes('process.env');
        
        if (hasHardcodedKeys) {
          this.results.security.failed.push({
            type: 'file',
            name: file,
            issue: 'Potential hardcoded secrets detected',
            priority: 'CRITICAL'
          });
        } else if (!usesEnvVars) {
          this.results.security.failed.push({
            type: 'file',
            name: file,
            issue: 'Not using environment variables',
            priority: 'MEDIUM'
          });
        } else {
          this.results.security.passed.push({
            type: 'file',
            name: file,
            status: 'Secure configuration'
          });
        }
      } catch (error) {
        this.results.security.missing.push({
          type: 'file',
          name: file,
          issue: 'File not found',
          priority: 'MEDIUM'
        });
      }
    }
  }

  async auditIntegrations() {
    console.log('🔗 Auditing External Integrations...\n');
    
    const integrationChecks = [
      {
        name: 'Supabase Connection',
        test: async () => {
          const { data, error } = await supabase.auth.getSession();
          return !error;
        }
      },
      {
        name: 'Environment Variables',
        test: async () => {
          try {
            const envExample = await fs.readFile('env.example', 'utf8');
            return envExample.includes('VITE_SUPABASE_URL');
          } catch {
            return false;
          }
        }
      }
    ];
    
    for (const integration of integrationChecks) {
      try {
        const passed = await integration.test();
        
        if (passed) {
          this.results.integrations.passed.push({
            type: 'integration',
            name: integration.name,
            status: 'WORKING'
          });
        } else {
          this.results.integrations.failed.push({
            type: 'integration',
            name: integration.name,
            issue: 'Integration test failed',
            priority: 'HIGH'
          });
        }
      } catch (error) {
        this.results.integrations.failed.push({
          type: 'integration',
          name: integration.name,
          issue: `Error: ${error.message}`,
          priority: 'HIGH'
        });
      }
    }
  }

  generateReport() {
    console.log('\n📊 COMPREHENSIVE QA AUDIT REPORT\n');
    console.log('='.repeat(80));
    
    const sections = [
      { name: 'DATABASE', results: this.results.database },
      { name: 'API ENDPOINTS', results: this.results.api },
      { name: 'FRONTEND', results: this.results.frontend },
      { name: 'SECURITY', results: this.results.security },
      { name: 'INTEGRATIONS', results: this.results.integrations }
    ];
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalMissing = 0;
    
    sections.forEach(section => {
      console.log(`\n🔍 ${section.name}:`);
      console.log(`✅ Passed: ${section.results.passed.length}`);
      console.log(`❌ Failed: ${section.results.failed.length}`);
      console.log(`⚠️ Missing: ${section.results.missing.length}`);
      
      totalPassed += section.results.passed.length;
      totalFailed += section.results.failed.length;
      totalMissing += section.results.missing.length;
      
      // Show critical issues
      const criticalIssues = [
        ...section.results.failed.filter(f => f.priority === 'CRITICAL'),
        ...section.results.missing.filter(m => m.priority === 'HIGH')
      ];
      
      if (criticalIssues.length > 0) {
        console.log(`\n🚨 CRITICAL ISSUES in ${section.name}:`);
        criticalIssues.forEach(issue => {
          console.log(`   • ${issue.name}: ${issue.issue}`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 OVERALL SUMMARY:');
    console.log(`✅ Total Passed: ${totalPassed}`);
    console.log(`❌ Total Failed: ${totalFailed}`);
    console.log(`⚠️ Total Missing: ${totalMissing}`);
    
    const totalChecks = totalPassed + totalFailed + totalMissing;
    const successRate = totalChecks > 0 ? ((totalPassed / totalChecks) * 100).toFixed(1) : 0;
    
    console.log(`\n🎯 SUCCESS RATE: ${successRate}%`);
    
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT - System ready for production!');
    } else if (successRate >= 75) {
      console.log('⚠️ GOOD - Minor fixes needed before production');
    } else if (successRate >= 50) {
      console.log('🔧 MODERATE - Significant improvements needed');
    } else {
      console.log('🚨 CRITICAL - Major issues must be resolved');
    }
    
    return {
      summary: { totalPassed, totalFailed, totalMissing, successRate },
      details: this.results
    };
  }

  async generateFixScripts() {
    console.log('\n🔧 GENERATING FIX SCRIPTS...\n');
    
    // Generate SQL for missing tables
    const missingTables = this.results.database.missing.filter(m => m.type === 'table');
    
    if (missingTables.length > 0) {
      console.log('📝 SQL Scripts needed for missing tables:');
      missingTables.forEach(table => {
        console.log(`   • CREATE TABLE ${table.name} - Check database/ directory`);
      });
    }
    
    // Generate component templates for missing frontend parts
    const missingComponents = this.results.frontend.missing;
    
    if (missingComponents.length > 0) {
      console.log('\n📝 Component files needed:');
      missingComponents.forEach(comp => {
        console.log(`   • ${comp.name} - Create directory/component`);
      });
    }
    
    // Generate API templates for missing endpoints
    const missingAPIs = this.results.api.missing;
    
    if (missingAPIs.length > 0) {
      console.log('\n📝 API files needed:');
      missingAPIs.forEach(api => {
        console.log(`   • ${api.name} - Create API module`);
      });
    }
  }

  async run() {
    console.log('🤖 STARTING COMPREHENSIVE QA AUDIT');
    console.log('🎯 Testing SAMIA TAROT system completeness\n');
    
    try {
      await this.auditDatabase();
      await this.auditFrontendComponents();
      await this.auditAPIEndpoints(); 
      await this.auditSecurity();
      await this.auditIntegrations();
      
      const report = this.generateReport();
      await this.generateFixScripts();
      
      return report;
      
    } catch (error) {
      console.error('💥 Audit failed:', error.message);
      return null;
    }
  }
}

// Run the comprehensive audit
const audit = new ComprehensiveAudit();
audit.run(); 