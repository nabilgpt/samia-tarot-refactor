/**
 * Enhanced Providers & Secrets Management API Routes
 * SAMIA TAROT - Dashboard Enhancement
 * 
 * RESTful API endpoints for managing providers, services, models, and secrets
 */

import express from 'express';
import enhancedProvidersService from '../services/enhancedProvidersService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Check if user has admin privileges
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required'
    });
  }
  next();
};

/**
 * Check if user has super admin privileges
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Super admin privileges required'
    });
  }
  next();
};

// ============================================================================
// PROVIDERS ROUTES
// ============================================================================

/**
 * GET /api/enhanced-providers/providers
 * Get all providers with optional filtering
 */
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };

    const result = await enhancedProvidersService.getProviders(filters);
    res.json(result);
  } catch (error) {
    console.error('Error in GET /providers:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/enhanced-providers/providers/:id
 * Get single provider by ID
 */
router.get('/providers/:id', authenticateToken, async (req, res) => {
  try {
    const result = await enhancedProvidersService.getProvider(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error in GET /providers/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/enhanced-providers/providers
 * Create new provider
 */
router.post('/providers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, type, logo_url, description } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required'
      });
    }

    const providerData = {
      name: name.trim(),
      type,
      logo_url,
      description
    };

    const result = await enhancedProvidersService.createProvider(providerData);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error in POST /providers:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/enhanced-providers/providers/:id
 * Update provider
 */
router.put('/providers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, type, logo_url, description, active } = req.body;

    const providerData = {};
    if (name !== undefined) providerData.name = name.trim();
    if (type !== undefined) providerData.type = type;
    if (logo_url !== undefined) providerData.logo_url = logo_url;
    if (description !== undefined) providerData.description = description;
    if (active !== undefined) providerData.active = active;

    const result = await enhancedProvidersService.updateProvider(req.params.id, providerData);
    res.json(result);
  } catch (error) {
    console.error('Error in PUT /providers/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/enhanced-providers/providers/:id
 * Delete provider
 */
router.delete('/providers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await enhancedProvidersService.deleteProvider(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error in DELETE /providers/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================================================
// SERVICES ROUTES
// ============================================================================

/**
 * GET /api/enhanced-providers/services
 * Get all services with optional filtering
 */
router.get('/services', authenticateToken, async (req, res) => {
  try {
    const filters = {
      provider_id: req.query.provider_id,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      search: req.query.search
    };

    const result = await enhancedProvidersService.getServices(filters);
    res.json(result);
  } catch (error) {
    console.error('Error in GET /services:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/enhanced-providers/services
 * Create new service
 */
router.post('/services', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { provider_id, name, description } = req.body;

    // Validation
    if (!provider_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID and name are required'
      });
    }

    const serviceData = {
      provider_id,
      name: name.trim(),
      description
    };

    const result = await enhancedProvidersService.createService(serviceData);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error in POST /services:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/enhanced-providers/services/:id
 * Update service
 */
router.put('/services/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, active } = req.body;

    const serviceData = {};
    if (name !== undefined) serviceData.name = name.trim();
    if (description !== undefined) serviceData.description = description;
    if (active !== undefined) serviceData.active = active;

    const result = await enhancedProvidersService.updateService(req.params.id, serviceData);
    res.json(result);
  } catch (error) {
    console.error('Error in PUT /services/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/enhanced-providers/services/:id
 * Delete service
 */
router.delete('/services/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await enhancedProvidersService.deleteService(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error in DELETE /services/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================================================
// MODELS ROUTES
// ============================================================================

/**
 * GET /api/enhanced-providers/models
 * Get all models with optional filtering
 */
router.get('/models', authenticateToken, async (req, res) => {
  try {
    const filters = {
      provider_id: req.query.provider_id,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      search: req.query.search
    };

    const result = await enhancedProvidersService.getModels(filters);
    res.json(result);
  } catch (error) {
    console.error('Error in GET /models:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/enhanced-providers/models
 * Create new model
 */
router.post('/models', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { provider_id, name, description } = req.body;

    // Validation
    if (!provider_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID and name are required'
      });
    }

    const modelData = {
      provider_id,
      name: name.trim(),
      description
    };

    const result = await enhancedProvidersService.createModel(modelData);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error in POST /models:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/enhanced-providers/models/:id
 * Update model
 */
router.put('/models/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, active } = req.body;

    const modelData = {};
    if (name !== undefined) modelData.name = name.trim();
    if (description !== undefined) modelData.description = description;
    if (active !== undefined) modelData.active = active;

    const result = await enhancedProvidersService.updateModel(req.params.id, modelData);
    res.json(result);
  } catch (error) {
    console.error('Error in PUT /models/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/enhanced-providers/models/:id
 * Delete model
 */
router.delete('/models/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await enhancedProvidersService.deleteModel(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error in DELETE /models/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================================================
// SECRETS ROUTES (SUPER ADMIN ONLY)
// ============================================================================

/**
 * GET /api/enhanced-providers/secrets
 * Get all secrets with optional filtering (super admin only)
 */
router.get('/secrets', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const filters = {
      provider_id: req.query.provider_id,
      model_id: req.query.model_id,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      usage_scope: req.query.usage_scope,
      region: req.query.region,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    };

    const result = await enhancedProvidersService.getSecrets(filters);
    res.json(result);
  } catch (error) {
    console.error('Error in GET /secrets:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/enhanced-providers/secrets/:id
 * Get single secret by ID with decrypted value (super admin only)
 */
router.get('/secrets/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await enhancedProvidersService.getSecret(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error in GET /secrets/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/enhanced-providers/secrets
 * Create new secret (super admin only)
 */
router.post('/secrets', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      provider_id, 
      model_id, 
      secret_key, 
      secret_value, 
      usage_scope, 
      services, 
      region, 
      expiration_date, 
      tags, 
      description 
    } = req.body;

    // Validation
    if (!provider_id || !secret_key || !secret_value) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID, secret key, and secret value are required'
      });
    }

    const secretData = {
      provider_id,
      model_id: model_id || null,
      secret_key: secret_key.trim(),
      secret_value,
      usage_scope: usage_scope || ['backend'],
      services: services || [],
      region,
      expiration_date,
      tags: tags || [],
      description
    };

    const result = await enhancedProvidersService.createSecret(secretData);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error in POST /secrets:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/enhanced-providers/secrets/:id
 * Update secret (super admin only)
 */
router.put('/secrets/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      secret_key, 
      secret_value, 
      usage_scope, 
      services, 
      region, 
      expiration_date, 
      tags, 
      description, 
      active 
    } = req.body;

    const secretData = {};
    if (secret_key !== undefined) secretData.secret_key = secret_key.trim();
    if (secret_value !== undefined) secretData.secret_value = secret_value;
    if (usage_scope !== undefined) secretData.usage_scope = usage_scope;
    if (services !== undefined) secretData.services = services;
    if (region !== undefined) secretData.region = region;
    if (expiration_date !== undefined) secretData.expiration_date = expiration_date;
    if (tags !== undefined) secretData.tags = tags;
    if (description !== undefined) secretData.description = description;
    if (active !== undefined) secretData.active = active;

    const result = await enhancedProvidersService.updateSecret(req.params.id, secretData);
    res.json(result);
  } catch (error) {
    console.error('Error in PUT /secrets/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/enhanced-providers/secrets/:id
 * Delete secret (super admin only)
 */
router.delete('/secrets/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await enhancedProvidersService.deleteSecret(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error in DELETE /secrets/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/enhanced-providers/secrets/:id/test
 * Test secret connectivity (super admin only)
 */
router.post('/secrets/:id/test', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await enhancedProvidersService.testSecret(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error in POST /secrets/:id/test:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================================================
// UTILITY ROUTES
// ============================================================================

/**
 * GET /api/enhanced-providers/provider-types
 * Get all available provider types
 */
router.get('/provider-types', authenticateToken, async (req, res) => {
  try {
    const result = await enhancedProvidersService.getProviderTypes();
    res.json(result);
  } catch (error) {
    console.error('Error in GET /provider-types:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/enhanced-providers/usage-scopes
 * Get all available usage scopes
 */
router.get('/usage-scopes', authenticateToken, async (req, res) => {
  try {
    const result = await enhancedProvidersService.getUsageScopes();
    res.json(result);
  } catch (error) {
    console.error('Error in GET /usage-scopes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/enhanced-providers/stats
 * Get overall system statistics
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const providersResult = await enhancedProvidersService.getProviders();
    const servicesResult = await enhancedProvidersService.getServices();
    const modelsResult = await enhancedProvidersService.getModels();
    const secretsResult = await enhancedProvidersService.getSecrets();

    const stats = {
      providers: {
        total: providersResult.data?.length || 0,
        active: providersResult.data?.filter(p => p.active).length || 0,
        by_type: {}
      },
      services: {
        total: servicesResult.data?.length || 0,
        active: servicesResult.data?.filter(s => s.active).length || 0
      },
      models: {
        total: modelsResult.data?.length || 0,
        active: modelsResult.data?.filter(m => m.active).length || 0
      },
      secrets: {
        total: secretsResult.data?.length || 0,
        active: secretsResult.data?.filter(s => s.active).length || 0
      }
    };

    // Calculate provider type distribution
    if (providersResult.data) {
      providersResult.data.forEach(provider => {
        const type = provider.type;
        if (!stats.providers.by_type[type]) {
          stats.providers.by_type[type] = 0;
        }
        stats.providers.by_type[type]++;
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in GET /stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 