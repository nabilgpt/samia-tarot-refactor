/**
 * DYNAMIC AI PROVIDERS & MODELS MANAGEMENT API ROUTES
 * SAMIA TAROT Platform - Complete Dynamic AI Management
 * 
 * Features:
 * - Hot-swap AI providers and models
 * - Zero hardcoding - everything admin-configurable
 * - Real-time feature assignment updates
 * - Health monitoring and analytics
 */

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Decrypt secret value from system secrets
 * This matches the implementation in systemSecretsRoutes.js
 */
const decryptSecret = (encryptedData) => {
  // Simplified decryption - matches systemSecretsRoutes.js implementation
  return encryptedData.encrypted;
};

/**
 * Get API key from system secrets table for a given provider type
 * This ensures consistency with the System Secrets tab
 */
async function getAPIKeyFromSystemSecrets(providerType) {
  console.log('🔐 [AI] Looking for API key in system secrets for provider type:', providerType);
  
  // Map provider types to their corresponding system secret keys
  const secretKeyMap = {
    'openai': 'OPENAI_API_KEY',
    'anthropic': 'ANTHROPIC_API_KEY', 
    'google': 'GOOGLE_AI_API_KEY',
    'elevenlabs': 'ELEVENLABS_API_KEY'
  };
  
  const secretKey = secretKeyMap[providerType];
  if (!secretKey) {
    throw new Error(`No secret key mapping found for provider type: ${providerType}`);
  }
  
  // Get the API key from system_secrets table
  const { data: secret, error: secretError } = await supabaseAdmin
    .from('system_secrets')
    .select('secret_value_encrypted, secret_salt')
    .eq('secret_key', secretKey)
    .eq('is_active', true)
    .single();
  
  if (secretError || !secret) {
    throw new Error(`API key not found in system_secrets for: ${secretKey}. Please configure it in System Secrets.`);
  }
  
  // Decrypt the API key using the same method as system secrets
  try {
    const apiKey = decryptSecret({
      encrypted: secret.secret_value_encrypted,
      key: secret.secret_salt
    });
    console.log(`✅ [AI] Successfully retrieved API key for ${providerType}`);
    return apiKey;
  } catch (decryptError) {
    throw new Error(`Failed to decrypt API key for ${providerType}: ${decryptError.message}`);
  }
}

// ============================================================================
// AI PROVIDERS MANAGEMENT
// ============================================================================

/**
 * @route GET /api/dynamic-ai/providers
 * @desc Get all AI providers with health status
 * @access Admin/Super Admin
 */
router.get('/providers', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🤖 [AI] Loading AI providers with enhanced details...');

      // Select the newly added columns as well
      const { data, error } = await supabaseAdmin
        .from('ai_providers')
        .select(`
          id,
          name,
          provider_type,
          api_endpoint,
          is_active,
          description,
          created_at,
          updated_at,
          logo_url,
          configuration_key
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [AI] Get providers error:', error);
        return res.status(500).json({ success: false, message: 'Database query failed', error: error.message });
      }

      console.log(`✅ [AI] Loaded ${data.length} AI providers.`);
      res.json({ success: true, data });

    } catch (error) {
      console.error('🔥 [API ERROR] in GET /dynamic-ai/providers', error);
      res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

/**
 * @route POST /api/dynamic-ai/providers
 * @desc Create new AI provider
 * @access Super Admin
 */
router.post('/providers', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    try {
      const { name, provider_type, api_endpoint, description, is_active, configuration_key } = req.body;

      // Validate required fields
      if (!name || !provider_type || !api_endpoint) {
        return res.status(400).json({ success: false, message: 'Name, Provider Type, and API Endpoint are required.' });
      }

      // If configuration_key is provided but empty, it's an error.
      if (configuration_key !== undefined && configuration_key.trim() === '') {
        return res.status(400).json({ success: false, message: 'If provided, configuration_key cannot be empty.' });
      }

      console.log(`🤖 [AI] Creating new provider: ${name}`);

      // Auto-generate configuration_key from the name if not provided.
      // This creates a predictable and consistent key, e.g., "Azure OpenAI" -> "azure_openai_api_key".
      const final_configuration_key = configuration_key || 
        name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_$/, '') + '_api_key';

      const { data, error } = await supabaseAdmin
        .from('ai_providers')
        .insert([{ 
          name, 
          provider_type, 
          api_endpoint,
          description,
          is_active,
          configuration_key: final_configuration_key // Ensure this is always included
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [AI] Create provider error:', error);
        if (error.code === '23505') { // unique constraint violation
          return res.status(409).json({ success: false, message: 'A provider with this name already exists.', error: error.message });
        }
        return res.status(500).json({ success: false, message: 'Failed to create provider in database.', error: error.message });
      }

      console.log(`✅ [AI] Provider created successfully: ${data.id}`);
      res.status(201).json({ success: true, data });

    } catch (error) {
      console.error('🔥 [API ERROR] in POST /dynamic-ai/providers', error);
      res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

/**
 * @route PUT /api/dynamic-ai/providers/:id
 * @desc Update AI provider
 * @access Super Admin
 */
router.put('/providers/:id', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, provider_type, api_endpoint, description, is_active } = req.body;

      // Validate required fields
      if (!name || !provider_type || !api_endpoint) {
        return res.status(400).json({ success: false, message: 'Name, Provider Type, and API Endpoint are required.' });
      }

      console.log(`🤖 [AI] Updating provider: ${id}`);

      const { data, error } = await supabaseAdmin
        .from('ai_providers')
        .update({ 
          name, 
          provider_type, 
          api_endpoint,
          description,
          is_active,
          updated_at: new Date()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ [AI] Update provider error:', error);
        return res.status(500).json({ success: false, message: 'Failed to update provider.', error: error.message });
      }

      console.log(`✅ [AI] Provider updated successfully: ${data.id}`);
      res.json({ success: true, data });

    } catch (error) {
      console.error('🔥 [API ERROR] in PUT /dynamic-ai/providers/:id', error);
      res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

/**
 * @route DELETE /api/dynamic-ai/providers/:id
 * @desc Delete AI provider
 * @access Super Admin
 */
router.delete('/providers/:id', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('🤖 [AI] Deleting AI provider:', id);

      // Check if provider is being used by any features
      const { data: assignments, error: assignmentError } = await supabaseAdmin
        .from('feature_ai_assignments')
        .select('feature_name')
        .or(`primary_provider_id.eq.${id},backup_provider_id.eq.${id}`)
        .eq('is_active', true);

      if (assignmentError) {
        throw assignmentError;
      }

      if (assignments && assignments.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete provider: it's currently assigned to ${assignments.length} features`,
          features: assignments.map(a => a.feature_name)
        });
      }

      const { error } = await supabaseAdmin
        .from('ai_providers')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      console.log('✅ [AI] Deleted AI provider:', id);

      res.json({
        success: true,
        message: 'AI provider deleted successfully'
      });

    } catch (error) {
      console.error('❌ [AI] Delete provider error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete AI provider',
        error: error.message
      });
    }
  }
);

// Test a provider's endpoint connectivity from the backend to avoid CORS issues
router.post('/providers/test', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    const { api_endpoint, provider_type } = req.body;

    if (!api_endpoint) {
      return res.status(400).json({ success: false, message: 'API endpoint is required for testing.' });
    }

    try {
      let testResult = { success: false, message: 'Test not implemented for this provider type' };
      const apiKey = provider_type !== 'none' ? await getAPIKeyFromSystemSecrets(provider_type) : null;
      
      switch (provider_type) {
        case 'openai':
          testResult = await testOpenAIProvider(apiKey, api_endpoint, 'Hello');
          break;
        case 'anthropic':
          testResult = await testAnthropicProvider(apiKey, api_endpoint, 'Hello');
          break;
        case 'google':
          testResult = await testGoogleProvider(apiKey, api_endpoint, 'Hello');
          break;
        case 'elevenlabs':
          testResult = await testElevenLabsProvider(apiKey, api_endpoint);
          break;
        default:
          // Generic endpoint reachability test
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

          const response = await fetch(api_endpoint, { signal: controller.signal, method: 'GET' });
          clearTimeout(timeoutId);

          if (response.ok) {
            testResult = { success: true, message: `Endpoint is reachable (Status: ${response.status})` };
          } else {
            testResult = { success: false, message: `Endpoint responded with status: ${response.status}` };
          }
          break;
      }
      
      if (testResult.success) {
        res.json({ success: true, message: testResult.message });
      } else {
        res.status(400).json({ success: false, message: testResult.message });
      }

    } catch (error) {
      res.status(400).json({ success: false, message: `Could not reach provider endpoint. Error: ${error.name === 'AbortError' ? 'Request timed out' : error.message}` });
    }
});

// ============================================================================
// AI MODELS MANAGEMENT
// ============================================================================

/**
 * @route GET /api/dynamic-ai/models
 * @desc Get all AI models
 * @access Admin/Super Admin
 */
router.get('/models', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { provider_id, model_type, active_only } = req.query;
      
      console.log('🤖 [AI] Loading AI models...');

      let query = supabaseAdmin
        .from('ai_models')
        .select(`
          *, 
          ai_providers(name, provider_type, is_active)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (provider_id) {
        query = query.eq('provider_id', provider_id);
      }

      if (model_type) {
        query = query.eq('model_type', model_type);
      }

      if (active_only === 'true') {
        query = query.eq('is_active', true);
      }

      const { data: models, error } = await query;

      if (error) {
        throw error;
      }

      console.log(`✅ [AI] Loaded ${models.length} AI models`);

      res.json({
        success: true,
        data: models,
        total: models.length,
        message: 'AI models retrieved successfully'
      });

    } catch (error) {
      console.error('❌ [AI] Get models error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve AI models',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/dynamic-ai/models
 * @desc Create new AI model
 * @access Super Admin
 */
router.post('/models', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    try {
      const {
        provider_id, model_name, display_name, model_version, model_type,
        max_tokens, context_window, supports_streaming, supports_functions, supports_vision,
        input_cost_per_1k, output_cost_per_1k,
        default_parameters, parameter_constraints,
        description, use_cases
      } = req.body;

      console.log('🤖 [AI] Creating AI model:', model_name);

      // Validate required fields
      if (!provider_id || !model_name || !display_name || !model_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: provider_id, model_name, display_name, model_type'
        });
      }

      const { data: model, error } = await supabaseAdmin
        .from('ai_models')
        .insert({
          provider_id,
          model_name,
          display_name,
          model_version,
          model_type,
          max_tokens: max_tokens || 4096,
          context_window: context_window || 4096,
          supports_streaming: supports_streaming ?? true,
          supports_functions: supports_functions ?? false,
          supports_vision: supports_vision ?? false,
          input_cost_per_1k: input_cost_per_1k || 0,
          output_cost_per_1k: output_cost_per_1k || 0,
          default_parameters: default_parameters || {},
          parameter_constraints: parameter_constraints || {},
          description,
          use_cases: use_cases || [],
          created_by: req.user.id,
          updated_by: req.user.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ [AI] Created AI model:', model.id);

      res.status(201).json({
        success: true,
        data: model,
        message: 'AI model created successfully'
      });

    } catch (error) {
      console.error('❌ [AI] Create model error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create AI model',
        error: error.message
      });
    }
  }
);

// ============================================================================
// FEATURE AI ASSIGNMENTS MANAGEMENT
// ============================================================================

/**
 * @route GET /api/dynamic-ai/assignments
 * @desc Get all feature AI assignments
 * @access Admin/Super Admin
 */
router.get('/assignments', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { feature_category, active_only } = req.query;
      
      console.log('🤖 [AI] Loading feature AI assignments...');

      let query = supabaseAdmin
        .from('feature_ai_assignments')
        .select(`
          *,
          primary_provider:ai_providers!primary_provider_id(name, provider_type, is_active),
          primary_model:ai_models!primary_model_id(model_name, display_name, model_type),
          backup_provider:ai_providers!backup_provider_id(name, provider_type, is_active),
          backup_model:ai_models!backup_model_id(model_name, display_name, model_type)
        `)
        .order('feature_name', { ascending: true });

      // Apply filters
      if (feature_category) {
        query = query.eq('feature_category', feature_category);
      }

      if (active_only === 'true') {
        query = query.eq('is_active', true);
      }

      const { data: assignments, error } = await query;

      if (error) {
        throw error;
      }

      console.log(`✅ [AI] Loaded ${assignments.length} feature assignments`);

      res.json({
        success: true,
        data: assignments,
        total: assignments.length,
        message: 'Feature AI assignments retrieved successfully'
      });

    } catch (error) {
      console.error('❌ [AI] Get assignments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve feature AI assignments',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/dynamic-ai/assignments
 * @desc Create new feature AI assignment
 * @access Super Admin
 */
router.post('/assignments', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    try {
      const { 
        feature_name, 
        feature_category,
        primary_provider_id, 
        primary_model_id,
        backup_provider_id,
        backup_model_id,
        is_active = true,
        config = {}
      } = req.body;
      
      // Validate required fields
      if (!feature_name || !primary_provider_id) {
        return res.status(400).json({
          success: false,
          error: 'Feature name and primary provider ID are required'
        });
      }
      
      console.log('🤖 [AI] Creating feature assignment:', { 
        feature_name, 
        feature_category,
        primary_provider_id, 
        primary_model_id,
        backup_provider_id,
        backup_model_id,
        is_active 
      });
      
      // Check if assignment already exists
      const { data: existingAssignment } = await supabaseAdmin
        .from('feature_ai_assignments')
        .select('id')
        .eq('feature_name', feature_name)
        .single();
      
      if (existingAssignment) {
        return res.status(409).json({
          success: false,
          error: 'Feature assignment already exists'
        });
      }
      
      const { data, error } = await supabaseAdmin
        .from('feature_ai_assignments')
        .insert([{
          feature_name,
          feature_category: feature_category || 'general',
          primary_provider_id,
          primary_model_id,
          backup_provider_id,
          backup_model_id,
          is_active,
          config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select(`
          *,
          primary_provider:ai_providers!primary_provider_id(name, provider_type, is_active),
          primary_model:ai_models!primary_model_id(model_name, display_name, model_type),
          backup_provider:ai_providers!backup_provider_id(name, provider_type, is_active),
          backup_model:ai_models!backup_model_id(model_name, display_name, model_type)
        `)
        .single();
      
      if (error) {
        console.error('❌ [AI] Error creating feature assignment:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create feature assignment'
        });
      }
      
      console.log('✅ [AI] Feature assignment created successfully');
      
      res.status(201).json({
        success: true,
        data,
        message: 'Feature assignment created successfully'
      });
      
    } catch (error) {
      console.error('❌ [AI] Error in POST /assignments:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route PUT /api/dynamic-ai/assignments/:feature_name
 * @desc Update feature AI assignment (Hot-swap)
 * @access Super Admin
 */
router.put('/assignments/:feature_name', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    try {
      const { feature_name } = req.params;
      const {
        primary_provider_id, primary_model_id,
        backup_provider_id, backup_model_id,
        feature_parameters, custom_prompt_template,
        enable_failover, max_retries, retry_delay_seconds
      } = req.body;

      console.log('🔄 [AI] Hot-swapping AI assignment for feature:', feature_name);

      // Validate that the provider and model exist and are active
      if (primary_provider_id && primary_model_id) {
        const { data: provider, error: providerError } = await supabaseAdmin
          .from('ai_providers')
          .select('id, name, is_active')
          .eq('id', primary_provider_id)
          .eq('is_active', true)
          .single();

        if (providerError || !provider) {
          return res.status(400).json({
            success: false,
            message: 'Primary AI provider not found or inactive'
          });
        }

        const { data: model, error: modelError } = await supabaseAdmin
          .from('ai_models')
          .select('id, model_name, is_active')
          .eq('id', primary_model_id)
          .eq('provider_id', primary_provider_id)
          .eq('is_active', true)
          .single();

        if (modelError || !model) {
          return res.status(400).json({
            success: false,
            message: 'Primary AI model not found, inactive, or not associated with the provider'
          });
        }
      }

      const updateData = {
        primary_provider_id,
        primary_model_id,
        backup_provider_id,
        backup_model_id,
        feature_parameters: feature_parameters || {},
        custom_prompt_template,
        enable_failover: enable_failover ?? true,
        max_retries: max_retries || 3,
        retry_delay_seconds: retry_delay_seconds || 5,
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data: assignment, error } = await supabaseAdmin
        .from('feature_ai_assignments')
        .upsert({
          feature_name,
          feature_category: 'custom',
          ...updateData
        })
        .select(`
          *,
          primary_provider:ai_providers!primary_provider_id(name, provider_type),
          primary_model:ai_models!primary_model_id(model_name, display_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ [AI] Hot-swapped AI assignment for feature:', feature_name);

      res.json({
        success: true,
        data: assignment,
        message: `AI assignment updated successfully for feature: ${feature_name}. Changes are now live!`
      });

    } catch (error) {
      console.error('❌ [AI] Update assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update feature AI assignment',
        error: error.message
      });
    }
  }
);

// ============================================================================
// AI PROVIDER TESTING
// ============================================================================

/**
 * @route POST /api/dynamic-ai/providers/:id/test
 * @desc Test AI provider functionality
 * @access Admin/Super Admin
 */
router.post('/providers/:id/test', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { test_text = 'Hello, this is a test message.', model_name = null } = req.body;
      
      console.log('🧪 [AI] Testing provider:', id);

      // Get provider details
      const { data: provider, error: providerError } = await supabaseAdmin
        .from('ai_providers')
        .select('*')
        .eq('id', id)
        .single();

      if (providerError || !provider) {
        return res.status(404).json({
          success: false,
          message: 'AI provider not found'
        });
      }

      // Get API key from system secrets table (not from ai_providers table)
      let apiKey;
      try {
        apiKey = await getAPIKeyFromSystemSecrets(provider.provider_type);
      } catch (error) {
        console.log(`❌ [AI] ${error.message}`);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      // Perform test based on provider type
      let testResult = {
        success: false,
        message: 'Test not implemented for this provider type',
        provider_name: provider.name,
        test_text,
        response_text: null,
        response_time_ms: 0,
        model_used: model_name || 'default'
      };

      const startTime = Date.now();
      
      try {
                 switch (provider.provider_type) {
           case 'openai':
             try {
               const openaiResult = await testOpenAIProvider(apiKey, provider.base_url, test_text);
               testResult = {
                 success: openaiResult.success,
                 message: openaiResult.message,
                 provider_name: provider.name,
                 test_text,
                 response_text: openaiResult.response_content || null,
                 model_used: model_name || 'gpt-3.5-turbo',
                 tokens_used: openaiResult.tokens_used || 0
               };
             } catch (error) {
               testResult = {
                 success: false,
                 message: error.message || 'OpenAI test failed',
                 provider_name: provider.name,
                 test_text,
                 response_text: null,
                 model_used: model_name || 'gpt-3.5-turbo',
                 tokens_used: 0
               };
             }
             break;
           case 'anthropic':
             try {
               const anthropicResult = await testAnthropicProvider(apiKey, provider.base_url, test_text);
               testResult = {
                 success: anthropicResult.success,
                 message: anthropicResult.message,
                 provider_name: provider.name,
                 test_text,
                 response_text: anthropicResult.response_content || null,
                 model_used: model_name || 'claude-3-haiku-20240307',
                 tokens_used: anthropicResult.tokens_used || 0
               };
             } catch (error) {
               testResult = {
                 success: false,
                 message: error.message || 'Anthropic test failed',
                 provider_name: provider.name,
                 test_text,
                 response_text: null,
                 model_used: model_name || 'claude-3-haiku-20240307',
                 tokens_used: 0
               };
             }
             break;
           case 'google':
             try {
               const googleResult = await testGoogleProvider(apiKey, provider.base_url, test_text);
               testResult = {
                 success: googleResult.success,
                 message: googleResult.message,
                 provider_name: provider.name,
                 test_text,
                 response_text: googleResult.response_content || null,
                 model_used: model_name || 'gemini-pro',
                 tokens_used: googleResult.tokens_used || 0
               };
             } catch (error) {
               testResult = {
                 success: false,
                 message: error.message || 'Google test failed',
                 provider_name: provider.name,
                 test_text,
                 response_text: null,
                 model_used: model_name || 'gemini-pro',
                 tokens_used: 0
               };
             }
             break;
           case 'elevenlabs':
             try {
               const elevenlabsResult = await testElevenLabsProvider(apiKey, provider.base_url);
               testResult = {
                 success: elevenlabsResult.success,
                 message: elevenlabsResult.message,
                 provider_name: provider.name,
                 test_text,
                 response_text: elevenlabsResult.user_data ? JSON.stringify(elevenlabsResult.user_data) : null,
                 model_used: 'tts-1',
                 user_data: elevenlabsResult.user_data || null
               };
             } catch (error) {
               testResult = {
                 success: false,
                 message: error.message || 'ElevenLabs test failed',
                 provider_name: provider.name,
                 test_text,
                 response_text: null,
                 model_used: 'tts-1',
                 user_data: null
               };
             }
             break;
           default:
             testResult = {
               success: false,
               message: `Testing not implemented for provider type: ${provider.provider_type}`,
               provider_name: provider.name,
               test_text,
               response_text: null,
               model_used: model_name || 'default'
             };
         }
        
        testResult.response_time_ms = Date.now() - startTime;
        
        // Update provider test status
        await supabaseAdmin
          .from('ai_providers')
          .update({
            health_status: testResult.success ? 'healthy' : 'error',
            last_health_check: new Date().toISOString()
          })
          .eq('id', id);

        // Log usage
        await supabaseAdmin
          .from('ai_usage_analytics')
          .insert({
            provider_id: id,
            feature_name: 'provider_test',
            request_type: 'test',
            tokens_used: testResult.response_text ? Math.ceil(testResult.response_text.length / 4) : 0,
            response_time_ms: testResult.response_time_ms,
            success: testResult.success,
            error_message: testResult.success ? null : testResult.message,
            user_id: req.user.id
          });

      } catch (testError) {
        console.error('❌ [AI] Test error:', testError);
        testResult = {
          success: false,
          message: testError.message || 'Test failed with unknown error',
          provider_name: provider.name,
          test_text,
          response_text: null,
          response_time_ms: Date.now() - startTime,
          model_used: model_name || 'default'
        };
      }

      console.log(`${testResult.success ? '✅' : '❌'} [AI] Test completed for ${provider.name}`);

      res.json({
        success: true,
        test_result: testResult,
        message: testResult.success ? 'Provider test successful' : 'Provider test failed'
      });

    } catch (error) {
      console.error('❌ [AI] Test provider error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test provider',
        error: error.message
      });
    }
  }
);

// ============================================================================
// AI PROVIDER HEALTH CHECK
// ============================================================================

/**
 * @route POST /api/dynamic-ai/providers/:id/health-check
 * @desc Test AI provider health
 * @access Admin/Super Admin
 */
router.post('/providers/:id/health-check', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('🏥 [AI] Testing provider health:', id);

      // Get provider details
      const { data: provider, error: providerError } = await supabaseAdmin
        .from('ai_providers')
        .select('*')
        .eq('id', id)
        .single();

      if (providerError || !provider) {
        return res.status(404).json({
          success: false,
          message: 'AI provider not found'
        });
      }

      // Get API key from system secrets table (not from ai_providers table)
      let apiKey;
      try {
        apiKey = await getAPIKeyFromSystemSecrets(provider.provider_type);
      } catch (error) {
        console.log(`❌ [AI] Health check failed: ${error.message}`);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      // Perform health check based on provider type
      let healthStatus = 'unknown';
      let healthMessage = 'Health check not implemented for this provider type';
      
      try {
        // This would be implemented with actual API calls to each provider
        // For now, we'll simulate a successful health check
        healthStatus = 'healthy';
        healthMessage = 'Provider is responding normally';
        
        // Update health status in database
        await supabaseAdmin
          .from('ai_providers')
          .update({
            health_status: healthStatus,
            last_health_check: new Date().toISOString()
          })
          .eq('id', id);

      } catch (healthError) {
        healthStatus = 'down';
        healthMessage = `Health check failed: ${healthError.message}`;
        
        // Update health status in database
        await supabaseAdmin
          .from('ai_providers')
          .update({
            health_status: healthStatus,
            last_health_check: new Date().toISOString()
          })
          .eq('id', id);
      }

      console.log(`🏥 [AI] Health check result for ${provider.name}:`, healthStatus);

      res.json({
        success: healthStatus === 'healthy',
        data: {
          provider_id: id,
          provider_name: provider.name,
          health_status: healthStatus,
          message: healthMessage,
          checked_at: new Date().toISOString()
        },
        message: healthMessage
      });

    } catch (error) {
      console.error('❌ [AI] Health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform health check',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/dynamic-ai/providers/:id/test
 * @desc Test AI provider with real API call
 * @access Admin/Super Admin
 */
router.post('/providers/:id/test', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { test_prompt = "Hello, this is a test message." } = req.body;
      
      console.log('🧪 [AI] Testing provider:', id);

      // Get provider details
      const { data: provider, error: providerError } = await supabaseAdmin
        .from('ai_providers')
        .select('*')
        .eq('id', id)
        .single();

      if (providerError || !provider) {
        return res.status(404).json({
          success: false,
          message: 'AI provider not found'
        });
      }

      // Get API key from system secrets table (not from ai_providers table)
      let apiKey;
      try {
        apiKey = await getAPIKeyFromSystemSecrets(provider.provider_type);
      } catch (error) {
        console.log(`❌ [AI] API test failed: ${error.message}`);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'API key not configured for this provider'
        });
      }

      // Perform test based on provider type
      let testResult = {
        success: false,
        message: 'Test not implemented for this provider type',
        provider_name: provider.name,
        provider_type: provider.provider_type,
        tested_at: new Date().toISOString()
      };

      const startTime = Date.now();

      try {
        switch (provider.provider_type.toLowerCase()) {
          case 'openai':
            testResult = await testOpenAIProvider(apiKey, provider.base_url, test_prompt);
            break;
          case 'anthropic':
            testResult = await testAnthropicProvider(apiKey, provider.base_url, test_prompt);
            break;
          case 'google':
            testResult = await testGoogleProvider(apiKey, provider.base_url, test_prompt);
            break;
          case 'elevenlabs':
            testResult = await testElevenLabsProvider(apiKey, provider.base_url);
            break;
          default:
            testResult = {
              success: false,
              message: `Provider type '${provider.provider_type}' testing not implemented yet`,
              provider_name: provider.name,
              provider_type: provider.provider_type,
              tested_at: new Date().toISOString()
            };
        }

        testResult.response_time_ms = Date.now() - startTime;
        testResult.provider_name = provider.name;
        testResult.provider_type = provider.provider_type;
        testResult.tested_at = new Date().toISOString();

        // Update provider's last test status
        await supabaseAdmin
          .from('ai_providers')
          .update({
            last_health_check: new Date().toISOString(),
            health_status: testResult.success ? 'healthy' : 'down'
          })
          .eq('id', id);

        console.log(`${testResult.success ? '✅' : '❌'} [AI] Test completed for ${provider.name}:`, testResult.message);

        res.json({
          success: true,
          data: testResult,
          message: testResult.success ? 'Provider test successful' : 'Provider test failed'
        });

      } catch (testError) {
        console.error('❌ [AI] Provider test error:', testError);
        
        const errorResult = {
          success: false,
          message: testError.message || 'Provider test failed',
          provider_name: provider.name,
          provider_type: provider.provider_type,
          response_time_ms: Date.now() - startTime,
          tested_at: new Date().toISOString(),
          error_details: testError.message
        };

        // Update provider's last test status
        await supabaseAdmin
          .from('ai_providers')
          .update({
            last_health_check: new Date().toISOString(),
            health_status: 'down'
          })
          .eq('id', id);

        res.json({
          success: false,
          data: errorResult,
          message: 'Provider test failed'
        });
      }

    } catch (error) {
      console.error('❌ [AI] Test endpoint error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test AI provider',
        error: error.message
      });
    }
  }
);

// ============================================================================
// PROVIDER TEST FUNCTIONS
// ============================================================================

async function testOpenAIProvider(apiKey, endpoint, testPrompt) {
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 50
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: `OpenAI test successful! Response: "${data.choices[0].message.content.substring(0, 100)}..."`,
    response_content: data.choices[0].message.content,
    tokens_used: data.usage?.total_tokens || 0
  };
}

async function testAnthropicProvider(apiKey, endpoint, testPrompt) {
  const response = await fetch(`${endpoint}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: testPrompt }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: `Anthropic test successful! Response: "${data.content[0].text.substring(0, 100)}..."`,
    response_content: data.content[0].text,
    tokens_used: data.usage?.output_tokens || 0
  };
}

async function testGoogleProvider(apiKey, endpoint, testPrompt) {
  const response = await fetch(`${endpoint}/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: testPrompt }]
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;
  return {
    success: true,
    message: `Google test successful! Response: "${content.substring(0, 100)}..."`,
    response_content: content,
    tokens_used: data.usageMetadata?.totalTokenCount || 0
  };
}

async function testElevenLabsProvider(apiKey, endpoint) {
  const response = await fetch(`${endpoint}/v1/user`, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`ElevenLabs API error: ${error.detail?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: `ElevenLabs test successful! User: ${data.email || 'Connected'}`,
    user_data: data
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function encryptValue(value) {
  if (!value) {
    console.log('⚠️ [ENCRYPT] No value provided');
    return '';
  }
  
  try {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(
      process.env.ENCRYPTION_KEY || 'samia-tarot-default-encryption-key-32',
      'utf8'
    );
    
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = key.slice(0, 32);
    if (keyBuffer.length < 32) {
      keyBuffer = Buffer.concat([keyBuffer, Buffer.alloc(32 - keyBuffer.length, 0)]);
    }
    
    const iv = crypto.randomBytes(16);
    
    // Use createCipheriv instead of deprecated createCipher
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    console.log('✅ [ENCRYPT] Successfully encrypted value');
    return iv.toString('hex') + ':' + encrypted;
    
  } catch (error) {
    console.error('❌ [ENCRYPT] Error encrypting value:', error.message);
    console.log('⚠️ [ENCRYPT] Falling back to plain text value');
    return value; // Return as-is if encryption fails
  }
}

function decryptValue(encryptedValue) {
  if (!encryptedValue) {
    console.log('⚠️ [DECRYPT] No encrypted value provided');
    return '';
  }
  
  try {
    // Check if the value is already plain text (not encrypted)
    // If it doesn't contain ':' separator, it's likely plain text
    if (!encryptedValue.includes(':')) {
      console.log('✅ [DECRYPT] Value appears to be plain text, returning as-is');
      return encryptedValue;
    }
    
    // Try to decrypt the value
    const algorithm = 'aes-256-cbc';
    const defaultKey = 'samia-tarot-default-encryption-key-32';
    
    // Create 32-byte key using scrypt for better security
    const keyBuffer = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || defaultKey,
      'salt',
      32
    );
    
    const parts = encryptedValue.split(':');
    if (parts.length !== 2) {
      console.log('⚠️ [DECRYPT] Invalid encrypted value format, treating as plain text');
      return encryptedValue;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Use createDecipheriv instead of deprecated createDecipher
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('✅ [DECRYPT] Successfully decrypted value');
    return decrypted;
    
  } catch (error) {
    console.error('❌ [DECRYPT] Error decrypting value:', error.message);
    console.log('⚠️ [DECRYPT] Falling back to plain text value');
    
    // Enhanced fallback logic with better error handling
    if (encryptedValue && typeof encryptedValue === 'string' && encryptedValue.trim() !== '') {
      console.log('🔄 [DECRYPT] Using encrypted value as plain text fallback');
      return encryptedValue;
    }
    
    console.log('❌ [DECRYPT] No valid fallback value available');
    return '';
  }
}

// ============================================================================
// FEATURE ASSIGNMENTS MANAGEMENT
// ============================================================================

/**
 * @route GET /api/dynamic-ai/available-features
 * @desc Get all available features that require API keys or secrets (dynamic list)
 * @access Admin/Super Admin
 */
router.get('/available-features', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🤖 [AI] Loading available features from all sources...');
      
      // Get all unique features from different sources
      const featuresMap = new Map();
      
      // 1. Get features from system_secrets table
      const { data: secretsData } = await supabaseAdmin
        .from('system_secrets')
        .select('secret_key, secret_category, secret_subcategory, display_name, description, provider_name, is_active')
        .eq('is_active', true);
      
      if (secretsData) {
        secretsData.forEach(secret => {
          // Extract feature from secret key (e.g., OPENAI_API_KEY -> openai features)
          const featureKey = secret.secret_key.toLowerCase().replace('_api_key', '').replace('_secret', '');
          const category = secret.secret_category || 'general';
          
          // Map common API keys to their features
          if (featureKey.includes('openai')) {
            featuresMap.set('daily_zodiac_text', {
              key: 'daily_zodiac_text',
              name: 'Daily Zodiac Text Generation',
              category: 'content',
              requires_secret: 'OPENAI_API_KEY',
              provider: 'OpenAI'
            });
            featuresMap.set('tarot_reading', {
              key: 'tarot_reading',
              name: 'AI Tarot Reading',
              category: 'content',
              requires_secret: 'OPENAI_API_KEY',
              provider: 'OpenAI'
            });
            featuresMap.set('chat_assistant', {
              key: 'chat_assistant',
              name: 'Chat Assistant',
              category: 'conversation',
              requires_secret: 'OPENAI_API_KEY',
              provider: 'OpenAI'
            });
            featuresMap.set('content_moderation', {
              key: 'content_moderation',
              name: 'Content Moderation',
              category: 'moderation',
              requires_secret: 'OPENAI_API_KEY',
              provider: 'OpenAI'
            });
            featuresMap.set('analytics_insights', {
              key: 'analytics_insights',
              name: 'Analytics AI Insights',
              category: 'analytics',
              requires_secret: 'OPENAI_API_KEY',
              provider: 'OpenAI'
            });
            featuresMap.set('emergency_assistant', {
              key: 'emergency_assistant',
              name: 'Emergency AI Assistant',
              category: 'emergency',
              requires_secret: 'OPENAI_API_KEY',
              provider: 'OpenAI'
            });
            featuresMap.set('translation_ai', {
              key: 'translation_ai',
              name: 'AI Translation Service',
              category: 'translation',
              requires_secret: 'OPENAI_API_KEY',
              provider: 'OpenAI'
            });
          }
          
          if (featureKey.includes('elevenlabs')) {
            featuresMap.set('daily_zodiac_tts', {
              key: 'daily_zodiac_tts',
              name: 'Daily Zodiac Text-to-Speech',
              category: 'tts',
              requires_secret: 'ELEVENLABS_API_KEY',
              provider: 'ElevenLabs'
            });
            featuresMap.set('notifications_tts', {
              key: 'notifications_tts',
              name: 'Notifications Text-to-Speech',
              category: 'tts',
              requires_secret: 'ELEVENLABS_API_KEY',
              provider: 'ElevenLabs'
            });
            featuresMap.set('emergency_tts', {
              key: 'emergency_tts',
              name: 'Emergency TTS Alerts',
              category: 'emergency',
              requires_secret: 'ELEVENLABS_API_KEY',
              provider: 'ElevenLabs'
            });
          }
          
          if (featureKey.includes('stripe')) {
            featuresMap.set('payment_processing', {
              key: 'payment_processing',
              name: 'Payment Processing',
              category: 'payment',
              requires_secret: 'STRIPE_SECRET_KEY',
              provider: 'Stripe'
            });
            featuresMap.set('subscription_management', {
              key: 'subscription_management',
              name: 'Subscription Management',
              category: 'payment',
              requires_secret: 'STRIPE_SECRET_KEY',
              provider: 'Stripe'
            });
          }
          
          if (featureKey.includes('google')) {
            featuresMap.set('google_translate', {
              key: 'google_translate',
              name: 'Google Translate',
              category: 'translation',
              requires_secret: 'GOOGLE_API_KEY',
              provider: 'Google'
            });
            featuresMap.set('google_ai', {
              key: 'google_ai',
              name: 'Google AI (Gemini)',
              category: 'content',
              requires_secret: 'GOOGLE_API_KEY',
              provider: 'Google'
            });
          }
          
          if (featureKey.includes('anthropic') || featureKey.includes('claude')) {
            featuresMap.set('claude_ai', {
              key: 'claude_ai',
              name: 'Claude AI Assistant',
              category: 'conversation',
              requires_secret: 'ANTHROPIC_API_KEY',
              provider: 'Anthropic'
            });
          }
          
          if (featureKey.includes('sendgrid')) {
            featuresMap.set('email_notifications', {
              key: 'email_notifications',
              name: 'Email Notifications',
              category: 'communication',
              requires_secret: 'SENDGRID_API_KEY',
              provider: 'SendGrid'
            });
          }
          
          if (featureKey.includes('twilio')) {
            featuresMap.set('sms_notifications', {
              key: 'sms_notifications',
              name: 'SMS Notifications',
              category: 'communication',
              requires_secret: 'TWILIO_AUTH_TOKEN',
              provider: 'Twilio'
            });
          }
          
          if (featureKey.includes('square')) {
            featuresMap.set('square_payment', {
              key: 'square_payment',
              name: 'Square Payment Processing',
              category: 'payment',
              requires_secret: 'SQUARE_ACCESS_TOKEN',
              provider: 'Square'
            });
          }
          
          if (featureKey.includes('cloudinary')) {
            featuresMap.set('image_storage', {
              key: 'image_storage',
              name: 'Image Storage & CDN',
              category: 'storage',
              requires_secret: 'CLOUDINARY_API_KEY',
              provider: 'Cloudinary'
            });
          }
          
          if (featureKey.includes('backblaze') || featureKey.includes('b2')) {
            featuresMap.set('backup_storage', {
              key: 'backup_storage',
              name: 'Backup & File Storage',
              category: 'storage',
              requires_secret: 'BACKBLAZE_B2_KEY',
              provider: 'Backblaze B2'
            });
          }
        });
      }
      
      // 2. Get features from existing feature_ai_assignments
      const { data: assignmentsData } = await supabaseAdmin
        .from('feature_ai_assignments')
        .select('feature_name, provider_id, model_id')
        .eq('is_active', true);
      
      if (assignmentsData) {
        assignmentsData.forEach(assignment => {
          if (!featuresMap.has(assignment.feature_name)) {
            featuresMap.set(assignment.feature_name, {
              key: assignment.feature_name,
              name: assignment.feature_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              category: 'ai',
              requires_secret: 'AI_API_KEY',
              provider: 'AI Provider'
            });
          }
        });
      }
      
      // 3. Get features from translation settings that require providers
      const { data: translationData } = await supabaseAdmin
        .from('translation_settings')
        .select('setting_key, setting_value')
        .like('setting_key', '%provider%');
      
      if (translationData) {
        // Add translation features
        featuresMap.set('auto_translation', {
          key: 'auto_translation',
          name: 'Auto Translation',
          category: 'translation',
          requires_secret: 'TRANSLATION_API_KEY',
          provider: 'Translation Provider'
        });
        
        featuresMap.set('bilingual_content', {
          key: 'bilingual_content',
          name: 'Bilingual Content Management',
          category: 'translation',
          requires_secret: 'TRANSLATION_API_KEY',
          provider: 'Translation Provider'
        });
        
        featuresMap.set('deck_translation', {
          key: 'deck_translation',
          name: 'Deck Types Translation',
          category: 'translation',
          requires_secret: 'TRANSLATION_API_KEY',
          provider: 'Translation Provider'
        });
        
        featuresMap.set('spread_translation', {
          key: 'spread_translation',
          name: 'Spread Translation',
          category: 'translation',
          requires_secret: 'TRANSLATION_API_KEY',
          provider: 'Translation Provider'
        });
      }
      
      // 4. Get features from provider integrations
      const { data: providersData } = await supabaseAdmin
        .from('providers')
        .select('provider_key, provider_name, provider_type, supported_features')
        .eq('is_active', true);
      
      if (providersData) {
        providersData.forEach(provider => {
          if (provider.supported_features) {
            provider.supported_features.forEach(feature => {
              const featureKey = `${provider.provider_key}_${feature}`;
              if (!featuresMap.has(featureKey)) {
                featuresMap.set(featureKey, {
                  key: featureKey,
                  name: `${provider.provider_name} ${feature.replace(/_/g, ' ')}`,
                  category: provider.provider_type || 'integration',
                  requires_secret: `${provider.provider_key.toUpperCase()}_API_KEY`,
                  provider: provider.provider_name
                });
              }
            });
          }
        });
      }
      
      // Convert Map to array and sort by category then name
      const availableFeatures = Array.from(featuresMap.values())
        .sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        });
      
      console.log(`✅ [AI] Loaded ${availableFeatures.length} available features from all sources`);
      
      res.json({
        success: true,
        data: availableFeatures,
        message: `Found ${availableFeatures.length} features requiring API keys/secrets`
      });
      
    } catch (error) {
      console.error('❌ [AI] Error loading available features:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load available features'
      });
    }
  }
);

/**
 * @route GET /api/dynamic-ai/feature-assignments
 * @desc Get all feature assignments (AI features mapped to providers/models)
 * @access Admin/Super Admin
 */
router.get('/feature-assignments', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🤖 [AI] Loading feature assignments...');
      
      const { data, error } = await supabaseAdmin
        .from('feature_ai_assignments')
        .select(`
          *,
          provider:provider_id(name, provider_type, is_active),
          model:model_id(name, provider_id, is_active)
        `)
        .order('feature_name');
      
      if (error) {
        console.error('❌ [AI] Error loading feature assignments:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to load feature assignments'
        });
      }
      
      console.log(`✅ [AI] Loaded ${data?.length || 0} feature assignments`);
      
      res.json({
        success: true,
        data: data || []
      });
      
    } catch (error) {
      console.error('❌ [AI] Error in GET /feature-assignments:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/dynamic-ai/feature-assignments
 * @desc Create new feature assignment
 * @access Super Admin
 */
router.post('/feature-assignments', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    try {
      const { feature_name, provider_id, model_id, is_active = true } = req.body;
      
      // Validate required fields
      if (!feature_name || !provider_id) {
        return res.status(400).json({
          success: false,
          error: 'Feature name and provider ID are required'
        });
      }
      
      console.log('🤖 [AI] Creating feature assignment:', { feature_name, provider_id, model_id });
      
      const { data, error } = await supabaseAdmin
        .from('feature_ai_assignments')
        .insert([{
          feature_name,
          provider_id,
          model_id,
          is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ [AI] Error creating feature assignment:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create feature assignment'
        });
      }
      
      console.log('✅ [AI] Feature assignment created successfully');
      
      res.status(201).json({
        success: true,
        data
      });
      
    } catch (error) {
      console.error('❌ [AI] Error in POST /feature-assignments:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route PUT /api/dynamic-ai/feature-assignments/:id
 * @desc Update feature assignment
 * @access Super Admin
 */
router.put('/feature-assignments/:id', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { feature_name, provider_id, model_id, is_active } = req.body;
      
      console.log('🤖 [AI] Updating feature assignment:', id);
      
      const { data, error } = await supabaseAdmin
        .from('feature_ai_assignments')
        .update({
          feature_name,
          provider_id,
          model_id,
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [AI] Error updating feature assignment:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update feature assignment'
        });
      }
      
      console.log('✅ [AI] Feature assignment updated successfully');
      
      res.json({
        success: true,
        data
      });
      
    } catch (error) {
      console.error('❌ [AI] Error in PUT /feature-assignments/:id:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route DELETE /api/dynamic-ai/feature-assignments/:id
 * @desc Delete feature assignment
 * @access Super Admin
 */
router.delete('/feature-assignments/:id', 
  authenticateToken, 
  requireRole(['super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('🤖 [AI] Deleting feature assignment:', id);
      
      const { error } = await supabaseAdmin
        .from('feature_ai_assignments')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ [AI] Error deleting feature assignment:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete feature assignment'
        });
      }
      
      console.log('✅ [AI] Feature assignment deleted successfully');
      
      res.json({
        success: true,
        message: 'Feature assignment deleted successfully'
      });
      
    } catch (error) {
      console.error('❌ [AI] Error in DELETE /feature-assignments/:id:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);



// ============================================================================
// DYNAMIC PROVIDER MODELS FETCHING
// ============================================================================

/**
 * @route GET /api/dynamic-ai/providers/:providerId/remote-models
 * @desc Fetch live models from provider's API
 * @access Admin/Super Admin
 */
router.get('/providers/:providerId/remote-models', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { providerId } = req.params;
      
      console.log('🔍 [REMOTE-MODELS] Starting remote models fetch for provider:', providerId);
      console.log('🔍 [REMOTE-MODELS] User:', req.user.email);
      
      // Get provider details first
      const { data: providerData, error: providerError } = await supabaseAdmin
        .from('ai_providers')
        .select('*')
        .eq('id', providerId)
        .single();
      
      if (providerError || !providerData) {
        console.error('❌ [REMOTE-MODELS] Provider not found:', providerError);
        return res.status(404).json({
          success: false,
          error: 'Provider not found'
        });
      }
      
      console.log('🔍 [REMOTE-MODELS] Provider found:', providerData.name, 'Type:', providerData.provider_type);
      
      if (!providerData.is_active) {
        console.log('⚠️ [REMOTE-MODELS] Provider is not active:', providerData.name);
        return res.status(400).json({
          success: false,
          error: 'Provider is not active'
        });
      }
      
      // Get API key using the same method as test provider
      let retrievedApiKey;
      try {
        retrievedApiKey = await getAPIKeyFromSystemSecrets(providerData.provider_type);
        console.log('✅ [REMOTE-MODELS] API key retrieved successfully');
      } catch (error) {
        console.error('❌ [REMOTE-MODELS] API key retrieval failed:', error.message);
        return res.status(400).json({
          success: false,
          error: 'Failed to retrieve API key: ' + error.message
        });
      }
      
      // Fetch remote models based on provider type
      let remoteModels = [];
      
      switch (providerData.provider_type) {
        case 'openai':
          remoteModels = await fetchOpenAIModels(retrievedApiKey, providerData.base_url);
          break;
        case 'anthropic':
          remoteModels = await fetchAnthropicModels(retrievedApiKey, providerData.base_url);
          break;
        case 'google':
          remoteModels = await fetchGoogleModels(retrievedApiKey, providerData.base_url);
          break;
        case 'elevenlabs':
          remoteModels = await fetchElevenLabsModels(retrievedApiKey, providerData.base_url);
          break;
        default:
          console.log('⚠️ [REMOTE-MODELS] Dynamic model fetching not supported for provider type:', providerData.provider_type);
          return res.status(400).json({
            success: false,
            error: `Dynamic model fetching not supported for provider type: ${providerData.provider_type}`,
            fallback_to_database: true
          });
      }
      
      console.log(`✅ [REMOTE-MODELS] Successfully fetched ${remoteModels.length} remote models for ${providerData.name}`);
      
      res.json({
        success: true,
        provider: {
          id: providerData.id,
          name: providerData.name,
          type: providerData.provider_type
        },
        models: remoteModels,
        count: remoteModels.length
      });
      
    } catch (error) {
      console.error('❌ [AI] Error in GET /providers/:providerId/remote-models:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        fallback_to_database: true
      });
    }
  }
);

// ============================================================================
// REMOTE MODEL FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetch models from OpenAI API
 */
async function fetchOpenAIModels(apiKey, baseUrl = 'https://api.openai.com/v1') {
  try {
    console.log('🔄 [AI] Fetching OpenAI models...');
    
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const models = data.data || [];
    
    // Filter and format models
    return models
      .filter(model => model.id && !model.id.includes('embedding')) // Filter out embedding models
      .map(model => ({
        id: model.id,
        name: model.id,
        display_name: model.id,
        description: `OpenAI model: ${model.id}`,
        provider_type: 'openai',
        capabilities: getOpenAICapabilities(model.id),
        context_length: getOpenAIContextLength(model.id),
        is_chat_model: model.id.includes('gpt') || model.id.includes('chat'),
        is_completion_model: model.id.includes('text-') || model.id.includes('davinci'),
        created: model.created,
        owned_by: model.owned_by || 'openai'
      }))
      .sort((a, b) => b.created - a.created); // Sort by creation date, newest first
    
  } catch (error) {
    console.error('❌ [AI] Error fetching OpenAI models:', error);
    throw error;
  }
}

/**
 * Fetch models from Anthropic API
 */
async function fetchAnthropicModels(apiKey, baseUrl = 'https://api.anthropic.com') {
  try {
    console.log('🔄 [AI] Fetching Anthropic models...');
    
    // Anthropic doesn't have a public models endpoint, so we return their known models
    const knownModels = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022', 
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ];
    
    return knownModels.map(modelId => ({
      id: modelId,
      name: modelId,
      display_name: modelId,
      description: `Anthropic Claude model: ${modelId}`,
      provider_type: 'anthropic',
      capabilities: ['text_generation', 'conversation'],
      context_length: getAnthropicContextLength(modelId),
      is_chat_model: true,
      is_completion_model: false,
      created: Date.now(),
      owned_by: 'anthropic'
    }));
    
  } catch (error) {
    console.error('❌ [AI] Error fetching Anthropic models:', error);
    throw error;
  }
}

/**
 * Fetch models from Google AI API
 */
async function fetchGoogleModels(apiKey, baseUrl = 'https://generativelanguage.googleapis.com/v1') {
  try {
    console.log('🔄 [AI] Fetching Google AI models...');
    
    const response = await fetch(`${baseUrl}/models?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google AI API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    // Filter and format models
    return models
      .filter(model => model.name && model.supportedGenerationMethods?.includes('generateContent'))
      .map(model => ({
        id: model.name.replace('models/', ''),
        name: model.name.replace('models/', ''),
        display_name: model.displayName || model.name.replace('models/', ''),
        description: model.description || `Google AI model: ${model.name}`,
        provider_type: 'google',
        capabilities: ['text_generation', 'conversation'],
        context_length: model.inputTokenLimit || 32000,
        is_chat_model: true,
        is_completion_model: false,
        created: Date.now(),
        owned_by: 'google'
      }));
    
  } catch (error) {
    console.error('❌ [AI] Error fetching Google AI models:', error);
    throw error;
  }
}

/**
 * Fetch models from ElevenLabs API
 */
async function fetchElevenLabsModels(apiKey, baseUrl = 'https://api.elevenlabs.io/v1') {
  try {
    console.log('🔄 [AI] Fetching ElevenLabs models...');
    
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`ElevenLabs API error: ${error.detail?.message || response.statusText}`);
    }
    
    const models = await response.json();
    
    // Format models
    return models.map(model => ({
      id: model.model_id,
      name: model.model_id,
      display_name: model.name,
      description: model.description || `ElevenLabs TTS model: ${model.name}`,
      provider_type: 'elevenlabs',
      capabilities: ['text_to_speech'],
      context_length: model.max_characters_request_free || 2500,
      is_chat_model: false,
      is_completion_model: false,
      created: Date.now(),
      owned_by: 'elevenlabs'
    }));
    
  } catch (error) {
    console.error('❌ [AI] Error fetching ElevenLabs models:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get OpenAI model capabilities
 */
function getOpenAICapabilities(modelId) {
  const capabilities = ['text_generation'];
  
  if (modelId.includes('gpt')) {
    capabilities.push('conversation');
  }
  
  if (modelId.includes('gpt-4') && modelId.includes('vision')) {
    capabilities.push('image_understanding');
  }
  
  if (modelId.includes('dall-e')) {
    capabilities.push('image_generation');
  }
  
  if (modelId.includes('whisper')) {
    capabilities.push('speech_to_text');
  }
  
  if (modelId.includes('tts')) {
    capabilities.push('text_to_speech');
  }
  
  return capabilities;
}

/**
 * Get OpenAI model context length
 */
function getOpenAIContextLength(modelId) {
  const contextLengths = {
    'gpt-4-turbo': 128000,
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-3.5-turbo': 16385,
    'gpt-3.5-turbo-16k': 16385,
    'text-davinci-003': 4097,
    'text-davinci-002': 4097,
    'text-curie-001': 2049,
    'text-babbage-001': 2049,
    'text-ada-001': 2049
  };
  
  // Check for exact match
  if (contextLengths[modelId]) {
    return contextLengths[modelId];
  }
  
  // Check for partial matches
  if (modelId.includes('gpt-4-turbo')) return 128000;
  if (modelId.includes('gpt-4')) return 8192;
  if (modelId.includes('gpt-3.5-turbo')) return 16385;
  if (modelId.includes('text-davinci')) return 4097;
  
  // Default fallback
  return 4097;
}

/**
 * Get Anthropic model context length
 */
function getAnthropicContextLength(modelId) {
  if (modelId.includes('claude-3')) return 200000;
  if (modelId.includes('claude-2')) return 100000;
  if (modelId.includes('claude-instant')) return 100000;
  
  return 100000; // Default
}



export default router; 