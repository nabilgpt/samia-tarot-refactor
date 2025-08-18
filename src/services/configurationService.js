import { supabase } from '../lib/supabase.js';
import api from './frontendApi.js';

export class ConfigurationService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // ============================================================================
    // CONFIGURATION CATEGORIES
    // ============================================================================

    async getCategories() {
        try {
            const response = await api.get('/configuration/categories');
            return response.data;
        } catch (error) {
            console.error('Error fetching configuration categories:', error);
            throw error;
        }
    }

    // ============================================================================
    // CONFIGURATION MANAGEMENT
    // ============================================================================

    async getConfigurationsByCategory(category) {
        try {
            const response = await api.get(`/configuration/category/${category}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching configurations for category ${category}:`, error);
            throw error;
        }
    }

    async getConfigurationValue(configKey, useCache = true) {
        try {
            // Check cache first
            if (useCache && this.cache.has(configKey)) {
                const cached = this.cache.get(configKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.value;
                }
            }

            const response = await api.get(`/configuration/value/${configKey}`);
            const value = response.data.value;

            // Cache the value
            this.cache.set(configKey, {
                value,
                timestamp: Date.now()
            });

            return value;
        } catch (error) {
            console.error(`Error fetching configuration value for ${configKey}:`, error);
            throw error;
        }
    }

    async updateConfigurationValue(configKey, value, changeReason = '') {
        try {
            const response = await api.put(`/configuration/value/${configKey}`, {
                value,
                changeReason
            });

            // Clear cache for this key
            this.cache.delete(configKey);

            return response.data;
        } catch (error) {
            console.error(`Error updating configuration value for ${configKey}:`, error);
            throw error;
        }
    }

    async testConfiguration(configKey) {
        try {
            const response = await api.post(`/configuration/test/${configKey}`);
            return response.data;
        } catch (error) {
            console.error(`Error testing configuration ${configKey}:`, error);
            throw error;
        }
    }

    // ============================================================================
    // VALIDATION HELPERS
    // ============================================================================

    validateConfigurationValue(config, value) {
        const errors = [];

        // Check required fields
        if (config.is_required && (!value || value.trim() === '')) {
            errors.push('This configuration is required');
        }

        // Validate data type
        switch (config.data_type) {
            case 'number':
                if (value && isNaN(Number(value))) {
                    errors.push('Value must be a number');
                }
                break;
            case 'boolean':
                if (value && !['true', 'false'].includes(value.toLowerCase())) {
                    errors.push('Value must be true or false');
                }
                break;
            case 'json':
                if (value) {
                    try {
                        JSON.parse(value);
                    } catch (e) {
                        errors.push('Value must be valid JSON');
                    }
                }
                break;
        }

        return errors;
    }

    getConfigurationIcon(category) {
        const icons = {
            infrastructure: 'Database',
            security: 'Shield',
            payments: 'CreditCard',
            ai_services: 'Brain',
            communication: 'Mail',
            notifications: 'Bell',
            analytics: 'BarChart',
            emergency: 'AlertTriangle',
            system: 'Settings',
            development: 'Code'
        };

        return icons[category] || 'Settings';
    }
}

export default new ConfigurationService();
