import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCreatorIdConstraint() {
  try {
    console.log('🔧 Starting foreign key constraint fix...');
    
    // 1. Check if profile exists in profiles table
    console.log('1. Checking if profile exists in profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', '6e9faf93-2bf7-4937-868c-1208dae2e2eb')
      .single();
    
    if (profileError) {
      console.error('❌ Profile not found in profiles table:', profileError);
      console.log('💡 This is likely the root cause of the issue');
      console.log('💡 Solution: The profile needs to exist in the profiles table');
      return;
    }
    
    console.log('✅ Profile exists in profiles table:', profileData);
    
    // 2. Check if same ID exists in auth.users
    console.log('2. Checking if profile exists in auth.users...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
      '6e9faf93-2bf7-4937-868c-1208dae2e2eb'
    );
    
    if (authError) {
      console.log('❌ Profile not found in auth.users:', authError.message);
      console.log('💡 This is likely the issue - the constraint is pointing to auth.users');
      console.log('💡 but the profile only exists in the profiles table');
      
      // Since we can't modify constraints directly, we need to use Supabase Dashboard
      console.log('\n🚨 MANUAL FIX REQUIRED:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Run this SQL:');
      console.log('   ALTER TABLE spreads DROP CONSTRAINT IF EXISTS spreads_creator_id_fkey;');
      console.log('   ALTER TABLE spreads ADD CONSTRAINT spreads_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;');
      console.log('3. Then try creating the spread again');
      
      return;
    } else {
      console.log('✅ Profile exists in auth.users:', authUser.user.email);
    }
    
    // 3. If we get here, both exist - test the spread creation
    console.log('3. Testing spread creation...');
    
    const testSpread = {
      name_en: 'Test Spread',
      name_ar: 'انتشار تجريبي',
      description_en: 'Test description',
      description_ar: 'وصف تجريبي',
      category_id: 6,
      deck_id: 1,
      layout_type: 'grid',
      card_count: 3,
      mode: 'auto',
      creator_id: '6e9faf93-2bf7-4937-868c-1208dae2e2eb',
      status: 'pending'
    };
    
    const { data: testData, error: testError } = await supabase
      .from('spreads')
      .insert(testSpread)
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Test spread creation failed:', testError);
      
      if (testError.message.includes('violates foreign key constraint')) {
        console.log('\n🚨 CONSTRAINT ISSUE CONFIRMED:');
        console.log('The foreign key constraint is pointing to the wrong table.');
        console.log('Go to Supabase Dashboard → SQL Editor and run:');
        console.log('ALTER TABLE spreads DROP CONSTRAINT IF EXISTS spreads_creator_id_fkey;');
        console.log('ALTER TABLE spreads ADD CONSTRAINT spreads_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;');
      }
    } else {
      console.log('✅ Test spread created successfully:', testData.id);
      
      // Clean up test data
      const { error: cleanupError } = await supabase
        .from('spreads')
        .delete()
        .eq('id', testData.id);
      
      if (cleanupError) {
        console.log('ℹ️  Test data cleanup failed (not critical):', cleanupError);
      } else {
        console.log('✅ Test data cleaned up');
      }
    }
    
    console.log('🎉 Diagnostic complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixCreatorIdConstraint().then(() => {
  console.log('✅ Script finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 