#!/usr/bin/env node

/**
 * DIRECT FIX: Add missing new_data column to audit_logs table
 * Quick fix for Phase 4 dynamic language infrastructure
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 FIXING AUDIT_LOGS SCHEMA...');

async function fixAuditLogsSchema() {
  try {
    // Step 1: Check if audit_logs table exists
    console.log('📊 Checking audit_logs table...');
    
    const { data: tables, error: tableError } = await supabase
      .rpc('exec_raw_sql', { 
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name = 'audit_logs' AND table_schema = 'public'
        `
      });
    
    if (tableError) {
      // Table doesn't exist, create it
      console.log('📝 Creating audit_logs table...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          table_name VARCHAR(100) NOT NULL,
          action VARCHAR(50) NOT NULL,
          record_id UUID,
          user_id UUID,
          old_data JSONB,
          new_data JSONB,
          metadata JSONB DEFAULT '{}'::jsonb,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          session_id VARCHAR(255)
        );
        
        CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      `;
      
      const { error: createError } = await supabase.rpc('exec_raw_sql', {
        query: createTableSQL
      });
      
      if (createError) {
        console.error('❌ Failed to create table:', createError);
        return;
      }
      
      console.log('✅ audit_logs table created successfully!');
    } else {
      console.log('✅ audit_logs table exists');
      
      // Step 2: Check if new_data column exists
      console.log('🔍 Checking for new_data column...');
      
      const { data: columns, error: columnError } = await supabase
        .rpc('exec_raw_sql', {
          query: `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            AND column_name = 'new_data'
            AND table_schema = 'public'
          `
        });
      
      if (columnError || !columns || columns.length === 0) {
        console.log('➕ Adding missing new_data column...');
        
        const { error: addColumnError } = await supabase
          .rpc('exec_raw_sql', {
            query: 'ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;'
          });
        
        if (addColumnError) {
          console.error('❌ Failed to add column:', addColumnError);
          return;
        }
        
        console.log('✅ new_data column added!');
      } else {
        console.log('✅ new_data column already exists');
      }
    }
    
    // Step 3: Test the fix
    console.log('🧪 Testing the fix...');
    
    const testSQL = `
      INSERT INTO audit_logs (
        table_name, action, new_data, metadata, created_at
      ) VALUES (
        'test_table', 
        'schema_fix_test',
        '{"test": "data"}'::jsonb,
        '{"fix": "audit_logs_schema"}'::jsonb,
        NOW()
      ) RETURNING id;
    `;
    
    const { data: testResult, error: testError } = await supabase
      .rpc('exec_raw_sql', { query: testSQL });
    
    if (testError) {
      console.error('❌ Test failed:', testError);
      return;
    }
    
    console.log('✅ Test successful! Schema fix complete.');
    
    // Clean up test data
    await supabase
      .rpc('exec_raw_sql', {
        query: "DELETE FROM audit_logs WHERE action = 'schema_fix_test';"
      });
    
    console.log('🎉 AUDIT_LOGS SCHEMA FIX COMPLETE!');
    console.log('🚀 Phase 4 can now proceed without errors.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Check if we have the required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  console.error('');
  console.error('Please set up your .env file with the required variables.');
  process.exit(1);
}

fixAuditLogsSchema(); 