/**
 * SIMPLE ADD NOTIFICATIONS SCRIPT 
 * Uses correct priority values: low, medium, high
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addSimpleNotifications() {
  try {
    console.log('🔔 Adding simple test notifications...');
    
    // Get super admin user ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    const userId = profile.id;
    console.log(`👤 Found user ID: ${userId}`);
    
    // Simple notifications with correct format
    const notifications = [
      {
        recipient_id: userId,
        type: 'approval_pending',
        title: 'New Reader Approval Required',
        message: 'A new reader has submitted their profile for approval.',
        priority: 'high'
      },
      {
        recipient_id: userId,
        type: 'review_new', 
        title: 'New Client Review Posted',
        message: 'A client has posted a new review.',
        priority: 'medium'
      },
      {
        recipient_id: userId,
        type: 'payment_received',
        title: 'Payment Received',
        message: 'A payment of $25.00 has been received.',
        priority: 'medium'
      },
      {
        recipient_id: userId,
        type: 'booking_new',
        title: 'New Booking Request', 
        message: 'A client has requested a new session.',
        priority: 'high'
      },
      {
        recipient_id: userId,
        type: 'deck_created',
        title: 'New Tarot Deck Added',
        message: 'A new deck has been added to your collection.',
        priority: 'low'
      }
    ];
    
    // Clear existing
    await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', userId);
    
    // Insert new ones
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`✅ Added ${data.length} notifications successfully!`);
    data.forEach((n, i) => {
      console.log(`   ${i + 1}. ${n.title} (${n.type}) - ${n.priority}`);
    });
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

addSimpleNotifications(); 