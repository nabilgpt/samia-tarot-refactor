#!/usr/bin/env node

/**
 * 🔧 MISSING TABLES FIXER
 * Identifies and helps fix missing database tables
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Required tables and their SQL files
const requiredTables = {
  'call_sessions': 'CREATE_MISSING_SUPABASE_TABLES.sql',
  'call_recordings': 'CREATE_MISSING_SUPABASE_TABLES.sql', 
  'emergency_call_logs': 'CREATE_MISSING_SUPABASE_TABLES.sql',
  'reader_schedule': 'database/working_hours_approval_system.sql',
  'working_hours_requests': 'database/working_hours_approval_system.sql',
  'working_hours_audit': 'database/working_hours_approval_system.sql',
  'booking_window_settings': 'database/working_hours_approval_system.sql'
};

// Required views
const requiredViews = {
  'my_working_hours_requests': 'database/working_hours_approval_system.sql',
  'pending_working_hours_requests': 'database/working_hours_approval_system.sql',
  'my_schedule': 'database/working_hours_approval_system.sql'
};

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      return false; // Table doesn't exist
    }
    
    return !error; // Table exists
  } catch (error) {
    return false;
  }
}

async function checkViewExists(viewName) {
  try {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      return false; // View doesn't exist
    }
    
    return !error; // View exists
  } catch (error) {
    return false;
  }
}

async function analyzeDatabase() {
  console.log('🔍 Analyzing database for missing tables and views...\n');
  
  const missingTables = [];
  const missingViews = [];
  const existingTables = [];
  const existingViews = [];
  
  // Check tables
  console.log('📋 Checking required tables:');
  for (const [tableName, sqlFile] of Object.entries(requiredTables)) {
    const exists = await checkTableExists(tableName);
    console.log(`${exists ? '✅' : '❌'} ${tableName}`);
    
    if (exists) {
      existingTables.push(tableName);
    } else {
      missingTables.push({ table: tableName, file: sqlFile });
    }
  }
  
  console.log('\n📋 Checking required views:');
  for (const [viewName, sqlFile] of Object.entries(requiredViews)) {
    const exists = await checkViewExists(viewName);
    console.log(`${exists ? '✅' : '❌'} ${viewName}`);
    
    if (exists) {
      existingViews.push(viewName);
    } else {
      missingViews.push({ view: viewName, file: sqlFile });
    }
  }
  
  return { missingTables, missingViews, existingTables, existingViews };
}

async function generateFixInstructions(missingTables, missingViews) {
  console.log('\n🚀 FIXING MISSING TABLES AND VIEWS:\n');
  
  if (missingTables.length === 0 && missingViews.length === 0) {
    console.log('🎉 All tables and views exist! No action needed.');
    return;
  }
  
  // Group by SQL file
  const fileGroups = {};
  
  [...missingTables, ...missingViews].forEach(item => {
    const file = item.file;
    if (!fileGroups[file]) {
      fileGroups[file] = { tables: [], views: [] };
    }
    
    if (item.table) {
      fileGroups[file].tables.push(item.table);
    } else if (item.view) {
      fileGroups[file].views.push(item.view);
    }
  });
  
  console.log('📋 SOLUTION: Execute the following SQL files in Supabase Dashboard:\n');
  
  let stepNumber = 1;
  for (const [file, items] of Object.entries(fileGroups)) {
    console.log(`📋 Step ${stepNumber}: Execute ${file}`);
    console.log(`   🔗 https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new`);
    console.log(`   📁 Copy all content from: ${file}`);
    console.log(`   ▶️  Paste and click RUN`);
    
    if (items.tables.length > 0) {
      console.log(`   📊 Will create tables: ${items.tables.join(', ')}`);
    }
    if (items.views.length > 0) {
      console.log(`   👁️  Will create views: ${items.views.join(', ')}`);
    }
    console.log('');
    stepNumber++;
  }
  
  console.log('⏱️  Estimated time: 2-3 minutes per file');
  console.log('🔄 After completion, refresh your app to clear errors');
}

async function runFixAnalyzer() {
  console.log('🔧 MISSING TABLES ANALYZER\n');
  console.log('🎯 Goal: Identify and fix missing database components\n');
  
  try {
    const { missingTables, missingViews, existingTables, existingViews } = await analyzeDatabase();
    
    console.log('\n📊 ANALYSIS SUMMARY:');
    console.log(`✅ Existing tables: ${existingTables.length}`);
    console.log(`❌ Missing tables: ${missingTables.length}`);
    console.log(`✅ Existing views: ${existingViews.length}`);
    console.log(`❌ Missing views: ${missingViews.length}`);
    
    await generateFixInstructions(missingTables, missingViews);
    
    if (missingTables.length > 0 || missingViews.length > 0) {
      console.log('\n💡 TROUBLESHOOTING TIPS:');
      console.log('• Make sure you\'re logged into the correct Supabase project');
      console.log('• Execute SQL files in the correct order');
      console.log('• Check for any SQL execution errors');
      console.log('• Refresh your browser after creating tables');
      console.log('• Run this script again to verify completion');
    }
    
  } catch (error) {
    console.error('💥 Error analyzing database:', error.message);
    console.log('🔄 Please check your Supabase connection and try again');
  }
}

// Run the analyzer
runFixAnalyzer(); 