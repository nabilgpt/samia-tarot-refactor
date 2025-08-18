// ============================================================================
// SAMIA TAROT - BILINGUAL SETTINGS MANAGEMENT API
// Pure translation and language configuration (NO secrets or API keys)
// ============================================================================
// Date: 2025-07-13
// Purpose: Manage translation settings, provider assignments, and language configuration
// Security: Admin/Super Admin access, no sensitive data handling
// ============================================================================

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// ============================================================================
// MIDDLEWARE & UTILITIES
// ============================================================================

// Audit logging for translation settings changes
const logSettingsChange = async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log the settings change after response
        setImmediate(async () => {
            try {
                if (req.method !== 'GET' && res.statusCode < 400) {
                    const { data: insertData, error } = await supabaseAdmin
                        .from('system_audit_log')
                        .insert({
                            action_type: 'setting_updated',
                            target_type: 'translation_setting',
                            target_id: req.params.id || null,
                            target_name: req.body?.setting_key || 'bulk_update',
                            actor_id: req.user.id,
                            actor_role: req.user.role,
                            old_values: req.originalValues || {},
                            new_values: req.body || {},
                            change_description: `Translation setting ${req.method.toLowerCase()} operation`,
                            ip_address: req.ip,
                            user_agent: req.get('User-Agent'),
                            created_at: new Date().toISOString()
                        });
                    
                    if (error) {
                        console.error('🚨 [AUDIT] Failed to log settings change:', error);
                    }
                }
            } catch (error) {
                console.error('🚨 [AUDIT] Error logging settings change:', error);
            }
        });
        
        return originalSend.call(this, data);
    };
    
    next();
};

// ============================================================================
// TRANSLATION SETTINGS ROUTES
// ============================================================================

// GET /api/bilingual-settings/translation-settings - Get all translation settings
router.get('/translation-settings', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log('🌍 [BILINGUAL SETTINGS] Getting translation settings...');
        
        const { category, active_only } = req.query;
        
        let query = supabaseAdmin
            .from('translation_settings')
            .select('*')
            .order('setting_category', { ascending: true })
            .order('display_order', { ascending: true });
        
        // Apply filters
        if (category) query = query.eq('setting_category', category);
        if (active_only === 'true') query = query.eq('is_active', true);
        
        const { data: settings, error } = await query;
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error fetching settings:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch translation settings',
                details: error.message
            });
        }
        
        // Group by category
        const groupedSettings = settings.reduce((acc, setting) => {
            const category = setting.setting_category;
            if (!acc[category]) acc[category] = [];
            acc[category].push(setting);
            return acc;
        }, {});
        
        console.log(`✅ [BILINGUAL SETTINGS] Retrieved ${settings.length} translation settings`);
        
        res.json({
            success: true,
            data: {
                settings: groupedSettings,
                total: settings.length,
                categories: Object.keys(groupedSettings)
            }
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /translation-settings:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/bilingual-settings/translation-settings/:id - Get specific translation setting
router.get('/translation-settings/:id', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log(`🌍 [BILINGUAL SETTINGS] Getting translation setting: ${req.params.id}`);
        
        const { data: setting, error } = await supabaseAdmin
            .from('translation_settings')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error fetching setting:', error);
            return res.status(error.code === 'PGRST116' ? 404 : 500).json({
                success: false,
                error: error.code === 'PGRST116' ? 'Setting not found' : 'Failed to fetch setting'
            });
        }
        
        console.log(`✅ [BILINGUAL SETTINGS] Retrieved setting: ${setting.setting_key}`);
        
        res.json({
            success: true,
            data: setting
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /translation-settings/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// PUT /api/bilingual-settings/translation-settings/:id - Update translation setting
router.put('/translation-settings/:id', authenticateToken, roleCheck(['super_admin']), logSettingsChange, async (req, res) => {
    try {
        console.log(`🌍 [BILINGUAL SETTINGS] Updating translation setting: ${req.params.id}`);
        
        const {
            setting_value,
            display_name_en,
            display_name_ar,
            description_en,
            description_ar,
            is_user_configurable,
            is_required,
            ui_component,
            ui_options,
            display_order,
            is_active
        } = req.body;
        
        // Get current setting for audit
        const { data: currentSetting, error: fetchError } = await supabaseAdmin
            .from('translation_settings')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (fetchError) {
            return res.status(404).json({
                success: false,
                error: 'Setting not found'
            });
        }
        
        // Store original values for audit
        req.originalValues = currentSetting;
        
        // Prepare update data
        const updateData = {
            setting_value,
            display_name_en,
            display_name_ar,
            description_en,
            description_ar,
            is_user_configurable,
            is_required,
            ui_component,
            ui_options,
            display_order,
            is_active,
            updated_by: req.user.id
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );
        
        // Update setting
        const { data: updatedSetting, error } = await supabaseAdmin
            .from('translation_settings')
            .update(updateData)
            .eq('id', req.params.id)
            .select('*')
            .single();
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error updating setting:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update setting',
                details: error.message
            });
        }
        
        console.log(`✅ [BILINGUAL SETTINGS] Updated setting: ${updatedSetting.setting_key}`);
        
        res.json({
            success: true,
            data: updatedSetting
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in PUT /translation-settings/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// POST /api/bilingual-settings/translation-settings - Create new translation setting
router.post('/translation-settings', authenticateToken, roleCheck(['super_admin']), logSettingsChange, async (req, res) => {
    try {
        console.log('🌍 [BILINGUAL SETTINGS] Creating new translation setting...');
        
        const {
            setting_key,
            setting_category,
            setting_value,
            setting_type,
            display_name_en,
            display_name_ar,
            description_en,
            description_ar,
            is_user_configurable,
            is_required,
            default_value,
            validation_rules,
            ui_component,
            ui_options,
            display_order
        } = req.body;
        
        // Validate required fields
        if (!setting_key || !setting_category || !setting_value || !display_name_en || !display_name_ar) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: setting_key, setting_category, setting_value, display_name_en, display_name_ar'
            });
        }
        
        // Check if setting already exists
        const { data: existingSetting, error: checkError } = await supabaseAdmin
            .from('translation_settings')
            .select('id')
            .eq('setting_key', setting_key)
            .single();
        
        if (existingSetting) {
            return res.status(400).json({
                success: false,
                error: 'Setting with this key already exists'
            });
        }
        
        // Insert new setting
        const { data: newSetting, error } = await supabaseAdmin
            .from('translation_settings')
            .insert({
                setting_key,
                setting_category,
                setting_value,
                setting_type: setting_type || 'config',
                display_name_en,
                display_name_ar,
                description_en,
                description_ar,
                is_user_configurable: is_user_configurable !== undefined ? is_user_configurable : true,
                is_required: is_required || false,
                default_value: default_value || setting_value,
                validation_rules: validation_rules || {},
                ui_component: ui_component || 'input',
                ui_options: ui_options || {},
                display_order: display_order || 0,
                is_active: true,
                updated_by: req.user.id
            })
            .select('*')
            .single();
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error creating setting:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create setting',
                details: error.message
            });
        }
        
        console.log(`✅ [BILINGUAL SETTINGS] Created setting: ${setting_key}`);
        
        res.status(201).json({
            success: true,
            data: newSetting
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in POST /translation-settings:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// DELETE /api/bilingual-settings/translation-settings/:id - Delete translation setting
router.delete('/translation-settings/:id', authenticateToken, roleCheck(['super_admin']), logSettingsChange, async (req, res) => {
    try {
        console.log(`🌍 [BILINGUAL SETTINGS] Deleting translation setting: ${req.params.id}`);
        
        const { data: deletedSetting, error } = await supabaseAdmin
            .from('translation_settings')
            .delete()
            .eq('id', req.params.id)
            .select('setting_key')
            .single();
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error deleting setting:', error);
            return res.status(error.code === 'PGRST116' ? 404 : 500).json({
                success: false,
                error: error.code === 'PGRST116' ? 'Setting not found' : 'Failed to delete setting'
            });
        }
        
        console.log(`✅ [BILINGUAL SETTINGS] Deleted setting: ${deletedSetting.setting_key}`);
        
        res.json({
            success: true,
            message: 'Setting deleted successfully'
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in DELETE /translation-settings/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// PROVIDER MANAGEMENT ROUTES (NON-SENSITIVE)
// ============================================================================

// GET /api/bilingual-settings/providers - Get all providers (no sensitive data)
router.get('/providers', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log('🌍 [BILINGUAL SETTINGS] Getting providers...');
        
        const { type, active_only } = req.query;
        
        let query = supabaseAdmin
            .from('providers')
            .select(`
                id,
                provider_key,
                provider_name,
                provider_type,
                company_name,
                homepage_url,
                documentation_url,
                supported_languages,
                supported_features,
                rate_limit_per_minute,
                rate_limit_per_hour,
                max_requests_per_day,
                timeout_seconds,
                pricing_model,
                cost_per_request,
                cost_per_1k_tokens,
                is_active,
                health_status,
                last_health_check,
                config_schema,
                default_config,
                description,
                notes,
                tags,
                created_at,
                updated_at
            `)
            .order('provider_name', { ascending: true });
        
        // Apply filters
        if (type) query = query.eq('provider_type', type);
        if (active_only === 'true') query = query.eq('is_active', true);
        
        const { data: providers, error } = await query;
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error fetching providers:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch providers',
                details: error.message
            });
        }
        
        // Group by provider type
        const groupedProviders = providers.reduce((acc, provider) => {
            const type = provider.provider_type;
            if (!acc[type]) acc[type] = [];
            acc[type].push(provider);
            return acc;
        }, {});
        
        console.log(`✅ [BILINGUAL SETTINGS] Retrieved ${providers.length} providers`);
        
        res.json({
            success: true,
            data: {
                providers: groupedProviders,
                total: providers.length,
                types: Object.keys(groupedProviders)
            }
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /providers:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/bilingual-settings/providers/:id - Get specific provider
router.get('/providers/:id', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log(`🌍 [BILINGUAL SETTINGS] Getting provider: ${req.params.id}`);
        
        const { data: provider, error } = await supabaseAdmin
            .from('providers')
            .select(`
                id,
                provider_key,
                provider_name,
                provider_type,
                company_name,
                homepage_url,
                documentation_url,
                supported_languages,
                supported_features,
                rate_limit_per_minute,
                rate_limit_per_hour,
                max_requests_per_day,
                timeout_seconds,
                pricing_model,
                cost_per_request,
                cost_per_1k_tokens,
                is_active,
                health_status,
                last_health_check,
                config_schema,
                default_config,
                description,
                notes,
                tags,
                created_at,
                updated_at
            `)
            .eq('id', req.params.id)
            .single();
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error fetching provider:', error);
            return res.status(error.code === 'PGRST116' ? 404 : 500).json({
                success: false,
                error: error.code === 'PGRST116' ? 'Provider not found' : 'Failed to fetch provider'
            });
        }
        
        console.log(`✅ [BILINGUAL SETTINGS] Retrieved provider: ${provider.provider_name}`);
        
        res.json({
            success: true,
            data: provider
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /providers/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// PUT /api/bilingual-settings/providers/:id - Update provider (non-sensitive data only)
router.put('/providers/:id', authenticateToken, roleCheck(['super_admin']), logSettingsChange, async (req, res) => {
    try {
        console.log(`🌍 [BILINGUAL SETTINGS] Updating provider: ${req.params.id}`);
        
        const {
            provider_name,
            provider_type,
            company_name,
            homepage_url,
            documentation_url,
            supported_languages,
            supported_features,
            rate_limit_per_minute,
            rate_limit_per_hour,
            max_requests_per_day,
            timeout_seconds,
            pricing_model,
            cost_per_request,
            cost_per_1k_tokens,
            is_active,
            config_schema,
            default_config,
            description,
            notes,
            tags
        } = req.body;
        
        // Get current provider for audit
        const { data: currentProvider, error: fetchError } = await supabaseAdmin
            .from('providers')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (fetchError) {
            return res.status(404).json({
                success: false,
                error: 'Provider not found'
            });
        }
        
        // Store original values for audit
        req.originalValues = currentProvider;
        
        // Prepare update data (excluding sensitive fields)
        const updateData = {
            provider_name,
            provider_type,
            company_name,
            homepage_url,
            documentation_url,
            supported_languages,
            supported_features,
            rate_limit_per_minute,
            rate_limit_per_hour,
            max_requests_per_day,
            timeout_seconds,
            pricing_model,
            cost_per_request,
            cost_per_1k_tokens,
            is_active,
            config_schema,
            default_config,
            description,
            notes,
            tags,
            updated_by: req.user.id
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );
        
        // Update provider
        const { data: updatedProvider, error } = await supabaseAdmin
            .from('providers')
            .update(updateData)
            .eq('id', req.params.id)
            .select('*')
            .single();
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error updating provider:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update provider',
                details: error.message
            });
        }
        
        console.log(`✅ [BILINGUAL SETTINGS] Updated provider: ${updatedProvider.provider_name}`);
        
        res.json({
            success: true,
            data: updatedProvider
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in PUT /providers/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// PROVIDER ASSIGNMENTS ROUTES
// ============================================================================

// GET /api/bilingual-settings/provider-assignments - Get provider assignments
router.get('/provider-assignments', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log('🌍 [BILINGUAL SETTINGS] Getting provider assignments...');
        
        const { assignment_type, active_only } = req.query;
        
        let query = supabaseAdmin
            .from('translation_provider_assignments')
            .select(`
                *,
                providers:provider_id (
                    id,
                    provider_key,
                    provider_name,
                    provider_type,
                    supported_languages,
                    health_status
                )
            `)
            .order('priority_order', { ascending: true });
        
        // Apply filters
        if (assignment_type) query = query.eq('assignment_type', assignment_type);
        if (active_only === 'true') query = query.eq('is_active', true);
        
        const { data: assignments, error } = await query;
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error fetching assignments:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch provider assignments',
                details: error.message
            });
        }
        
        // Group by assignment type
        const groupedAssignments = assignments.reduce((acc, assignment) => {
            const type = assignment.assignment_type;
            if (!acc[type]) acc[type] = [];
            acc[type].push(assignment);
            return acc;
        }, {});
        
        console.log(`✅ [BILINGUAL SETTINGS] Retrieved ${assignments.length} provider assignments`);
        
        res.json({
            success: true,
            data: {
                assignments: groupedAssignments,
                total: assignments.length,
                types: Object.keys(groupedAssignments)
            }
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /provider-assignments:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// PUT /api/bilingual-settings/provider-assignments/:id - Update provider assignment
router.put('/provider-assignments/:id', authenticateToken, roleCheck(['super_admin']), logSettingsChange, async (req, res) => {
    try {
        console.log(`🌍 [BILINGUAL SETTINGS] Updating provider assignment: ${req.params.id}`);
        
        const {
            assignment_type,
            is_default,
            priority_order,
            supported_source_languages,
            supported_target_languages,
            quality_score,
            max_retries,
            retry_delay_seconds,
            enable_fallback,
            is_active
        } = req.body;
        
        // Get current assignment for audit
        const { data: currentAssignment, error: fetchError } = await supabaseAdmin
            .from('translation_provider_assignments')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (fetchError) {
            return res.status(404).json({
                success: false,
                error: 'Provider assignment not found'
            });
        }
        
        // Store original values for audit
        req.originalValues = currentAssignment;
        
        // Prepare update data
        const updateData = {
            assignment_type,
            is_default,
            priority_order,
            supported_source_languages,
            supported_target_languages,
            quality_score,
            max_retries,
            retry_delay_seconds,
            enable_fallback,
            is_active
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );
        
        // Update assignment
        const { data: updatedAssignment, error } = await supabaseAdmin
            .from('translation_provider_assignments')
            .update(updateData)
            .eq('id', req.params.id)
            .select(`
                *,
                providers:provider_id (
                    id,
                    provider_key,
                    provider_name,
                    provider_type
                )
            `)
            .single();
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error updating assignment:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update provider assignment',
                details: error.message
            });
        }
        
        console.log(`✅ [BILINGUAL SETTINGS] Updated provider assignment: ${updatedAssignment.assignment_type}`);
        
        res.json({
            success: true,
            data: updatedAssignment
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in PUT /provider-assignments/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// FEATURE ASSIGNMENTS ROUTES
// ============================================================================

// GET /api/bilingual-settings/feature-assignments - Get feature assignments
router.get('/feature-assignments', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log('🌍 [BILINGUAL SETTINGS] Getting feature assignments...');
        
        const { feature_category, active_only } = req.query;
        
        let query = supabaseAdmin
            .from('feature_provider_assignments')
            .select(`
                *,
                primary_provider:primary_provider_id (
                    id,
                    provider_key,
                    provider_name,
                    provider_type,
                    health_status
                ),
                backup_provider:backup_provider_id (
                    id,
                    provider_key,
                    provider_name,
                    provider_type,
                    health_status
                )
            `)
            .order('feature_category', { ascending: true })
            .order('feature_name', { ascending: true });
        
        // Apply filters
        if (feature_category) query = query.eq('feature_category', feature_category);
        if (active_only === 'true') query = query.eq('is_active', true);
        
        const { data: assignments, error } = await query;
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error fetching feature assignments:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch feature assignments',
                details: error.message
            });
        }
        
        // Group by feature category
        const groupedAssignments = assignments.reduce((acc, assignment) => {
            const category = assignment.feature_category;
            if (!acc[category]) acc[category] = [];
            acc[category].push(assignment);
            return acc;
        }, {});
        
        console.log(`✅ [BILINGUAL SETTINGS] Retrieved ${assignments.length} feature assignments`);
        
        res.json({
            success: true,
            data: {
                assignments: groupedAssignments,
                total: assignments.length,
                categories: Object.keys(groupedAssignments)
            }
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /feature-assignments:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// PUT /api/bilingual-settings/feature-assignments/:id - Update feature assignment
router.put('/feature-assignments/:id', authenticateToken, roleCheck(['super_admin']), logSettingsChange, async (req, res) => {
    try {
        console.log(`🌍 [BILINGUAL SETTINGS] Updating feature assignment: ${req.params.id}`);
        
        const {
            primary_provider_id,
            backup_provider_id,
            feature_config,
            enable_failover,
            max_retries,
            retry_delay_seconds,
            is_active
        } = req.body;
        
        // Get current assignment for audit
        const { data: currentAssignment, error: fetchError } = await supabaseAdmin
            .from('feature_provider_assignments')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (fetchError) {
            return res.status(404).json({
                success: false,
                error: 'Feature assignment not found'
            });
        }
        
        // Store original values for audit
        req.originalValues = currentAssignment;
        
        // Prepare update data
        const updateData = {
            primary_provider_id,
            backup_provider_id,
            feature_config,
            enable_failover,
            max_retries,
            retry_delay_seconds,
            is_active
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );
        
        // Update assignment
        const { data: updatedAssignment, error } = await supabaseAdmin
            .from('feature_provider_assignments')
            .update(updateData)
            .eq('id', req.params.id)
            .select(`
                *,
                primary_provider:primary_provider_id (
                    id,
                    provider_key,
                    provider_name,
                    provider_type
                ),
                backup_provider:backup_provider_id (
                    id,
                    provider_key,
                    provider_name,
                    provider_type
                )
            `)
            .single();
        
        if (error) {
            console.error('🚨 [BILINGUAL SETTINGS] Error updating feature assignment:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update feature assignment',
                details: error.message
            });
        }
        
        console.log(`✅ [BILINGUAL SETTINGS] Updated feature assignment: ${updatedAssignment.feature_name}`);
        
        res.json({
            success: true,
            data: updatedAssignment
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in PUT /feature-assignments/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// HELPER ROUTES
// ============================================================================

// GET /api/bilingual-settings/categories - Get available categories
router.get('/categories', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log('🌍 [BILINGUAL SETTINGS] Getting categories...');
        
        const categories = {
            translation_settings: ['general', 'providers', 'quality', 'caching', 'fallback', 'analytics'],
            provider_types: ['ai_language', 'ai_tts', 'ai_vision', 'translation', 'storage', 'payment', 'communication', 'analytics', 'monitoring'],
            assignment_types: ['primary', 'secondary', 'fallback'],
            feature_categories: ['translation', 'tts', 'ai_chat', 'ai_reading', 'image_generation', 'content_moderation', 'analytics', 'storage', 'communication']
        };
        
        console.log('✅ [BILINGUAL SETTINGS] Retrieved categories');
        
        res.json({
            success: true,
            data: categories
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /categories:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/bilingual-settings/health - Get system health
router.get('/health', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log('🌍 [BILINGUAL SETTINGS] Getting system health...');
        
        // Get active providers count
        const { data: providers, error: providersError } = await supabaseAdmin
            .from('providers')
            .select('health_status, provider_type')
            .eq('is_active', true);
        
        // Get active settings count
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('translation_settings')
            .select('setting_category')
            .eq('is_active', true);
        
        // Get active assignments count
        const { data: assignments, error: assignmentsError } = await supabaseAdmin
            .from('translation_provider_assignments')
            .select('assignment_type, is_default')
            .eq('is_active', true);
        
        if (providersError || settingsError || assignmentsError) {
            throw new Error('Failed to fetch health data');
        }
        
        const healthData = {
            providers: {
                total: providers.length,
                healthy: providers.filter(p => p.health_status === 'healthy').length,
                degraded: providers.filter(p => p.health_status === 'degraded').length,
                down: providers.filter(p => p.health_status === 'down').length,
                by_type: providers.reduce((acc, p) => {
                    acc[p.provider_type] = (acc[p.provider_type] || 0) + 1;
                    return acc;
                }, {})
            },
            settings: {
                total: settings.length,
                by_category: settings.reduce((acc, s) => {
                    acc[s.setting_category] = (acc[s.setting_category] || 0) + 1;
                    return acc;
                }, {})
            },
            assignments: {
                total: assignments.length,
                primary: assignments.filter(a => a.assignment_type === 'primary').length,
                secondary: assignments.filter(a => a.assignment_type === 'secondary').length,
                fallback: assignments.filter(a => a.assignment_type === 'fallback').length,
                default_assigned: assignments.filter(a => a.is_default === true).length
            },
            status: 'operational',
            timestamp: new Date().toISOString()
        };
        
        console.log('✅ [BILINGUAL SETTINGS] System health retrieved');
        
        res.json({
            success: true,
            data: healthData
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /health:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/bilingual-settings/analytics - Get translation analytics
router.get('/analytics', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log('🌍 [BILINGUAL SETTINGS] Getting analytics...');
        
        const { date_range = '7d' } = req.query;
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        const days = parseInt(date_range.replace('d', '')) || 7;
        startDate.setDate(endDate.getDate() - days);
        
        // Get provider usage analytics
        const { data: providerUsage, error: providerError } = await supabaseAdmin
            .from('provider_usage_analytics')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        // Get translation settings usage
        const { data: settingsUsage, error: settingsError } = await supabaseAdmin
            .from('translation_settings')
            .select('setting_key, setting_category, updated_at')
            .eq('is_active', true);
        
        // Get provider assignments
        const { data: assignments, error: assignmentsError } = await supabaseAdmin
            .from('translation_provider_assignments')
            .select('provider_id, assignment_type, is_default')
            .eq('is_active', true);
        
        if (providerError || settingsError || assignmentsError) {
            console.error('🚨 [BILINGUAL SETTINGS] Error fetching analytics:', providerError || settingsError || assignmentsError);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch analytics data'
            });
        }
        
        // Process analytics data
        const analytics = {
            overview: {
                total_requests: providerUsage?.reduce((sum, usage) => sum + (usage.total_requests || 0), 0) || 0,
                successful_requests: providerUsage?.reduce((sum, usage) => sum + (usage.successful_requests || 0), 0) || 0,
                failed_requests: providerUsage?.reduce((sum, usage) => sum + (usage.failed_requests || 0), 0) || 0,
                average_response_time: providerUsage?.length > 0 ? 
                    providerUsage.reduce((sum, usage) => sum + (usage.average_response_time || 0), 0) / providerUsage.length : 0
            },
            providers: {
                total_active: assignments?.length || 0,
                primary_assignments: assignments?.filter(a => a.assignment_type === 'primary').length || 0,
                fallback_assignments: assignments?.filter(a => a.assignment_type === 'fallback').length || 0,
                usage_by_provider: providerUsage || []
            },
            settings: {
                total_active: settingsUsage?.length || 0,
                by_category: settingsUsage?.reduce((acc, setting) => {
                    acc[setting.setting_category] = (acc[setting.setting_category] || 0) + 1;
                    return acc;
                }, {}) || {},
                recent_updates: settingsUsage?.filter(s => 
                    new Date(s.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                ).length || 0
            },
            date_range: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                days: days
            },
            generated_at: new Date().toISOString()
        };
        
        console.log('✅ [BILINGUAL SETTINGS] Analytics retrieved');
        
        res.json({
            success: true,
            data: analytics
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// GET /api/bilingual-settings/provider-health - Get provider health status
router.get('/provider-health', authenticateToken, roleCheck(['admin', 'super_admin']), async (req, res) => {
    try {
        console.log('🌍 [BILINGUAL SETTINGS] Getting provider health...');
        
        // Get provider health from system health checks
        const { data: healthChecks, error: healthError } = await supabaseAdmin
            .from('system_health_checks')
            .select('*')
            .eq('check_type', 'provider_health')
            .order('created_at', { ascending: false })
            .limit(50);
        
        // Get active providers
        const { data: providers, error: providersError } = await supabaseAdmin
            .from('providers')
            .select('id, provider_name, provider_type, health_status, last_health_check, is_active')
            .eq('is_active', true);
        
        if (healthError || providersError) {
            console.error('🚨 [BILINGUAL SETTINGS] Error fetching provider health:', healthError || providersError);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch provider health data'
            });
        }
        
        // Process health data
        const providerHealth = {
            overview: {
                total_providers: providers?.length || 0,
                healthy_providers: providers?.filter(p => p.health_status === 'healthy').length || 0,
                degraded_providers: providers?.filter(p => p.health_status === 'degraded').length || 0,
                down_providers: providers?.filter(p => p.health_status === 'down').length || 0
            },
            providers: providers?.map(provider => ({
                id: provider.id,
                name: provider.provider_name,
                type: provider.provider_type,
                status: provider.health_status || 'unknown',
                last_check: provider.last_health_check,
                is_active: provider.is_active
            })) || [],
            recent_checks: healthChecks?.slice(0, 10).map(check => ({
                provider_id: check.target_id,
                check_time: check.created_at,
                status: check.status,
                response_time: check.response_time_ms,
                error_message: check.error_message
            })) || [],
            system_status: {
                overall: providers?.every(p => p.health_status === 'healthy') ? 'healthy' : 
                        providers?.some(p => p.health_status === 'down') ? 'degraded' : 'operational',
                last_updated: new Date().toISOString()
            }
        };
        
        console.log('✅ [BILINGUAL SETTINGS] Provider health retrieved');
        
        res.json({
            success: true,
            data: providerHealth
        });
        
    } catch (error) {
        console.error('🚨 [BILINGUAL SETTINGS] Error in GET /provider-health:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router; 