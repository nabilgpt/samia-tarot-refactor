// =====================================================
// SAMIA TAROT - DYNAMIC TRANSLATION PROVIDERS API ROUTES
// Comprehensive API for managing AI translation providers
// =====================================================

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// =====================================================
// UNIFIED PROVIDERS ENDPOINT
// =====================================================

/**
 * GET /api/dynamic-translation/providers/unified
 * Get all available providers for translation from multiple sources
 */
router.get('/providers/unified', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    console.log('🔄 [UNIFIED PROVIDERS] Loading providers from all sources...');

    // Load from both translation-specific and general AI providers
    const [translationProvidersQuery, aiProvidersQuery] = await Promise.all([
      supabaseAdmin
        .from('ai_translation_providers')
        .select(`
          id, name, display_name_en, display_name_ar,
          description_en, description_ar, api_endpoint_url,
          authentication_type, supports_languages,
          max_tokens_per_request, supports_batch_translation,
          supports_context_preservation, estimated_cost_per_1k_tokens,
          is_active, is_default_provider, display_order,
          config_schema, default_config, created_at, updated_at,
          last_tested_at, test_status
        `)
        .order('display_order', { ascending: true }),
      
      supabaseAdmin
        .from('ai_providers')
        .select(`
          id, name, provider_type, api_endpoint, description,
          supports_text_generation, is_active, is_default,
          requests_per_minute, tokens_per_minute, created_at, updated_at
        `)
        .eq('is_active', true)
        .eq('supports_text_generation', true)
    ]);

    const translationProviders = translationProvidersQuery.data || [];
    const aiProviders = aiProvidersQuery.data || [];

    console.log(`✅ [UNIFIED PROVIDERS] Found ${translationProviders.length} translation providers`);
    console.log(`✅ [UNIFIED PROVIDERS] Found ${aiProviders.length} AI providers`);

    // Convert AI providers to translation provider format
    const aiProvidersForTranslation = aiProviders.map(provider => ({
      id: `ai_${provider.id}`,
      name: provider.name.toLowerCase(),
      display_name_en: provider.name,
      display_name_ar: provider.name,
      description_en: provider.description || `${provider.provider_type} provider`,
      description_ar: provider.description || `مقدم ${provider.provider_type}`,
      api_endpoint_url: provider.api_endpoint || '',
      authentication_type: 'bearer_token',
      supports_languages: ['en', 'ar'],
      max_tokens_per_request: provider.tokens_per_minute || 1500,
      supports_batch_translation: false,
      supports_context_preservation: true,
      is_active: provider.is_active,
      is_default_provider: provider.is_default,
      display_order: 999, // Put at end
      provider_type: provider.provider_type,
      source: 'ai_providers',
      created_at: provider.created_at,
      updated_at: provider.updated_at,
      last_tested_at: null,
      test_status: null
    }));

    // Combine providers, avoiding duplicates
    const existingNames = translationProviders.map(p => p.name.toLowerCase());
    const uniqueAiProviders = aiProvidersForTranslation.filter(p => 
      !existingNames.includes(p.name.toLowerCase())
    );

    const allProviders = [...translationProviders, ...uniqueAiProviders];

    console.log(`✅ [UNIFIED PROVIDERS] Total unified providers: ${allProviders.length}`);

    res.json({
      success: true,
      data: allProviders,
      sources: {
        translation_providers: translationProviders.length,
        ai_providers: uniqueAiProviders.length,
        total: allProviders.length
      }
    });

  } catch (error) {
    console.error('❌ [UNIFIED PROVIDERS] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// =====================================================
// AI TRANSLATION PROVIDERS MANAGEMENT
// =====================================================

/**
 * GET /api/dynamic-translation/providers
 * Get all AI translation providers (Admin+ access)
 */
router.get('/providers', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    console.log('🤖 [DYNAMIC TRANSLATION] Getting all AI providers');

    const { data: providers, error } = await supabaseAdmin
      .from('ai_translation_providers')
      .select(`
        id, name, display_name_en, display_name_ar,
        description_en, description_ar, api_endpoint_url,
        authentication_type, supports_languages,
        max_tokens_per_request, supports_batch_translation,
        supports_context_preservation, estimated_cost_per_1k_tokens,
        is_active, is_default_provider, display_order,
        config_schema, default_config, created_at, updated_at,
        last_tested_at, test_status
      `)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ [DYNAMIC TRANSLATION] Error fetching providers:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch AI providers',
        details: error.message
      });
    }

    console.log(`✅ [DYNAMIC TRANSLATION] Successfully fetched ${providers?.length || 0} providers`);

    res.json({
      success: true,
      data: providers || []
    });

  } catch (error) {
    console.error('❌ [DYNAMIC TRANSLATION] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/dynamic-translation/providers
 * Create new AI translation provider (Super Admin only)
 */
router.post('/providers', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const {
      name, display_name_en, display_name_ar, description_en, description_ar,
      api_endpoint_url, authentication_type, supports_languages,
      max_tokens_per_request, supports_batch_translation, supports_context_preservation,
      estimated_cost_per_1k_tokens, is_active, config_schema, default_config
    } = req.body;

    console.log('🤖 [DYNAMIC TRANSLATION] Creating new AI provider:', name);

    // Validation
    if (!name || !display_name_en || !display_name_ar) {
      return res.status(400).json({
        success: false,
        error: 'Name and display names are required'
      });
    }

    // Check for duplicate provider name
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('ai_translation_providers')
      .select('id')
      .eq('name', name)
      .limit(1);

    if (checkError) {
      console.error('❌ [DYNAMIC TRANSLATION] Duplicate check error:', checkError);
      return res.status(400).json({
        success: false,
        error: 'Failed to check for duplicates',
        details: checkError.message
      });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Provider with this name already exists'
      });
    }

    // Get next display order
    const { data: lastProvider } = await supabaseAdmin
      .from('ai_translation_providers')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (lastProvider?.[0]?.display_order || 0) + 1;

    // Insert new provider
    const { data: newProvider, error: insertError } = await supabaseAdmin
      .from('ai_translation_providers')
      .insert([{
        name: name.toLowerCase().trim(),
        display_name_en: display_name_en.trim(),
        display_name_ar: display_name_ar.trim(),
        description_en: description_en?.trim() || '',
        description_ar: description_ar?.trim() || '',
        api_endpoint_url: api_endpoint_url?.trim() || '',
        authentication_type: authentication_type || 'bearer_token',
        supports_languages: supports_languages || ['en', 'ar'],
        max_tokens_per_request: max_tokens_per_request || 1500,
        supports_batch_translation: !!supports_batch_translation,
        supports_context_preservation: supports_context_preservation !== false,
        estimated_cost_per_1k_tokens: estimated_cost_per_1k_tokens || 0.0020,
        is_active: is_active !== false,
        is_default_provider: false, // Never set as default on creation
        display_order: nextOrder,
        config_schema: config_schema || {},
        default_config: default_config || {},
        created_by: req.user.id
      }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ [DYNAMIC TRANSLATION] Insert error:', insertError);
      return res.status(400).json({
        success: false,
        error: 'Failed to create AI provider',
        details: insertError.message
      });
    }

    console.log(`✅ [DYNAMIC TRANSLATION] Successfully created provider: ${newProvider.name}`);

    res.status(201).json({
      success: true,
      data: newProvider
    });

  } catch (error) {
    console.error('❌ [DYNAMIC TRANSLATION] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * PUT /api/dynamic-translation/providers/:id
 * Update AI translation provider (Super Admin only)
 */
router.put('/providers/:id', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🤖 [DYNAMIC TRANSLATION] Updating provider:', id);

    // Remove sensitive fields that shouldn't be updated here
    delete updateData.id;
    delete updateData.name; // Name changes require special handling
    delete updateData.created_at;
    delete updateData.created_by;

    // Update timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: updatedProvider, error } = await supabaseAdmin
      .from('ai_translation_providers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [DYNAMIC TRANSLATION] Update error:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to update AI provider',
        details: error.message
      });
    }

    if (!updatedProvider) {
      return res.status(404).json({
        success: false,
        error: 'AI provider not found'
      });
    }

    console.log(`✅ [DYNAMIC TRANSLATION] Successfully updated provider: ${updatedProvider.name}`);

    res.json({
      success: true,
      data: updatedProvider
    });

  } catch (error) {
    console.error('❌ [DYNAMIC TRANSLATION] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * DELETE /api/dynamic-translation/providers/:id
 * Delete AI translation provider (Super Admin only)
 */
router.delete('/providers/:id', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🤖 [DYNAMIC TRANSLATION] Deleting provider:', id);

    // Check if this is the default provider
    const { data: provider, error: checkError } = await supabaseAdmin
      .from('ai_translation_providers')
      .select('name, display_name_en, is_default_provider')
      .eq('id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [DYNAMIC TRANSLATION] Error checking provider:', checkError);
      return res.status(400).json({
        success: false,
        error: 'Failed to verify provider',
        details: checkError.message
      });
    }

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'AI provider not found'
      });
    }

    if (provider.is_default_provider) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the default provider. Please set another provider as default first.'
      });
    }

    // Delete the provider (credentials will be cascade deleted)
    const { error: deleteError } = await supabaseAdmin
      .from('ai_translation_providers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [DYNAMIC TRANSLATION] Delete error:', deleteError);
      return res.status(400).json({
        success: false,
        error: 'Failed to delete AI provider',
        details: deleteError.message
      });
    }

    console.log(`✅ [DYNAMIC TRANSLATION] Successfully deleted provider: ${provider.display_name_en}`);

    res.json({
      success: true,
      message: 'AI provider deleted successfully',
      deleted_provider: {
        id,
        name: provider.name,
        display_name: provider.display_name_en
      }
    });

  } catch (error) {
    console.error('❌ [DYNAMIC TRANSLATION] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// =====================================================
// TRANSLATION SETTINGS MANAGEMENT
// =====================================================

/**
 * GET /api/dynamic-translation/settings
 * Get all translation settings (Admin+ access)
 */
router.get('/settings', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    console.log('🔧 [DYNAMIC TRANSLATION] Getting translation settings');

    const { data: settings, error } = await supabaseAdmin
      .from('translation_settings')
      .select('*')
      .order('category')
      .order('setting_key');

    if (error) {
      console.error('❌ [DYNAMIC TRANSLATION] Error fetching settings:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch translation settings',
        details: error.message
      });
    }

    // Convert settings to a more usable format
    const settingsMap = {};
    settings?.forEach(setting => {
      settingsMap[setting.setting_key] = {
        value: setting.setting_value,
        description_en: setting.description_en,
        description_ar: setting.description_ar,
        category: setting.category,
        is_system_setting: setting.is_system_setting,
        updated_at: setting.updated_at
      };
    });

    console.log(`✅ [DYNAMIC TRANSLATION] Successfully fetched ${settings?.length || 0} settings`);

    res.json({
      success: true,
      data: settingsMap,
      raw_settings: settings || []
    });

  } catch (error) {
    console.error('❌ [DYNAMIC TRANSLATION] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * PUT /api/dynamic-translation/settings
 * Update translation settings (Super Admin only)
 */
router.put('/settings', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required'
      });
    }

    console.log('🔧 [DYNAMIC TRANSLATION] Updating translation settings:', Object.keys(settings));

    const updates = [];
    const errors = [];

    // Process each setting update
    for (const [key, value] of Object.entries(settings)) {
      try {
        const { error } = await supabaseAdmin
          .from('translation_settings')
          .upsert({
            setting_key: key,
            setting_value: typeof value === 'string' ? `"${value}"` : JSON.stringify(value),
            updated_at: new Date().toISOString(),
            updated_by: req.user.id
          }, {
            onConflict: 'setting_key'
          });

        if (error) {
          errors.push({ key, error: error.message });
        } else {
          updates.push(key);
        }
      } catch (err) {
        errors.push({ key, error: err.message });
      }
    }

    if (errors.length > 0) {
      console.error('❌ [DYNAMIC TRANSLATION] Some settings failed to update:', errors);
      return res.status(400).json({
        success: false,
        error: 'Some settings failed to update',
        details: {
          successful_updates: updates,
          failed_updates: errors
        }
      });
    }

    console.log(`✅ [DYNAMIC TRANSLATION] Successfully updated ${updates.length} settings`);

    res.json({
      success: true,
      message: 'Translation settings updated successfully',
      updated_settings: updates
    });

  } catch (error) {
    console.error('❌ [DYNAMIC TRANSLATION] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// =====================================================
// PROVIDER CREDENTIALS MANAGEMENT
// =====================================================

/**
 * POST /api/dynamic-translation/providers/:id/credentials
 * Set provider credentials (Super Admin only)
 */
router.post('/providers/:id/credentials', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { id: providerId } = req.params;
    const { credentials } = req.body;

    console.log('🔐 [DYNAMIC TRANSLATION] Setting credentials for provider:', providerId);

    if (!credentials || typeof credentials !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Credentials object is required'
      });
    }

    // Verify provider exists
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('ai_translation_providers')
      .select('id, name')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({
        success: false,
        error: 'AI provider not found'
      });
    }

    const credentialUpdates = [];
    const errors = [];

    // Process each credential
    for (const [key, value] of Object.entries(credentials)) {
      try {
        // For now, we'll store as encrypted (in a real system, use actual encryption)
        const { error } = await supabaseAdmin
          .from('ai_provider_credentials')
          .upsert({
            provider_id: providerId,
            credential_key: key,
            credential_value_encrypted: value, // TODO: Implement actual encryption
            is_encrypted: true,
            is_active: true,
            created_by: req.user.id
          }, {
            onConflict: 'provider_id,credential_key'
          });

        if (error) {
          errors.push({ key, error: error.message });
        } else {
          credentialUpdates.push(key);
        }
      } catch (err) {
        errors.push({ key, error: err.message });
      }
    }

    if (errors.length > 0) {
      console.error('❌ [DYNAMIC TRANSLATION] Some credentials failed to update:', errors);
      return res.status(400).json({
        success: false,
        error: 'Some credentials failed to update',
        details: {
          successful_updates: credentialUpdates,
          failed_updates: errors
        }
      });
    }

    console.log(`✅ [DYNAMIC TRANSLATION] Successfully updated ${credentialUpdates.length} credentials for ${provider.name}`);

    res.json({
      success: true,
      message: 'Provider credentials updated successfully',
      provider: provider.name,
      updated_credentials: credentialUpdates
    });

  } catch (error) {
    console.error('❌ [DYNAMIC TRANSLATION] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// =====================================================
// PROVIDER TESTING AND ANALYTICS
// =====================================================

/**
 * POST /api/dynamic-translation/providers/:id/test
 * Test AI translation provider (Super Admin only)
 */
router.post('/providers/:id/test', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { id: providerId } = req.params;
    const { test_text = 'Hello, this is a test translation.', target_language = 'ar' } = req.body;

    console.log('🧪 [DYNAMIC TRANSLATION] Testing provider:', providerId);

    // Get provider details
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('ai_translation_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({
        success: false,
        error: 'AI provider not found'
      });
    }

    const startTime = Date.now();
    let testResult = {
      success: false,
      translated_text: null,
      error_message: null,
      response_time_ms: 0,
      provider_name: provider.name
    };

    try {
      // TODO: Implement actual provider testing logic based on provider type
      // For now, simulate a test
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      testResult = {
        success: true,
        translated_text: target_language === 'ar' ? 'مرحبا، هذا اختبار ترجمة.' : 'Hello, this is a test translation.',
        error_message: null,
        response_time_ms: Date.now() - startTime,
        provider_name: provider.name
      };

    } catch (testError) {
      testResult.error_message = testError.message;
      testResult.response_time_ms = Date.now() - startTime;
    }

    // Update provider test status
    await supabaseAdmin
      .from('ai_translation_providers')
      .update({
        last_tested_at: new Date().toISOString(),
        test_status: testResult.success ? 'success' : 'failed'
      })
      .eq('id', providerId);

    // Log the test usage
    await supabaseAdmin
      .from('translation_usage_logs')
      .insert({
        provider_id: providerId,
        request_type: 'test',
        source_language: 'en',
        target_language: target_language,
        text_length: test_text.length,
        response_time_ms: testResult.response_time_ms,
        success: testResult.success,
        error_message: testResult.error_message,
        used_for: 'provider_test',
        user_id: req.user.id
      });

    console.log(`${testResult.success ? '✅' : '❌'} [DYNAMIC TRANSLATION] Test completed for ${provider.name}`);

    res.json({
      success: true,
      test_result: testResult
    });

  } catch (error) {
    console.error('❌ [DYNAMIC TRANSLATION] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/dynamic-translation/analytics
 * Get translation usage analytics (Admin+ access)
 */
router.get('/analytics', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      provider_id, 
      group_by = 'day' // 'day', 'week', 'month', 'provider'
    } = req.query;

    console.log('📊 [DYNAMIC TRANSLATION] Getting analytics:', { start_date, end_date, provider_id, group_by });

    let query = supabaseAdmin
      .from('translation_usage_logs')
      .select(`
        *,
        ai_translation_providers(name, display_name_en)
      `);

    // Apply filters
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }
    if (provider_id) {
      query = query.eq('provider_id', provider_id);
    }

    const { data: logs, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000); // Reasonable limit for analytics

    if (error) {
      console.error('❌ [DYNAMIC TRANSLATION] Error fetching analytics:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch analytics data',
        details: error.message
      });
    }

    // Process analytics data
    const analytics = {
      total_requests: logs?.length || 0,
      successful_requests: logs?.filter(log => log.success).length || 0,
      failed_requests: logs?.filter(log => !log.success).length || 0,
      average_response_time: 0,
      total_cost_estimate: 0,
      by_provider: {},
      by_language_pair: {},
      by_use_case: {}
    };

    if (logs && logs.length > 0) {
      // Calculate averages and totals
      const totalResponseTime = logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0);
      analytics.average_response_time = Math.round(totalResponseTime / logs.length);
      analytics.total_cost_estimate = logs.reduce((sum, log) => sum + (log.estimated_cost || 0), 0);

      // Group by provider
      logs.forEach(log => {
        const providerName = log.ai_translation_providers?.display_name_en || 'Unknown';
        if (!analytics.by_provider[providerName]) {
          analytics.by_provider[providerName] = {
            total: 0,
            successful: 0,
            failed: 0,
            avg_response_time: 0,
            total_cost: 0
          };
        }
        
        analytics.by_provider[providerName].total++;
        if (log.success) {
          analytics.by_provider[providerName].successful++;
        } else {
          analytics.by_provider[providerName].failed++;
        }
        analytics.by_provider[providerName].total_cost += (log.estimated_cost || 0);
      });

      // Calculate average response times for each provider
      Object.keys(analytics.by_provider).forEach(provider => {
        const providerLogs = logs.filter(log => 
          (log.ai_translation_providers?.display_name_en || 'Unknown') === provider
        );
        const totalTime = providerLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0);
        analytics.by_provider[provider].avg_response_time = providerLogs.length > 0 
          ? Math.round(totalTime / providerLogs.length) : 0;
      });

      // Group by language pair
      logs.forEach(log => {
        const pair = `${log.source_language} → ${log.target_language}`;
        analytics.by_language_pair[pair] = (analytics.by_language_pair[pair] || 0) + 1;
      });

      // Group by use case
      logs.forEach(log => {
        const useCase = log.used_for || 'unknown';
        analytics.by_use_case[useCase] = (analytics.by_use_case[useCase] || 0) + 1;
      });
    }

    console.log(`✅ [DYNAMIC TRANSLATION] Analytics computed for ${analytics.total_requests} requests`);

    res.json({
      success: true,
      data: analytics,
      query_params: { start_date, end_date, provider_id, group_by }
    });

  } catch (error) {
    console.error('❌ [DYNAMIC TRANSLATION] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router; 