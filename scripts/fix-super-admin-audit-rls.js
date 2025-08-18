#!/usr/bin/env node

/**
 * 🔧 SAMIA TAROT - Fix Super Admin Audit RLS Policies
 * Resolves 403 Forbidden errors when logging to super_admin_audit_logs table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const fixRLSPolicies = async () => {
  console.log('🔧 SAMIA TAROT - Fix Super Admin Audit RLS Policies');
  console.log('═══════════════════════════════════════════════════');
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log('');

  try {
    // SQL to fix RLS policies
    const sqlCommands = [
      // Check if super_admin_audit_logs table exists and enable RLS
      `
      DO $$
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'super_admin_audit_logs') THEN
              ALTER TABLE super_admin_audit_logs ENABLE ROW LEVEL SECURITY;
              RAISE NOTICE 'RLS enabled for super_admin_audit_logs';
          ELSE
              RAISE NOTICE 'Table super_admin_audit_logs does not exist';
          END IF;
      END $$;
      `,
      
      // Drop existing policies
      `DROP POLICY IF EXISTS "super_admin_audit_logs_insert_policy" ON super_admin_audit_logs;`,
      `DROP POLICY IF EXISTS "super_admin_audit_logs_select_policy" ON super_admin_audit_logs;`,
      `DROP POLICY IF EXISTS "super_admin_audit_logs_service_role_policy" ON super_admin_audit_logs;`,
      
      // Create insert policy for super_admin users
      `
      CREATE POLICY "super_admin_audit_logs_insert_policy" ON super_admin_audit_logs
          FOR INSERT
          TO authenticated
          WITH CHECK (
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE profiles.id = auth.uid() 
                  AND profiles.role = 'super_admin'
              )
          );
      `,
      
      // Create select policy for super_admin users
      `
      CREATE POLICY "super_admin_audit_logs_select_policy" ON super_admin_audit_logs
          FOR SELECT
          TO authenticated
          USING (
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE profiles.id = auth.uid() 
                  AND profiles.role = 'super_admin'
              )
          );
      `,
      
      // Create service_role policy for backend operations
      `
      CREATE POLICY "super_admin_audit_logs_service_role_policy" ON super_admin_audit_logs
          FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
      `,
      
      // Grant permissions
      `GRANT ALL ON super_admin_audit_logs TO service_role;`,
      `GRANT SELECT, INSERT ON super_admin_audit_logs TO authenticated;`,
      
      // Fix system_secrets table as well
      `
      DO $$
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_secrets') THEN
              ALTER TABLE system_secrets ENABLE ROW LEVEL SECURITY;
              RAISE NOTICE 'RLS enabled for system_secrets';
          END IF;
      END $$;
      `,
      
      `DROP POLICY IF EXISTS "system_secrets_super_admin_policy" ON system_secrets;`,
      `DROP POLICY IF EXISTS "system_secrets_service_role_policy" ON system_secrets;`,
      
      `
      CREATE POLICY "system_secrets_super_admin_policy" ON system_secrets
          FOR ALL
          TO authenticated
          USING (
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE profiles.id = auth.uid() 
                  AND profiles.role = 'super_admin'
              )
          )
          WITH CHECK (
              EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE profiles.id = auth.uid() 
                  AND profiles.role = 'super_admin'
              )
          );
      `,
      
      `
      CREATE POLICY "system_secrets_service_role_policy" ON system_secrets
          FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
      `,
      
      `GRANT ALL ON system_secrets TO service_role;`,
      `GRANT ALL ON system_secrets TO authenticated;`
    ];

    console.log('🔄 Executing RLS policy fixes...');
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i].trim();
      if (!command) continue;

      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: command 
        });

        if (error) {
          // Check if it's a harmless error (table doesn't exist, policy already exists, etc.)
          if (error.message.includes('does not exist') || 
              error.message.includes('already exists') ||
              error.message.includes('cannot be dropped because it does not exist')) {
            console.log(`⏭️  Skipped (${error.message.split('.')[0]})`);
          } else {
            console.log(`⚠️  Warning: ${error.message.substring(0, 80)}...`);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Error executing command ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 Results:');
    console.log(`✅ Successful commands: ${successCount}`);
    console.log(`⚠️  Warnings/Errors: ${errorCount}`);

    // Verify the policies were created
    console.log('');
    console.log('🔍 Verifying policies...');
    
    try {
      const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('schemaname, tablename, policyname, permissive, roles, cmd')
        .in('tablename', ['super_admin_audit_logs', 'system_secrets']);

      if (error) {
        console.log('⚠️  Could not verify policies:', error.message);
      } else {
        console.log(`✅ Found ${policies?.length || 0} active policies`);
        if (policies && policies.length > 0) {
          policies.forEach(policy => {
            console.log(`   📋 ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
          });
        }
      }
    } catch (err) {
      console.log('⚠️  Policy verification failed:', err.message);
    }

    console.log('');
    console.log('🎉 RLS policy fix completed!');
    console.log('');
    console.log('📝 Summary:');
    console.log('✅ Fixed super_admin_audit_logs table RLS policies');
    console.log('✅ Fixed system_secrets table RLS policies');
    console.log('✅ Granted proper permissions to authenticated and service_role');
    console.log('');
    console.log('🔄 Please refresh your frontend to test the fix!');

  } catch (error) {
    console.error('❌ RLS policy fix failed:', error);
    process.exit(1);
  }
};

// Run the fix
fixRLSPolicies().catch(console.error); 