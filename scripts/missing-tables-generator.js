#!/usr/bin/env node

/**
 * 🔧 MISSING TABLES GENERATOR & FIXER
 * Identifies and creates SQL to fix all missing database tables
 */

import fs from 'fs/promises';

class MissingTablesFixer {
  constructor() {
    this.missingTables = [
      // From audit results
      'user_profiles', 'user_sessions', 'auth_tokens',
      'tarot_spread_positions', 'reader_spreads', 'client_tarot_sessions',
      'payment_methods', 'payment_gateway_configs', 'wallet_transactions',
      'wallet_balances', 'transaction_audit', 'payment_sessions',
      'commission_settings', 'refund_requests',
      'escalation_logs', 'call_participants', 'emergency_escalations',
      'daily_analytics', 'reader_analytics', 'business_analytics',
      'revenue_analytics', 'platform_commissions', 'reader_earnings',
      'revenue_sharing', 'reader_performance_metrics',
      'chat_sessions', 'chat_messages', 'voice_notes', 'chat_participants',
      'message_reactions', 'chat_archives',
      'approval_requests', 'admin_actions', 'audit_logs', 'user_feedback',
      'ai_models', 'ai_prompts', 'ai_sessions', 'ai_feedback',
      'learning_paths', 'course_content', 'course_enrollments',
      'emergency_contacts', 'location_tracking', 'device_registrations',
      'push_notifications', 'email_templates', 'sms_templates',
      'subscription_plans', 'user_subscriptions', 'promotional_codes',
      'file_uploads', 'media_storage', 'backup_logs'
    ];
    
    this.sqlFileMapping = {
      // Tarot system
      'tarot_spread_positions': 'database/enhanced-tarot-spread-system.sql',
      'reader_spreads': 'database/enhanced-tarot-spread-system.sql',
      'client_tarot_sessions': 'database/enhanced-tarot-spread-system.sql',
      
      // Payment system
      'payment_methods': 'DATABASE_PAYMENT_METHODS_UPDATE.sql',
      'payment_gateway_configs': 'DATABASE_PAYMENT_METHODS_UPDATE.sql',
      'wallet_transactions': 'DATABASE_PAYMENT_METHODS_UPDATE.sql',
      'wallet_balances': 'DATABASE_PAYMENT_METHODS_UPDATE.sql',
      'transaction_audit': 'DATABASE_PAYMENT_METHODS_UPDATE.sql',
      
      // Analytics system
      'daily_analytics': 'database/phase3-analytics-business.sql',
      'reader_analytics': 'database/phase3-analytics-business.sql',
      'business_analytics': 'database/phase3-analytics-business.sql',
      'revenue_analytics': 'database/phase3-analytics-business.sql',
      'platform_commissions': 'database/phase3-analytics-business.sql',
      'reader_earnings': 'database/phase3-analytics-business.sql',
      'revenue_sharing': 'database/phase3-analytics-business.sql',
      
      // Chat system
      'chat_sessions': 'database/chat-enhancements.sql',
      'chat_messages': 'database/chat-enhancements.sql',
      'voice_notes': 'database/chat-enhancements.sql',
      
      // Call system
      'escalation_logs': 'database/phase3-call-video-system.sql',
      'call_participants': 'database/phase3-call-video-system.sql',
      'emergency_escalations': 'database/phase3-call-video-system.sql',
      
      // AI system
      'ai_models': 'database/phase2-tarot-ai.sql',
      'ai_prompts': 'database/phase2-tarot-ai.sql',
      'ai_sessions': 'database/phase2-tarot-ai.sql',
      'ai_feedback': 'database/phase2-tarot-ai.sql',
      'learning_paths': 'database/phase2-tarot-ai.sql',
      'course_content': 'database/phase2-tarot-ai.sql',
      'course_enrollments': 'database/phase2-tarot-ai.sql',
      
      // Admin system
      'approval_requests': 'database/approval_system.sql',
      'admin_actions': 'database/approval_system.sql',
      'audit_logs': 'database/approval_system.sql'
    };
  }

  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async analyzeExistingFiles() {
    console.log('🔍 ANALYZING EXISTING SQL FILES\n');
    
    const existingFiles = [];
    const missingFiles = [];
    
    const uniqueFiles = [...new Set(Object.values(this.sqlFileMapping))];
    
    for (const file of uniqueFiles) {
      const exists = await this.checkFileExists(file);
      
      if (exists) {
        existingFiles.push(file);
        console.log(`✅ ${file}`);
      } else {
        missingFiles.push(file);
        console.log(`❌ ${file} (missing)`);
      }
    }
    
    return { existingFiles, missingFiles };
  }

  categorizeTablesBySource() {
    const categorized = {};
    
    this.missingTables.forEach(table => {
      const sourceFile = this.sqlFileMapping[table];
      
      if (sourceFile) {
        if (!categorized[sourceFile]) {
          categorized[sourceFile] = [];
        }
        categorized[sourceFile].push(table);
      } else {
        if (!categorized['unknown']) {
          categorized['unknown'] = [];
        }
        categorized['unknown'].push(table);
      }
    });
    
    return categorized;
  }

  async generateExecutionPlan() {
    console.log('\n📋 EXECUTION PLAN FOR MISSING TABLES\n');
    
    const { existingFiles, missingFiles } = await this.analyzeExistingFiles();
    const categorized = this.categorizeTablesBySource();
    
    let stepNumber = 1;
    
    // Process existing files first
    for (const file of existingFiles) {
      if (categorized[file] && categorized[file].length > 0) {
        console.log(`📋 STEP ${stepNumber}: Execute ${file}`);
        console.log(`   🎯 Purpose: Create ${categorized[file].length} missing tables`);
        console.log(`   📊 Tables: ${categorized[file].join(', ')}`);
        console.log(`   ▶️ Execute in Supabase Dashboard:`);
        console.log(`      🔗 https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new`);
        console.log(`      📁 Copy content from: ${file}`);
        console.log('');
        stepNumber++;
      }
    }
    
    // Handle unknown tables (need custom SQL)
    if (categorized['unknown'] && categorized['unknown'].length > 0) {
      console.log(`📋 STEP ${stepNumber}: Create Custom Tables`);
      console.log(`   🎯 Purpose: Create ${categorized['unknown'].length} unmapped tables`);
      console.log(`   📊 Tables: ${categorized['unknown'].join(', ')}`);
      console.log(`   ⚠️ Action: These need custom SQL creation`);
      console.log('');
    }
    
    // List missing files
    if (missingFiles.length > 0) {
      console.log('🚨 MISSING SQL FILES:');
      missingFiles.forEach(file => {
        console.log(`   ❌ ${file} - File not found`);
      });
    }
  }

  async generateCustomSQL() {
    console.log('\n🔧 GENERATING CUSTOM SQL FOR UNMAPPED TABLES\n');
    
    const categorized = this.categorizeTablesBySource();
    const unknownTables = categorized['unknown'] || [];
    
    if (unknownTables.length === 0) {
      console.log('✅ No custom SQL needed - all tables mapped to existing files');
      return;
    }
    
    let customSQL = '-- Custom SQL for unmapped tables\n\n';
    
    // Generate basic table structures for unknown tables
    unknownTables.forEach(table => {
      customSQL += `-- ${table.toUpperCase()} TABLE\n`;
      customSQL += `CREATE TABLE IF NOT EXISTS ${table} (\n`;
      customSQL += `    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
      
      // Add common fields based on table name
      if (table.includes('user')) {
        customSQL += `    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,\n`;
      }
      if (table.includes('session')) {
        customSQL += `    session_token TEXT UNIQUE,\n`;
        customSQL += `    expires_at TIMESTAMP WITH TIME ZONE,\n`;
      }
      if (table.includes('transaction')) {
        customSQL += `    amount DECIMAL(10,2),\n`;
        customSQL += `    currency VARCHAR(3) DEFAULT 'USD',\n`;
      }
      if (table.includes('notification')) {
        customSQL += `    title TEXT,\n`;
        customSQL += `    message TEXT,\n`;
        customSQL += `    read_at TIMESTAMP WITH TIME ZONE,\n`;
      }
      
      customSQL += `    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),\n`;
      customSQL += `    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())\n`;
      customSQL += `);\n\n`;
    });
    
    console.log('📄 Generated Custom SQL:');
    console.log(customSQL);
    
    // Save to file
    await fs.writeFile('database/custom-missing-tables.sql', customSQL);
    console.log('💾 Saved to: database/custom-missing-tables.sql');
  }

  async generateReport() {
    console.log('📊 COMPREHENSIVE MISSING TABLES REPORT\n');
    console.log('='.repeat(80));
    
    const categorized = this.categorizeTablesBySource();
    
    console.log(`🔍 ANALYSIS SUMMARY:`);
    console.log(`📊 Total missing tables: ${this.missingTables.length}`);
    console.log(`📁 Mapped to existing files: ${this.missingTables.length - (categorized['unknown'] || []).length}`);
    console.log(`❓ Need custom SQL: ${(categorized['unknown'] || []).length}`);
    
    console.log('\n📋 BREAKDOWN BY SOURCE FILE:');
    Object.entries(categorized).forEach(([file, tables]) => {
      console.log(`\n📁 ${file}:`);
      console.log(`   📊 Tables: ${tables.length}`);
      tables.forEach(table => console.log(`      • ${table}`));
    });
    
    await this.generateExecutionPlan();
    await this.generateCustomSQL();
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Execute existing SQL files in Supabase Dashboard');
    console.log('2. Execute custom SQL file for unmapped tables');
    console.log('3. Run verification: node scripts/database-table-checker.js');
    console.log('4. Update frontend to use new tables');
  }

  async run() {
    console.log('🔧 MISSING TABLES GENERATOR & FIXER');
    console.log('🎯 Analyzing and creating fix plan for missing database tables\n');
    
    await this.generateReport();
  }
}

const fixer = new MissingTablesFixer();
fixer.run().catch(console.error); 