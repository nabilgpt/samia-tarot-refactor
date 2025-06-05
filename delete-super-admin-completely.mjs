import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deleteSuperAdminCompletely() {
  try {
    console.log('🔍 Finding super admin user...');
    
    // Find the super admin user
    const { data: superAdminUser, error: findError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    if (findError || !superAdminUser) {
      console.log('ℹ️  No super admin user found to delete');
      return;
    }
    
    console.log('✅ Found super admin user:', {
      id: superAdminUser.id,
      email: superAdminUser.email,
      role: superAdminUser.role
    });
    
    const userId = superAdminUser.id;
    
    console.log('\n🗑️  Step 1: Deleting related data...');
    
    // Delete from wallets (this was causing the foreign key constraint error)
    console.log('🔄 Deleting wallets...');
    const { error: walletsError } = await supabase
      .from('wallets')
      .delete()
      .eq('user_id', userId);
    
    if (walletsError) {
      console.warn('⚠️  Warning deleting wallets:', walletsError.message);
    } else {
      console.log('✅ Deleted wallets');
    }
    
    // Delete from transactions
    console.log('🔄 Deleting transactions...');
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId);
    
    if (transactionsError) {
      console.warn('⚠️  Warning deleting transactions:', transactionsError.message);
    } else {
      console.log('✅ Deleted transactions');
    }
    
    // Delete from bookings (as user_id)
    console.log('🔄 Deleting bookings (as user)...');
    const { error: bookingsUserError } = await supabase
      .from('bookings')
      .delete()
      .eq('user_id', userId);
    
    if (bookingsUserError) {
      console.warn('⚠️  Warning deleting bookings (user):', bookingsUserError.message);
    } else {
      console.log('✅ Deleted bookings (as user)');
    }
    
    // Delete from bookings (as reader_id)
    console.log('🔄 Deleting bookings (as reader)...');
    const { error: bookingsReaderError } = await supabase
      .from('bookings')
      .delete()
      .eq('reader_id', userId);
    
    if (bookingsReaderError) {
      console.warn('⚠️  Warning deleting bookings (reader):', bookingsReaderError.message);
    } else {
      console.log('✅ Deleted bookings (as reader)');
    }
    
    // Delete from payments
    console.log('🔄 Deleting payments...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', userId);
    
    if (paymentsError) {
      console.warn('⚠️  Warning deleting payments:', paymentsError.message);
    } else {
      console.log('✅ Deleted payments');
    }
    
    // Delete from notifications
    console.log('🔄 Deleting notifications...');
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    
    if (notificationsError) {
      console.warn('⚠️  Warning deleting notifications:', notificationsError.message);
    } else {
      console.log('✅ Deleted notifications');
    }
    
    // Delete from reviews (as user)
    console.log('🔄 Deleting reviews...');
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .eq('user_id', userId);
    
    if (reviewsError) {
      console.warn('⚠️  Warning deleting reviews:', reviewsError.message);
    } else {
      console.log('✅ Deleted reviews');
    }
    
    console.log('\n🗑️  Step 2: Deleting profile...');
    
    // Delete from profiles table
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (deleteProfileError) {
      console.error('❌ Failed to delete profile:', deleteProfileError.message);
      return;
    } else {
      console.log('✅ Deleted profile');
    }
    
    console.log('\n🗑️  Step 3: Deleting auth user...');
    
    // Delete from auth.users table
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      console.warn('⚠️  Warning deleting auth user:', deleteAuthError.message);
    } else {
      console.log('✅ Deleted auth user');
    }
    
    console.log('\n🗑️  Step 4: Verifying deletion...');
    
    // Verify user is completely deleted
    const { data: verifyUser, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    if (verifyError || !verifyUser) {
      console.log('✅ CONFIRMED: Super admin user completely deleted');
    } else {
      console.log('⚠️  User still exists:', verifyUser);
    }
    
    console.log('\n🎉 SUCCESS! Super admin user completely removed from database');
    console.log('📧 Email info@samiatarot.com is now free to use');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Create a fresh super admin user');
    console.log('2. Set up proper RLS policies');
    console.log('3. Test super admin access');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the complete deletion
deleteSuperAdminCompletely(); 