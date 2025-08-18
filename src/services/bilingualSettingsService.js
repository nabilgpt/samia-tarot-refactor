// ============================================================================
// SAMIA TAROT - BILINGUAL SETTINGS SERVICE
// Translation settings and provider management (NO secrets or credentials)
// ============================================================================
// Date: 2025-07-13
// Purpose: Service layer for translation settings, provider assignments, and analytics
// Security: Admin/Super Admin access, no sensitive data handling
// ============================================================================

import api from './frontendApi.js';

class BilingualSettingsService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // ============================================================================
    // TRANSLATION SETTINGS MANAGEMENT
    // ============================================================================

    /**
     * Get all translation settings grouped by category
     * @param {Object} filters - Optional filters { category, active_only }
     * @returns {Promise<Object>} - Response with grouped settings data
     */
    async getTranslationSettings(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.category) params.append('category', filters.category);
            if (filters.active_only) params.append('active_only', filters.active_only);
            
            const response = await api.get(`/bilingual-settings/translation-settings?${params}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching translation settings:', error);
            throw error;
        }
    }

    /**
     * Get specific translation setting
     * @param {string} settingId - Setting ID
     * @returns {Promise<Object>} - Response with setting data
     */
    async getTranslationSetting(settingId) {
        try {
            const response = await api.get(`/bilingual-settings/translation-settings/${settingId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching translation setting ${settingId}:`, error);
            throw error;
        }
    }

    /**
     * Update translation setting
     * @param {string} settingId - Setting ID
     * @param {Object} updateData - Updated setting data
     * @returns {Promise<Object>} - Response with updated setting
     */
    async updateTranslationSetting(settingId, updateData) {
        try {
            const response = await api.put(`/bilingual-settings/translation-settings/${settingId}`, updateData);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error(`Error updating translation setting ${settingId}:`, error);
            throw error;
        }
    }

    /**
     * Create new translation setting
     * @param {Object} settingData - Setting data
     * @returns {Promise<Object>} - Response with created setting
     */
    async createTranslationSetting(settingData) {
        try {
            const response = await api.post('/bilingual-settings/translation-settings', settingData);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error('Error creating translation setting:', error);
            throw error;
        }
    }

    /**
     * Delete translation setting
     * @param {string} settingId - Setting ID
     * @returns {Promise<Object>} - Response with deletion confirmation
     */
    async deleteTranslationSetting(settingId) {
        try {
            const response = await api.delete(`/bilingual-settings/translation-settings/${settingId}`);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error(`Error deleting translation setting ${settingId}:`, error);
            throw error;
        }
    }

    // ============================================================================
    // PROVIDER MANAGEMENT (NON-SENSITIVE DATA ONLY)
    // ============================================================================

    /**
     * Get all translation providers grouped by type
     * @param {Object} filters - Optional filters { type, active_only }
     * @returns {Promise<Object>} - Response with grouped providers data
     */
    async getProviders(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.type) params.append('type', filters.type);
            if (filters.active_only) params.append('active_only', filters.active_only);
            
            const response = await api.get(`/bilingual-settings/providers?${params}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching providers:', error);
            throw error;
        }
    }

    /**
     * Get specific provider (non-sensitive data only)
     * @param {string} providerId - Provider ID
     * @returns {Promise<Object>} - Response with provider data
     */
    async getProvider(providerId) {
        try {
            const response = await api.get(`/bilingual-settings/providers/${providerId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching provider ${providerId}:`, error);
            throw error;
        }
    }

    /**
     * Update provider (non-sensitive data only)
     * @param {string} providerId - Provider ID
     * @param {Object} updateData - Updated provider data (no credentials)
     * @returns {Promise<Object>} - Response with updated provider
     */
    async updateProvider(providerId, updateData) {
        try {
            const response = await api.put(`/bilingual-settings/providers/${providerId}`, updateData);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error(`Error updating provider ${providerId}:`, error);
            throw error;
        }
    }

    /**
     * Create new provider (non-sensitive data only)
     * @param {Object} providerData - Provider data (no credentials)
     * @returns {Promise<Object>} - Response with created provider
     */
    async createProvider(providerData) {
        try {
            const response = await api.post('/bilingual-settings/providers', providerData);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error('Error creating provider:', error);
            throw error;
        }
    }

    /**
     * Delete provider
     * @param {string} providerId - Provider ID
     * @returns {Promise<Object>} - Response with deletion confirmation
     */
    async deleteProvider(providerId) {
        try {
            const response = await api.delete(`/bilingual-settings/providers/${providerId}`);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error(`Error deleting provider ${providerId}:`, error);
            throw error;
        }
    }

    // ============================================================================
    // PROVIDER ASSIGNMENTS MANAGEMENT
    // ============================================================================

    /**
     * Get translation provider assignments
     * @param {Object} filters - Optional filters { feature_name, provider_type }
     * @returns {Promise<Object>} - Response with provider assignments
     */
    async getProviderAssignments(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.feature_name) params.append('feature_name', filters.feature_name);
            if (filters.provider_type) params.append('provider_type', filters.provider_type);
            
            const response = await api.get(`/bilingual-settings/provider-assignments?${params}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching provider assignments:', error);
            throw error;
        }
    }

    /**
     * Update provider assignment for a feature
     * @param {string} featureName - Feature name
     * @param {Object} assignmentData - Assignment data
     * @returns {Promise<Object>} - Response with updated assignment
     */
    async updateProviderAssignment(featureName, assignmentData) {
        try {
            const response = await api.put(`/bilingual-settings/provider-assignments/${featureName}`, assignmentData);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error(`Error updating provider assignment for ${featureName}:`, error);
            throw error;
        }
    }

    // ============================================================================
    // ANALYTICS AND MONITORING
    // ============================================================================

    /**
     * Get translation analytics
     * @param {Object} filters - Optional filters { provider_id, date_range, metric_type }
     * @returns {Promise<Object>} - Response with analytics data
     */
    async getAnalytics(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.provider_id) params.append('provider_id', filters.provider_id);
            if (filters.date_range) params.append('date_range', filters.date_range);
            if (filters.metric_type) params.append('metric_type', filters.metric_type);
            
            const response = await api.get(`/bilingual-settings/analytics?${params}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw error;
        }
    }

    /**
     * Get provider health status
     * @param {string} providerId - Provider ID (optional)
     * @returns {Promise<Object>} - Response with health data
     */
    async getProviderHealth(providerId = null) {
        try {
            const url = providerId 
                ? `/bilingual-settings/provider-health/${providerId}`
                : '/bilingual-settings/provider-health';
            
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching provider health:', error);
            throw error;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Clear service cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get icon for provider type
     * @param {string} providerType - Provider type
     * @returns {string} - Icon name
     */
    getProviderTypeIcon(providerType) {
        const icons = {
            'openai': 'Bot',
            'google': 'Globe',
            'azure': 'Cloud',
            'aws': 'Database',
            'anthropic': 'Brain',
            'huggingface': 'Cpu',
            'custom': 'Settings'
        };
        return icons[providerType] || 'Bot';
    }

    /**
     * Get color for provider status
     * @param {string} status - Provider status
     * @returns {string} - Color class
     */
    getProviderStatusColor(status) {
        const colors = {
            'active': 'text-green-400',
            'inactive': 'text-gray-400',
            'error': 'text-red-400',
            'warning': 'text-yellow-400',
            'testing': 'text-blue-400'
        };
        return colors[status] || 'text-gray-400';
    }

    /**
     * Format setting value for display
     * @param {Object} setting - Setting object
     * @returns {string} - Formatted value
     */
    formatSettingValue(setting) {
        if (!setting.setting_value) return 'Not set';
        
        switch (setting.setting_type) {
            case 'boolean':
                return setting.setting_value === 'true' ? 'Enabled' : 'Disabled';
            case 'number':
                return setting.setting_value.toString();
            case 'array':
                try {
                    const arr = JSON.parse(setting.setting_value);
                    return Array.isArray(arr) ? arr.join(', ') : setting.setting_value;
                } catch {
                    return setting.setting_value;
                }
            case 'object':
                try {
                    const obj = JSON.parse(setting.setting_value);
                    return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : setting.setting_value;
                } catch {
                    return setting.setting_value;
                }
            default:
                return setting.setting_value;
        }
    }

    /**
     * Validate setting value
     * @param {Object} setting - Setting metadata
     * @param {string} value - Setting value
     * @returns {Object} - Validation result { valid, error }
     */
    validateSettingValue(setting, value) {
        if (setting.is_required && (!value || value.trim() === '')) {
            return { valid: false, error: 'This setting is required' };
        }

        // Type-specific validation
        switch (setting.setting_type) {
            case 'boolean':
                if (value !== 'true' && value !== 'false') {
                    return { valid: false, error: 'Value must be true or false' };
                }
                break;
            case 'number':
                if (isNaN(parseFloat(value))) {
                    return { valid: false, error: 'Value must be a valid number' };
                }
                break;
            case 'array':
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed)) {
                        return { valid: false, error: 'Value must be a valid JSON array' };
                    }
                } catch {
                    return { valid: false, error: 'Value must be valid JSON' };
                }
                break;
            case 'object':
                try {
                    JSON.parse(value);
                } catch {
                    return { valid: false, error: 'Value must be valid JSON' };
                }
                break;
        }

        // Validation rules
        if (setting.validation_rules) {
            try {
                const rules = JSON.parse(setting.validation_rules);
                
                if (rules.min_length && value.length < rules.min_length) {
                    return { valid: false, error: `Minimum length is ${rules.min_length}` };
                }
                
                if (rules.max_length && value.length > rules.max_length) {
                    return { valid: false, error: `Maximum length is ${rules.max_length}` };
                }
                
                if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
                    return { valid: false, error: 'Value does not match required pattern' };
                }
            } catch {
                // Invalid validation rules - ignore
            }
        }

        return { valid: true, error: null };
    }
}

export default new BilingualSettingsService(); 