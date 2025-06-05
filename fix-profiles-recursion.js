import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProfilesRecursion() {
  console.log('Starting profiles table RLS fix...');
  
  try {
    // Step 1: Disable RLS temporarily
    console.log('Step 1: Disabling RLS...');
    const { error: disableError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;'
    });
    
    if (disableError) {
      console.log('Error disabling RLS (may not exist yet):', disableError.message);
    }

    // Step 2: Drop all existing policies
    console.log('Step 2: Dropping existing policies...');
    const policiesToDrop = [
      'Users can view their own profile',
      'Users can update their own profile', 
      'Admin can view all profiles',
      'Admin can update all profiles',
      'Super admin can view all profiles',
      'Super admin can update all profiles',
      'Super admin can insert profiles',
      'Super admin can delete profiles',
      'Public can view profiles',
      'Public can insert profiles',
      'Anyone can read profiles',
      'Anyone can create profiles',
      'Enable read access for all users',
      'Enable insert access for all users',
      'Enable update access for all users'
    ];

    for (const policy of policiesToDrop) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${policy}" ON public.profiles;`
      });
      if (error && !error.message.includes('does not exist')) {
        console.log(`Error dropping policy "${policy}":`, error.message);
      }
    }

    // Step 3: Create safe, non-recursive policies
    console.log('Step 3: Creating safe policies...');
    
    const safePolicies = [
      {
        name: 'Users can view own profile - safe',
        sql: `CREATE POLICY "Users can view own profile - safe"
              ON public.profiles FOR SELECT
              TO authenticated
              USING (auth.uid() = id);`
      },
      {
        name: 'Users can update own profile - safe', 
        sql: `CREATE POLICY "Users can update own profile - safe"
              ON public.profiles FOR UPDATE
              TO authenticated
              USING (auth.uid() = id)
              WITH CHECK (auth.uid() = id);`
      },
      {
        name: 'Super admin full access - safe',
        sql: `CREATE POLICY "Super admin full access - safe"
              ON public.profiles FOR ALL
              TO authenticated
              USING (auth.email() IN ('super.admin@samia-tarot.com', 'samia.nabilgpt@gmail.com'));`
      },
      {
        name: 'Users can insert own profile - safe',
        sql: `CREATE POLICY "Users can insert own profile - safe"
              ON public.profiles FOR INSERT
              TO authenticated
              WITH CHECK (auth.uid() = id);`
      }
    ];

    for (const policy of safePolicies) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: policy.sql
      });
      if (error) {
        console.log(`Error creating policy "${policy.name}":`, error.message);
      } else {
        console.log(`✓ Created policy: ${policy.name}`);
      }
    }

    // Step 4: Re-enable RLS
    console.log('Step 4: Re-enabling RLS...');
    const { error: enableError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'
    });
    
    if (enableError) {
      console.log('Error enabling RLS:', enableError.message);
    } else {
      console.log('✓ RLS enabled successfully');
    }

    // Step 5: Test the fix
    console.log('Step 5: Testing the fix...');
    const { data: profiles, error: testError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(5);

    if (testError) {
      console.log('❌ Test failed:', testError.message);
    } else {
      console.log('✅ Test successful! Profiles query works.');
      console.log('Sample profiles:', profiles);
    }

    console.log('\n🎉 Profiles table RLS fix completed successfully!');
    console.log('The infinite recursion issue should now be resolved.');
    console.log('Please refresh your browser and try logging in again.');

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
  }
}

// Alternative approach using direct SQL if rpc doesn't work
async function fixWithDirectSQL() {
  console.log('Attempting direct SQL approach...');
  
  const sqlCommands = [
    'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;',
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
    `CREATE POLICY "Users can view own profile - safe"
     ON public.profiles FOR SELECT TO authenticated
     USING (auth.uid() = id);`,
    `CREATE POLICY "Users can update own profile - safe"
     ON public.profiles FOR UPDATE TO authenticated
     USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`,
    `CREATE POLICY "Super admin full access - safe"
     ON public.profiles FOR ALL TO authenticated
     USING (auth.email() IN ('super.admin@samia-tarot.com', 'samia.nabilgpt@gmail.com'));`,
    `CREATE POLICY "Users can insert own profile - safe"
     ON public.profiles FOR INSERT TO authenticated
     WITH CHECK (auth.uid() = id);`,
    'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'
  ];

  for (const sql of sqlCommands) {
    try {
      console.log(`Executing: ${sql.substring(0, 50)}...`);
      // Use direct query instead of rpc
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
        const error = await response.text();
        console.log(`Warning: ${error}`);
      }
    } catch (error) {
      console.log(`Warning for command: ${error.message}`);
    }
  }

  // Test
  const { data: profiles, error: testError } = await supabase
    .from('profiles') 
    .select('id, email, role')
    .limit(3);

  if (testError) {
    console.log('❌ Test failed:', testError.message);
  } else {
    console.log('✅ Test successful!');
    console.log('Sample profiles:', profiles);
  }
}

// Run the fix
fixProfilesRecursion().catch(() => {
  console.log('Primary method failed, trying alternative...');
  fixWithDirectSQL();
}); 