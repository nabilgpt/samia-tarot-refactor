#!/usr/bin/env node

/**
 * 🚨 EMERGENCY STRUCTURE FIX SCRIPT
 * Fixes: profiles table structure, missing role/user_id columns, SQL syntax errors
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class EmergencyStructureFix {
  constructor() {
    this.requiredColumns = {
      profiles: [
        'id',
        'user_id', 
        'role',
        'email',
        'first_name',
        'last_name',
        'phone',
        'avatar_url',
        'is_active',
        'created_at',
        'updated_at'
      ]
    };
    
    this.criticalTables = [
      'profiles',
      'reading_sessions',
      'tarot_spread_positions'
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
      const { error } = await supabase
        .from(tableName)
        .select(columnName)
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  async checkProfilesStructure() {
    console.log('🔍 CHECKING PROFILES TABLE STRUCTURE:\n');
    
    const profilesExists = await this.checkTableExists('profiles');
    if (!profilesExists) {
      console.log('❌ profiles table does not exist');
      return {
        tableExists: false,
        missingColumns: this.requiredColumns.profiles,
        existingColumns: []
      };
    }

    console.log('✅ profiles table exists');
    
    const missingColumns = [];
    const existingColumns = [];
    
    for (const column of this.requiredColumns.profiles) {
      const exists = await this.checkColumnExists('profiles', column);
      const status = exists ? '✅' : '❌';
      console.log(`${status} profiles.${column}`);
      
      if (exists) {
        existingColumns.push(column);
      } else {
        missingColumns.push(column);
      }
    }
    
    return {
      tableExists: true,
      missingColumns,
      existingColumns
    };
  }

  async checkCriticalTables() {
    console.log('\n🔍 CHECKING CRITICAL TABLES:\n');
    
    const results = {
      existing: [],
      missing: []
    };
    
    for (const table of this.criticalTables) {
      const exists = await this.checkTableExists(table);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${table}`);
      
      if (exists) {
        results.existing.push(table);
      } else {
        results.missing.push(table);
      }
    }
    
    return results;
  }

  async provideTrustedFix(profilesStructure, tableResults) {
    console.log('\n🔧 EMERGENCY FIXES REQUIRED:\n');
    
    const hasProfilesIssues = profilesStructure.missingColumns.length > 0;
    const hasMissingTables = tableResults.missing.length > 0;
    
    if (hasProfilesIssues || hasMissingTables) {
      console.log('🚨 CRITICAL STRUCTURAL ISSUES DETECTED\n');
      
      console.log('📋 EXECUTE THIS SQL FILE TO FIX ALL ISSUES:');
      console.log('   🔗 File: database/fix-profiles-structure.sql');
      console.log('');
      console.log('📝 This comprehensive fix addresses:');
      
      if (hasProfilesIssues) {
        console.log('   🔧 PROFILES TABLE STRUCTURE:');
        profilesStructure.missingColumns.forEach(col => {
          console.log(`      • Adds missing ${col} column`);
        });
      }
      
      if (hasMissingTables) {
        console.log('   🔧 MISSING TABLES:');
        tableResults.missing.forEach(table => {
          console.log(`      • Creates ${table} table`);
        });
      }
      
      console.log('   🔧 SQL SYNTAX FIXES:');
      console.log('      • Fixes function parameter defaults');
      console.log('      • Proper trigger syntax');
      console.log('      • Safe RLS policy creation');
      console.log('');
      
      console.log('⚡ EXECUTION STEPS:');
      console.log('1. Open: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new');
      console.log('2. Copy ALL content from: database/fix-profiles-structure.sql');
      console.log('3. Paste in SQL Editor');
      console.log('4. Click "RUN" button');
      console.log('5. Wait for success messages');
      console.log('6. Verify: node scripts/emergency-structure-fix.js');
      console.log('');
      
    } else {
      console.log('🎉 ALL STRUCTURAL ISSUES RESOLVED!');
      console.log('✅ profiles table has all required columns');
      console.log('✅ All critical tables exist');
      console.log('✅ Database structure is complete');
      console.log('');
      console.log('🚀 NEXT STEPS:');
      console.log('   1. Test your application - errors should be resolved');
      console.log('   2. Continue with: node scripts/real-time-database-automation.js');
      console.log('   3. Complete remaining database tables');
    }
  }

  async generateDetailedAnalysis(profilesStructure, tableResults) {
    console.log('\n📊 DETAILED ANALYSIS:\n');
    
    console.log('📋 PROFILES TABLE STATUS:');
    console.log(`   • Table exists: ${profilesStructure.tableExists ? '✅' : '❌'}`);
    console.log(`   • Required columns: ${this.requiredColumns.profiles.length}`);
    console.log(`   • Existing columns: ${profilesStructure.existingColumns.length}`);
    console.log(`   • Missing columns: ${profilesStructure.missingColumns.length}`);
    
    if (profilesStructure.missingColumns.length > 0) {
      console.log('   🚨 Missing columns:');
      profilesStructure.missingColumns.forEach(col => {
        console.log(`      • ${col}`);
      });
    }
    
    console.log('\n📋 CRITICAL TABLES STATUS:');
    console.log(`   • Required tables: ${this.criticalTables.length}`);
    console.log(`   • Existing tables: ${tableResults.existing.length}`);
    console.log(`   • Missing tables: ${tableResults.missing.length}`);
    
    if (tableResults.missing.length > 0) {
      console.log('   🚨 Missing tables:');
      tableResults.missing.forEach(table => {
        console.log(`      • ${table}`);
      });
    }
  }

  async generateWindowsCopyCommand() {
    console.log('\n💾 WINDOWS COPY COMMAND:\n');
    console.log('Get-Content "database\\fix-profiles-structure.sql" | Set-Clipboard');
    console.log('');
    console.log('Run this in PowerShell to copy the fix to clipboard,');
    console.log('then paste directly into Supabase SQL Editor');
  }

  async run() {
    try {
      console.log('🚨 EMERGENCY STRUCTURE DIAGNOSTIC');
      console.log('🎯 Analyzing database structure issues\n');
      console.log('='.repeat(80));
      
      const profilesStructure = await this.checkProfilesStructure();
      const tableResults = await this.checkCriticalTables();
      
      await this.generateDetailedAnalysis(profilesStructure, tableResults);
      await this.provideTrustedFix(profilesStructure, tableResults);
      await this.generateWindowsCopyCommand();
      
      console.log('\n' + '='.repeat(80));
      
      const hasIssues = profilesStructure.missingColumns.length > 0 || tableResults.missing.length > 0;
      
      if (hasIssues) {
        console.log('🚨 STATUS: STRUCTURAL ISSUES - Execute fix immediately');
        console.log('📁 FIX FILE: database/fix-profiles-structure.sql');
      } else {
        console.log('🎯 STATUS: STRUCTURE COMPLETE - Ready for application testing');
      }
      
    } catch (error) {
      console.error('💥 Structural diagnostic error:', error.message);
      console.log('\n🔧 MANUAL BACKUP PLAN:');
      console.log('1. Execute database/fix-profiles-structure.sql in Supabase');
      console.log('2. This will add all missing columns and tables');
      console.log('3. Re-run this script to verify');
    }
  }
}

const structureFix = new EmergencyStructureFix();
structureFix.run(); 