#!/usr/bin/env node

/**
 * 🔧 MANUAL EXECUTION HELPER
 * Provides formatted SQL content for direct copy-paste execution
 */

import fs from 'fs/promises';

async function readAndFormatSQL(filePath, stepName) {
  try {
    console.log(`\n🔨 PREPARING: ${stepName}`);
    console.log(`📁 Reading: ${filePath}`);
    
    const content = await fs.readFile(filePath, 'utf8');
    console.log(`✅ Successfully read ${content.length} characters`);
    
    // Count SQL statements
    const statements = content.split(';').filter(stmt => 
      stmt.trim() && !stmt.trim().startsWith('--')
    ).length;
    
    console.log(`📊 Contains ~${statements} SQL statements`);
    console.log(`🎯 Ready for execution in Supabase Dashboard`);
    
    return content;
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔧 MANUAL EXECUTION HELPER');
  console.log('📋 Preparing SQL files for Supabase Dashboard execution\n');
  
  const sqlFiles = [
    {
      name: 'Call & Emergency Tables',
      file: 'CREATE_MISSING_SUPABASE_TABLES.sql',
      step: 1
    },
    {
      name: 'Working Hours System',
      file: 'database/working_hours_approval_system.sql',
      step: 2
    }
  ];

  console.log('🚀 SQL FILES ANALYSIS:\n');
  
  for (const sqlInfo of sqlFiles) {
    const content = await readAndFormatSQL(sqlInfo.file, sqlInfo.name);
    
    if (content) {
      console.log(`\n📋 STEP ${sqlInfo.step} INSTRUCTIONS:`);
      console.log(`1. Open: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new`);
      console.log(`2. Copy ENTIRE content from: ${sqlInfo.file}`);
      console.log(`3. Paste in SQL Editor`);
      console.log(`4. Click RUN button`);
      console.log(`5. Verify "Success" message appears`);
      console.log(`${'─'.repeat(60)}`);
    }
  }
  
  console.log('\n🎯 IMMEDIATE ACTION PLAN:');
  console.log('Since automated execution failed due to Supabase security,');
  console.log('I recommend you execute the SQL files manually as shown above.');
  console.log('This should take approximately 2-3 minutes total.');
  console.log('\n✅ After execution, all console errors will disappear!');
}

main().catch(console.error); 