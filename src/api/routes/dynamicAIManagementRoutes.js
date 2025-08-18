import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getAPIKeyFromSystemSecrets } from './helpers/aiSecrets.js';

const router = express.Router();

// ============================================================================
// AI PROVIDERS MANAGEMENT
// ============================================================================

/**
 * @route   POST /api/dynamic-ai/providers
 * @desc    Create a new AI provider and its corresponding secret
 * @access  Super Admin
 */
router.post('/providers', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  const { name, provider_type, api_endpoint, description } = req.body;

  if (!name || !provider_type || !api_endpoint) {
    return res.status(400).json({ success: false, message: 'Name, Provider Type, and API Endpoint are required.' });
  }

  try {
    // Auto-generate the configuration_key
    const configuration_key = `${name.toLowerCase().replace(/ /g, '_')}_api_key`;

    const { data: provider, error: providerError } = await supabaseAdmin
        .from('ai_providers')
        .insert([{ name, provider_type, api_endpoint, description, configuration_key }])
        .select()
        .single();

    if (providerError) {
      throw providerError;
    }

    // Step 2: Auto-generate and create the corresponding secret
    const secret_key = `${name.toLowerCase().replace(/\s+/g, '_')}_api_key`;
    const { data: secret, error: secretError } = await supabaseAdmin
      .from('system_secrets')
      .insert({
        secret_key,
        display_name: `${name} API Key`,
        description: `API Key for the ${name} provider. Automatically generated.`,
        secret_category: 'ai_provider',
        secret_subcategory: provider_type,
        provider_name: name,
        is_active: true,
        created_by: req.user.user_id
      })
      .select()
      .single();

    if (secretError) {
      // Rollback provider creation if secret creation fails
      await supabaseAdmin.from('ai_providers').delete().eq('id', provider.id);
      throw secretError;
    }

    res.status(201).json({ 
      success: true, 
      message: 'Provider and its secret configuration created successfully.',
      data: { provider, secret }
    });

  } catch (error) {
    console.error('Error creating AI provider and secret:', error);
    res.status(500).json({ success: false, message: 'Failed to create provider.', error: error.message });
  }
});

/**
 * @route   GET /api/dynamic-ai/providers
 * @desc    Get all AI providers
 * @access  Super Admin
 */
router.get('/providers', authenticateToken, requireRole(['super_admin']), async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('ai_providers')
            .select('id, name, provider_type, configuration_key, is_active, created_at')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ [AI] Error fetching providers:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch AI providers' });
    }
});

/**
 * @route   GET /api/dynamic-ai/providers/config-keys
 * @desc    Get all provider configuration keys for secret creation
 * @access  Super Admin
 */
router.get('/providers/config-keys', authenticateToken, requireRole(['super_admin']), async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('ai_providers')
            .select('name, configuration_key');

        if (error) throw error;

        const keys = data.map(p => ({
            label: `${p.name} (auto)`,
            value: p.configuration_key
        }));
        
        // Add a custom option
        keys.push({ label: 'Custom Secret Key...', value: 'custom' });

        res.json({ success: true, keys });
    } catch (error) {
        console.error('❌ [AI] Error fetching config keys:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch provider config keys' });
    }
});

// ============================================================================
// AI MODELS MANAGEMENT
// ============================================================================

/**
 * @route   POST /api/dynamic-ai/models
 * @desc    Create a new AI model for a provider
 * @access  Super Admin
 */
router.post('/models', authenticateToken, requireRole(['super_admin']), async (req, res) => {
    const { provider_id, model_name, display_name, model_type, description } = req.body;

    if (!provider_id || !model_name || !display_name || !model_type) {
        return res.status(400).json({ success: false, message: 'Provider, Model Name, Display Name, and Model Type are required.' });
    }

    try {
        const { data: model, error } = await supabaseAdmin
            .from('ai_models')
            .insert({ provider_id, model_name, display_name, model_type, description, is_active: true, created_by: req.user.user_id })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, message: 'Model created successfully.', data: model });
    } catch (error) {
        console.error('Error creating AI model:', error);
        res.status(500).json({ success: false, message: 'Failed to create model.', error: error.message });
    }
});

// ============================================================================
// FEATURE ASSIGNMENTS MANAGEMENT
// ============================================================================

/**
 * @route   POST /api/dynamic-ai/assignments
 * @desc    Assign a model to a feature
 * @access  Super Admin
 */
router.post('/assignments', authenticateToken, requireRole(['super_admin']), async (req, res) => {
    const { feature_name, feature_category, primary_provider_id, primary_model_id } = req.body;

    if (!feature_name || !feature_category || !primary_provider_id || !primary_model_id) {
        return res.status(400).json({ success: false, message: 'All fields are required to create an assignment.' });
    }

    try {
        const { data: assignment, error } = await supabaseAdmin
            .from('feature_ai_assignments')
            .insert({ feature_name, feature_category, primary_provider_id, primary_model_id, is_active: true, created_by: req.user.user_id })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, message: 'Feature assignment created successfully.', data: assignment });
    } catch (error) {
        console.error('Error creating feature assignment:', error);
        res.status(500).json({ success: false, message: 'Failed to create assignment.', error: error.message });
    }
});

export default router; 