/**
 * ADD BILINGUAL NOTIFICATIONS SCRIPT 
 * Creates notifications with both Arabic and English content
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addBilingualNotifications() {
  try {
    console.log('🔔 Adding bilingual test notifications...');
    
    // Get super admin user ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    const userId = profile.id;
    console.log(`👤 Found user ID: ${userId}`);
    
    // Bilingual notifications with Arabic and English content
    const notifications = [
      {
        recipient_id: userId,
        type: 'approval_pending',
        title: 'New Reader Approval Required',
        message: 'A new reader has submitted their profile for approval.',
        priority: 'high',
        data: {
          title_ar: 'موافقة قارئ جديدة مطلوبة',
          title_en: 'New Reader Approval Required',
          message_ar: 'قدم قارئ جديد ملفه الشخصي للموافقة عليه.',
          message_en: 'A new reader has submitted their profile for approval.',
          reader_name: 'أحمد محمد'
        }
      },
      {
        recipient_id: userId,
        type: 'review_new', 
        title: 'New Client Review Posted',
        message: 'A client has posted a new review.',
        priority: 'medium',
        data: {
          title_ar: 'تقييم جديد من العميل',
          title_en: 'New Client Review Posted',
          message_ar: 'نشر عميل تقييماً جديداً للخدمة.',
          message_en: 'A client has posted a new review.',
          rating: 5,
          client_name: 'سارة أحمد'
        }
      },
      {
        recipient_id: userId,
        type: 'payment_received',
        title: 'Payment Received',
        message: 'A payment of $25.00 has been received.',
        priority: 'medium',
        data: {
          title_ar: 'تم استلام دفعة',
          title_en: 'Payment Received',
          message_ar: 'تم استلام دفعة بقيمة 25.00 دولار.',
          message_en: 'A payment of $25.00 has been received.',
          amount: '$25.00'
        }
      },
      {
        recipient_id: userId,
        type: 'booking_new',
        title: 'New Booking Request', 
        message: 'A client has requested a new session.',
        priority: 'high',
        data: {
          title_ar: 'طلب حجز جديد',
          title_en: 'New Booking Request',
          message_ar: 'طلب عميل جلسة قراءة تاروت جديدة.',
          message_en: 'A client has requested a new session.',
          client_name: 'مريم عبدالله',
          session_type: 'تاروت'
        }
      },
      {
        recipient_id: userId,
        type: 'deck_created',
        title: 'New Tarot Deck Added',
        message: 'A new deck has been added to your collection.',
        priority: 'low',
        data: {
          title_ar: 'مجموعة تاروت جديدة',
          title_en: 'New Tarot Deck Added',
          message_ar: 'تمت إضافة مجموعة تاروت جديدة إلى مجموعتك.',
          message_en: 'A new deck has been added to your collection.',
          deck_name: 'الرحلة الكونية',
          deck_name_en: 'Cosmic Journey'
        }
      }
    ];
    
    // Clear existing notifications
    console.log('🗑️ Clearing existing notifications...');
    await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', userId);
    
    // Insert new bilingual notifications
    console.log('➕ Adding bilingual notifications...');
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`✅ Added ${data.length} bilingual notifications successfully!`);
    data.forEach((n, i) => {
      const arabicTitle = n.data?.title_ar || 'No Arabic title';
      console.log(`   ${i + 1}. EN: ${n.title}`);
      console.log(`      AR: ${arabicTitle} (${n.type}) - ${n.priority}`);
    });
    
    console.log('\n🎯 Now notifications will display in both languages!');
    console.log('🌐 Arabic UI → Arabic notifications');
    console.log('🌐 English UI → English notifications');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

addBilingualNotifications(); 