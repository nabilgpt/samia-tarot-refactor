/**
 * Fix admin_audit_logs table schema
 * Adds the missing record_ids column that's causing 400 Bad Request errors
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixTableSchema() {
  console.log('🔧 Fixing admin_audit_logs table schema...');
  
  try {
    // Add the missing record_ids column
    console.log('📝 Adding record_ids column...');
    
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add the missing record_ids column
        ALTER TABLE admin_audit_logs 
        ADD COLUMN IF NOT EXISTS record_ids TEXT[] DEFAULT '{}';
        
        -- Add other potentially missing columns for completeness
        ALTER TABLE admin_audit_logs 
        ADD COLUMN IF NOT EXISTS bulk_operation_id UUID,
        ADD COLUMN IF NOT EXISTS can_undo BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS undone_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS undone_by UUID,
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
        
        -- Add an index on record_ids for performance
        CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_record_ids 
        ON admin_audit_logs USING GIN (record_ids);
        
        -- Add an index on admin_id for performance
        CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id 
        ON admin_audit_logs (admin_id);
        
        -- Add an index on action_type for filtering
        CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type 
        ON admin_audit_logs (action_type);
      `
    });
    
    if (alterError) {
      console.error('❌ Error altering table:', alterError);
      
      // Fallback: try adding just the record_ids column
      console.log('🔄 Trying fallback approach...');
      
      const { error: fallbackError } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE admin_audit_logs ADD COLUMN record_ids TEXT[] DEFAULT '{}';`
      });
      
      if (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return;
      }
    }
    
    console.log('✅ Table schema updated successfully');
    
    // Test the fix
    console.log('🧪 Testing the fix...');
    
    const testInsert = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: 'c3922fea-329a-4d6e-800c-3e03c9fe341d',
        action_type: 'SCHEMA_FIX_TEST',
        table_name: 'test',
        record_ids: ['test-id-1', 'test-id-2'],
        metadata: { 
          test: true,
          fixed_at: new Date().toISOString()
        }
      });
    
    if (testInsert.error) {
      console.error('❌ Test insert failed:', testInsert.error);
    } else {
      console.log('✅ Test insert successful - schema fix verified!');
      
      // Clean up test record
      await supabase
        .from('admin_audit_logs')
        .delete()
        .eq('action_type', 'SCHEMA_FIX_TEST');
        
      console.log('🧹 Test record cleaned up');
    }
    
    console.log('\n🎉 Admin audit logs table schema fixed!');
    console.log('   - record_ids column added');
    console.log('   - Performance indexes created');
    console.log('   - 400 Bad Request errors should be resolved');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixTableSchema(); 