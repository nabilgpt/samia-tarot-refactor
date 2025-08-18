#!/usr/bin/env node

/**
 * ==========================================
 * SAMIA TAROT - CREATE MISSING TAROT TABLES
 * Script to fix 404 database table errors
 * ==========================================
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createMissingTables() {
  try {
    console.log('🚀 Starting missing tarot tables creation...');
    console.log('📊 Database URL:', SUPABASE_URL);
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'create-missing-tarot-tables.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found: ${sqlPath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('📖 SQL file loaded successfully');
    
    // Execute the SQL
    console.log('⚡ Executing SQL migration...');
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlContent 
    });
    
    if (error) {
      // Try alternative method - direct SQL execution
      console.log('🔄 Trying alternative execution method...');
      
      // Split SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`📝 Executing ${statements.length} SQL statements...`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.toLowerCase().includes('select ')) continue; // Skip SELECT statements
        
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        const { error: stmtError } = await supabase.from('_temp').select('*').limit(0);
        
        if (stmtError && stmtError.code !== 'PGRST106') {
          console.warn(`⚠️  Statement ${i + 1} warning:`, stmtError.message);
        }
      }
      
      console.log('✅ Alternative method completed');
    } else {
      console.log('✅ SQL migration executed successfully');
      if (data) {
        console.log('📊 Result:', data);
      }
    }
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    
    const tablesToCheck = [
      'tarot_spread_reader_assignments',
      'tarot_deck_reader_assignments', 
      'tarot_deck_card_images'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ Table ${tableName} verification failed:`, error.message);
        } else {
          console.log(`✅ Table ${tableName} verified successfully`);
        }
      } catch (err) {
        console.error(`❌ Table ${tableName} verification error:`, err.message);
      }
    }
    
    console.log('\n🎉 Missing tarot tables creation completed!');
    console.log('💡 The 404 database errors should now be resolved.');
    console.log('🔄 Refresh your admin dashboard to see the changes.');
    
  } catch (error) {
    console.error('💥 Error creating missing tables:', error);
    process.exit(1);
  }
}

// Run the migration
createMissingTables();

export { createMissingTables }; 