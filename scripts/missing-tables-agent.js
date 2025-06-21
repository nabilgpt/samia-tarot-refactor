#!/usr/bin/env node

/**
 * 🤖 MISSING TABLES AUTOMATION AGENT
 * Automatically executes SQL files to create missing database tables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables from the main .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

class MissingTablesAgent {
  constructor() {
    this.sqlFiles = [
      {
        name: 'Call & Emergency Tables',
        file: 'CREATE_MISSING_SUPABASE_TABLES.sql',
        creates: ['call_sessions', 'call_recordings', 'emergency_call_logs']
      },
      {
        name: 'Working Hours System', 
        file: 'database/working_hours_approval_system.sql',
        creates: ['reader_schedule', 'working_hours_requests', 'working_hours_audit', 'booking_window_settings']
      }
    ];
  }

  async checkTableExists(tableName) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      return !error || error.code !== '42P01';
    } catch (error) {
      return false;
    }
  }

  async readSqlFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error(`❌ Error reading ${filePath}:`, error.message);
      return null;
    }
  }

  async executeViaRPC(sqlContent, description) {
    console.log(`🔄 Trying RPC execution for ${description}...`);
    
    try {
      // Try custom RPC function if it exists
      const { data, error } = await (supabaseAdmin || supabase).rpc('exec_sql', {
        sql_query: sqlContent
      });

      if (!error) {
        console.log(`✅ RPC execution successful for ${description}`);
        return true;
      } else {
        console.log(`⚠️ RPC method not available: ${error.message}`);
        return false;
      }
    } catch (error) {
      console.log(`⚠️ RPC method failed: ${error.message}`);
      return false;
    }
  }

  async executeViaDirectClient(sqlContent, description) {
    console.log(`🔄 Trying direct client execution for ${description}...`);
    
    if (!supabaseAdmin) {
      console.log(`⚠️ Service role key not available for ${description}`);
      return false;
    }

    try {
      // Split SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        if (!statement) continue;

        try {
          const { error } = await supabaseAdmin.rpc('exec', {
            sql: statement + ';'
          });

          if (!error) {
            successCount++;
          } else {
            errorCount++;
            console.log(`⚠️ Statement error: ${error.message}`);
          }
        } catch (err) {
          errorCount++;
          console.log(`⚠️ Statement execution error: ${err.message}`);
        }
      }

      if (successCount > 0 && errorCount === 0) {
        console.log(`✅ Direct execution successful for ${description} (${successCount} statements)`);
        return true;
      } else if (successCount > 0) {
        console.log(`⚠️ Partial success for ${description}: ${successCount} success, ${errorCount} errors`);
        return false;
      } else {
        console.log(`❌ Direct execution failed for ${description}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Direct execution error for ${description}: ${error.message}`);
      return false;
    }
  }

  async executeViaPostgREST(sqlContent, description) {
    console.log(`🔄 Trying PostgREST API for ${description}...`);
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey || supabaseAnonKey}`,
          'apikey': serviceRoleKey || supabaseAnonKey
        },
        body: JSON.stringify({ sql_query: sqlContent })
      });

      if (response.ok) {
        console.log(`✅ PostgREST execution successful for ${description}`);
        return true;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ PostgREST failed: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ PostgREST error for ${description}: ${error.message}`);
      return false;
    }
  }

  async executeSqlFile(sqlInfo) {
    console.log(`\n🚀 Processing: ${sqlInfo.name}`);
    console.log(`📁 File: ${sqlInfo.file}`);
    console.log(`📊 Will create: ${sqlInfo.creates.join(', ')}`);

    // Read SQL file
    const sqlContent = await this.readSqlFile(sqlInfo.file);
    if (!sqlContent) {
      console.log(`❌ Failed to read SQL file: ${sqlInfo.file}`);
      return false;
    }

    console.log(`📋 Read ${sqlContent.length} characters from ${sqlInfo.file}`);

    // Try multiple execution methods
    const methods = [
      () => this.executeViaRPC(sqlContent, sqlInfo.name),
      () => this.executeViaDirectClient(sqlContent, sqlInfo.name),
      () => this.executeViaPostgREST(sqlContent, sqlInfo.name)
    ];

    for (const method of methods) {
      const success = await method();
      if (success) {
        await this.verifySqlExecution(sqlInfo);
        return true;
      }
    }

    console.log(`❌ All execution methods failed for ${sqlInfo.name}`);
    this.showManualInstructions(sqlInfo);
    return false;
  }

  async verifySqlExecution(sqlInfo) {
    console.log(`🔍 Verifying table creation for ${sqlInfo.name}...`);
    
    let createdCount = 0;
    for (const tableName of sqlInfo.creates) {
      const exists = await this.checkTableExists(tableName);
      console.log(`${exists ? '✅' : '❌'} ${tableName}`);
      if (exists) createdCount++;
    }

    if (createdCount === sqlInfo.creates.length) {
      console.log(`🎉 All tables created successfully for ${sqlInfo.name}!`);
    } else {
      console.log(`⚠️ Only ${createdCount}/${sqlInfo.creates.length} tables created for ${sqlInfo.name}`);
    }
  }

  showManualInstructions(sqlInfo) {
    console.log(`\n📋 MANUAL SETUP REQUIRED for ${sqlInfo.name}:`);
    console.log(`🔗 1. Open: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new`);
    console.log(`📁 2. Copy all content from: ${sqlInfo.file}`);
    console.log(`▶️ 3. Paste in SQL Editor and click RUN`);
    console.log(`📊 4. Should create: ${sqlInfo.creates.join(', ')}`);
  }

  async runAutomation() {
    console.log('🤖 MISSING TABLES AUTOMATION AGENT');
    console.log('🎯 Goal: Automatically create missing database tables\n');

    if (serviceRoleKey) {
      console.log('🔑 Service role key detected - attempting automated execution');
    } else {
      console.log('⚠️ Service role key not found - will try alternative methods');
    }

    let successCount = 0;
    let totalFiles = this.sqlFiles.length;

    for (const sqlInfo of this.sqlFiles) {
      const success = await this.executeSqlFile(sqlInfo);
      if (success) {
        successCount++;
      }
    }

    console.log(`\n📊 AUTOMATION SUMMARY:`);
    console.log(`✅ Successfully executed: ${successCount}/${totalFiles} SQL files`);
    console.log(`${successCount === totalFiles ? '🎉' : '⚠️'} ${successCount === totalFiles ? 'All tables created automatically!' : 'Some manual steps may be required'}`);

    if (successCount < totalFiles) {
      console.log(`\n💡 NEXT STEPS:`);
      console.log(`• Execute the manual instructions shown above`);
      console.log(`• Run verification: node scripts/fix-missing-tables.js`);
      console.log(`• Refresh your app to clear console errors`);
    } else {
      console.log(`\n🎉 SUCCESS! Your database is now complete.`);
      console.log(`🔄 Refresh your React app to see the errors disappear.`);
    }
  }
}

// Run the automation
const agent = new MissingTablesAgent();
agent.runAutomation().catch(error => {
  console.error('💥 Agent error:', error.message);
}); 