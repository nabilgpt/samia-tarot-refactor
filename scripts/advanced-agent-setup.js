#!/usr/bin/env node

/**
 * 🤖 ADVANCED AGENT - Database Creation
 * Attempts to create tables using alternative methods
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SQL Commands to create tables directly
const createTablesSQL = `
-- 1. Create tarot_decks table
CREATE TABLE IF NOT EXISTS tarot_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    total_cards INTEGER DEFAULT 78,
    deck_type VARCHAR(50) DEFAULT 'traditional',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create tarot_spreads table
CREATE TABLE IF NOT EXISTS tarot_spreads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    description_ar TEXT,
    card_count INTEGER NOT NULL,
    positions JSONB NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    category VARCHAR(50) DEFAULT 'general',
    deck_id UUID,
    is_active BOOLEAN DEFAULT true,
    is_custom BOOLEAN DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_spread_deck FOREIGN KEY (deck_id) REFERENCES tarot_decks(id) ON DELETE SET NULL
);

-- 3. Create spread_service_assignments table
CREATE TABLE IF NOT EXISTS spread_service_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spread_id UUID NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_assignment_spread FOREIGN KEY (spread_id) REFERENCES tarot_spreads(id) ON DELETE CASCADE
);

-- 4. Create spread_approval_logs table
CREATE TABLE IF NOT EXISTS spread_approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spread_id UUID NOT NULL,
    approved_by UUID NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    approval_notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_approval_spread FOREIGN KEY (spread_id) REFERENCES tarot_spreads(id) ON DELETE CASCADE
);

-- 5. Create client_spread_selections table
CREATE TABLE IF NOT EXISTS client_spread_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    spread_id UUID NOT NULL,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(100),
    is_completed BOOLEAN DEFAULT false,
    CONSTRAINT fk_selection_spread FOREIGN KEY (spread_id) REFERENCES tarot_spreads(id) ON DELETE CASCADE
);

-- 6. Create reader_spread_notifications table
CREATE TABLE IF NOT EXISTS reader_spread_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL,
    spread_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_notification_spread FOREIGN KEY (spread_id) REFERENCES tarot_spreads(id) ON DELETE CASCADE
);
`;

async function executeRawSQL(sql) {
  console.log('🤖 Agent: Attempting to execute raw SQL...');
  
  try {
    // Method 1: Try using rpc function
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (!error) {
      console.log('✅ SQL executed successfully via RPC');
      return { success: true, method: 'rpc' };
    }
    
    console.log('⚠️  RPC method failed:', error.message);
  } catch (err) {
    console.log('⚠️  RPC method error:', err.message);
  }

  try {
    // Method 2: Try direct query execution (usually requires service role key)
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log('⚠️  Schema access denied:', error.message);
    } else {
      console.log('✅ Schema accessible, but cannot execute DDL with anon key');
    }
  } catch (err) {
    console.log('⚠️  Schema method error:', err.message);
  }

  return { success: false, method: 'none' };
}

async function createTablesByInsertion() {
  console.log('🤖 Agent: Attempting table creation via insertion...');
  
  // Try to create tables by attempting insertions that would trigger creation
  const testData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Deck',
    name_ar: 'مجموعة تجريبية',
    description: 'Test deck for table creation',
    description_ar: 'مجموعة تجريبية لإنشاء الجدول',
    total_cards: 78,
    deck_type: 'test',
    is_default: false,
    is_active: true
  };

  const { data, error } = await supabase
    .from('tarot_decks')
    .insert(testData)
    .select();

  if (error) {
    if (error.code === '42P01') {
      console.log('❌ Table does not exist and cannot be created automatically');
      return false;
    } else {
      console.log('⚠️  Insertion error:', error.message);
      return false;
    }
  } else {
    console.log('✅ Table exists or was created');
    
    // Clean up test data
    await supabase
      .from('tarot_decks')
      .delete()
      .eq('id', testData.id);
    
    return true;
  }
}

async function runAdvancedAgent() {
  console.log('🤖 ADVANCED AGENT STARTING...\n');
  console.log('🎯 Goal: Create database tables using any method possible\n');

  try {
    // Step 1: Test if tables already exist
    console.log('1. Testing existing table access...');
    const { data: existingTables, error: tableError } = await supabase
      .from('tarot_decks')
      .select('*')
      .limit(1);

    if (!tableError) {
      console.log('✅ Tables already exist! Proceeding to data setup...');
      
      // Import and run the regular agent
      const { runAgentSetup } = await import('./agent-database-setup.js');
      await runAgentSetup();
      return;
    }

    console.log('Tables do not exist. Attempting creation...\n');

    // Step 2: Try raw SQL execution
    console.log('2. Attempting raw SQL execution...');
    const sqlResult = await executeRawSQL(createTablesSQL);
    
    if (sqlResult.success) {
      console.log('✅ Tables created via SQL!');
      
      // Run data setup
      const { runAgentSetup } = await import('./agent-database-setup.js');
      await runAgentSetup();
      return;
    }

    // Step 3: Try table creation via insertion
    console.log('\n3. Attempting table creation via insertion...');
    const insertionResult = await createTablesByInsertion();
    
    if (insertionResult) {
      console.log('✅ Tables created via insertion!');
      
      // Run data setup
      const { runAgentSetup } = await import('./agent-database-setup.js');
      await runAgentSetup();
      return;
    }

    // Step 4: All automated methods failed
    console.log('\n❌ AGENT LIMITATION REACHED');
    console.log('All automated table creation methods failed.');
    console.log('This is a Supabase security limitation - DDL operations require manual execution.\n');

    console.log('🤖 AGENT SOLUTION: Human-assisted setup required\n');
    
    console.log('📋 STEP-BY-STEP SOLUTION:');
    console.log('1. Open: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql/new');
    console.log('2. Copy the contents of: database/enhanced-tarot-spread-system.sql');
    console.log('3. Paste and click RUN');
    console.log('4. Copy the contents of: database/tarot-spread-rls-policies.sql');
    console.log('5. Paste and click RUN');
    console.log('6. Run: node scripts/agent-database-setup.js');
    
    console.log('\n🔧 Alternative: Service Role Key Method');
    console.log('If you have SUPABASE_SERVICE_ROLE_KEY:');
    console.log('1. Add it to your .env file');
    console.log('2. Update this script to use service role client');
    console.log('3. Re-run this agent');

    console.log('\n⏰ Estimated time: 2 minutes for manual setup');

  } catch (error) {
    console.error('💥 ADVANCED AGENT ERROR:', error);
    console.log('🔄 Fallback to manual setup recommended');
  }
}

// Run the advanced agent
runAdvancedAgent(); 