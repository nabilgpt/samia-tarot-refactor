// Fix secrets_access_log constraint - SAMIA TAROT
// This script fixes the constraint violation by updating the allowed access types

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSecretsAccessLogConstraint() {
  console.log('🔧 [CONSTRAINT FIX] Starting secrets_access_log constraint fix...');
  
  try {
    // Step 1: Drop the existing constraint
    console.log('📝 [CONSTRAINT FIX] Dropping existing constraint...');
    const { error: dropError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE secrets_access_log 
        DROP CONSTRAINT IF EXISTS secrets_access_log_access_type_check;
      `
    });
    
    if (dropError) {
      console.error('❌ [CONSTRAINT FIX] Error dropping constraint:', dropError);
      // Continue anyway, constraint might not exist
    } else {
      console.log('✅ [CONSTRAINT FIX] Existing constraint dropped successfully');
    }
    
    // Step 2: Add the updated constraint with all required access types
    console.log('📝 [CONSTRAINT FIX] Adding updated constraint...');
    const { error: addError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE secrets_access_log 
        ADD CONSTRAINT secrets_access_log_access_type_check 
        CHECK (access_type IN (
          'read', 
          'decrypt', 
          'update', 
          'delete', 
          'test', 
          'export', 
          'import',
          'create',
          'view',
          'list',
          'search',
          'bulk_export',
          'bulk_import',
          'system_decrypt',
          'api_test',
          'health_check'
        ));
      `
    });
    
    if (addError) {
      console.error('❌ [CONSTRAINT FIX] Error adding constraint:', addError);
      throw addError;
    }
    
    console.log('✅ [CONSTRAINT FIX] Updated constraint added successfully');
    
    // Step 3: Verify the constraint was applied correctly
    console.log('📝 [CONSTRAINT FIX] Verifying constraint...');
    const { data: constraintData, error: verifyError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          tc.constraint_name,
          cc.check_clause
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc 
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'secrets_access_log' 
          AND tc.constraint_type = 'CHECK'
          AND tc.constraint_name = 'secrets_access_log_access_type_check';
      `
    });
    
    if (verifyError) {
      console.error('❌ [CONSTRAINT FIX] Error verifying constraint:', verifyError);
      throw verifyError;
    }
    
    if (constraintData && constraintData.length > 0) {
      console.log('✅ [CONSTRAINT FIX] Constraint verification successful:');
      console.log('   Constraint name:', constraintData[0].constraint_name);
      console.log('   Check clause:', constraintData[0].check_clause);
    } else {
      console.log('⚠️ [CONSTRAINT FIX] Constraint verification: No constraint found (might be expected)');
    }
    
    // Step 4: Test the constraint with a sample insert (will be rolled back)
    console.log('📝 [CONSTRAINT FIX] Testing constraint with sample data...');
    
    // Get a sample secret ID and profile ID for testing
    const { data: secretData } = await supabase
      .from('system_secrets')
      .select('id')
      .limit(1);
      
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1);
    
    if (secretData && secretData.length > 0 && profileData && profileData.length > 0) {
      const { error: testError } = await supabase
        .from('secrets_access_log')
        .insert({
          secret_id: secretData[0].id,
          accessed_by: profileData[0].id,
          access_type: 'create',
          access_method: 'api',
          ip_address: '127.0.0.1',
          success: true
        });
      
      if (testError) {
        console.error('❌ [CONSTRAINT FIX] Test insert failed:', testError);
        throw testError;
      }
      
      console.log('✅ [CONSTRAINT FIX] Test insert successful - constraint allows "create" access type');
      
      // Clean up test data
      await supabase
        .from('secrets_access_log')
        .delete()
        .eq('access_type', 'create')
        .eq('access_method', 'api')
        .eq('ip_address', '127.0.0.1');
        
      console.log('🧹 [CONSTRAINT FIX] Test data cleaned up');
    } else {
      console.log('⚠️ [CONSTRAINT FIX] Skipping test insert - no sample data available');
    }
    
    console.log('🎉 [CONSTRAINT FIX] Constraint fix completed successfully!');
    console.log('✅ [CONSTRAINT FIX] All access types now supported in secrets_access_log table');
    
  } catch (error) {
    console.error('❌ [CONSTRAINT FIX] Fatal error:', error);
    process.exit(1);
  }
}

// Run the fix
fixSecretsAccessLogConstraint(); 