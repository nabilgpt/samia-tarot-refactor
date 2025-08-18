/**
 * ADD TEST NOTIFICATIONS SCRIPT
 * Creates 5 test notifications to test the navigation functionality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addTestNotifications() {
  try {
    console.log('🔔 Adding test notifications...');
    
    // Get super admin user ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    if (profileError || !profile) {
      console.error('❌ Error finding super admin profile:', profileError);
      return;
    }
    
    const userId = profile.id;
    console.log(`👤 Found super admin user ID: ${userId}`);
    
    // Test notifications for different navigation scenarios
    const testNotifications = [
      {
        recipient_id: userId,
        sender_id: userId,
        type: 'approval_pending',
        title: 'New Reader Approval Required',
        message: 'A new reader has submitted their profile for approval. Please review their qualifications.',
        priority: 'urgent',
        channels: ['web'],
        is_system: false,
        created_at: new Date().toISOString()
      },
      {
        recipient_id: userId,
        sender_id: userId,
        type: 'review_new',
        title: 'New Client Review Posted',
        message: 'A client has posted a new review for one of your readers. Check the feedback.',
        priority: 'normal',
        channels: ['web'],
        is_system: false,
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
      },
      {
        recipient_id: userId,
        sender_id: userId,
        type: 'payment_received',
        title: 'Payment Received',
        message: 'A payment of $25.00 has been received for a tarot reading session.',
        priority: 'normal',
        channels: ['web'],
        is_system: false,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      },
      {
        recipient_id: userId,
        sender_id: userId,
        type: 'booking_new',
        title: 'New Booking Request',
        message: 'A client has requested a new tarot reading session. Please confirm availability.',
        priority: 'urgent',
        channels: ['web'],
        is_system: false,
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      },
      {
        recipient_id: userId,
        sender_id: userId,
        type: 'deck_created',
        title: 'New Tarot Deck Added',
        message: 'A new tarot deck "Cosmic Journey" has been added to your collection.',
        priority: 'normal',
        channels: ['web'],
        is_system: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      }
    ];
    
    // Delete existing test notifications first
    console.log('🗑️ Clearing existing test notifications...');
    await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', userId)
      .in('type', ['approval_pending', 'review_new', 'payment_received', 'booking_new', 'deck_created']);
    
    // Insert new test notifications
    console.log('➕ Adding new test notifications...');
    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotifications)
      .select();
    
    if (error) {
      console.error('❌ Error adding test notifications:', error);
      return;
    }
    
    console.log(`✅ Successfully added ${data.length} test notifications:`);
    data.forEach((notification, index) => {
      console.log(`   ${index + 1}. ${notification.title} (${notification.type})`);
    });
    
    // Verify unread count
    const { data: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('recipient_id', userId)
      .is('read_at', null);
    
    if (countError) {
      console.error('❌ Error checking unread count:', countError);
    } else {
      console.log(`📊 Total unread notifications: ${unreadCount.length}`);
    }
    
    console.log('🎉 Test notifications setup complete!');
    console.log('🚀 You can now test the navigation functionality:');
    console.log('   • Click on "New Reader Approval Required" → Should navigate to Approvals tab');
    console.log('   • Click on "New Client Review Posted" → Should navigate to Reviews tab');
    console.log('   • Click on "Payment Received" → Should navigate to Payments tab');
    console.log('   • Click on "New Booking Request" → Should navigate to Bookings tab');
    console.log('   • Click on "New Tarot Deck Added" → Should navigate to Tarot tab');
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
  }
}

// Run the script
addTestNotifications().then(() => {
  console.log('🔚 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 