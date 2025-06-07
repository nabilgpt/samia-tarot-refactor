#!/usr/bin/env node

/**
 * 🚀 AUTO-EXECUTE DATABASE FIXES
 * Step-by-step guidance for executing all required SQL files
 */

import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class DatabaseFixer {
  constructor() {
    this.executionPlan = [
      {
        id: 1,
        name: 'Enhanced Tarot System',
        file: 'database/enhanced-tarot-spread-system.sql',
        priority: 'HIGH',
        tables: ['tarot_spread_positions', 'reader_spreads', 'client_tarot_sessions'],
        description: 'Complete tarot spread functionality'
      },
      {
        id: 2,
        name: 'Payment System Foundation',
        file: 'DATABASE_PAYMENT_METHODS_UPDATE.sql',
        priority: 'CRITICAL',
        tables: ['payment_settings', 'payment_gateways', 'payment_regions'],
        description: 'Enable payment processing'
      },
      {
        id: 3,
        name: 'Analytics & Business Intelligence',
        file: 'database/phase3-analytics-business.sql',
        priority: 'HIGH',
        tables: ['daily_analytics', 'reader_analytics', 'business_analytics', 'revenue_analytics'],
        description: 'Business reporting and analytics'
      },
      {
        id: 4,
        name: 'Chat System',
        file: 'database/chat-enhancements.sql',
        priority: 'HIGH',
        tables: ['chat_sessions', 'chat_messages', 'voice_notes'],
        description: 'Real-time communication'
      },
      {
        id: 5,
        name: 'Advanced Call Features',
        file: 'database/phase3-call-video-system.sql',
        priority: 'MEDIUM',
        tables: ['escalation_logs', 'call_participants', 'emergency_escalations'],
        description: 'Enhanced call and emergency features'
      },
      {
        id: 6,
        name: 'AI & Learning System',
        file: 'database/phase2-tarot-ai.sql',
        priority: 'MEDIUM',
        tables: ['ai_models', 'ai_prompts', 'ai_sessions', 'learning_paths'],
        description: 'AI-powered features and learning'
      },
      {
        id: 7,
        name: 'Approval & Admin System',
        file: 'database/approval_system.sql',
        priority: 'MEDIUM',
        tables: ['approval_requests', 'admin_actions', 'audit_logs'],
        description: 'Administrative workflows'
      },
      {
        id: 8,
        name: 'Custom Support Tables',
        file: 'database/custom-missing-tables.sql',
        priority: 'LOW',
        tables: ['user_profiles', 'user_sessions', 'emergency_contacts', 'push_notifications'],
        description: 'Additional support features'
      }
    ];
  }

  async checkFileExists(file) {
    try {
      await fs.access(file);
      return true;
    } catch {
      return false;
    }
  }

  async verifyTableExists(tableName) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      return !error || error.code !== '42P01';
    } catch {
      return false;
    }
  }

  async generateExecutionGuide() {
    console.log('🚀 DATABASE FIXES - AUTO-EXECUTION GUIDE\n');
    console.log('='.repeat(80));
    
    let totalSteps = 0;
    let readySteps = 0;
    
    for (const step of this.executionPlan) {
      totalSteps++;
      
      console.log(`\n📋 STEP ${step.id}: ${step.name.toUpperCase()}`);
      console.log(`🎯 Priority: ${step.priority}`);
      console.log(`📊 Creates: ${step.tables.length} tables`);
      console.log(`💡 Purpose: ${step.description}`);
      
      // Check if file exists
      const fileExists = await this.checkFileExists(step.file);
      
      if (fileExists) {
        readySteps++;
        console.log(`✅ File ready: ${step.file}`);
        
        // Check if tables already exist
        let existingCount = 0;
        for (const table of step.tables) {
          const exists = await this.verifyTableExists(table);
          if (exists) existingCount++;
        }
        
        if (existingCount === step.tables.length) {
          console.log(`✅ Already completed - all ${step.tables.length} tables exist`);
        } else if (existingCount > 0) {
          console.log(`⚠️ Partially completed - ${existingCount}/${step.tables.length} tables exist`);
        } else {
          console.log(`❌ Not executed - 0/${step.tables.length} tables exist`);
        }
        
        console.log(`\n🔗 EXECUTE NOW:`);
        console.log(`   1. Open: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new`);
        console.log(`   2. Copy ALL content from: ${step.file}`);
        console.log(`   3. Paste in SQL Editor`);
        console.log(`   4. Click "RUN" button`);
        console.log(`   5. Verify success message`);
        
      } else {
        console.log(`❌ File missing: ${step.file}`);
        console.log(`⚠️ Action needed: Create this SQL file first`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXECUTION SUMMARY:');
    console.log(`📋 Total steps: ${totalSteps}`);
    console.log(`✅ Ready to execute: ${readySteps}`);
    console.log(`❌ Files missing: ${totalSteps - readySteps}`);
    
    if (readySteps === totalSteps) {
      console.log('\n🎉 ALL FILES READY FOR EXECUTION!');
      console.log('🚀 Proceed with step-by-step execution above');
    } else {
      console.log(`\n⚠️ ${totalSteps - readySteps} files missing - check project structure`);
    }
  }

  async generateProgressTracker() {
    console.log('\n📊 PROGRESS TRACKER\n');
    
    let completedSteps = 0;
    
    for (const step of this.executionPlan) {
      let existingCount = 0;
      
      for (const table of step.tables) {
        const exists = await this.verifyTableExists(table);
        if (exists) existingCount++;
      }
      
      const percentage = ((existingCount / step.tables.length) * 100).toFixed(1);
      const status = existingCount === step.tables.length ? '✅' : 
                    existingCount > 0 ? '⚠️' : '❌';
      
      console.log(`${status} Step ${step.id}: ${step.name} (${percentage}% - ${existingCount}/${step.tables.length})`);
      
      if (existingCount === step.tables.length) {
        completedSteps++;
      }
    }
    
    const overallProgress = ((completedSteps / this.executionPlan.length) * 100).toFixed(1);
    
    console.log(`\n🎯 OVERALL PROGRESS: ${overallProgress}% (${completedSteps}/${this.executionPlan.length} steps)`);
    
    if (completedSteps === this.executionPlan.length) {
      console.log('🎉 ALL DATABASE FIXES COMPLETED!');
      console.log('✅ Run final verification: node scripts/database-table-checker.js');
    } else {
      console.log(`⚠️ ${this.executionPlan.length - completedSteps} steps remaining`);
    }
  }

  async generateQuickCommands() {
    console.log('\n⚡ QUICK EXECUTION COMMANDS\n');
    
    for (const step of this.executionPlan) {
      const fileExists = await this.checkFileExists(step.file);
      
      if (fileExists) {
        console.log(`# Step ${step.id}: ${step.name}`);
        console.log(`cat "${step.file}" | pbcopy  # Copy to clipboard (Mac)`);
        console.log(`# Then paste in: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new`);
        console.log('');
      }
    }
  }

  async run() {
    console.log('🔧 DATABASE AUTO-EXECUTION GUIDE');
    console.log('🎯 Complete step-by-step database setup\n');
    
    await this.generateExecutionGuide();
    await this.generateProgressTracker();
    await this.generateQuickCommands();
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Execute each SQL file in order');
    console.log('2. Verify completion with progress tracker');
    console.log('3. Run comprehensive QA test');
    console.log('4. Deploy to production');
  }
}

const fixer = new DatabaseFixer();
fixer.run().catch(console.error); 