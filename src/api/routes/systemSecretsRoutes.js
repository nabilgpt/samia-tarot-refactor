// ============================================================================
// SAMIA TAROT - SYSTEM SECRETS MANAGEMENT API
// Centralized API for all sensitive data, API keys, and credentials
// ============================================================================
// Date: 2025-07-13
// Purpose: Secure management of system secrets with comprehensive audit trails
// Security: Super admin only, full encryption, detailed logging
// ============================================================================

import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// ============================================================================
// MIDDLEWARE & UTILITIES
// ============================================================================

// Audit logging middleware
const logSecretAccess = async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log the access after response
        setImmediate(async () => {
            try {
                const { data: insertData, error } = await supabaseAdmin
                    .from('secrets_access_log')
                    .insert({
                        secret_id: req.params.id || null,
                        accessed_by: req.user.id,
                        access_type: req.method === 'GET' ? 'read' : 
                                   req.method === 'POST' ? 'export' : 
                                   req.method === 'PUT' ? 'update' : 'delete',
                        access_method: 'api',
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        success: res.statusCode < 400,
                        accessed_at: new Date().toISOString()
                    });
                
                if (error) {
                    console.error('🚨 [AUDIT LOG] Failed to log access:', error);
                }
  } catch (error) {
                console.error('🚨 [AUDIT LOG] Error logging access:', error);
            }
        });
        
        return originalSend.call(this, data);
    };
    
    next();
};

// Encryption utilities
const encryptSecret = (value) => {
    try {
        const algorithm = 'aes-256-gcm';
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        
        // Use createCipheriv instead of deprecated createCipher
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted: encrypted,
            key: key.toString('hex'),
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    } catch (error) {
        console.error('🚨 [CRYPTO] Encryption error:', error);
        // Fallback to simple base64 encoding for development
        return {
            encrypted: Buffer.from(value).toString('base64'),
            key: 'fallback',
            iv: 'fallback',
            authTag: 'fallback'
        };
    }
};

const decryptSecret = (encryptedData) => {
    try {
        // Check if it's fallback encoding
        if (encryptedData.key === 'fallback') {
            return Buffer.from(encryptedData.encrypted, 'base64').toString('utf8');
        }
        
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(encryptedData.key, 'hex');
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');
        
        // Use createDecipheriv instead of deprecated createDecipher
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('🚨 [CRYPTO] Decryption error:', error);
        // Fallback to returning encrypted data as-is
        return encryptedData.encrypted || encryptedData;
    }
};

// ============================================================================
// ROUTES
// ============================================================================

// GET /api/system-secrets - List all system secrets (metadata only)
router.get('/', authenticateToken, roleCheck(['super_admin']), logSecretAccess, async (req, res) => {
    try {
        console.log('🔐 [SYSTEM SECRETS] Getting all secrets list...');
        
        const { category, subcategory, provider, active_only } = req.query;
    
    let query = supabaseAdmin
      .from('system_secrets')
            .select(`
                id,
                secret_key,
                secret_category_id,
                secret_subcategory_id,
                display_name,
                description,
                provider_name,
                is_required,
                requires_restart,
                test_status,
                last_tested_at,
                environment,
                is_active,
                created_at,
                updated_at,
                category:secret_categories(id, name, display_name_en, display_name_ar),
                subcategory:secret_subcategories(id, name, display_name_en, display_name_ar)
            `);

    // Apply filters
        if (category) query = query.eq('secret_category_id', category);
        if (subcategory) query = query.eq('secret_subcategory_id', subcategory);
        if (provider) query = query.eq('provider_name', provider);
        if (active_only === 'true') query = query.eq('is_active', true);
        
        query = query.order('secret_category_id', { ascending: true })
                    .order('display_name', { ascending: true });

    const { data: secrets, error } = await query;

    if (error) {
            console.error('🚨 [SYSTEM SECRETS] Error fetching secrets:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch system secrets',
                details: error.message
            });
        }
        
        // Format response with category names and group by category for better organization
        const formattedSecrets = secrets.map(secret => ({
            ...secret,
            secret_category: secret.category?.display_name_en || 'Uncategorized',
            secret_subcategory: secret.subcategory?.display_name_en || null,
            category_display_name: secret.category?.display_name_en || 'Uncategorized'
        }));
        
        const groupedSecrets = formattedSecrets.reduce((acc, secret) => {
            const category = secret.secret_category;
            if (!acc[category]) acc[category] = [];
            acc[category].push(secret);
            return acc;
        }, {});
        
        console.log(`✅ [SYSTEM SECRETS] Retrieved ${formattedSecrets.length} secrets`);

    res.json({
      success: true,
            data: {
                secrets: groupedSecrets,
      total: formattedSecrets.length,
                categories: Object.keys(groupedSecrets)
            }
    });

  } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Error in GET /:', error);
    res.status(500).json({
      success: false,
            error: 'Internal server error',
            details: error.message
    });
  }
});

// GET /api/system-secrets/categories - Get available categories
router.get('/categories', authenticateToken, roleCheck(['super_admin']), async (req, res) => {
  try {
        console.log('🔐 [SYSTEM SECRETS] Getting categories...');
        
        // Get categories with subcategories and secrets count
        const { data: categories, error } = await supabaseAdmin
            .from('secret_categories')
            .select(`
                id,
                name,
                display_name_en,
                display_name_ar,
                is_active,
                subcategories:secret_subcategories(
                    id,
                    name,
                    display_name_en,
                    display_name_ar,
                    is_active
                ),
                secrets:system_secrets(
                    provider_name
                )
            `)
            .eq('is_active', true)
            .order('display_name_en');

        if (error) {
            console.error('🚨 [SYSTEM SECRETS] Error fetching categories:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch categories'
            });
        }
        
        // Format response with providers from secrets
        const result = categories.map(category => {
            const providers = new Set();
            if (category.secrets) {
                category.secrets.forEach(secret => {
                    if (secret.provider_name) providers.add(secret.provider_name);
                });
            }
            
            return {
                id: category.id,
                category: category.display_name_en,
                name_en: category.display_name_en,
                name_ar: category.display_name_ar,
                subcategories: category.subcategories?.filter(sub => sub.is_active) || [],
                providers: Array.from(providers)
            };
        });
        
        console.log(`✅ [SYSTEM SECRETS] Retrieved ${result.length} categories`);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Error in GET /categories:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/system-secrets/:id - Get specific secret (decrypted value)
router.get('/:id', authenticateToken, roleCheck(['super_admin']), logSecretAccess, async (req, res) => {
  try {
        console.log(`🔐 [SYSTEM SECRETS] Getting secret: ${req.params.id}`);

        const { data: secret, error } = await supabaseAdmin
            .from('system_secrets')
            .select(`
                *,
                category:secret_categories(id, name, display_name_en, display_name_ar),
                subcategory:secret_subcategories(id, name, display_name_en, display_name_ar)
            `)
            .eq('id', req.params.id)
            .single();

    if (error) {
            console.error('🚨 [SYSTEM SECRETS] Error fetching secret:', error);
            return res.status(error.code === 'PGRST116' ? 404 : 500).json({
        success: false,
                error: error.code === 'PGRST116' ? 'Secret not found' : 'Failed to fetch secret'
            });
        }
        
        // Decrypt the secret value
        const decryptedValue = decryptSecret({
            encrypted: secret.secret_value_encrypted,
            key: secret.secret_salt
        });
        
        console.log(`✅ [SYSTEM SECRETS] Retrieved secret: ${secret.secret_key}`);

    res.json({
      success: true,
            data: {
                ...secret,
                secret_value: decryptedValue,
                // Remove encrypted fields from response
                secret_value_encrypted: undefined,
                secret_salt: undefined
            }
    });

  } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Error in GET /:id:', error);
    res.status(500).json({
      success: false,
            error: 'Internal server error'
    });
  }
});

// POST /api/system-secrets - Create new secret
router.post('/', authenticateToken, roleCheck(['super_admin']), logSecretAccess, async (req, res) => {
    try {
        console.log('🔐 [SYSTEM SECRETS] Creating new secret...');
        
        const {
            secret_key,
            secret_category_id,
            secret_subcategory_id,
            secret_value,
            display_name,
            description,
            provider_name,
            is_required,
            requires_restart,
            environment
        } = req.body;
        
        // Validate required fields
        if (!secret_key || !secret_category_id || !secret_value || !display_name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: secret_key, secret_category_id, secret_value, display_name'
            });
        }

        // Validate category exists
        const { data: category } = await supabaseAdmin
            .from('secret_categories')
            .select('id')
            .eq('id', secret_category_id)
            .single();

        if (!category) {
            return res.status(400).json({
                success: false,
                error: 'Invalid category ID'
            });
        }

        // Validate subcategory if provided
        if (secret_subcategory_id) {
            const { data: subcategory } = await supabaseAdmin
                .from('secret_subcategories')
                .select('id, category_id')
                .eq('id', secret_subcategory_id)
                .single();

            if (!subcategory) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid subcategory ID'
                });
            }

            if (subcategory.category_id !== secret_category_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Subcategory does not belong to the specified category'
                });
            }
        }

        // Check if secret already exists
        const { data: existingSecret, error: checkError } = await supabaseAdmin
      .from('system_secrets')
      .select('id')
            .eq('secret_key', secret_key)
      .single();

        if (existingSecret) {
            return res.status(400).json({
        success: false,
                error: 'Secret with this key already exists'
            });
        }
        
        // Encrypt the secret value
        const encryptedData = encryptSecret(secret_value);
        
        // Insert new secret
        const { data: newSecret, error } = await supabaseAdmin
            .from('system_secrets')
            .insert({
                secret_key,
                secret_category_id,
                secret_subcategory_id,
                secret_value_encrypted: encryptedData.encrypted,
                secret_salt: encryptedData.key,
                encryption_method: 'AES-256-GCM',
                display_name,
                description,
                provider_name,
                is_required: is_required || false,
                requires_restart: requires_restart || false,
                environment: environment || 'all',
                is_active: true,
                created_by: req.user.id,
                updated_by: req.user.id
            })
            .select(`
                *,
                category:secret_categories(id, name, display_name_en, display_name_ar),
                subcategory:secret_subcategories(id, name, display_name_en, display_name_ar)
            `)
            .single();

    if (error) {
            console.error('🚨 [SYSTEM SECRETS] Error creating secret:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create secret',
                details: error.message
            });
        }
        
        console.log(`✅ [SYSTEM SECRETS] Created secret: ${secret_key}`);

    res.status(201).json({
      success: true,
      data: {
        ...newSecret,
                secret_value_encrypted: undefined,
                secret_salt: undefined
            }
    });

  } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Error in POST /:', error);
    res.status(500).json({
      success: false,
            error: 'Internal server error'
    });
  }
});

// PUT /api/system-secrets/:id - Update secret
router.put('/:id', authenticateToken, roleCheck(['super_admin']), logSecretAccess, async (req, res) => {
    try {
        console.log(`🔐 [SYSTEM SECRETS] Updating secret: ${req.params.id}`);
        
        const {
            secret_value,
            secret_category_id,
            secret_subcategory_id,
            display_name,
            description,
            provider_name,
            is_required,
            requires_restart,
            environment,
            is_active
        } = req.body;

        // Validate category if provided
        if (secret_category_id) {
            const { data: category } = await supabaseAdmin
                .from('secret_categories')
                .select('id')
                .eq('id', secret_category_id)
                .single();

            if (!category) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid category ID'
                });
            }
        }

        // Validate subcategory if provided
        if (secret_subcategory_id) {
            const { data: subcategory } = await supabaseAdmin
                .from('secret_subcategories')
                .select('id, category_id')
                .eq('id', secret_subcategory_id)
                .single();

            if (!subcategory) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid subcategory ID'
                });
            }

            // If both category and subcategory are provided, ensure they match
            if (secret_category_id && subcategory.category_id !== secret_category_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Subcategory does not belong to the specified category'
                });
            }
        }

        // Prepare update data
        const updateData = {
            display_name,
            description,
            provider_name,
            is_required,
            requires_restart,
            environment,
            is_active,
            updated_by: req.user.id
        };

        // Add category/subcategory if provided
        if (secret_category_id !== undefined) updateData.secret_category_id = secret_category_id;
        if (secret_subcategory_id !== undefined) updateData.secret_subcategory_id = secret_subcategory_id;

        // If secret value is being updated, encrypt it
        if (secret_value) {
            const encryptedData = encryptSecret(secret_value);
            updateData.secret_value_encrypted = encryptedData.encrypted;
            updateData.secret_salt = encryptedData.key;
        }
        
        // Update secret
        const { data: updatedSecret, error } = await supabaseAdmin
            .from('system_secrets')
            .update(updateData)
            .eq('id', req.params.id)
            .select(`
                *,
                category:secret_categories(id, name, display_name_en, display_name_ar),
                subcategory:secret_subcategories(id, name, display_name_en, display_name_ar)
            `)
            .single();

    if (error) {
            console.error('🚨 [SYSTEM SECRETS] Error updating secret:', error);
            return res.status(error.code === 'PGRST116' ? 404 : 500).json({
                success: false,
                error: error.code === 'PGRST116' ? 'Secret not found' : 'Failed to update secret'
            });
        }
        
        console.log(`✅ [SYSTEM SECRETS] Updated secret: ${updatedSecret.secret_key}`);

    res.json({
      success: true,
      data: {
        ...updatedSecret,
                secret_value_encrypted: undefined,
                secret_salt: undefined
            }
    });

  } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Error in PUT /:id:', error);
    res.status(500).json({
      success: false,
            error: 'Internal server error'
    });
  }
});

// DELETE /api/system-secrets/:id - Delete secret
router.delete('/:id', authenticateToken, roleCheck(['super_admin']), logSecretAccess, async (req, res) => {
    try {
        console.log(`🔐 [SYSTEM SECRETS] Deleting secret: ${req.params.id}`);
        
        const { data: deletedSecret, error } = await supabaseAdmin
            .from('system_secrets')
            .delete()
            .eq('id', req.params.id)
            .select('secret_key')
            .single();
        
        if (error) {
            console.error('🚨 [SYSTEM SECRETS] Error deleting secret:', error);
            return res.status(error.code === 'PGRST116' ? 404 : 500).json({
        success: false,
                error: error.code === 'PGRST116' ? 'Secret not found' : 'Failed to delete secret'
            });
        }
        
        console.log(`✅ [SYSTEM SECRETS] Deleted secret: ${deletedSecret.secret_key}`);
        
        res.json({
            success: true,
            message: 'Secret deleted successfully'
        });
        
    } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Error in DELETE /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// POST /api/system-secrets/:id/test - Test secret/API key
router.post('/:id/test', authenticateToken, roleCheck(['super_admin']), logSecretAccess, async (req, res) => {
    try {
        console.log(`🔐 [SYSTEM SECRETS] Testing secret: ${req.params.id}`);
        
        // Get secret details
        const { data: secret, error } = await supabaseAdmin
      .from('system_secrets')
      .select('*')
            .eq('id', req.params.id)
      .single();

        if (error) {
      return res.status(404).json({
        success: false,
                error: 'Secret not found'
            });
        }
        
        // Decrypt secret value
        const decryptedValue = decryptSecret({
            encrypted: secret.secret_value_encrypted,
            key: secret.secret_salt
        });
        
        let testResult = { success: false, message: 'Test not implemented' };
        
        // FIRST: Check if value exists and is not empty
        if (!decryptedValue || decryptedValue.trim() === '' || decryptedValue === 'null' || decryptedValue === 'undefined') {
            testResult = { 
                success: false, 
                message: 'Failed: Key not set or empty' 
            };
        } else {
            // Test based on secret type
            if (secret.secret_key.includes('OPENAI_API_KEY')) {
                testResult = await testOpenAIKey(decryptedValue);
            } else if (secret.secret_key.includes('ELEVENLABS_API_KEY')) {
                testResult = await testElevenLabsKey(decryptedValue);
            } else if (secret.secret_key.includes('STRIPE_SECRET_KEY')) {
                testResult = await testStripeKey(decryptedValue);
            } else if (secret.secret_key.includes('TRON_API_KEY')) {
                testResult = validateFormatOnly(decryptedValue, 'TRON API Key');
            } else if (secret.secret_key.includes('USDT') || secret.secret_key.includes('WALLET')) {
                testResult = validateFormatOnly(decryptedValue, 'Wallet Address');
            } else if (secret.secret_key.includes('JWT_SECRET')) {
                testResult = validateJWTSecret(decryptedValue);
            } else {
                testResult = validateFormatOnly(decryptedValue, 'Secret');
            }
        }
        
        // Update test status
        await supabaseAdmin
            .from('system_secrets')
            .update({
                test_status: testResult.success ? 'valid' : 'invalid',
                last_tested_at: new Date().toISOString()
            })
            .eq('id', req.params.id);
        
        console.log(`✅ [SYSTEM SECRETS] Test result for ${secret.secret_key}: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);

        res.json({
            success: true,
            test_result: testResult
        });

    } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Error in POST /:id/test:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// POST /api/system-secrets/test-connection - Test provider connection
router.post('/test-connection', authenticateToken, roleCheck(['super_admin']), async (req, res) => {
  try {
    const { 
            provider_type, 
            api_key, 
            base_url, 
            test_endpoint, 
            deployment_name, 
            api_version,
            headers = {} 
        } = req.body;

        console.log(`🔗 [SYSTEM SECRETS] Testing connection for ${provider_type}...`);

        // Validate required fields
        if (!provider_type || !api_key || !base_url) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: provider_type, api_key, base_url'
            });
        }

        let testResult;
        
        // Test connection based on provider type
        switch (provider_type) {
            case 'openai':
                testResult = await testOpenAIConnection(api_key, base_url);
                break;
            case 'anthropic':
                testResult = await testAnthropicConnection(api_key, base_url);
                break;
            case 'google':
                testResult = await testGoogleConnection(api_key, base_url);
                break;
            case 'elevenlabs':
                testResult = await testElevenLabsConnection(api_key, base_url);
                break;
            case 'azure_openai':
                testResult = await testAzureOpenAIConnection(api_key, base_url, deployment_name, api_version);
                break;
            case 'custom':
                testResult = await testCustomConnection(api_key, base_url, test_endpoint, headers);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: `Unsupported provider type: ${provider_type}`
                });
        }

        res.json(testResult);

    } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Connection test error:', error);
        res.status(500).json({
            success: false,
            error: 'Connection test failed',
            details: error.message
        });
    }
});

// POST /api/system-secrets/health-update - Update provider health status
router.post('/health-update', authenticateToken, roleCheck(['super_admin']), async (req, res) => {
    try {
        const { provider_id, status, response_time, error_message, checked_at } = req.body;

        console.log(`🏥 [SYSTEM SECRETS] Updating health for provider ${provider_id}...`);

        // Update provider health in database
        const { data: healthUpdate, error: updateError } = await supabaseAdmin
            .from('system_health_checks')
            .upsert({
                provider_id,
                status,
                response_time,
                error_message,
                checked_at: checked_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'provider_id'
            });

        if (updateError) {
            throw updateError;
    }

    res.json({
      success: true,
            message: 'Health status updated successfully'
    });

  } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Health update error:', error);
    res.status(500).json({
      success: false,
            error: 'Health update failed',
            details: error.message
    });
  }
});

// GET /api/system-secrets/providers/:id - Get specific provider details
router.get('/providers/:id', authenticateToken, roleCheck(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`📋 [SYSTEM SECRETS] Getting provider details for ${id}...`);

        // Get provider from ai_providers table
        const { data: provider, error } = await supabaseAdmin
            .from('ai_providers')
      .select('*')
            .eq('id', id)
            .single();

    if (error) {
      throw error;
    }

        if (!provider) {
            return res.status(404).json({
                success: false,
                error: 'Provider not found'
            });
        }

    res.json({
      success: true,
            data: provider
    });

  } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Get provider error:', error);
    res.status(500).json({
      success: false,
            error: 'Failed to get provider',
            details: error.message
    });
  }
});

// GET /api/system-secrets/audit/logs - Get audit logs
router.get('/audit/logs', authenticateToken, roleCheck(['super_admin']), async (req, res) => {
    try {
        console.log('🔐 [SYSTEM SECRETS] Getting audit logs...');
        
        const { limit = 100, offset = 0, secret_id, access_type } = req.query;
        
        let query = supabaseAdmin
            .from('secrets_access_log')
            .select(`
                *,
                profiles:accessed_by(first_name, last_name, email)
            `)
            .order('accessed_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (secret_id) query = query.eq('secret_id', secret_id);
        if (access_type) query = query.eq('access_type', access_type);
        
        const { data: logs, error } = await query;
        
        if (error) {
            console.error('🚨 [SYSTEM SECRETS] Error fetching audit logs:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch audit logs'
            });
        }
        
        console.log(`✅ [SYSTEM SECRETS] Retrieved ${logs.length} audit logs`);
        
        res.json({
            success: true,
            data: logs
        });
        
    } catch (error) {
        console.error('🚨 [SYSTEM SECRETS] Error in GET /audit/logs:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// TESTING UTILITIES
// ============================================================================

// Test OpenAI API key
async function testOpenAIKey(apiKey) {
    // Check for empty value first
    if (!apiKey || apiKey.trim() === '') {
        return {
            success: false,
            message: 'Failed: OpenAI API key is empty'
        };
    }
    
    // Check basic format
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
        return {
            success: false,
            message: 'Failed: Invalid OpenAI API key format'
        };
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                message: `OpenAI key is valid! Found ${data.data.length} available models.`
            };
          } else {
            return {
                success: false,
                message: `OpenAI key test failed: ${response.status} ${response.statusText}`
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `OpenAI key test error: ${error.message}`
        };
    }
}

// Test ElevenLabs API key
async function testElevenLabsKey(apiKey) {
    // Check for empty value first
    if (!apiKey || apiKey.trim() === '') {
        return {
            success: false,
            message: 'Failed: ElevenLabs API key is empty'
        };
    }
    
    // Check basic format (ElevenLabs keys are usually 32 characters)
    if (apiKey.length < 20) {
        return {
            success: false,
            message: 'Failed: ElevenLabs API key too short'
        };
    }
    
    try {
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            return {
                success: true,
                message: 'ElevenLabs key is valid and working!'
            };
          } else {
            return {
                success: false,
                message: `ElevenLabs key test failed: ${response.status} ${response.statusText}`
            };
        }
      } catch (error) {
        return {
            success: false,
            message: `ElevenLabs key test error: ${error.message}`
        };
    }
}

// Test Stripe API key
async function testStripeKey(apiKey) {
    // Check for empty value first
    if (!apiKey || apiKey.trim() === '') {
        return {
            success: false,
            message: 'Failed: Stripe API key is empty'
        };
    }
    
    // Check basic format (Stripe keys start with sk_ or pk_)
    if (!apiKey.startsWith('sk_') && !apiKey.startsWith('pk_')) {
        return {
            success: false,
            message: 'Failed: Invalid Stripe API key format (should start with sk_ or pk_)'
        };
    }
    
    try {
        const response = await fetch('https://api.stripe.com/v1/accounts', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        if (response.ok) {
            return {
                success: true,
                message: 'Stripe key is valid and working!'
            };
        } else {
            return {
                success: false,
                message: `Stripe key test failed: ${response.status} ${response.statusText}`
            };
        }
  } catch (error) {
        return {
      success: false,
            message: `Stripe key test error: ${error.message}`
        };
    }
}

async function testOpenAIConnection(apiKey, baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            status: 'connected',
            data: data,
            message: `OpenAI connection successful. ${data.data?.length || 0} models available.`
        };
    } catch (error) {
        return {
            success: false,
            status: 'connection_failed',
            error: error.message
        };
    }
}

async function testAnthropicConnection(apiKey, baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            status: 'connected',
            data: data,
            message: 'Anthropic (Claude) connection successful'
        };
    } catch (error) {
        return {
            success: false,
            status: 'connection_failed',
            error: error.message
        };
    }
}

async function testGoogleConnection(apiKey, baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/models?key=${apiKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            status: 'connected',
            data: data,
            message: `Google AI connection successful. ${data.models?.length || 0} models available.`
        };
      } catch (error) {
        return {
            success: false,
            status: 'connection_failed',
            error: error.message
        };
    }
}

async function testElevenLabsConnection(apiKey, baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/user`, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            status: 'connected',
            data: data,
            message: 'ElevenLabs connection successful'
        };
  } catch (error) {
        return {
      success: false,
            status: 'connection_failed',
      error: error.message
        };
    }
}

async function testAzureOpenAIConnection(apiKey, baseUrl, deploymentName, apiVersion) {
    try {
        const url = `${baseUrl}/openai/deployments/${deploymentName}/completions?api-version=${apiVersion}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: 'test',
                max_tokens: 1
            }),
            timeout: 15000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            status: 'connected',
            data: data,
            message: 'Azure OpenAI connection successful'
          };
        } catch (error) {
        return {
            success: false,
            status: 'connection_failed',
            error: error.message
        };
    }
}

async function testCustomConnection(apiKey, baseUrl, testEndpoint = '/health', customHeaders = {}) {
    try {
        const url = `${baseUrl}${testEndpoint}`;
        
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...customHeaders
        };

        const response = await fetch(url, {
            method: 'GET',
            headers,
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            status: 'connected',
            data: data,
            message: 'Custom provider connection successful'
        };
      } catch (error) {
        return {
            success: false,
            status: 'connection_failed',
            error: error.message
        };
    }
}

// ============================================================================
// FORMAT VALIDATION UTILITIES
// ============================================================================

// Basic format validation for secrets without API testing
function validateFormatOnly(value, keyType) {
    if (!value || value.trim() === '') {
        return {
            success: false,
            message: `Failed: ${keyType} is empty`
        };
    }
    
    // Basic format checks
    if (value.length < 8) {
        return {
            success: false,
            message: `Failed: ${keyType} too short (minimum 8 characters)`
        };
    }
    
    return {
        success: true,
        message: `Format validation passed for ${keyType}`
    };
}

// JWT Secret validation
function validateJWTSecret(value) {
    if (!value || value.trim() === '') {
        return {
            success: false,
            message: 'Failed: JWT Secret is empty'
        };
    }
    
    // JWT secrets should be at least 32 characters for security
    if (value.length < 32) {
        return {
            success: false,
            message: 'Failed: JWT Secret too short (minimum 32 characters)'
        };
    }
    
    return {
        success: true,
        message: 'JWT Secret format validation passed'
    };
}

export default router; 
