const express = require('express');
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to ensure only admin/super_admin can access config routes
const requireAdmin = async (req, res, next) => {
  try {
    // Use admin client to bypass RLS for role checking
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile || !['admin', 'super_admin'].includes(profile.role)) {
      console.log(`Config access denied for user ${req.user.id}: role=${profile?.role}, error=${error?.message}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    console.log(`✅ Config access granted for user ${req.user.id} (${profile.role})`);
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication verification failed',
      error: error.message
    });
  }
};

// GET /api/config - Get all configuration values
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: configData, error } = await supabaseAdmin
      .from('app_config')
      .select('key, value, section, encrypted, created_at, updated_at')
      .order('section', { ascending: true })
      .order('key', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: configData || [],
      total: configData?.length || 0,
      message: 'Configuration retrieved successfully'
    });

  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve configuration',
      error: error.message
    });
  }
});

// GET /api/config/:key - Get specific configuration value
router.get('/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;

    const { data: configItem, error } = await supabaseAdmin
      .from('app_config')
      .select('*')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!configItem) {
      return res.status(404).json({
        success: false,
        message: 'Configuration key not found'
      });
    }

    res.json({
      success: true,
      data: configItem,
      message: 'Configuration value retrieved successfully'
    });

  } catch (error) {
    console.error('Get config key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve configuration value',
      error: error.message
    });
  }
});

// PUT /api/config - Update or create configuration value
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key, value, section = 'general', encrypted = false } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Configuration key is required'
      });
    }

    // Convert value to JSON string for storage
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

    const { data, error } = await supabaseAdmin
      .from('app_config')
      .upsert({
        key,
        value: jsonValue,
        section,
        encrypted,
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: error.message
    });
  }
});

// DELETE /api/config/:key - Delete configuration value
router.delete('/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;

    const { error } = await supabaseAdmin
      .from('app_config')
      .delete()
      .eq('key', key);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Configuration deleted successfully'
    });

  } catch (error) {
    console.error('Delete config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete configuration',
      error: error.message
    });
  }
});

// GET /api/config/section/:section - Get configuration by section
router.get('/section/:section', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { section } = req.params;

    const { data: configData, error } = await supabaseAdmin
      .from('app_config')
      .select('key, value, section, encrypted, created_at, updated_at')
      .eq('section', section)
      .order('key', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: configData || [],
      total: configData?.length || 0,
      section,
      message: `Configuration for section '${section}' retrieved successfully`
    });

  } catch (error) {
    console.error('Get config by section error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve configuration by section',
      error: error.message
    });
  }
});

// POST /api/config/bulk - Bulk update configuration values
router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Configs array is required and must not be empty'
      });
    }

    // Prepare bulk upsert data
    const bulkData = configs.map(config => ({
      key: config.key,
      value: typeof config.value === 'string' ? config.value : JSON.stringify(config.value),
      section: config.section || 'general',
      encrypted: config.encrypted || false,
      updated_by: req.user.id,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabaseAdmin
      .from('app_config')
      .upsert(bulkData, {
        onConflict: 'key'
      })
      .select();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data,
      total: data?.length || 0,
      message: `${data?.length || 0} configuration values updated successfully`
    });

  } catch (error) {
    console.error('Bulk update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update configuration',
      error: error.message
    });
  }
});

module.exports = router; 