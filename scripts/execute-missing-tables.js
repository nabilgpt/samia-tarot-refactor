#!/usr/bin/env node

/**
 * 🎯 EXECUTE MISSING TABLES - STEP BY STEP GUIDE
 * Prepares SQL and provides exact manual execution instructions
 */

import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class ExecutionGuide {
  constructor() {
    this.steps = [
      {
        id: 1,
        name: 'Call & Emergency Tables',
        file: 'CREATE_MISSING_SUPABASE_TABLES.sql',
        creates: ['call_sessions', 'call_recordings', 'emergency_call_logs'],
        description: 'Creates tables for video calls and emergency logging'
      },
      {
        id: 2,
        name: 'Working Hours System',
        file: 'database/working_hours_approval_system.sql', 
        creates: ['reader_schedule', 'working_hours_requests', 'working_hours_audit', 'booking_window_settings'],
        description: 'Creates reader scheduling and approval system'
      }
    ];
  }

  async checkTableExists(tableName) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      return !error || error.code !== '42P01';
    } catch {
      return false;
    }
  }

  async checkAllTables() {
    console.log('🔍 Checking current database status...\n');
    
    const results = [];
    
    for (const step of this.steps) {
      console.log(`📋 ${step.name}:`);
      const stepResult = { ...step, tableStatus: [] };
      
      for (const tableName of step.creates) {
        const exists = await this.checkTableExists(tableName);
        stepResult.tableStatus.push({ table: tableName, exists });
        console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
      }
      
      results.push(stepResult);
      console.log('');
    }
    
    return results;
  }

  async readFileContent(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error(`❌ Could not read ${filePath}: ${error.message}`);
      return null;
    }
  }

  async generateExecutionPlan(results) {
    console.log('🎯 EXECUTION PLAN:\n');
    
    let hasAnyMissing = false;
    let stepNumber = 1;
    
    for (const step of results) {
      const missingTables = step.tableStatus.filter(t => !t.exists);
      
      if (missingTables.length > 0) {
        hasAnyMissing = true;
        
        console.log(`📋 STEP ${stepNumber}: ${step.name}`);
        console.log(`🎯 Purpose: ${step.description}`);
        console.log(`📊 Will create: ${missingTables.map(t => t.table).join(', ')}`);
        console.log(`📁 SQL File: ${step.file}`);
        console.log('');
        
        console.log('🚀 EXECUTION INSTRUCTIONS:');
        console.log(`1. Open Supabase SQL Editor:`);
        console.log(`   🔗 https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new`);
        console.log('');
        console.log(`2. Copy ALL content from file: ${step.file}`);
        console.log(`3. Paste into SQL Editor`);
        console.log(`4. Click "RUN" button`);
        console.log(`5. Wait for "Success" message`);
        console.log('');
        
        // Try to show a preview of the SQL file
        const sqlContent = await this.readFileContent(step.file);
        if (sqlContent) {
          const preview = sqlContent.substring(0, 200);
          console.log(`📄 File Preview (first 200 chars):`);
          console.log(`${preview}...`);
          console.log('');
        }
        
        console.log('─'.repeat(80));
        console.log('');
        
        stepNumber++;
      } else {
        console.log(`✅ ${step.name} - All tables exist, skipping`);
      }
    }
    
    if (!hasAnyMissing) {
      console.log('🎉 ALL TABLES EXIST! No action needed.');
      console.log('🔄 If you still see console errors, try refreshing your app.');
    } else {
      console.log('💡 IMPORTANT NOTES:');
      console.log('• Execute steps in order (Step 1, then Step 2)');
      console.log('• Wait for each step to complete before moving to next');
      console.log('• Check for any error messages in Supabase dashboard');
      console.log('• After completion, refresh your React app');
      console.log('• Run this script again to verify: node scripts/execute-missing-tables.js');
    }
  }

  async createQuickReference() {
    console.log('\n📋 QUICK REFERENCE COMMANDS:\n');
    console.log('🔍 Check tables status:');
    console.log('   node scripts/fix-missing-tables.js');
    console.log('');
    console.log('🔄 After SQL execution, verify:');
    console.log('   node scripts/execute-missing-tables.js');
    console.log('');
    console.log('🎯 Expected result: All console 404 errors should disappear');
  }

  async run() {
    console.log('🎯 MISSING TABLES EXECUTION GUIDE\n');
    console.log('This script will show you exactly what to execute in Supabase Dashboard\n');
    
    try {
      const results = await this.checkAllTables();
      await this.generateExecutionPlan(results);
      await this.createQuickReference();
      
    } catch (error) {
      console.error('💥 Error:', error.message);
      console.log('\n🔄 Please check your internet connection and try again.');
    }
  }
}

// Run the guide
const guide = new ExecutionGuide();
guide.run(); 