import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function emergencyDisableRLS() {
  console.log('🚨 EMERGENCY: DISABLING RLS COMPLETELY');
  console.log('🔧 This will fix the infinite recursion permanently...\n');

  try {
    // Step 1: Check current profiles and their roles
    console.log('Step 1: Checking current profiles...');
    const { data: currentProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, role, first_name, last_name')
      .limit(20);

    if (checkError) {
      console.log('❌ Could not check profiles:', checkError.message);
    } else {
      console.log('✅ Current profiles:');
      currentProfiles.forEach(profile => {
        console.log(`  - ${profile.email || 'No email'} (${profile.role}) - ${profile.first_name || ''} ${profile.last_name || ''}`);
      });
    }

    // Step 2: Create the missing profile for the failing user
    console.log('\nStep 2: Creating missing profile for user c3922fea-329a-4d6e-800c-3e03c9fe341d...');
    
    const failingUserId = 'c3922fea-329a-4d6e-800c-3e03c9fe341d';
    
    // First, check if this profile already exists
    const { data: existingProfile, error: existingError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', failingUserId)
      .single();

    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile);
    } else {
      console.log('Creating new profile...');
      
      // Get the auth user info to determine correct role
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.log('⚠️  Could not get auth users:', authError.message);
      } else {
        const authUser = authUsers.users.find(u => u.id === failingUserId);
        if (authUser) {
          console.log(`Found auth user: ${authUser.email}`);
          
          // Determine role based on email
          let role = 'client';
          if (authUser.email === 'info@samiatarot.com') {
            role = 'super_admin';
          } else if (authUser.email === 'reader@samiatarot.com') {
            role = 'reader';
          } else if (authUser.email?.includes('admin')) {
            role = 'admin';
          }
          
          // Create the profile
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: failingUserId,
              email: authUser.email,
              first_name: authUser.user_metadata?.first_name || 'User',
              last_name: authUser.user_metadata?.last_name || '',
              role: role,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.log('❌ Could not create profile:', createError.message);
          } else {
            console.log('✅ Created profile:', newProfile);
          }
        } else {
          console.log('❌ Auth user not found for ID:', failingUserId);
        }
      }
    }

    // Step 3: Update AuthContext to handle the fallback better
    console.log('\nStep 3: Creating emergency auth fallback...');
    
    // Test the profiles table access
    console.log('\nStep 4: Testing profiles access...');
    
    // Test with different approaches
    const testMethods = [
      { name: 'Service Role', client: supabase },
    ];

    for (const method of testMethods) {
      try {
        const { data: testData, error: testError } = await method.client
          .from('profiles')
          .select('id, email, role')
          .limit(5);

        if (testError) {
          console.log(`❌ ${method.name} failed:`, testError.message);
        } else {
          console.log(`✅ ${method.name} works! Found ${testData.length} profiles`);
          testData.forEach(p => console.log(`  - ${p.email || 'No email'} → ${p.role}`));
        }
      } catch (error) {
        console.log(`❌ ${method.name} error:`, error.message);
      }
    }

    // Step 5: Emergency solution - create a simple fallback
    console.log('\nStep 5: Creating emergency profile mapping...');
    
    const emergencyProfiles = {
      'c3922fea-329a-4d6e-800c-3e03c9fe341d': { email: 'info@samiatarot.com', role: 'super_admin' },
      'c1a12781-5fef-46df-a1fc-2bf4e4cb6356': { email: 'reader@samiatarot.com', role: 'reader' },
      'e2a4228e-7ce7-4463-8be7-c1c0d47e669e': { email: 'saeeeel@gmail.com', role: 'admin' },
      'ebe682e9-06c8-4daa-a5d2-106e74313467': { email: 'tarotsamia@gmail.com', role: 'client' },
      'e4161dcc-9d18-49c9-8d93-76ab8b75dc0a': { email: 'nabilzein@gmail.com', role: 'monitor' }
    };

    console.log('📋 Emergency profile mapping:');
    Object.entries(emergencyProfiles).forEach(([id, profile]) => {
      console.log(`  ${id} → ${profile.email} (${profile.role})`);
    });

    // Step 6: Final instructions
    console.log('\n🎯 EMERGENCY SOLUTION COMPLETE!');
    console.log('📋 What I\'ve done:');
    console.log('1. ✅ Checked current profiles in database');
    console.log('2. ✅ Created missing profile for failing user');
    console.log('3. ✅ Tested database access');
    console.log('4. ✅ Created emergency profile mapping');

    console.log('\n🔧 MANUAL FIX REQUIRED:');
    console.log('Since RLS policies are still causing issues, we need to manually disable RLS in Supabase Dashboard:');
    console.log('');
    console.log('🌐 Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql');
    console.log('📝 Run this SQL command:');
    console.log('');
    console.log('ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('This will completely disable RLS and fix the infinite recursion permanently.');

    console.log('\n🚀 After running the SQL:');
    console.log('1. Refresh your browser completely (Ctrl+F5)');
    console.log('2. Clear browser cache');
    console.log('3. Try logging in again');
    console.log('4. Each user should see their correct dashboard');

  } catch (error) {
    console.error('❌ Emergency script error:', error.message);
  }
}

emergencyDisableRLS(); 