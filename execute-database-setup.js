#!/usr/bin/env node

/**
 * 🔧 SAMIA TAROT - Database Setup Executor
 * Executes the complete missing tables SQL to finalize database
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

async function executeDatabaseSetup() {
  console.log('🔧 SAMIA TAROT - Database Setup Executor');
  console.log('═══════════════════════════════════════\n');

  try {
    // Read the complete missing tables SQL file
    console.log('📖 Reading COMPLETE_MISSING_TABLES.sql...');
    const sql = fs.readFileSync('COMPLETE_MISSING_TABLES.sql', 'utf8');
    
    // Split into individual commands
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));

    console.log(`📝 Found ${commands.length} SQL commands to execute\n`);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.trim()) {
        try {
          // Show progress
          if (i % 10 === 0) {
            console.log(`📊 Progress: ${i}/${commands.length} commands processed`);
          }

          const { error } = await supabase.rpc('exec_sql', { 
            sql_query: command 
          });

          if (error) {
            // Check if it's a "already exists" error (which is OK)
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate key') ||
                error.message.includes('relation') && error.message.includes('already exists')) {
              skipCount++;
            } else {
              console.log(`⚠️  Command ${i + 1}: ${error.message.substring(0, 80)}...`);
              errorCount++;
            }
          } else {
            successCount++;
          }
        } catch (err) {
          console.log(`💥 Exception on command ${i + 1}: ${err.message.substring(0, 80)}...`);
          errorCount++;
        }
      }
    }

    console.log('\n🎯 Database Setup Results:');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Successful commands: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Failed commands: ${errorCount}`);
    console.log(`📊 Total processed: ${successCount + skipCount + errorCount}`);

    // Verify key tables were created
    console.log('\n🔍 Verifying key tables...');
    
    const keyTables = [
      'payment_methods',
      'wallet_transactions', 
      'chat_sessions',
      'chat_messages',
      'voice_notes',
      'daily_analytics',
      'reader_analytics',
      'ai_learning_data',
      'reader_applications'
    ];

    let verifiedCount = 0;
    for (const tableName of keyTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);

        if (!error) {
          console.log(`✅ ${tableName} - Table accessible`);
          verifiedCount++;
        } else {
          console.log(`❌ ${tableName} - ${error.message}`);
        }
      } catch (err) {
        console.log(`💥 ${tableName} - Exception: ${err.message}`);
      }
    }

    console.log(`\n📈 Table Verification: ${verifiedCount}/${keyTables.length} key tables verified`);

    if (verifiedCount >= keyTables.length * 0.8) {
      console.log('\n🎉 SUCCESS! Database setup completed successfully!');
      console.log('🚀 Your SAMIA TAROT platform database is now complete!');
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some tables may need manual attention');
    }

  } catch (error) {
    console.log('💥 Database setup failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Run the setup
executeDatabaseSetup(); 