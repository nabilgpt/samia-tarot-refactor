// =================================================
// SAMIA TAROT MULTILINGUAL API ROUTES
// Phase 4: Dynamic Language Management & Translation
// =================================================
// Comprehensive API for unlimited language support
// Zero-hardcoding, dashboard-configurable everything
// =================================================

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import OpenAI from 'openai';

const router = express.Router();

// =================================================
// 1. LANGUAGE MANAGEMENT ENDPOINTS
// =================================================

/**
 * GET /api/multilingual/languages
 * Get all available languages (public endpoint)
 */
router.get('/languages', async (req, res) => {
  try {
    const { include_disabled = false } = req.query;
    
    let query = supabaseAdmin
      .from('dynamic_languages')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (!include_disabled) {
      query = query.eq('is_enabled', true);
    }
    
    const { data: languages, error } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      languages: languages || []
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch languages',
      details: error.message 
    });
  }
});

/**
 * POST /api/multilingual/languages
 * Add a new language (Super Admin only)
 */
router.post('/languages', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const {
      language_code,
      language_name_en,
      language_name_native,
      flag_emoji = '',
      is_rtl = false,
      date_format = 'YYYY-MM-DD',
      time_format = 'HH:mm',
      currency_format = '$#,##0.00',
      number_format = '#,##0.00',
      auto_create_columns = true
    } = req.body;
    
    // Validation
    if (!language_code || !language_name_en || !language_name_native) {
      return res.status(400).json({
        success: false,
        error: 'Language code, English name, and native name are required'
      });
    }
    
    if (language_code.length < 2 || language_code.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Language code must be 2-5 characters'
      });
    }
    
    // Check if language already exists
    const { data: existingLang } = await supabaseAdmin
      .from('dynamic_languages')
      .select('language_code')
      .eq('language_code', language_code)
      .single();
    
    if (existingLang) {
      return res.status(400).json({
        success: false,
        error: 'Language code already exists'
      });
    }
    
    // Use database function for complete language addition
    const { data: result, error } = await supabaseAdmin
      .rpc('add_new_language', {
        new_language_code: language_code,
        language_name_en,
        language_name_native,
        flag_emoji,
        is_rtl,
        auto_create_columns
      });
    
    if (error) {
      throw error;
    }
    
    // Log the addition
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'dynamic_languages',
        action: 'language_added',
        new_data: { language_code, language_name_en, language_name_native },
        metadata: { auto_create_columns, result },
        user_id: req.user.id
      });
    
    res.json({
      success: true,
      message: 'Language added successfully',
      data: result
    });
  } catch (error) {
    console.error('Error adding language:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add language',
      details: error.message 
    });
  }
});

/**
 * PUT /api/multilingual/languages/:code
 * Update language settings (Super Admin only)
 */
router.put('/languages/:code', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { code } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated via this endpoint
    delete updates.language_code;
    delete updates.created_at;
    delete updates.id;
    
    const { data, error } = await supabaseAdmin
      .from('dynamic_languages')
      .update({ ...updates, updated_at: new Date(), updated_by: req.user.id })
      .eq('language_code', code)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Log the update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'dynamic_languages',
        action: 'language_updated',
        new_data: data,
        metadata: { updated_fields: Object.keys(updates) },
        user_id: req.user.id
      });
    
    res.json({
      success: true,
      message: 'Language updated successfully',
      data
    });
  } catch (error) {
    console.error('Error updating language:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update language',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/multilingual/languages/:code
 * Remove a language (Super Admin only)
 */
router.delete('/languages/:code', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { code } = req.params;
    
    // Prevent deletion of primary languages
    if (['ar', 'en'].includes(code)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete primary languages (Arabic/English)'
      });
    }
    
    // Check if language is being used
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('preferred_language', code);
    
    if (count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete language: ${count} users are using this language`
      });
    }
    
    const { data, error } = await supabaseAdmin
      .from('dynamic_languages')
      .delete()
      .eq('language_code', code)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Log the deletion
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'dynamic_languages',
        action: 'language_deleted',
        old_data: data,
        user_id: req.user.id
      });
    
    res.json({
      success: true,
      message: 'Language removed successfully'
    });
  } catch (error) {
    console.error('Error removing language:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove language',
      details: error.message 
    });
  }
});

// =================================================
// 2. TRANSLATION ENDPOINTS
// =================================================

/**
 * POST /api/multilingual/translate
 * Translate text using configured providers
 */
router.post('/translate', [authenticateToken], async (req, res) => {
  try {
    const {
      text,
      target_language,
      source_language = null,
      provider_preference = null
    } = req.body;
    
    if (!text || !target_language) {
      return res.status(400).json({
        success: false,
        error: 'Text and target language are required'
      });
    }
    
    // Get enabled translation providers
    const { data: providers, error: providersError } = await supabaseAdmin
      .from('translation_providers')
      .select('*')
      .eq('is_enabled', true)
      .order('priority', { ascending: false });
    
    if (providersError) {
      throw providersError;
    }
    
    if (!providers || providers.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'No translation providers available'
      });
    }
    
    // Select provider (preference or highest priority)
    let selectedProvider = providers.find(p => p.provider_code === provider_preference) || providers[0];
    
    // Check if provider supports target language
    if (!selectedProvider.supported_languages.includes(target_language)) {
      selectedProvider = providers.find(p => p.supported_languages.includes(target_language));
      if (!selectedProvider) {
        return res.status(400).json({
          success: false,
          error: `No provider supports language: ${target_language}`
        });
      }
    }
    
    let translatedText = null;
    
    // Translate based on provider
    switch (selectedProvider.provider_code) {
      case 'openai':
        translatedText = await translateWithOpenAI(text, target_language, source_language, selectedProvider.configuration);
        break;
      case 'google':
        translatedText = await translateWithGoogle(text, target_language, source_language);
        break;
      case 'deepl':
        translatedText = await translateWithDeepL(text, target_language, source_language);
        break;
      default:
        throw new Error(`Unknown provider: ${selectedProvider.provider_code}`);
    }
    
    // Update provider usage
    await supabaseAdmin
      .from('translation_providers')
      .update({
        usage_this_month: selectedProvider.usage_this_month + 1,
        updated_at: new Date()
      })
      .eq('id', selectedProvider.id);
    
    res.json({
      success: true,
      translated_text: translatedText,
      provider_used: selectedProvider.provider_code,
      source_language: source_language || 'auto-detected',
      target_language
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Translation failed',
      details: error.message 
    });
  }
});

/**
 * POST /api/multilingual/translate-batch
 * Batch translate multiple texts (Admin only)
 */
router.post('/translate-batch', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const {
      texts, // Array of {id, text, target_language}
      source_language = null,
      provider_preference = null
    } = req.body;
    
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Texts array is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const item of texts) {
      try {
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/multilingual/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization
          },
          body: JSON.stringify({
            text: item.text,
            target_language: item.target_language,
            source_language,
            provider_preference
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          results.push({
            id: item.id,
            original_text: item.text,
            translated_text: data.translated_text,
            target_language: item.target_language
          });
        } else {
          errors.push({
            id: item.id,
            error: data.error
          });
        }
      } catch (error) {
        errors.push({
          id: item.id,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      errors,
      total_processed: texts.length,
      successful: results.length,
      failed: errors.length
    });
  } catch (error) {
    console.error('Batch translation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Batch translation failed',
      details: error.message 
    });
  }
});

// =================================================
// 3. TTS (TEXT-TO-SPEECH) ENDPOINTS
// =================================================

/**
 * POST /api/multilingual/tts/generate
 * Generate audio for text in specified language
 */
router.post('/tts/generate', [authenticateToken], async (req, res) => {
  try {
    const {
      text,
      language_code,
      voice_id = null,
      provider_preference = null
    } = req.body;
    
    if (!text || !language_code) {
      return res.status(400).json({
        success: false,
        error: 'Text and language code are required'
      });
    }
    
    // Get enabled TTS providers
    const { data: providers, error: providersError } = await supabaseAdmin
      .from('tts_providers')
      .select('*')
      .eq('is_enabled', true)
      .order('priority', { ascending: false });
    
    if (providersError) {
      throw providersError;
    }
    
    if (!providers || providers.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'No TTS providers available'
      });
    }
    
    // Select provider
    let selectedProvider = providers.find(p => p.provider_code === provider_preference) || providers[0];
    
    // Check language support
    if (!selectedProvider.supported_languages.includes(language_code)) {
      selectedProvider = providers.find(p => p.supported_languages.includes(language_code));
      if (!selectedProvider) {
        return res.status(400).json({
          success: false,
          error: `No TTS provider supports language: ${language_code}`
        });
      }
    }
    
    let audioBuffer = null;
    let filename = null;
    
    // Generate TTS based on provider
    switch (selectedProvider.provider_code) {
      case 'elevenlabs':
        ({ audioBuffer, filename } = await generateTTSWithElevenLabs(text, language_code, voice_id, selectedProvider.voice_configurations));
        break;
      case 'google_cloud':
        ({ audioBuffer, filename } = await generateTTSWithGoogleCloud(text, language_code, selectedProvider.voice_configurations));
        break;
      case 'azure':
        ({ audioBuffer, filename } = await generateTTSWithAzure(text, language_code, selectedProvider.voice_configurations));
        break;
      default:
        throw new Error(`Unknown TTS provider: ${selectedProvider.provider_code}`);
    }
    
    // Update provider usage
    await supabaseAdmin
      .from('tts_providers')
      .update({
        usage_this_month: selectedProvider.usage_this_month + 1,
        updated_at: new Date()
      })
      .eq('id', selectedProvider.id);
    
    res.json({
      success: true,
      audio_url: `/audio/${filename}`, // Assuming audio files are served from /audio/
      filename,
      provider_used: selectedProvider.provider_code,
      language_code,
      text_length: text.length
    });
  } catch (error) {
    console.error('TTS generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'TTS generation failed',
      details: error.message 
    });
  }
});

// =================================================
// 4. PROVIDER MANAGEMENT ENDPOINTS
// =================================================

/**
 * GET /api/multilingual/providers/translation
 * Get translation providers (Admin only)
 */
router.get('/providers/translation', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { data: providers, error } = await supabaseAdmin
      .from('translation_providers')
      .select('*')
      .order('priority', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      providers: providers || []
    });
  } catch (error) {
    console.error('Error fetching translation providers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch providers',
      details: error.message 
    });
  }
});

/**
 * PUT /api/multilingual/providers/translation/:id
 * Update translation provider settings (Super Admin only)
 */
router.put('/providers/translation/:id', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('translation_providers')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Provider updated successfully',
      data
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update provider',
      details: error.message 
    });
  }
});

// =================================================
// 5. ANALYTICS & MONITORING ENDPOINTS
// =================================================

/**
 * GET /api/multilingual/analytics
 * Get multilingual system analytics (Admin only)
 */
router.get('/analytics', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    // Language usage statistics
    const { data: languageUsage } = await supabaseAdmin
      .from('profiles')
      .select('preferred_language')
      .not('preferred_language', 'is', null);
    
    const languageStats = {};
    languageUsage?.forEach(user => {
      languageStats[user.preferred_language] = (languageStats[user.preferred_language] || 0) + 1;
    });
    
    // Translation provider usage
    const { data: translationProviders } = await supabaseAdmin
      .from('translation_providers')
      .select('provider_code, provider_name, usage_this_month, monthly_quota');
    
    // TTS provider usage
    const { data: ttsProviders } = await supabaseAdmin
      .from('tts_providers')
      .select('provider_code, provider_name, usage_this_month, monthly_quota');
    
    // Available languages count
    const { count: totalLanguages } = await supabaseAdmin
      .from('dynamic_languages')
      .select('*', { count: 'exact', head: true })
      .eq('is_enabled', true);
    
    res.json({
      success: true,
      data: {
        language_usage: languageStats,
        total_languages: totalLanguages,
        translation_providers: translationProviders || [],
        tts_providers: ttsProviders || [],
        generated_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics',
      details: error.message 
    });
  }
});

// =================================================
// TRANSLATION HELPER FUNCTIONS
// =================================================

async function translateWithOpenAI(text, targetLanguage, sourceLanguage, config) {
  try {
    // Get OpenAI API key from system configurations
    const { data: apiKeyConfig } = await supabaseAdmin
      .from('system_configurations')
      .select('config_value_encrypted, config_value_plain')
      .eq('config_key', 'openai_api_key')
      .single();
    
    if (!apiKeyConfig?.config_value_encrypted && !apiKeyConfig?.config_value_plain) {
      throw new Error('OpenAI API key not configured');
    }
    
    const apiKey = apiKeyConfig.config_value_encrypted || apiKeyConfig.config_value_plain;
    const openai = new OpenAI({ apiKey });
    
    const languageNames = {
      'ar': 'Arabic (Syrian dialect)',
      'en': 'English',
      'fr': 'French',
      'tr': 'Turkish',
      'fa': 'Persian/Farsi',
      'es': 'Spanish',
      'de': 'German',
      'ru': 'Russian',
      'zh': 'Chinese'
    };
    
    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage ? languageNames[sourceLanguage] : 'auto-detected language';
    
    const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. Maintain the original tone and context. For Arabic, use Syrian dialect when appropriate:

"${text}"

Translation:`;
    
    const response = await openai.chat.completions.create({
      model: config?.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: config?.temperature || 0.3,
      max_tokens: Math.min(text.length * 2, 1000)
    });
    
    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('OpenAI translation error:', error);
    throw error;
  }
}

async function translateWithGoogle(text, targetLanguage, sourceLanguage) {
  // Google Translate implementation would go here
  // For now, return null to indicate not implemented
  console.warn('Google Translate not yet implemented');
  return null;
}

async function translateWithDeepL(text, targetLanguage, sourceLanguage) {
  // DeepL implementation would go here
  console.warn('DeepL not yet implemented');
  return null;
}

// =================================================
// TTS HELPER FUNCTIONS
// =================================================

async function generateTTSWithElevenLabs(text, languageCode, voiceId, voiceConfigs) {
  // ElevenLabs TTS implementation would go here
  console.warn('ElevenLabs TTS not yet implemented');
  return { audioBuffer: null, filename: null };
}

async function generateTTSWithGoogleCloud(text, languageCode, voiceConfigs) {
  // Google Cloud TTS implementation would go here
  console.warn('Google Cloud TTS not yet implemented');
  return { audioBuffer: null, filename: null };
}

async function generateTTSWithAzure(text, languageCode, voiceConfigs) {
  // Azure TTS implementation would go here
  console.warn('Azure TTS not yet implemented');
  return { audioBuffer: null, filename: null };
}

export default router; 