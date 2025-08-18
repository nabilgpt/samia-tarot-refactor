// ============================================================================
// SAMIA TAROT - FIX TRANSLATION SETTINGS DEFAULT VALUES
// Insert missing default values in translation_settings table
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default translation settings
const defaultSettings = [
  {
    setting_key: 'global_translation_mode',
    setting_value: 'auto-translate',
    description_en: 'Global translation mode for all bilingual fields',
    description_ar: 'نمط الترجمة العام لجميع الحقول ثنائية اللغة',
    category: 'general',
    is_system_setting: false
  },
  {
    setting_key: 'default_provider',
    setting_value: 'openai',
    description_en: 'Default AI provider for translations',
    description_ar: 'مقدم الذكاء الاصطناعي الافتراضي للترجمة',
    category: 'providers',
    is_system_setting: false
  },
  {
    setting_key: 'fallback_mode',
    setting_value: 'auto-copy',
    description_en: 'Fallback mode when translation fails',
    description_ar: 'النمط الاحتياطي عند فشل الترجمة',
    category: 'general',
    is_system_setting: false
  },
  {
    setting_key: 'enable_provider_fallback',
    setting_value: true,
    description_en: 'Enable automatic fallback to secondary providers',
    description_ar: 'تفعيل التراجع التلقائي إلى مقدمي الخدمة الثانويين',
    category: 'providers',
    is_system_setting: false
  },
  {
    setting_key: 'translation_quality_threshold',
    setting_value: 0.7,
    description_en: 'Minimum quality score to accept translations',
    description_ar: 'الحد الأدنى لدرجة الجودة لقبول الترجمات',
    category: 'general',
    is_system_setting: false
  },
  {
    setting_key: 'cache_translations',
    setting_value: true,
    description_en: 'Enable caching of translations for performance',
    description_ar: 'تفعيل حفظ الترجمات مؤقتاً لتحسين الأداء',
    category: 'general',
    is_system_setting: false
  },
  {
    setting_key: 'enable_usage_analytics',
    setting_value: true,
    description_en: 'Track translation usage and performance',
    description_ar: 'تتبع استخدام الترجمة والأداء',
    category: 'general',
    is_system_setting: false
  }
];

async function insertDefaultSettings() {
  console.log('🔄 [TRANSLATION SETTINGS] Starting default values insertion...');
  
  try {
    // Check if table exists
    const { error: tableError } = await supabase
      .from('translation_settings')
      .select('setting_key')
      .limit(1);
    
    if (tableError) {
      console.error('❌ [TRANSLATION SETTINGS] Table does not exist or is not accessible:', tableError);
      return false;
    }
    
    console.log('✅ [TRANSLATION SETTINGS] Table exists and accessible');
    
    // Insert each setting
    let successCount = 0;
    let errorCount = 0;
    
    for (const setting of defaultSettings) {
      try {
        console.log(`🔄 [TRANSLATION SETTINGS] Processing: ${setting.setting_key}`);
        
        // Check if setting already exists
        const { data: existing, error: existingError } = await supabase
          .from('translation_settings')
          .select('setting_key')
          .eq('setting_key', setting.setting_key)
          .single();
        
        if (existingError && existingError.code !== 'PGRST116') {
          console.error(`❌ [TRANSLATION SETTINGS] Error checking ${setting.setting_key}:`, existingError);
          errorCount++;
          continue;
        }
        
        // Prepare setting data - store as JSON for consistency
        const settingData = {
          setting_key: setting.setting_key,
          setting_value: JSON.stringify(setting.setting_value),
          description_en: setting.description_en,
          description_ar: setting.description_ar,
          category: setting.category,
          is_system_setting: setting.is_system_setting,
          updated_at: new Date().toISOString()
        };
        
        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('translation_settings')
            .update(settingData)
            .eq('setting_key', setting.setting_key);
          
          if (updateError) {
            console.error(`❌ [TRANSLATION SETTINGS] Error updating ${setting.setting_key}:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ [TRANSLATION SETTINGS] Updated ${setting.setting_key}: ${JSON.stringify(setting.setting_value)}`);
            successCount++;
          }
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('translation_settings')
            .insert([settingData]);
          
          if (insertError) {
            console.error(`❌ [TRANSLATION SETTINGS] Error inserting ${setting.setting_key}:`, insertError);
            errorCount++;
          } else {
            console.log(`✅ [TRANSLATION SETTINGS] Inserted ${setting.setting_key}: ${JSON.stringify(setting.setting_value)}`);
            successCount++;
          }
        }
        
      } catch (error) {
        console.error(`❌ [TRANSLATION SETTINGS] Unexpected error for ${setting.setting_key}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 [TRANSLATION SETTINGS] Summary:');
    console.log(`   ✅ Successful operations: ${successCount}`);
    console.log(`   ❌ Failed operations: ${errorCount}`);
    console.log(`   📋 Total settings: ${defaultSettings.length}`);
    
    if (errorCount === 0) {
      console.log('🎉 [TRANSLATION SETTINGS] All default values inserted successfully!');
      return true;
    } else {
      console.log('⚠️ [TRANSLATION SETTINGS] Some operations failed, check logs above');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [TRANSLATION SETTINGS] Fatal error during insertion:', error);
    return false;
  }
}

// Run the script
insertDefaultSettings()
  .then(success => {
    if (success) {
      console.log('\n🚀 [TRANSLATION SETTINGS] Script completed successfully!');
      console.log('🔄 [TRANSLATION SETTINGS] You can now refresh your frontend to see the changes');
    } else {
      console.log('\n💥 [TRANSLATION SETTINGS] Script completed with errors');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 [TRANSLATION SETTINGS] Script failed:', error);
    process.exit(1);
  }); 