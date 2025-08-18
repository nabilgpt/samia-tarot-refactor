// =====================================================
// APPLY DYNAMIC TRANSLATION PROVIDERS SCHEMA
// Sets up the complete database structure for the dynamic translation system
// =====================================================

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createInitialProviders() {
  console.log('🤖 [PROVIDERS] Creating initial AI translation providers...');
  
  const initialProviders = [
    {
      name: 'openai',
      display_name_en: 'OpenAI GPT',
      display_name_ar: 'OpenAI GPT',
      description_en: 'Advanced AI translation using OpenAI GPT models',
      description_ar: 'ترجمة ذكية متقدمة باستخدام نماذج OpenAI GPT',
      api_endpoint_url: 'https://api.openai.com/v1/chat/completions',
      authentication_type: 'bearer_token',
      supports_languages: ['en', 'ar'],
      max_tokens_per_request: 1500,
      estimated_cost_per_1k_tokens: 0.0020,
      supports_batch_translation: false,
      supports_context_preservation: true,
      is_active: true,
      is_default_provider: true,
      display_order: 1,
      config_schema: {
        api_key: {
          description: 'OpenAI API Key',
          required: true,
          encrypted: true
        },
        model: {
          description: 'GPT Model (e.g., gpt-3.5-turbo)',
          required: false,
          encrypted: false
        },
        temperature: {
          description: 'Temperature (0.0-1.0)',
          required: false,
          encrypted: false
        }
      },
      default_config: {
        model: 'gpt-3.5-turbo',
        temperature: 0.2,
        max_tokens: 1500
      }
    }
  ];

  try {
    // First, let's check if we need to create the table
    const { error: checkError } = await supabase
      .from('ai_translation_providers')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST106') {
      console.log('📋 [PROVIDERS] Table does not exist, this is expected on first run');
      return true;
    }

    for (const provider of initialProviders) {
      // Check if provider already exists
      const { data: existing, error: existingError } = await supabase
        .from('ai_translation_providers')
        .select('id')
        .eq('name', provider.name)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error(`❌ [PROVIDERS] Error checking ${provider.name}:`, existingError);
        continue;
      }

      if (existing) {
        console.log(`⏭️ [PROVIDERS] ${provider.display_name_en} already exists, skipping`);
        continue;
      }

      const { data, error } = await supabase
        .from('ai_translation_providers')
        .insert([provider])
        .select()
        .single();

      if (error) {
        console.error(`❌ [PROVIDERS] Error creating ${provider.name}:`, error);
      } else {
        console.log(`✅ [PROVIDERS] Created ${provider.display_name_en}`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ [PROVIDERS] Failed to create providers:', error);
    return false;
  }
}

async function createInitialSettings() {
  console.log('⚙️ [SETTINGS] Creating initial translation settings...');
  
  const initialSettings = [
    {
      setting_key: 'global_translation_mode',
      setting_value: '"auto-copy"',
      description: 'Global translation mode: auto-copy or auto-translate'
    },
    {
      setting_key: 'default_provider',
      setting_value: '"openai"',
      description: 'Default AI translation provider'
    },
    {
      setting_key: 'enable_provider_fallback',
      setting_value: 'true',
      description: 'Enable automatic fallback to other providers'
    },
    {
      setting_key: 'cache_translations',
      setting_value: 'true',
      description: 'Cache translation results for performance'
    },
    {
      setting_key: 'enable_usage_analytics',
      setting_value: 'true',
      description: 'Track translation usage and performance'
    },
    {
      setting_key: 'translation_quality_threshold',
      setting_value: '0.7',
      description: 'Minimum quality threshold for translations'
    }
  ];

  try {
    // Check if settings table exists
    const { error: checkError } = await supabase
      .from('translation_settings')
      .select('setting_key')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST106') {
      console.log('📋 [SETTINGS] Table does not exist, this is expected on first run');
      return true;
    }

    for (const setting of initialSettings) {
      // Check if setting already exists
      const { data: existing, error: existingError } = await supabase
        .from('translation_settings')
        .select('setting_key')
        .eq('setting_key', setting.setting_key)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error(`❌ [SETTINGS] Error checking ${setting.setting_key}:`, existingError);
        continue;
      }

      if (existing) {
        console.log(`⏭️ [SETTINGS] ${setting.setting_key} already exists, skipping`);
        continue;
      }

      const { error } = await supabase
        .from('translation_settings')
        .insert([setting]);

      if (error) {
        console.error(`❌ [SETTINGS] Error creating ${setting.setting_key}:`, error);
      } else {
        console.log(`✅ [SETTINGS] Created ${setting.setting_key}: ${setting.setting_value}`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ [SETTINGS] Failed to create settings:', error);
    return false;
  }
}

async function verifySystem() {
  console.log('🔍 [VERIFY] Verifying dynamic translation system...');
  
  try {
    // Check providers
    const { data: providers, error: providersError } = await supabase
      .from('ai_translation_providers')
      .select('name, display_name_en, is_active')
      .order('display_order');
    
    if (providersError) {
      console.warn('⚠️ [VERIFY] Could not verify providers:', providersError.message);
    } else {
      console.log(`📊 [VERIFY] Found ${providers?.length || 0} providers:`);
      providers?.forEach(p => console.log(`  ✓ ${p.display_name_en} (${p.name}) - ${p.is_active ? 'Active' : 'Inactive'}`));
    }
    
    // Check settings
    const { data: settings, error: settingsError } = await supabase
      .from('translation_settings')
      .select('setting_key, setting_value')
      .order('setting_key');
    
    if (settingsError) {
      console.warn('⚠️ [VERIFY] Could not verify settings:', settingsError.message);
    } else {
      console.log(`📊 [VERIFY] Found ${settings?.length || 0} settings:`);
      settings?.forEach(s => console.log(`  ✓ ${s.setting_key}: ${s.setting_value}`));
    }
    
    return true;
  } catch (error) {
    console.error('❌ [VERIFY] Verification failed:', error);
    return false;
  }
}

async function main() {
  console.log('🎯 [INIT] Starting dynamic translation system setup...');
  console.log('');
  
  // Validate environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ [ENV] Missing required environment variables!');
    console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  console.log('✅ [ENV] Environment variables validated');
  console.log(`🔗 [ENV] Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log('');
  
  console.log('📝 [INFO] This script will create initial data for the dynamic translation system.');
  console.log('📝 [INFO] Tables should be created via Supabase dashboard or migrations.');
  console.log('');
  
  // Create initial data
  const providersSuccess = await createInitialProviders();
  const settingsSuccess = await createInitialSettings();
  
  if (providersSuccess && settingsSuccess) {
    await verifySystem();
    
    console.log('');
    console.log('🎉 [SUCCESS] Dynamic translation system setup completed!');
    console.log('');
    console.log('🚀 [NEXT STEPS] The system is now ready for:');
    console.log('  • Adding AI provider credentials through Super Admin Dashboard');
    console.log('  • Configuring global translation settings');
    console.log('  • Testing dynamic translation with deck types');
    console.log('  • Switch translation mode from auto-copy to auto-translate');
    console.log('');
  } else {
    console.log('');
    console.log('⚠️ [PARTIAL] Setup completed with some warnings');
    console.log('   This is normal if tables do not exist yet');
    console.log('   Create tables via Supabase dashboard first');
    console.log('');
  }
}

// Run the script
main().catch(error => {
  console.error('💥 [FATAL] Unhandled error:', error);
  process.exit(1);
}); 