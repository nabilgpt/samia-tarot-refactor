import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin as supabase } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// CONFIGURATION MANAGEMENT API ROUTES
// ============================================================================

// Get all configuration categories
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('configuration_categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');

        if (error) throw error;

        res.json({
            success: true,
            data: data || []
        });
    } catch (error) {
        console.error('Error fetching configuration categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch configuration categories',
            error: error.message
        });
    }
});

// Get configurations by category
router.get('/category/:category', authenticateToken, async (req, res) => {
    try {
        const { category } = req.params;
        const { user } = req;

        // Check user role for access control
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return res.status(403).json({
                success: false,
                message: 'User profile not found'
            });
        }

        let query = supabase
            .from('system_configurations')
            .select(`
                id,
                config_key,
                config_category,
                config_subcategory,
                display_name,
                description,
                data_type,
                is_sensitive,
                is_encrypted,
                is_required,
                access_level,
                validation_rules,
                default_value,
                possible_values,
                environment,
                is_active,
                config_value_plain,
                created_at,
                updated_at
            `)
            .eq('config_category', category)
            .eq('is_active', true);

        // Apply access control based on user role
        if (profile.role !== 'super_admin') {
            query = query.in('access_level', ['public', 'admin']);
        }

        const { data, error } = await query.order('config_subcategory', { ascending: true });

        if (error) throw error;

        // Filter out encrypted values for non-super-admin users
        const filteredData = data.map(config => {
            if (config.is_encrypted && profile.role !== 'super_admin') {
                return {
                    ...config,
                    config_value_plain: config.is_sensitive ? '[ENCRYPTED]' : config.config_value_plain
                };
            }
            return config;
        });

        res.json({
            success: true,
            data: filteredData || []
        });
    } catch (error) {
        console.error('Error fetching configurations by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch configurations',
            error: error.message
        });
    }
});

// Get specific configuration value
router.get('/value/:configKey', authenticateToken, async (req, res) => {
    try {
        const { configKey } = req.params;
        const { user } = req;

        // Use the database function to safely get configuration value
        const { data, error } = await supabase
            .rpc('get_config_value', { p_config_key: configKey });

        if (error) {
            if (error.message.includes('Access denied')) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this configuration'
                });
            }
            throw error;
        }

        res.json({
            success: true,
            value: data
        });
    } catch (error) {
        console.error('Error fetching configuration value:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch configuration value',
            error: error.message
        });
    }
});

// Update configuration value (Super Admin only)
router.put('/value/:configKey', authenticateToken, async (req, res) => {
    try {
        const { configKey } = req.params;
        const { value, changeReason } = req.body;
        const { user } = req;

        // Check if user is super admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super Admin access required'
            });
        }

        // Get existing configuration
        const { data: existingConfig, error: configError } = await supabase
            .from('system_configurations')
            .select('*')
            .eq('config_key', configKey)
            .single();

        if (configError) {
            throw new Error(`Configuration key not found: ${configKey}`);
        }

        // Update configuration value
        let updateData = {
            updated_by: user.id,
            updated_at: new Date().toISOString()
        };

        if (existingConfig.is_encrypted) {
            // For now, store as plain text - encryption can be added later
            updateData.config_value_plain = value;
        } else {
            updateData.config_value_plain = value;
        }

        const { error: updateError } = await supabase
            .from('system_configurations')
            .update(updateData)
            .eq('config_key', configKey);

        if (updateError) throw updateError;

        // Log the change
        const { error: logError } = await supabase
            .from('configuration_change_log')
            .insert({
                config_id: existingConfig.id,
                config_key: configKey,
                change_type: 'update',
                old_value_hash: existingConfig.config_value_plain ? 
                    crypto.createHash('sha256').update(existingConfig.config_value_plain).digest('hex') : null,
                new_value_hash: crypto.createHash('sha256').update(value).digest('hex'),
                changed_by: user.id,
                change_reason: changeReason || 'Updated via API'
            });

        if (logError) {
            console.warn('Failed to log configuration change:', logError);
        }

        res.json({
            success: true,
            message: 'Configuration updated successfully'
        });
    } catch (error) {
        console.error('Error updating configuration value:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update configuration value',
            error: error.message
        });
    }
});

// Get configuration change log
router.get('/changelog', authenticateToken, async (req, res) => {
    try {
        const { user } = req;
        const { page = 1, limit = 50, configKey } = req.query;

        // Check if user is super admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super Admin access required'
            });
        }

        let query = supabase
            .from('configuration_change_log')
            .select(`
                *,
                profiles!configuration_change_log_changed_by_fkey(
                    id,
                    email,
                    display_name
                )
            `)
            .order('created_at', { ascending: false });

        // Filter by config key if provided
        if (configKey) {
            query = query.eq('config_key', configKey);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching configuration change log:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch configuration change log',
            error: error.message
        });
    }
});

// Get configuration access log
router.get('/access-log', authenticateToken, async (req, res) => {
    try {
        const { user } = req;
        const { page = 1, limit = 50, configKey } = req.query;

        // Check if user is super admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super Admin access required'
            });
        }

        let query = supabase
            .from('configuration_access_log')
            .select(`
                *,
                profiles!configuration_access_log_accessed_by_fkey(
                    id,
                    email,
                    display_name
                )
            `)
            .order('created_at', { ascending: false });

        // Filter by config key if provided
        if (configKey) {
            query = query.eq('config_key', configKey);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching configuration access log:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch configuration access log',
            error: error.message
        });
    }
});

// Test configuration (e.g., test API keys)
router.post('/test/:configKey', authenticateToken, async (req, res) => {
    try {
        const { configKey } = req.params;
        const { user } = req;

        // Check if user is super admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super Admin access required'
            });
        }

        // Get configuration value using system function (no user auth required)
        const { data: configValue, error } = await supabase
            .rpc('get_system_config_value', { p_config_key: configKey });

        if (error) {
            console.error(`❌ [CONFIG TEST] Database error for ${configKey}:`, error);
            throw error;
        }

        if (!configValue) {
            console.log(`⚠️ [CONFIG TEST] Configuration not found: ${configKey}`);
            return res.status(404).json({
                success: false,
                message: `Configuration '${configKey}' not found. Please add it to the system_configurations table first.`,
                hint: 'Run the database/add-openai-config.sql script to add missing configurations.'
            });
        }

        console.log(`✅ [CONFIG TEST] Found configuration: ${configKey}`);
        console.log(`🔍 [CONFIG TEST] Value length: ${configValue?.length || 0} characters`);

        // Perform basic tests based on configuration type
        let testResult = { success: false, message: 'Test not implemented' };

        switch (configKey) {
            case 'STRIPE_SECRET_KEY':
                // Test Stripe key validity
                testResult = await testStripeKey(configValue);
                break;
            case 'OPENAI_API_KEY':
            case 'ZODIAC_OPENAI_API_KEY':
                // Test OpenAI key validity
                testResult = await testOpenAIKey(configValue);
                break;
            case 'ELEVENLABS_API_KEY':
            case 'ZODIAC_ELEVENLABS_API_KEY':
                // Test ElevenLabs key validity
                testResult = await testElevenLabsKey(configValue);
                break;
            case 'TWILIO_AUTH_TOKEN':
                // Test Twilio credentials
                testResult = await testTwilioCredentials(configValue);
                break;
            default:
                testResult = {
                    success: true,
                    message: 'Configuration exists but no specific test implemented'
                };
        }

        res.json({
            success: true,
            test_result: testResult
        });
    } catch (error) {
        console.error('Error testing configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test configuration',
            error: error.message
        });
    }
});

// Bulk update configurations
router.post('/bulk-update', authenticateToken, async (req, res) => {
    try {
        const { configurations, changeReason } = req.body;
        const { user } = req;

        // Check if user is super admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super Admin access required'
            });
        }

        const results = [];
        const errors = [];

        // Process each configuration update
        for (const config of configurations) {
            try {
                const { data, error } = await supabase
                    .rpc('set_config_value', {
                        p_config_key: config.key,
                        p_value: config.value,
                        p_change_reason: changeReason || 'Bulk update via API'
                    });

                if (error) throw error;

                results.push({
                    key: config.key,
                    success: true
                });
            } catch (error) {
                errors.push({
                    key: config.key,
                    error: error.message
                });
            }
        }

        res.json({
            success: errors.length === 0,
            message: `Updated ${results.length} configurations, ${errors.length} errors`,
            results,
            errors
        });
    } catch (error) {
        console.error('Error bulk updating configurations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk update configurations',
            error: error.message
        });
    }
});

// Helper functions for testing configurations
async function testStripeKey(apiKey) {
    try {
        // Basic Stripe key format validation
        if (!apiKey || !apiKey.startsWith('sk_')) {
            return { success: false, message: 'Invalid Stripe key format' };
        }
        return { success: true, message: 'Stripe key format is valid' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function testOpenAIKey(apiKey) {
    try {
        // Basic OpenAI key format validation
        if (!apiKey || !apiKey.startsWith('sk-')) {
            return { success: false, message: 'Invalid OpenAI key format - must start with sk-' };
        }

        // Real API call to test key validity
        console.log('🧪 [OPENAI TEST] Testing key validity with real API call...');
        
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        if (response.ok) {
            const data = await response.json();
            const modelCount = data.data ? data.data.length : 0;
            console.log(`✅ [OPENAI TEST] Key is valid! Found ${modelCount} available models`);
            return { 
                success: true, 
                message: `OpenAI key is valid and working! (${modelCount} models available)` 
            };
        } else {
            const errorText = await response.text();
            console.log(`❌ [OPENAI TEST] Key validation failed: ${response.status} - ${errorText}`);
            
            if (response.status === 401) {
                return { 
                    success: false, 
                    message: 'OpenAI key is invalid or expired (401 Unauthorized)' 
                };
            } else if (response.status === 403) {
                return { 
                    success: false, 
                    message: 'OpenAI key has insufficient permissions (403 Forbidden)' 
                };
            } else {
                return { 
                    success: false, 
                    message: `OpenAI API error: ${response.status} - ${errorText}` 
                };
            }
        }
    } catch (error) {
        console.error('❌ [OPENAI TEST] Error during key validation:', error);
        
        if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
            return { 
                success: false, 
                message: 'OpenAI API request timeout - check network connection' 
            };
        }
        
        return { 
            success: false, 
            message: `Error testing OpenAI key: ${error.message}` 
        };
    }
}

async function testElevenLabsKey(apiKey) {
    try {
        // Basic ElevenLabs key format validation
        if (!apiKey || apiKey.length < 20) {
            return { success: false, message: 'Invalid ElevenLabs API key format' };
        }

        // Real API call to test key validity
        console.log('🧪 [ELEVENLABS TEST] Testing key validity with real API call...');
        
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ [ELEVENLABS TEST] Key is valid! User: ${data.email || 'Unknown'}`);
            return { 
                success: true, 
                message: `ElevenLabs key is valid and working! (User: ${data.email || 'Active'})` 
            };
        } else {
            const errorText = await response.text();
            console.log(`❌ [ELEVENLABS TEST] Key validation failed: ${response.status} - ${errorText}`);
            
            if (response.status === 401) {
                return { 
                    success: false, 
                    message: 'ElevenLabs key is invalid or expired (401 Unauthorized)' 
                };
            } else if (response.status === 403) {
                return { 
                    success: false, 
                    message: 'ElevenLabs key has insufficient permissions (403 Forbidden)' 
                };
            } else {
                return { 
                    success: false, 
                    message: `ElevenLabs API error: ${response.status} - ${errorText}` 
                };
            }
        }
    } catch (error) {
        console.error('❌ [ELEVENLABS TEST] Error during key validation:', error);
        
        if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
            return { 
                success: false, 
                message: 'ElevenLabs API request timeout - check network connection' 
            };
        }
        
        return { 
            success: false, 
            message: `Error testing ElevenLabs key: ${error.message}` 
        };
    }
}

async function testTwilioCredentials(authToken) {
    try {
        // Basic Twilio token validation
        if (!authToken || authToken.length < 32) {
            return { success: false, message: 'Invalid Twilio auth token format' };
        }
        return { success: true, message: 'Twilio auth token format is valid' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export default router; 
