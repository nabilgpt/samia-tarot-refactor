#!/usr/bin/env node

/**
 * 🚨 EMERGENCY ERROR FIX SCRIPT
 * Immediate fixes for database errors: reading_sessions, user_id column, chat_messages
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class EmergencyErrorFix {
  constructor() {
    this.criticalTables = [
      'reading_sessions',
      'chat_messages', 
      'voice_notes',
      'tarot_spread_positions',
      'reader_spreads',
      'client_tarot_sessions'
    ];
  }

  async checkTableExists(tableName) {
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

  async checkColumnExists(tableName, columnName) {
    try {
      const { data, error } = await supabase
        .rpc('check_column_exists', {
          table_name: tableName,
          column_name: columnName
        });
      return !error && data;
    } catch {
      // Fallback method - try a simple query
      try {
        const { error } = await supabase
          .from(tableName)
          .select(columnName)
          .limit(1);
        return !error;
      } catch {
        return false;
      }
    }
  }

  async diagnoseCriticalErrors() {
    console.log('🚨 EMERGENCY DIAGNOSTIC - CRITICAL DATABASE ERRORS');
    console.log('🎯 Checking specific error conditions\n');
    console.log('='.repeat(80));

    const results = {
      missingTables: [],
      missingColumns: [],
      workingTables: []
    };

    console.log('🔍 CHECKING CRITICAL TABLES:\n');

    for (const table of this.criticalTables) {
      const exists = await this.checkTableExists(table);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${table}`);
      
      if (exists) {
        results.workingTables.push(table);
      } else {
        results.missingTables.push(table);
      }
    }

    console.log('\n🔍 CHECKING CRITICAL COLUMNS:\n');

    // Check for user_id column in profiles
    const profilesUserIdExists = await this.checkColumnExists('profiles', 'user_id');
    const userIdStatus = profilesUserIdExists ? '✅' : '❌';
    console.log(`${userIdStatus} profiles.user_id column`);
    
    if (!profilesUserIdExists) {
      results.missingColumns.push('profiles.user_id');
    }

    return results;
  }

  async provideFixes(results) {
    console.log('\n🔧 IMMEDIATE FIXES REQUIRED:\n');
    
    if (results.missingTables.length > 0 || results.missingColumns.length > 0) {
      console.log('🚨 CRITICAL: Execute these SQL fixes immediately in Supabase:\n');
      
      if (results.missingTables.includes('reading_sessions') || 
          results.missingTables.includes('tarot_spread_positions') ||
          results.missingTables.includes('reader_spreads') ||
          results.missingTables.includes('client_tarot_sessions') ||
          results.missingColumns.includes('profiles.user_id')) {
        
        console.log('📋 STEP 1: Fix primary errors (reading_sessions, user_id column)');
        console.log('   🔗 Execute this file: database/fix-immediate-errors.sql');
        console.log('   📝 This fixes:');
        console.log('      • Creates reading_sessions table');
        console.log('      • Adds user_id column to profiles');
        console.log('      • Creates tarot_spread_positions table');
        console.log('      • Creates reader_spreads table');
        console.log('      • Creates client_tarot_sessions table');
        console.log('');
      }
      
      if (results.missingTables.includes('chat_messages') || 
          results.missingTables.includes('voice_notes')) {
        
        console.log('📋 STEP 2: Fix chat system errors');
        console.log('   🔗 Execute this file: database/fix-chat-messages.sql');
        console.log('   📝 This fixes:');
        console.log('      • Creates chat_messages table');
        console.log('      • Creates voice_notes table');
        console.log('      • Adds proper RLS policies');
        console.log('');
      }

      console.log('⚡ QUICK EXECUTION GUIDE:');
      console.log('');
      console.log('1. Open Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new');
      console.log('');
      console.log('2. Copy and execute database/fix-immediate-errors.sql');
      console.log('   (This will fix the reading_sessions and user_id errors)');
      console.log('');
      console.log('3. Copy and execute database/fix-chat-messages.sql');
      console.log('   (This will fix the chat_messages errors)');
      console.log('');
      console.log('4. Verify fixes by running:');
      console.log('   node scripts/emergency-error-fix.js');
      console.log('');
      
    } else {
      console.log('🎉 ALL CRITICAL ERRORS RESOLVED!');
      console.log('✅ reading_sessions table exists');
      console.log('✅ profiles.user_id column exists');
      console.log('✅ chat_messages table exists');
      console.log('✅ All critical tables are present');
      console.log('');
      console.log('🚀 NEXT STEPS:');
      console.log('   1. Continue with remaining SQL files from the automation plan');
      console.log('   2. Run: node scripts/real-time-database-automation.js');
      console.log('   3. Complete the integration setup');
    }
  }

  async generateSQLCopyCommands() {
    console.log('\n💾 COPY COMMANDS FOR WINDOWS:\n');
    
    console.log('# Copy immediate error fixes to clipboard:');
    console.log('Get-Content "database\\fix-immediate-errors.sql" | Set-Clipboard');
    console.log('');
    console.log('# Copy chat fixes to clipboard:');
    console.log('Get-Content "database\\fix-chat-messages.sql" | Set-Clipboard');
    console.log('');
    console.log('Then paste directly into Supabase SQL Editor and click RUN');
  }

  async run() {
    try {
      const results = await this.diagnoseCriticalErrors();
      
      console.log('\n📊 DIAGNOSTIC SUMMARY:');
      console.log(`✅ Working tables: ${results.workingTables.length}`);
      console.log(`❌ Missing tables: ${results.missingTables.length}`);
      console.log(`❌ Missing columns: ${results.missingColumns.length}`);
      
      await this.provideFixes(results);
      await this.generateSQLCopyCommands();
      
      console.log('\n' + '='.repeat(80));
      
      if (results.missingTables.length === 0 && results.missingColumns.length === 0) {
        console.log('🎯 STATUS: CRITICAL ERRORS RESOLVED - Ready for next phase');
      } else {
        console.log('🚨 STATUS: CRITICAL ERRORS DETECTED - Execute fixes immediately');
      }
      
    } catch (error) {
      console.error('💥 Emergency diagnostic error:', error.message);
      console.log('\n🔧 MANUAL BACKUP PLAN:');
      console.log('1. Execute database/fix-immediate-errors.sql in Supabase');
      console.log('2. Execute database/fix-chat-messages.sql in Supabase');
      console.log('3. Re-run this script to verify');
    }
  }
}

const emergencyFix = new EmergencyErrorFix();
emergencyFix.run(); 