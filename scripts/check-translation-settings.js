// ============================================================================
// SAMIA TAROT - CHECK TRANSLATION SETTINGS TABLE
// Debug script to check current translation_settings data
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  { 
    auth: { persistSession: false }
  }
);

async function checkTranslationSettings() {
  try {
    console.log('🔍 Checking translation_settings table...\n');

    const { data: settings, error } = await supabaseAdmin
      .from('translation_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    console.log(`✅ Found ${settings?.length || 0} settings:\n`);
    
    if (settings && settings.length > 0) {
      settings.forEach((setting, index) => {
        console.log(`${index + 1}. ${setting.setting_key}:`);
        console.log(`   Value: ${setting.setting_value}`);
        console.log(`   Category: ${setting.category}`);
        console.log(`   Description EN: ${setting.description_en}`);
        console.log(`   Description AR: ${setting.description_ar}`);
        console.log(`   System Setting: ${setting.is_system_setting}`);
        console.log(`   Updated: ${setting.updated_at}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No settings found in the database');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the check
checkTranslationSettings(); 