// ============================================================================
// SAMIA TAROT - FIX TRANSLATION SETTINGS JSON VALUES
// Update existing settings to use JSON string values
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Settings that need to be fixed to JSON strings
const settingsToFix = [
  {
    setting_key: 'global_translation_mode',
    setting_value: '"auto-translate"'
  },
  {
    setting_key: 'default_provider',
    setting_value: '"openai"'
  },
  {
    setting_key: 'fallback_mode',
    setting_value: '"auto-copy"'
  },
  {
    setting_key: 'enable_provider_fallback',
    setting_value: 'true'
  },
  {
    setting_key: 'translation_quality_threshold',
    setting_value: '0.7'
  },
  {
    setting_key: 'cache_translations',
    setting_value: 'true'
  },
  {
    setting_key: 'enable_usage_analytics',
    setting_value: 'true'
  }
];

async function fixTranslationSettings() {
  console.log('🔧 Fixing translation settings to use JSON string values...\n');

  for (const setting of settingsToFix) {
    try {
      const { data, error } = await supabase
        .from('translation_settings')
        .update({ 
          setting_value: setting.setting_value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', setting.setting_key)
        .select();

      if (error) {
        console.error(`❌ Failed to update ${setting.setting_key}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`✅ Updated ${setting.setting_key} = ${setting.setting_value}`);
      } else {
        console.log(`⚠️  Setting ${setting.setting_key} not found in database`);
      }

    } catch (error) {
      console.error(`❌ Error updating ${setting.setting_key}:`, error);
    }
  }

  console.log('\n✅ Translation settings values fixed successfully!');
  console.log('🔄 Please refresh the frontend to see the changes.');
}

// Run the fix
fixTranslationSettings(); 