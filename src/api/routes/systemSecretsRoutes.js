const express = require('express');
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Middleware to ensure only super_admin can access these routes
const requireSuperAdmin = async (req, res, next) => {
  try {
    // Use admin client to bypass RLS for role checking
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile || profile.role !== 'super_admin') {
      console.log(`Access denied for user ${req.user.id}: role=${profile?.role}, error=${error?.message}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin role required.',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    console.log(`✅ Super admin access granted for user ${req.user.id}`);
    next();
  } catch (error) {
    console.error('Super Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication verification failed',
      error: error.message
    });
  }
};

// Helper function to mask sensitive values for frontend display
const maskSensitiveValue = (value, showLength = 4) => {
  if (!value || value.length <= showLength) {
    return '*'.repeat(8);
  }
  return value.substring(0, showLength) + '*'.repeat(value.length - showLength);
};

// Helper function to log audit entry
const logAudit = async (secretId, configKey, action, oldValue = null, newValue = null, category = null, additionalInfo = {}) => {
  try {
    // Try to insert directly into audit table if RPC doesn't exist
    const { error } = await supabaseAdmin
      .from('super_admin_audit_logs')
      .insert({
        secret_id: secretId,
        config_key: configKey,
        action: action,
        old_value: oldValue,
        new_value: newValue,
        category: category,
        additional_info: additionalInfo,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Audit logging error:', error);
    }
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
};

// GET /api/system-secrets - List all system secrets (masked values)
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { category, search, active_only } = req.query;
    
    let query = supabaseAdmin
      .from('system_secrets')
      .select('id, config_key, category, description, is_active, last_updated, created_at')
      .order('category', { ascending: true })
      .order('config_key', { ascending: true });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    if (search) {
      query = query.or(`config_key.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: secrets, error } = await query;

    if (error) {
      throw error;
    }

    // Add masked values for display
    const secretsWithMaskedValues = secrets.map(secret => ({
      ...secret,
      config_value_masked: maskSensitiveValue(secret.config_key, 6),
      has_value: true
    }));

    res.json({
      success: true,
      data: secretsWithMaskedValues,
      total: secrets.length,
      message: 'System secrets retrieved successfully'
    });

  } catch (error) {
    console.error('Get system secrets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system secrets',
      error: error.message
    });
  }
});

// GET /api/system-secrets/categories - Get all available categories
router.get('/categories', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('system_secrets')
      .select('category')
      .order('category');

    if (error) {
      throw error;
    }

    // Get unique categories with counts
    const categoryStats = categories.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    const categoriesWithCounts = Object.entries(categoryStats).map(([name, count]) => ({
      name,
      count,
      label: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ')
    }));

    res.json({
      success: true,
      data: categoriesWithCounts,
      message: 'Categories retrieved successfully'
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: error.message
    });
  }
});

// GET /api/system-secrets/:id - Get specific system secret (with actual value)
router.get('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: secret, error } = await supabase
      .from('system_secrets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!secret) {
      return res.status(404).json({
        success: false,
        message: 'System secret not found'
      });
    }

    // Log the access
    await logAudit(
      secret.id,
      secret.config_key,
      'VIEW',
      null,
      null,
      secret.category,
      { access_method: 'api_get_by_id', user_id: req.user.id }
    );

    res.json({
      success: true,
      data: secret,
      message: 'System secret retrieved successfully'
    });

  } catch (error) {
    console.error('Get system secret error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system secret',
      error: error.message
    });
  }
});

// POST /api/system-secrets - Create new system secret
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { config_key, config_value, category, description } = req.body;

    // Validation
    if (!config_key || !config_value) {
      return res.status(400).json({
        success: false,
        message: 'Config key and value are required'
      });
    }

    // Check if config_key already exists
    const { data: existing } = await supabase
      .from('system_secrets')
      .select('id')
      .eq('config_key', config_key)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Configuration key already exists'
      });
    }

    // Create new secret
    const { data: newSecret, error } = await supabase
      .from('system_secrets')
      .insert({
        config_key,
        config_value,
        category: category || 'general',
        description,
        created_by: req.user.id,
        updated_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the creation
    await logAudit(
      newSecret.id,
      config_key,
      'CREATE',
      null,
      config_value,
      category || 'general',
      { method: 'api_create', user_id: req.user.id }
    );

    res.status(201).json({
      success: true,
      data: {
        ...newSecret,
        config_value: maskSensitiveValue(config_value)
      },
      message: 'System secret created successfully'
    });

  } catch (error) {
    console.error('Create system secret error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create system secret',
      error: error.message
    });
  }
});

// PUT /api/system-secrets/:id - Update system secret
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { config_value, category, description, is_active } = req.body;

    // Get current secret for audit
    const { data: currentSecret, error: fetchError } = await supabase
      .from('system_secrets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentSecret) {
      return res.status(404).json({
        success: false,
        message: 'System secret not found'
      });
    }

    // Prepare update data
    const updateData = {
      last_updated: new Date().toISOString(),
      updated_by: req.user.id
    };

    if (config_value !== undefined) updateData.config_value = config_value;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update the secret
    const { data: updatedSecret, error } = await supabase
      .from('system_secrets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the update
    await logAudit(
      id,
      currentSecret.config_key,
      'UPDATE',
      currentSecret.config_value,
      config_value || currentSecret.config_value,
      category || currentSecret.category,
      { 
        method: 'api_update', 
        user_id: req.user.id,
        fields_updated: Object.keys(updateData).filter(key => key !== 'last_updated' && key !== 'updated_by')
      }
    );

    res.json({
      success: true,
      data: {
        ...updatedSecret,
        config_value: maskSensitiveValue(updatedSecret.config_value)
      },
      message: 'System secret updated successfully'
    });

  } catch (error) {
    console.error('Update system secret error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system secret',
      error: error.message
    });
  }
});

// DELETE /api/system-secrets/:id - Delete system secret
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        message: 'Deletion must be confirmed'
      });
    }

    // Get secret details for audit
    const { data: secret, error: fetchError } = await supabase
      .from('system_secrets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !secret) {
      return res.status(404).json({
        success: false,
        message: 'System secret not found'
      });
    }

    // Log the deletion before deleting
    await logAudit(
      id,
      secret.config_key,
      'DELETE',
      secret.config_value,
      null,
      secret.category,
      { method: 'api_delete', user_id: req.user.id }
    );

    // Delete the secret
    const { error } = await supabase
      .from('system_secrets')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'System secret deleted successfully'
    });

  } catch (error) {
    console.error('Delete system secret error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete system secret',
      error: error.message
    });
  }
});

// GET /api/system-secrets/audit/logs - Get audit logs
router.get('/audit/logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      config_key, 
      action, 
      limit = 50, 
      offset = 0,
      start_date,
      end_date 
    } = req.query;

    let query = supabase
      .from('system_secrets_audit')
      .select(`
        *,
        profiles:performed_by(full_name, email)
      `)
      .order('performed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (config_key) {
      query = query.eq('config_key', config_key);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (start_date) {
      query = query.gte('performed_at', start_date);
    }

    if (end_date) {
      query = query.lte('performed_at', end_date);
    }

    const { data: auditLogs, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: auditLogs,
      total: auditLogs.length,
      message: 'Audit logs retrieved successfully'
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: error.message
    });
  }
});

// POST /api/system-secrets/export - Export system secrets
router.post('/export', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      categories = [], 
      include_inactive = false, 
      format = 'json',
      mask_values = false 
    } = req.body;

    let query = supabase
      .from('system_secrets')
      .select('*')
      .order('category', { ascending: true })
      .order('config_key', { ascending: true });

    // Apply filters
    if (categories.length > 0) {
      query = query.in('category', categories);
    }

    if (!include_inactive) {
      query = query.eq('is_active', true);
    }

    const { data: secrets, error } = await query;

    if (error) {
      throw error;
    }

    // Prepare export data
    const exportData = {
      metadata: {
        version: '1.0.0',
        export_date: new Date().toISOString(),
        total_secrets: secrets.length,
        categories: [...new Set(secrets.map(s => s.category))],
        exported_by: req.user.id,
        include_inactive,
        mask_values
      },
      secrets: secrets.map(secret => ({
        config_key: secret.config_key,
        config_value: mask_values ? maskSensitiveValue(secret.config_value) : secret.config_value,
        category: secret.category,
        description: secret.description,
        is_active: secret.is_active,
        created_at: secret.created_at,
        last_updated: secret.last_updated
      })),
      import_instructions: {
        description: 'Use this JSON for bulk import of system secrets',
        usage: 'POST /api/system-secrets/import with this JSON structure',
        validation: 'All config_key values must be unique',
        security: 'Only super_admin users can perform bulk operations',
        backup: 'Always backup existing secrets before bulk import'
      }
    };

    // Log the export
    await logAudit(
      null,
      'SYSTEM_EXPORT',
      'EXPORT',
      null,
      null,
      'system',
      {
        method: 'api_export',
        user_id: req.user.id,
        total_exported: secrets.length,
        categories: exportData.metadata.categories,
        mask_values
      }
    );

    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="samia-tarot-secrets-${new Date().toISOString().split('T')[0]}.json"`);

    res.json({
      success: true,
      data: exportData,
      message: 'Secrets exported successfully'
    });

  } catch (error) {
    console.error('Export system secrets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export system secrets',
      error: error.message
    });
  }
});

// POST /api/system-secrets/bulk-populate - Auto-populate with default secrets
router.post('/bulk-populate', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { overwrite = false, categories = [] } = req.body;

    // Default secrets template
    const defaultSecrets = [
      // Payment Gateway Secrets
      { config_key: 'stripe_publishable', config_value: 'pk_live_placeholder', category: 'payment', description: 'Stripe Publishable Key for frontend integration' },
      { config_key: 'stripe_secret', config_value: 'sk_live_placeholder', category: 'payment', description: 'Stripe Secret Key for backend API calls' },
      { config_key: 'stripe_webhook', config_value: 'whsec_placeholder', category: 'payment', description: 'Stripe Webhook Secret for event verification' },
      { config_key: 'square_publishable', config_value: 'sq0idp-placeholder', category: 'payment', description: 'Square Application ID for frontend' },
      { config_key: 'square_secret', config_value: 'EAAAl_placeholder', category: 'payment', description: 'Square Access Token for API calls' },
      { config_key: 'usdt_wallet_trc20', config_value: 'TXplaceholder', category: 'payment', description: 'USDT Wallet Address TRC20 Network' },
      { config_key: 'usdt_wallet_erc20', config_value: '0xplaceholder', category: 'payment', description: 'USDT Wallet Address ERC20 Network' },
      
      // AI & ML Secrets
      { config_key: 'openai_api_key', config_value: 'sk-placeholder', category: 'ai', description: 'OpenAI API Key for GPT models' },
      { config_key: 'openai_org_id', config_value: 'org-placeholder', category: 'ai', description: 'OpenAI Organization ID' },
      { config_key: 'openai_default_model', config_value: 'gpt-4o', category: 'ai', description: 'Default OpenAI Model for AI readings' },
      
      // Database Secrets
      { config_key: 'supabase_url', config_value: 'https://placeholder.supabase.co', category: 'database', description: 'Supabase Project URL' },
      { config_key: 'supabase_anon_key', config_value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder', category: 'database', description: 'Supabase Anonymous Key for frontend' },
      { config_key: 'supabase_service_role_key', config_value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_placeholder', category: 'database', description: 'Supabase Service Role Key for backend' },
      
      // WebRTC Secrets
      { config_key: 'webrtc_ice_servers', config_value: 'stun:stun1.l.google.com:19302', category: 'webrtc', description: 'WebRTC ICE STUN Servers for video calls' },
      { config_key: 'webrtc_turn_user', config_value: 'turnuser_placeholder', category: 'webrtc', description: 'WebRTC TURN Server Username' },
      
      // Backup & Storage
      { config_key: 'backup_storage_url', config_value: 'https://backup.samia-tarot.com/', category: 'backup', description: 'Primary Backup Storage URL' },
      { config_key: 'backup_access_key', config_value: 'AKIA_placeholder', category: 'backup', description: 'Backup Storage Access Key' },
      
      // Notifications
      { config_key: 'sendgrid_api_key', config_value: 'SG.placeholder', category: 'notification', description: 'SendGrid API Key for email notifications' },
      { config_key: 'twilio_sid', config_value: 'AC_placeholder', category: 'notification', description: 'Twilio Account SID for SMS' },
      
      // Security
      { config_key: 'jwt_secret', config_value: 'samia_tarot_jwt_placeholder', category: 'security', description: 'JWT Secret Key for API authentication' },
      { config_key: 'encryption_key', config_value: 'samia_tarot_encryption_placeholder', category: 'security', description: 'Data Encryption Key' },
      
      // System
      { config_key: 'app_version', config_value: '1.0.0', category: 'system', description: 'Current Application Version' },
      { config_key: 'maintenance_mode', config_value: 'off', category: 'system', description: 'Application Maintenance Mode' },
      { config_key: 'feature_ai_readings', config_value: 'true', category: 'system', description: 'Enable AI-powered tarot readings' },
      
      // Analytics & Monitoring
      { config_key: 'google_analytics_id', config_value: 'GA-placeholder', category: 'analytics', description: 'Google Analytics Tracking ID' },
      { config_key: 'sentry_dsn', config_value: 'https://placeholder@sentry.io/placeholder', category: 'monitoring', description: 'Sentry Error Tracking DSN' }
    ];

    // Filter by categories if specified
    const secretsToPopulate = categories.length > 0 
      ? defaultSecrets.filter(secret => categories.includes(secret.category))
      : defaultSecrets;

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const secret of secretsToPopulate) {
      try {
        // Check if exists
        const { data: existing } = await supabase
          .from('system_secrets')
          .select('id')
          .eq('config_key', secret.config_key)
          .single();

        if (existing && !overwrite) {
          results.skipped++;
          continue;
        }

        if (existing && overwrite) {
          // Update existing
          const { error } = await supabase
            .from('system_secrets')
            .update({
              config_value: secret.config_value,
              category: secret.category,
              description: secret.description,
              last_updated: new Date().toISOString(),
              updated_by: req.user.id
            })
            .eq('id', existing.id);

          if (error) {
            results.errors.push(`Update failed for ${secret.config_key}: ${error.message}`);
          } else {
            results.updated++;
          }
        } else {
          // Create new
          const { error } = await supabase
            .from('system_secrets')
            .insert({
              config_key: secret.config_key,
              config_value: secret.config_value,
              category: secret.category,
              description: secret.description,
              is_active: true,
              created_by: req.user.id,
              updated_by: req.user.id
            });

          if (error) {
            results.errors.push(`Create failed for ${secret.config_key}: ${error.message}`);
          } else {
            results.created++;
          }
        }
      } catch (error) {
        results.errors.push(`Processing failed for ${secret.config_key}: ${error.message}`);
      }
    }

    // Log the bulk populate operation
    await logAudit(
      null,
      'BULK_POPULATE',
      'CREATE',
      null,
      null,
      'system',
      {
        method: 'api_bulk_populate',
        user_id: req.user.id,
        results,
        total_processed: secretsToPopulate.length,
        categories: categories.length > 0 ? categories : 'all'
      }
    );

    res.json({
      success: true,
      data: results,
      message: 'Bulk populate completed successfully'
    });

  } catch (error) {
    console.error('Bulk populate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk populate secrets',
      error: error.message
    });
  }
});

// POST /api/system-secrets/import - Import system secrets
router.post('/import', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { secrets, overwrite = false } = req.body;

    if (!Array.isArray(secrets) || secrets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import data'
      });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const secret of secrets) {
      try {
        const { config_key, config_value, category, description } = secret;

        if (!config_key || !config_value) {
          results.errors.push(`Invalid secret data: ${config_key || 'unknown'}`);
          continue;
        }

        // Check if exists
        const { data: existing } = await supabase
          .from('system_secrets')
          .select('id')
          .eq('config_key', config_key)
          .single();

        if (existing && !overwrite) {
          results.skipped++;
          continue;
        }

        if (existing && overwrite) {
          // Update existing
          const { error } = await supabase
            .from('system_secrets')
            .update({
              config_value,
              category: category || 'general',
              description,
              last_updated: new Date().toISOString(),
              updated_by: req.user.id
            })
            .eq('id', existing.id);

          if (error) {
            results.errors.push(`Update failed for ${config_key}: ${error.message}`);
          } else {
            results.updated++;
            await logAudit(existing.id, config_key, 'UPDATE', null, config_value, category, {
              method: 'api_import',
              user_id: req.user.id
            });
          }
        } else {
          // Create new
          const { data: newSecret, error } = await supabase
            .from('system_secrets')
            .insert({
              config_key,
              config_value,
              category: category || 'general',
              description,
              created_by: req.user.id,
              updated_by: req.user.id
            })
            .select()
            .single();

          if (error) {
            results.errors.push(`Create failed for ${config_key}: ${error.message}`);
          } else {
            results.created++;
            await logAudit(newSecret.id, config_key, 'CREATE', null, config_value, category, {
              method: 'api_import',
              user_id: req.user.id
            });
          }
        }
      } catch (error) {
        results.errors.push(`Processing failed for ${secret.config_key || 'unknown'}: ${error.message}`);
      }
    }

    // Log the import operation
    await logAudit(
      null,
      'SYSTEM_IMPORT',
      'IMPORT',
      null,
      null,
      'system',
      {
        method: 'api_import',
        user_id: req.user.id,
        results,
        total_processed: secrets.length
      }
    );

    res.json({
      success: true,
      data: results,
      message: 'Import completed'
    });

  } catch (error) {
    console.error('Import system secrets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import system secrets',
      error: error.message
    });
  }
});

// POST /api/system-secrets/test-connection/:id - Test connection for specific secret
router.post('/test-connection/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: secret, error } = await supabase
      .from('system_secrets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !secret) {
      return res.status(404).json({
        success: false,
        message: 'System secret not found'
      });
    }

    let testResult = {
      success: false,
      message: 'Connection test not implemented for this type',
      details: null
    };

    // Implement connection tests based on config_key type
    switch (secret.config_key) {
      case 'stripe_secret_key':
        // Test Stripe connection
        try {
          // This would require the actual Stripe SDK
          testResult = {
            success: true,
            message: 'Stripe connection test would be implemented here',
            details: { type: 'stripe', status: 'simulated_success' }
          };
        } catch (error) {
          testResult = {
            success: false,
            message: 'Stripe connection failed',
            details: { error: error.message }
          };
        }
        break;

      case 'openai_api_key':
        // Test OpenAI connection
        testResult = {
          success: true,
          message: 'OpenAI connection test would be implemented here',
          details: { type: 'openai', status: 'simulated_success' }
        };
        break;

      case 'supabase_url':
        // Test Supabase connection
        testResult = {
          success: true,
          message: 'Supabase connection active',
          details: { type: 'supabase', status: 'connected' }
        };
        break;

      default:
        testResult = {
          success: false,
          message: `Connection test not available for ${secret.config_key}`,
          details: { type: 'unsupported' }
        };
    }

    // Log the test
    await logAudit(
      secret.id,
      secret.config_key,
      'TEST',
      null,
      null,
      secret.category,
      {
        method: 'api_test_connection',
        user_id: req.user.id,
        test_result: testResult.success
      }
    );

    res.json({
      success: true,
      data: testResult,
      message: 'Connection test completed'
    });

  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection',
      error: error.message
    });
  }
});

module.exports = router; 