// =================================================
// SAMIA TAROT BILINGUAL TRANSLATION SERVICE
// Server-side translation handling for the ultimate bilingual system
// =================================================

import { supabaseAdmin } from '../lib/supabase.js';

class BilingualTranslationService {
  constructor() {
    this.config = null;
    this.lastConfigLoad = 0;
    this.configCacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load translation service configuration from database
   */
  async loadConfig() {
    const now = Date.now();
    
    // Use cached config if still valid
    if (this.config && (now - this.lastConfigLoad) < this.configCacheDuration) {
      return this.config;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('system_configurations')
        .select('config_value_encrypted, config_value_plain, is_encrypted')
        .eq('config_key', 'translation_service_config')
        .single();

      if (error || !data) {
        console.warn('⚠️ Translation service config not found, using defaults');
        this.config = {
          provider: 'openai',
          enabled: true,
          fallback_mode: 'auto_fill',
          api_key: null
        };
        return this.config;
      }

      // Decrypt config if needed
      let configString;
      if (data.is_encrypted && data.config_value_encrypted) {
        const { data: decryptedConfig } = await supabaseAdmin
          .rpc('decrypt_config_value', { encrypted_value: data.config_value_encrypted });
        configString = decryptedConfig;
      } else {
        configString = data.config_value_plain;
      }

      this.config = JSON.parse(configString);
      this.lastConfigLoad = now;

      // Load API key separately for security
      if (this.config.provider === 'openai') {
        await this.loadOpenAIKey();
      }

      return this.config;
    } catch (error) {
      console.error('❌ Error loading translation config:', error);
      this.config = {
        provider: 'openai',
        enabled: false,
        fallback_mode: 'auto_fill',
        api_key: null
      };
      return this.config;
    }
  }

  /**
   * Load OpenAI API key from system configurations
   */
  async loadOpenAIKey() {
    try {
      const { data } = await supabaseAdmin
        .from('system_configurations')
        .select('config_value_encrypted, config_value_plain, is_encrypted')
        .eq('config_key', 'openai_api_key')
        .single();

      if (data) {
        if (data.is_encrypted && data.config_value_encrypted) {
          const { data: decryptedKey } = await supabaseAdmin
            .rpc('decrypt_config_value', { encrypted_value: data.config_value_encrypted });
          this.config.api_key = decryptedKey;
        } else {
          this.config.api_key = data.config_value_plain;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load OpenAI API key for translation');
    }
  }

  /**
   * Translate text using the configured provider
   */
  async translateText(text, targetLanguage, sourceLanguage = null) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return null;
    }

    const config = await this.loadConfig();
    
    if (!config.enabled) {
      console.warn('⚠️ Translation service disabled, using fallback');
      return null;
    }

    try {
      switch (config.provider) {
        case 'openai':
          return await this.translateWithOpenAI(text, targetLanguage, sourceLanguage);
        case 'google':
          return await this.translateWithGoogle(text, targetLanguage, sourceLanguage);
        default:
          console.warn(`⚠️ Unknown translation provider: ${config.provider}`);
          return null;
      }
    } catch (error) {
      console.error('❌ Translation error:', error);
      return null;
    }
  }

  /**
   * Translate using OpenAI
   */
  async translateWithOpenAI(text, targetLanguage, sourceLanguage) {
    const config = await this.loadConfig();
    
    if (!config.api_key) {
      console.warn('⚠️ OpenAI API key not configured');
      return null;
    }

    const targetLangName = targetLanguage === 'ar' ? 'Arabic (Syrian dialect)' : 'English';
    const sourceLangName = sourceLanguage === 'ar' ? 'Arabic' : sourceLanguage === 'en' ? 'English' : 'auto-detected language';

    const systemPrompt = `You are a professional translator specializing in ${targetLangName}. 
Translate the following text from ${sourceLangName} to ${targetLangName} accurately and naturally. 
${targetLanguage === 'ar' ? 'Use Syrian dialect when appropriate.' : 'Use clear, natural English.'}
Return ONLY the translation, no explanations or additional text.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: Math.min(1500, text.length * 2),
          temperature: 0.2,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      }

      throw new Error('Invalid response format from OpenAI');
    } catch (error) {
      console.error('❌ OpenAI translation error:', error);
      return null;
    }
  }

  /**
   * Translate using Google Translate (future implementation)
   */
  async translateWithGoogle(text, targetLanguage, sourceLanguage) {
    console.warn('⚠️ Google Translate not yet implemented');
    return null;
  }

  /**
   * Process bilingual data object with auto-translation
   */
  async processBilingualData(data, options = {}) {
    const {
      forceTranslation = false,
      sourceLanguage = null,
      fields = ['name', 'description', 'question']
    } = options;

    const processed = { ...data };
    const translationPromises = [];

    // Process each bilingual field
    for (const field of fields) {
      const arField = `${field}_ar`;
      const enField = `${field}_en`;

      // Handle Arabic to English translation
      if (processed[arField] && (!processed[enField] || forceTranslation)) {
        translationPromises.push(
          this.translateText(processed[arField], 'en', 'ar')
            .then(translated => {
              if (translated) {
                processed[enField] = translated;
              } else if (!processed[enField]) {
                processed[enField] = processed[arField]; // Fallback to copy
              }
            })
        );
      }

      // Handle English to Arabic translation
      if (processed[enField] && (!processed[arField] || forceTranslation)) {
        translationPromises.push(
          this.translateText(processed[enField], 'ar', 'en')
            .then(translated => {
              if (translated) {
                processed[arField] = translated;
              } else if (!processed[arField]) {
                processed[arField] = processed[enField]; // Fallback to copy
              }
            })
        );
      }
    }

    // Wait for all translations to complete
    await Promise.all(translationPromises);

    // Ensure no field is empty
    for (const field of fields) {
      const arField = `${field}_ar`;
      const enField = `${field}_en`;

      if (!processed[arField] && processed[enField]) {
        processed[arField] = processed[enField];
      }
      if (!processed[enField] && processed[arField]) {
        processed[enField] = processed[arField];
      }
    }

    return processed;
  }

  /**
   * Get localized data based on user's language preference
   */
  getLocalizedData(data, language = 'en', fallbackLanguage = 'en') {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const localized = { ...data };
    const fields = ['name', 'description', 'question', 'position_name', 'position_description', 'meaning_upright', 'meaning_reversed'];

    for (const field of fields) {
      const primaryField = `${field}_${language}`;
      const fallbackField = `${field}_${fallbackLanguage}`;

      if (data[primaryField]) {
        localized[field] = data[primaryField];
      } else if (data[fallbackField]) {
        localized[field] = data[fallbackField];
      }
    }

    return localized;
  }

  /**
   * Get translation service status and statistics
   */
  async getServiceStatus() {
    const config = await this.loadConfig();
    
    return {
      enabled: config.enabled,
      provider: config.provider,
      fallback_mode: config.fallback_mode,
      api_key_configured: !!config.api_key,
      last_config_load: new Date(this.lastConfigLoad).toISOString(),
      cache_expires_at: new Date(this.lastConfigLoad + this.configCacheDuration).toISOString()
    };
  }

  /**
   * Update translation service configuration
   */
  async updateConfig(newConfig) {
    try {
      const configToStore = {
        provider: newConfig.provider || 'openai',
        enabled: newConfig.enabled !== false,
        fallback_mode: newConfig.fallback_mode || 'auto_fill'
      };

      const { error } = await supabaseAdmin
        .from('system_configurations')
        .upsert({
          config_key: 'translation_service_config',
          config_description: 'Bilingual translation service configuration',
          config_value_plain: JSON.stringify(configToStore),
          is_encrypted: false,
          category: 'AI Services'
        }, {
          onConflict: 'config_key'
        });

      if (error) {
        throw error;
      }

      // Clear cache to force reload
      this.config = null;
      this.lastConfigLoad = 0;

      return { success: true, config: configToStore };
    } catch (error) {
      console.error('❌ Error updating translation config:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test translation service
   */
  async testTranslation() {
    const testTexts = {
      en: 'Welcome to Samia Tarot',
      ar: 'مرحباً بكم في سامية تاروت'
    };

    const results = {
      english_to_arabic: null,
      arabic_to_english: null,
      service_status: await this.getServiceStatus()
    };

    try {
      results.english_to_arabic = await this.translateText(testTexts.en, 'ar');
      results.arabic_to_english = await this.translateText(testTexts.ar, 'en');
    } catch (error) {
      results.error = error.message;
    }

    return results;
  }
}

// Create singleton instance
const bilingualTranslationService = new BilingualTranslationService();

export {
  bilingualTranslationService,
  BilingualTranslationService
}; 