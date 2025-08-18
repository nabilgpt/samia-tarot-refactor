// =====================================================
// SAMIA TAROT - UNIFIED DYNAMIC TRANSLATION SERVICE
// The single source of truth for all translation operations
// Enhanced with robust provider fallback and retry logic
// =====================================================

import { supabaseAdmin } from '../lib/supabase.js';
import { makeOpenAICall } from './openai.js';

class UnifiedTranslationService {
  constructor() {
    this.cache = new Map();
    this.providersCache = null;
    this.settingsCache = null;
    this.lastCacheUpdate = 0;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.maxRetries = 5; // Maximum retries per provider
    
    console.log('🔄 [UNIFIED TRANSLATION] Service initialized with enhanced fallback system');
  }

  // =====================================================
  // PROVIDER MANAGEMENT (ENHANCED)
  // =====================================================

  async getAvailableProviders() {
    const now = Date.now();
    if (this.providersCache && (now - this.lastCacheUpdate) < this.cacheExpiry) {
      return this.providersCache;
    }

    try {
      console.log('🔄 [UNIFIED TRANSLATION] Loading providers from database...');
      
      // Get active providers from both tables, ordered by priority/preference
      const [translationProviders, aiProviders] = await Promise.all([
        supabaseAdmin
          .from('ai_translation_providers')
          .select('id, name, display_name_en, is_active, display_order, supports_languages')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        
        supabaseAdmin
          .from('ai_providers')
          .select('id, name, provider_type, is_active, supports_text_generation')
          .eq('is_active', true)
          .eq('supports_text_generation', true)
          .order('name')
      ]);

      // Combine and format providers
      const allProviders = [];
      
      // Add translation-specific providers first (they have priority)
      if (translationProviders.data) {
        translationProviders.data.forEach(provider => {
          allProviders.push({
            id: provider.id,
            name: provider.name,
            displayName: provider.display_name_en,
            type: 'translation',
            priority: provider.display_order || 999,
            supportsLanguages: provider.supports_languages || ['en', 'ar']
          });
        });
      }

      // Add AI providers as backup options
      if (aiProviders.data) {
        aiProviders.data.forEach(provider => {
          // Avoid duplicates
          if (!allProviders.find(p => p.name === provider.name)) {
            allProviders.push({
              id: provider.id,
              name: provider.name,
              displayName: provider.name,
              type: 'ai',
              priority: 1000, // Lower priority than translation providers
              supportsLanguages: ['en', 'ar']
            });
          }
        });
      }

      // Sort by priority (lower number = higher priority)
      allProviders.sort((a, b) => a.priority - b.priority);

      this.providersCache = allProviders;
      this.lastCacheUpdate = now;
      
      console.log(`✅ [UNIFIED TRANSLATION] Loaded ${allProviders.length} providers:`, 
        allProviders.map(p => `${p.name} (priority: ${p.priority})`));
      
      return allProviders;
      
    } catch (error) {
      console.error('❌ [UNIFIED TRANSLATION] Failed to load providers:', error);
      // Return fallback providers
      return [
        {
          id: 'fallback-openai',
          name: 'openai',
          displayName: 'OpenAI GPT',
          type: 'ai',
          priority: 1,
          supportsLanguages: ['en', 'ar']
        }
      ];
    }
  }

  async getTranslationSettings() {
    const now = Date.now();
    if (this.settingsCache && (now - this.lastCacheUpdate) < this.cacheExpiry) {
      return this.settingsCache;
    }

    try {
      console.log('🔄 [UNIFIED TRANSLATION] Loading translation settings from dashboard...');
      
      // Get translation settings from system_configurations
      const { data: settings, error } = await supabaseAdmin
        .from('system_configurations')
        .select('config_key, config_value_plain')
        .eq('config_category', 'ai_services')
        .in('config_key', ['TRANSLATION_ENABLED', 'DEFAULT_TRANSLATION_PROVIDER', 'FALLBACK_TO_COPY']);

      if (error) {
        console.warn('⚠️ [UNIFIED TRANSLATION] Error loading settings, using defaults:', error);
      }

      // Convert to map
      const settingsMap = {};
      settings?.forEach(setting => {
        settingsMap[setting.config_key] = setting.config_value_plain;
      });

      // Apply defaults
      this.settingsCache = {
        translationEnabled: settingsMap.TRANSLATION_ENABLED !== 'false',
        defaultProvider: settingsMap.DEFAULT_TRANSLATION_PROVIDER || 'openai',
        fallbackToCopy: settingsMap.FALLBACK_TO_COPY !== 'false',
        ...settingsMap
      };
      
      this.lastCacheUpdate = now;
      console.log(`✅ [UNIFIED TRANSLATION] Settings loaded:`, this.settingsCache);
      return this.settingsCache;
      
    } catch (error) {
      console.error('❌ [UNIFIED TRANSLATION] Settings load error:', error);
      // Return safe defaults
      this.settingsCache = {
        translationEnabled: true,
        defaultProvider: 'openai',
        fallbackToCopy: true
      };
      return this.settingsCache;
    }
  }

  // =====================================================
  // ENHANCED TRANSLATION WITH PROVIDER FALLBACK
  // =====================================================

  async translateText(text, targetLanguage, sourceLanguage = null, context = {}) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.warn('⚠️ [UNIFIED TRANSLATION] Empty text provided');
      return null;
    }

    const originalText = text.toLowerCase().trim();
    const settings = await this.getTranslationSettings();
    
    // If translation disabled, return null for fallback
    if (!settings.translationEnabled) {
      console.log('🔄 [UNIFIED TRANSLATION] Translation disabled, using fallback');
      return null;
    }

    // Check cache first
    const cacheKey = `${text}_${sourceLanguage || 'auto'}_${targetLanguage}`;
    if (this.cache.has(cacheKey)) {
      console.log('💾 [UNIFIED TRANSLATION] Cache hit');
      return this.cache.get(cacheKey);
    }

    // Get available providers
    const providers = await this.getAvailableProviders();
    
    // Order providers with default first
    const orderedProviders = this.orderProviders(providers, settings.defaultProvider);
    
    console.log(`🔄 [UNIFIED TRANSLATION] Starting translation with ${orderedProviders.length} providers`);
    console.log(`🔄 [UNIFIED TRANSLATION] Text: "${text.slice(0, 50)}..." (${sourceLanguage || 'auto'} → ${targetLanguage})`);

    // Try each provider with retries
    for (let i = 0; i < orderedProviders.length; i++) {
      const provider = orderedProviders[i];
      
      // Skip if provider doesn't support target language
      if (!provider.supportsLanguages.includes(targetLanguage)) {
        console.log(`⚠️ [UNIFIED TRANSLATION] Provider ${provider.name} doesn't support ${targetLanguage}, skipping`);
        continue;
      }

      console.log(`🔄 [UNIFIED TRANSLATION] Trying provider ${i + 1}/${orderedProviders.length}: ${provider.name}`);
      
      const result = await this.translateWithProviderRetries(
        provider,
        text,
        targetLanguage,
        sourceLanguage,
        context,
        originalText
      );

      if (result) {
        // Cache successful translation
        this.cache.set(cacheKey, result);
        
        // Limit cache size
        if (this.cache.size > 500) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        
        console.log(`✅ [UNIFIED TRANSLATION] Translation successful with ${provider.name}: "${result.slice(0, 50)}..."`);
        return result;
      }
    }

    // All providers failed
    console.error('❌ [UNIFIED TRANSLATION] All providers failed for translation');
    
    // If fallback enabled, return null for auto-copy mode
    if (settings.fallbackToCopy) {
      console.log('📋 [UNIFIED TRANSLATION] Using fallback (auto-copy)');
      return null; // This will trigger auto-copy in processBilingualData
    }
    
    // Return original text as last resort
    console.log('📋 [UNIFIED TRANSLATION] Returning original text as last resort');
    return text;
  }

  // =====================================================
  // PROVIDER RETRY LOGIC
  // =====================================================

  async translateWithProviderRetries(provider, text, targetLanguage, sourceLanguage, context, originalText) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 [UNIFIED TRANSLATION] ${provider.name} attempt ${attempt}/${this.maxRetries}`);
        
        const result = await this.translateWithProvider(
          provider,
          text,
          targetLanguage,
          sourceLanguage,
          context,
          attempt
        );

        // Validate translation result
        if (this.isValidTranslation(originalText, result)) {
          console.log(`✅ [UNIFIED TRANSLATION] ${provider.name} success on attempt ${attempt}: "${result.slice(0, 50)}..."`);
          return result;
        } else {
          console.log(`⚠️ [UNIFIED TRANSLATION] ${provider.name} attempt ${attempt} returned same text: "${result}"`);
          lastError = new Error(`Translation returned same text as input: "${result}"`);
        }

      } catch (error) {
        console.error(`❌ [UNIFIED TRANSLATION] ${provider.name} attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // Add delay between retries (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ [UNIFIED TRANSLATION] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ [UNIFIED TRANSLATION] ${provider.name} failed after ${this.maxRetries} attempts. Last error:`, lastError?.message);
    return null;
  }

  // =====================================================
  // PROVIDER-SPECIFIC TRANSLATION METHODS
  // =====================================================

  async translateWithProvider(provider, text, targetLanguage, sourceLanguage, context, attempt) {
    switch (provider.name) {
      case 'openai':
        return await this.translateWithOpenAI(text, targetLanguage, sourceLanguage, context, attempt);
      case 'google':
        return await this.translateWithGoogle(text, targetLanguage, sourceLanguage, context, attempt);
      case 'claude':
        return await this.translateWithClaude(text, targetLanguage, sourceLanguage, context, attempt);
      default:
        throw new Error(`Unknown translation provider: ${provider.name}`);
    }
  }

  async translateWithOpenAI(text, targetLanguage, sourceLanguage, context, attempt) {
    try {
      const targetLangName = targetLanguage === 'ar' ? 'Arabic (Syrian dialect)' : 'English';
      const sourceLangName = sourceLanguage === 'ar' ? 'Arabic' : sourceLanguage === 'en' ? 'English' : 'auto-detected language';

      // Different prompts for different attempts to increase variety
      const prompts = [
        `Translate this text from ${sourceLangName} to ${targetLangName}. Return ONLY the translation, no explanations: "${text}"`,
        `Convert this phrase to ${targetLangName}, maintaining meaning: "${text}"`,
        `Provide the ${targetLangName} equivalent for: "${text}"`,
        `How would you say "${text}" in ${targetLangName}? Give only the translation.`,
        `Translate to ${targetLangName} (ensure result is different from input): "${text}"`
      ];

      // Enhanced system prompt with context awareness
      let systemPrompt = `You are a professional translator specializing in ${targetLangName}. 
Translate the following text from ${sourceLangName} to ${targetLangName} accurately and naturally.`;

      if (targetLanguage === 'ar') {
        systemPrompt += ' Use Syrian dialect when appropriate.';
      } else {
        systemPrompt += ' Use clear, natural English.';
      }

      // Add context-specific instructions
      if (context.entityType) {
        switch (context.entityType) {
          case 'deck_types':
            systemPrompt += ' This is a tarot deck type name. Keep it concise and descriptive.';
            break;
          case 'spreads':
            systemPrompt += ' This is a tarot spread name or description. Maintain mystical and spiritual tone.';
            break;
          case 'services':
            systemPrompt += ' This is a spiritual service description. Use professional and inviting language.';
            break;
        }
      }

      systemPrompt += ' Return ONLY the translation, no explanations or additional text.';

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompts[attempt - 1] || prompts[0] }
      ];

      const response = await makeOpenAICall(messages, {
        model: attempt <= 2 ? 'gpt-3.5-turbo' : 'gpt-4', // Use better model for later attempts
        max_tokens: Math.min(1500, text.length * 2),
        temperature: 0.2 + (attempt * 0.1), // Increase creativity for retries
        top_p: 0.9
      });

      if (response.choices && response.choices[0] && response.choices[0].message) {
        return response.choices[0].message.content.trim();
      }

      throw new Error('Invalid response format from OpenAI');

    } catch (error) {
      console.error('❌ [UNIFIED TRANSLATION] OpenAI error:', error);
      throw error;
    }
  }

  async translateWithGoogle(text, targetLanguage, sourceLanguage, context, attempt) {
    try {
      console.log(`🌐 [UNIFIED TRANSLATION] Google Translate attempt ${attempt} for: "${text}"`);
      
      // Get Google Translate API key from system configurations
      const { data: apiKeyConfig, error: keyError } = await supabaseAdmin
        .from('system_configurations')
        .select('config_value_plain, config_value_encrypted, is_encrypted')
        .eq('config_key', 'GOOGLE_TRANSLATE_API_KEY')
        .eq('config_category', 'ai_services')
        .single();

      if (keyError || !apiKeyConfig) {
        console.log('⚠️ [UNIFIED TRANSLATION] Google Translate API key not found in dashboard');
        throw new Error('Google Translate API key not configured in dashboard');
      }

      const apiKey = apiKeyConfig.is_encrypted 
        ? apiKeyConfig.config_value_encrypted 
        : apiKeyConfig.config_value_plain;

      if (!apiKey || apiKey.trim() === '' || apiKey === 'CONFIGURE_VIA_DASHBOARD') {
        console.log('⚠️ [UNIFIED TRANSLATION] Google Translate API key not configured');
        throw new Error('Google Translate API key not configured');
      }

      // Construct Google Translate API request
      const googleApiUrl = 'https://translation.googleapis.com/language/translate/v2';
      const requestBody = {
        q: text,
        target: targetLanguage,
        source: sourceLanguage || 'auto',
        format: 'text',
        key: apiKey
      };

      console.log(`🌐 [UNIFIED TRANSLATION] Calling Google Translate API (attempt ${attempt})...`);
      
      const response = await fetch(googleApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`❌ [UNIFIED TRANSLATION] Google Translate API error (${response.status}):`, errorData);
        throw new Error(`Google Translate API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (data.data && data.data.translations && data.data.translations.length > 0) {
        const translatedText = data.data.translations[0].translatedText;
        console.log(`✅ [UNIFIED TRANSLATION] Google Translate success: "${translatedText}"`);
        return translatedText;
      } else {
        console.error('❌ [UNIFIED TRANSLATION] Google Translate returned invalid response format:', data);
        throw new Error('Google Translate returned invalid response format');
      }

    } catch (error) {
      console.error(`❌ [UNIFIED TRANSLATION] Google Translate error (attempt ${attempt}):`, error.message);
      throw error;
    }
  }

  async translateWithClaude(text, targetLanguage, sourceLanguage, context, attempt) {
    // TODO: Implement Claude API
    console.log('⚠️ [UNIFIED TRANSLATION] Claude not yet implemented');
    throw new Error('Claude provider not yet implemented');
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  orderProviders(providers, defaultProvider) {
    // Move default provider to front, maintain order for others
    const defaultIndex = providers.findIndex(p => p.name === defaultProvider);
    if (defaultIndex > 0) {
      const defaultProv = providers[defaultIndex];
      return [defaultProv, ...providers.slice(0, defaultIndex), ...providers.slice(defaultIndex + 1)];
    }
    return providers;
  }

  isValidTranslation(originalText, translatedText) {
    if (!translatedText || translatedText.trim() === '') return false;
    
    // Check if translation is different from original (case-insensitive)
    const original = originalText.toLowerCase().trim();
    const translated = translatedText.toLowerCase().trim();
    
    return original !== translated;
  }

  // =====================================================
  // BILINGUAL DATA PROCESSING (ENHANCED)
  // =====================================================

  async processBilingualData(data, options = {}) {
    const {
      fields = ['name', 'description'],
      entityType = 'unknown',
      entityId = null,
      forceTranslation = false
    } = options;

    console.log(`🔄 [UNIFIED TRANSLATION] Processing bilingual data for ${entityType}:`, fields);

    const processed = { ...data };
    const translationPromises = [];

    for (const field of fields) {
      const arField = `${field}_ar`;
      const enField = `${field}_en`;

      const arValue = processed[arField]?.trim();
      const enValue = processed[enField]?.trim();

      // Skip if both fields are already populated and not forcing
      if (arValue && enValue && !forceTranslation) {
        console.log(`✅ [UNIFIED TRANSLATION] ${field}: Both languages already provided`);
        continue;
      }

      // If neither field has a value, skip
      if (!arValue && !enValue) {
        console.log(`⚠️ [UNIFIED TRANSLATION] ${field}: No value provided in either language`);
        continue;
      }

      const context = { entityType, entityId, field };

      // If Arabic is provided but English is missing
      if (arValue && !enValue) {
        console.log(`🔄 [UNIFIED TRANSLATION] ${field}: Translating AR → EN`);
        translationPromises.push(
          this.translateText(arValue, 'en', 'ar', context)
            .then(result => {
              processed[enField] = result || arValue; // Fallback to original
              console.log(`✅ [UNIFIED TRANSLATION] ${field} AR → EN: "${result || 'fallback'}"`);
            })
            .catch(error => {
              console.error(`❌ [UNIFIED TRANSLATION] ${field} AR → EN failed:`, error);
              processed[enField] = arValue; // Auto-copy fallback
            })
        );
      }

      // If English is provided but Arabic is missing
      if (enValue && !arValue) {
        console.log(`🔄 [UNIFIED TRANSLATION] ${field}: Translating EN → AR`);
        translationPromises.push(
          this.translateText(enValue, 'ar', 'en', context)
            .then(result => {
              processed[arField] = result || enValue; // Fallback to original
              console.log(`✅ [UNIFIED TRANSLATION] ${field} EN → AR: "${result || 'fallback'}"`);
            })
            .catch(error => {
              console.error(`❌ [UNIFIED TRANSLATION] ${field} EN → AR failed:`, error);
              processed[arField] = enValue; // Auto-copy fallback
            })
        );
      }
    }

    // Wait for all translations to complete
    if (translationPromises.length > 0) {
      console.log(`🔄 [UNIFIED TRANSLATION] Waiting for ${translationPromises.length} translation(s) to complete...`);
      await Promise.all(translationPromises);
    }

    console.log(`✅ [UNIFIED TRANSLATION] Bilingual processing complete for ${entityType}`);
    return processed;
  }

  // =====================================================
  // CACHE AND STATUS MANAGEMENT
  // =====================================================

  clearCache() {
    this.cache.clear();
    this.providersCache = null;
    this.settingsCache = null;
    this.lastCacheUpdate = 0;
    console.log('🗑️ [UNIFIED TRANSLATION] Cache cleared');
  }

  async getSystemStatus() {
    const providers = await this.getAvailableProviders();
    const settings = await this.getTranslationSettings();

    return {
      enabled: settings.translationEnabled,
      defaultProvider: settings.defaultProvider,
      availableProviders: providers.length,
      cacheSize: this.cache.size,
      providers: providers.map(p => ({
        name: p.name,
        displayName: p.displayName,
        priority: p.priority,
        type: p.type
      }))
    };
  }
}

// Export singleton instance
export const unifiedTranslationService = new UnifiedTranslationService(); 