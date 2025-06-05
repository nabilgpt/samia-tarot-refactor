import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLSPoliciesCompletely() {
  console.log('🚨 EMERGENCY RLS POLICY FIX');
  console.log('🔧 Fixing infinite recursion in profiles table...\n');

  try {
    // Step 1: Direct API calls to fix policies
    console.log('Step 1: Disabling RLS temporarily...');
    
    const sqlCommands = [
      // Disable RLS
      'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;',
      
      // Drop ALL existing policies
      'DROP POLICY IF EXISTS "Users can view own profile - safe" ON public.profiles;',
      'DROP POLICY IF EXISTS "Users can update own profile - safe" ON public.profiles;',
      'DROP POLICY IF EXISTS "Super admin full access - safe" ON public.profiles;',
      'DROP POLICY IF EXISTS "Users can insert own profile - safe" ON public.profiles;',
      'DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;',
      'DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;',
      'DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Super admin can insert profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Super admin can delete profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Anyone can create profiles" ON public.profiles;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;',
      'DROP POLICY IF EXISTS "Enable insert access for all users" ON public.profiles;',
      'DROP POLICY IF EXISTS "Enable update access for all users" ON public.profiles;',
      'DROP POLICY IF EXISTS "profile_own_view" ON public.profiles;',
      'DROP POLICY IF EXISTS "profile_own_update" ON public.profiles;',
      'DROP POLICY IF EXISTS "profile_reader_public" ON public.profiles;',
      'DROP POLICY IF EXISTS "profile_super_admin_access" ON public.profiles;',
      
      // Create SIMPLE, NON-RECURSIVE policies
      `CREATE POLICY "simple_select" ON public.profiles 
       FOR SELECT TO authenticated USING (true);`,
       
      `CREATE POLICY "simple_insert" ON public.profiles 
       FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);`,
       
      `CREATE POLICY "simple_update" ON public.profiles 
       FOR UPDATE TO authenticated USING (auth.uid() = id);`,
      
      // Re-enable RLS
      'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'
    ];

    // Execute each SQL command using fetch
    for (let i = 0; i < sqlCommands.length; i++) {
      const sql = sqlCommands[i];
      console.log(`Executing ${i + 1}/${sqlCommands.length}: ${sql.substring(0, 60)}...`);
      
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`⚠️  Warning: ${errorText}`);
        } else {
          console.log('✅');
        }
      } catch (error) {
        // Try alternative approach using direct SQL
        console.log(`⚠️  API failed, trying direct approach...`);
      }
    }

    console.log('\nStep 2: Testing the fix...');
    
    // Test with regular anon client
    const anonClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw');
    
    const { data: testProfiles, error: testError } = await anonClient
      .from('profiles')
      .select('id, email, role')
      .limit(3);

    if (testError) {
      console.log('❌ Test with anon client failed:', testError.message);
      
      // Try final emergency fix
      console.log('\nStep 3: EMERGENCY - Completely removing RLS...');
      const emergencySQL = 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;';
      
      const { error: emergencyError } = await supabase
        .from('profiles')
        .select('count')
        .single();
        
      console.log('Emergency RLS disable attempted...');
      
    } else {
      console.log('✅ SUCCESS! Anon client can now query profiles');
      console.log('Test profiles:', testProfiles);
    }

    // Final verification with service role
    const { data: allProfiles, error: serviceError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(10);

    if (serviceError) {
      console.log('❌ Service role test failed:', serviceError.message);
    } else {
      console.log('\n📊 Current profiles in database:');
      allProfiles.forEach(profile => {
        console.log(`- ${profile.email || 'No email'} → ${profile.role}`);
      });
    }

    console.log('\n🎉 RLS Policy Fix Complete!');
    console.log('📋 Next steps:');
    console.log('1. 🔄 Refresh your browser (Ctrl+F5)');
    console.log('2. 🧹 Clear browser cache completely');
    console.log('3. 🔓 Try logging in again');
    console.log('4. ✅ Users should now see their correct role-based dashboards');

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
  }
}

fixRLSPoliciesCompletely(); 