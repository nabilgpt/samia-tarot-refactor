#!/usr/bin/env node

/**
 * 🦾 ULTIMATE AGENT - PostgreSQL REST API
 * Uses direct PostgreSQL REST API calls to execute SQL
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import https from 'https';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

// Try to get service role key from environment
let serviceRoleKey = null;
try {
  const envContent = await fs.readFile('.env', 'utf-8');
  const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (serviceKeyMatch) {
    serviceRoleKey = serviceKeyMatch[1].trim();
  }
} catch (error) {
  // .env file doesn't exist or doesn't have service key
}

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);

async function executePostgREST(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(supabaseUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/rpc/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey || supabaseAnonKey}`,
        'apikey': serviceRoleKey || supabaseAnonKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ success: res.statusCode === 200, data: result, status: res.statusCode });
        } catch (err) {
          resolve({ success: false, error: 'Invalid JSON response', data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

async function createTableDirectly(tableName, tableSQL) {
  console.log(`🤖 Ultimate Agent: Creating ${tableName} table directly...`);
  
  try {
    // Method 1: Try PostgREST
    const restResult = await executePostgREST(tableSQL);
    if (restResult.success) {
      console.log(`✅ ${tableName} created via REST API`);
      return true;
    }
    
    // Method 2: Try DDL via client operations
    if (tableName === 'tarot_decks') {
      // Create a test record to trigger table creation
      const testData = {
        name: 'Test Deck',
        name_ar: 'مجموعة تجريبية',
        description: 'Test deck for table creation',
        total_cards: 78,
        deck_type: 'test',
        is_default: false,
        is_active: true
      };
      
      const { data, error } = await supabase
        .from('tarot_decks')
        .insert(testData)
        .select();
      
      if (!error) {
        console.log(`✅ ${tableName} exists or was created`);
        // Clean up test data
        await supabase.from('tarot_decks').delete().eq('deck_type', 'test');
        return true;
      }
    }
    
    console.log(`⚠️ ${tableName} creation failed`);
    return false;
  } catch (error) {
    console.log(`❌ ${tableName} creation error:`, error.message);
    return false;
  }
}

async function executeViaSupabaseJS(sql) {
  console.log('🤖 Ultimate Agent: Trying Supabase JS execution...');
  
  try {
    // Try to execute as a raw query
    const { data, error } = await supabase
      .rpc('exec', { sql_statement: sql });
    
    if (!error) {
      console.log('✅ SQL executed via supabase.rpc(exec)');
      return true;
    }
    
    // Try alternative method
    const { data: data2, error: error2 } = await supabase
      .rpc('execute_sql', { query: sql });
    
    if (!error2) {
      console.log('✅ SQL executed via supabase.rpc(execute_sql)');
      return true;
    }
    
    console.log('⚠️ Both RPC methods failed');
    return false;
  } catch (error) {
    console.log('❌ Supabase JS execution failed:', error.message);
    return false;
  }
}

async function createSampleData() {
  console.log('🤖 Ultimate Agent: Creating sample data...');
  
  const decksData = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Moroccan Tarot',
      name_ar: 'الكارطة المغربية',
      description: 'Traditional Moroccan tarot deck with cultural symbolism',
      description_ar: 'مجموعة التاروت المغربية التقليدية مع الرمزية الثقافية',
      total_cards: 78,
      deck_type: 'moroccan',
      is_default: true,
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Rider Waite',
      name_ar: 'رايدر وايت',
      description: 'Classic Rider Waite tarot deck',
      description_ar: 'مجموعة رايدر وايت الكلاسيكية',
      total_cards: 78,
      deck_type: 'rider_waite',
      is_default: false,
      is_active: true
    }
  ];

  // Insert decks
  const { data: decks, error: decksError } = await supabase
    .from('tarot_decks')
    .upsert(decksData, { onConflict: 'id' })
    .select();

  if (decksError) {
    console.log('⚠️ Sample deck creation failed:', decksError.message);
    return false;
  }

  console.log(`✅ Sample decks created: ${decks?.length || 0} records`);
  return true;
}

async function runUltimateAgent() {
  console.log('🦾 ULTIMATE AGENT ACTIVATED!\n');
  console.log('🎯 Mission: Execute SQL by any means necessary\n');

  console.log('🔍 Agent Analysis:');
  console.log(`✅ Supabase URL: ${supabaseUrl}`);
  console.log(`✅ Anonymous Key: Available`);
  console.log(`${serviceRoleKey ? '✅' : '❌'} Service Role Key: ${serviceRoleKey ? 'Available' : 'Not found'}`);

  try {
    // Phase 1: Check if tables already exist
    console.log('\n📋 Phase 1: Checking existing infrastructure...');
    
    const { data: existingData, error: existingError } = await supabase
      .from('tarot_decks')
      .select('*')
      .limit(1);

    if (!existingError) {
      console.log('✅ Tables already exist! Proceeding to data population...');
      
      const dataSuccess = await createSampleData();
      
      if (dataSuccess) {
        console.log('\n🎉 ULTIMATE AGENT SUCCESS!');
        console.log('🌐 Enhanced Tarot Spread System is operational!');
        return;
      }
    }

    console.log('❌ Tables not found. Attempting various creation methods...\n');

    // Phase 2: Try different SQL execution methods
    console.log('📋 Phase 2: Advanced SQL execution attempts...');
    
    // Method 1: Try Supabase JS RPC
    const schemaSQL = await fs.readFile('database/enhanced-tarot-spread-system.sql', 'utf-8');
    const jsSuccess = await executeViaSupabaseJS(schemaSQL);
    
    if (jsSuccess) {
      console.log('✅ Tables created via Supabase JS!');
      const dataSuccess = await createSampleData();
      if (dataSuccess) {
        console.log('\n🎉 ULTIMATE AGENT TOTAL SUCCESS!');
        return;
      }
    }

    // Method 2: Try individual table creation
    console.log('\n📋 Phase 3: Individual table creation...');
    
    const createDecksSQL = `
      CREATE TABLE IF NOT EXISTS tarot_decks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        name_ar TEXT,
        description TEXT,
        description_ar TEXT,
        total_cards INTEGER DEFAULT 78,
        deck_type TEXT DEFAULT 'moroccan',
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const decksSuccess = await createTableDirectly('tarot_decks', createDecksSQL);
    
    if (decksSuccess) {
      console.log('✅ Individual table creation successful!');
      const dataSuccess = await createSampleData();
      if (dataSuccess) {
        console.log('\n🎉 ULTIMATE AGENT PARTIAL SUCCESS!');
        console.log('At least the basic tables are working.');
        return;
      }
    }

    // Phase 3: Manual guidance
    console.log('\n📋 Phase 4: Manual Setup Required');
    console.log('🤖 Ultimate Agent exhausted all automated methods.\n');

    console.log('🚀 MANUAL SETUP INSTRUCTIONS:');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│  🎯 FINAL SOLUTION: Manual SQL Execution    │');
    console.log('└─────────────────────────────────────────────┘\n');

    console.log('📋 Step 1: Open Supabase SQL Editor');
    console.log('   🔗 https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new\n');

    console.log('📋 Step 2: Execute First SQL File');
    console.log('   📁 Copy all content from: database/enhanced-tarot-spread-system.sql');
    console.log('   ▶️  Paste in SQL Editor and click RUN\n');

    console.log('📋 Step 3: Execute Second SQL File');
    console.log('   📁 Copy all content from: database/tarot-spread-rls-policies.sql');
    console.log('   ▶️  Paste in SQL Editor and click RUN\n');

    console.log('📋 Step 4: Verify Success');
    console.log('   🚀 Run: node scripts/agent-database-setup.js\n');

    console.log('⏱️  Total setup time: ~3 minutes');
    console.log('💡 This is the most reliable method for Supabase setup');

  } catch (error) {
    console.error('💥 ULTIMATE AGENT CRITICAL ERROR:', error);
    console.log('\n🔄 Fallback to manual setup required');
  }
}

// Activate the Ultimate Agent
runUltimateAgent(); 