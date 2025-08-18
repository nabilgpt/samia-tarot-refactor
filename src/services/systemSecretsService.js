// ============================================================================
// SAMIA TAROT - SYSTEM SECRETS SERVICE
// Frontend service for managing system secrets, API keys, and credentials
// ============================================================================
// Date: 2025-07-13
// Purpose: Service layer for System Secrets management with new database schema
// Security: Super admin only, encrypted secrets, comprehensive audit trails
// ============================================================================

import api from './frontendApi.js';

class SystemSecretsService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // ============================================================================
    // SYSTEM SECRETS MANAGEMENT
    // ============================================================================

    /**
     * Get all system secrets (metadata only, no decrypted values)
     * @param {Object} filters - Optional filters { category, subcategory, provider, active_only }
     * @returns {Promise<Object>} - Response with grouped secrets data
     */
    async getSystemSecrets(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.category) params.append('category', filters.category);
            if (filters.subcategory) params.append('subcategory', filters.subcategory);
            if (filters.provider) params.append('provider', filters.provider);
            if (filters.active_only) params.append('active_only', filters.active_only);
            
            const response = await api.get(`/system-secrets?${params}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching system secrets:', error);
            throw error;
        }
    }

    /**
     * Get available categories and subcategories
     * @returns {Promise<Object>} - Response with categories data
     */
    async getCategories() {
        try {
            const response = await api.get('/system-secrets/categories');
            return response.data;
        } catch (error) {
            console.error('Error fetching system secrets categories:', error);
            throw error;
        }
    }

    /**
     * Get specific secret with decrypted value
     * @param {string} secretId - Secret ID
     * @returns {Promise<Object>} - Response with secret data including decrypted value
     */
    async getSecretValue(secretId) {
        try {
            const response = await api.get(`/system-secrets/${secretId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching secret ${secretId}:`, error);
            throw error;
        }
    }

    /**
     * Create new system secret
     * @param {Object} secretData - Secret data
     * @returns {Promise<Object>} - Response with created secret
     */
    async createSecret(secretData) {
        try {
            const response = await api.post('/system-secrets', secretData);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error('Error creating system secret:', error);
            throw error;
        }
    }

    /**
     * Update existing system secret
     * @param {string} secretId - Secret ID
     * @param {Object} updateData - Updated secret data
     * @returns {Promise<Object>} - Response with updated secret
     */
    async updateSecret(secretId, updateData) {
        try {
            const response = await api.put(`/system-secrets/${secretId}`, updateData);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error(`Error updating secret ${secretId}:`, error);
            throw error;
        }
    }

    /**
     * Delete system secret
     * @param {string} secretId - Secret ID
     * @returns {Promise<Object>} - Response with deletion confirmation
     */
    async deleteSecret(secretId) {
        try {
            const response = await api.delete(`/system-secrets/${secretId}`);
            this.clearCache(); // Clear cache after modification
            return response.data;
        } catch (error) {
            console.error(`Error deleting secret ${secretId}:`, error);
            throw error;
        }
    }

    /**
     * Test system secret (validate API key, connection, etc.)
     * @param {string} secretId - Secret ID
     * @returns {Promise<Object>} - Response with test results
     */
    async testSecret(secretId) {
        try {
            const response = await api.post(`/system-secrets/${secretId}/test`);
            
            // Backend returns { success: true, test_result: { success: boolean, message: string } }
            // Extract the test_result from the response
            const testResult = response.test_result || response.data?.test_result || response.data;
            
            return { success: true, data: testResult };
        } catch (error) {
            console.error(`Error testing secret ${secretId}:`, error);
            throw error;
        }
    }

    /**
     * Get access logs for a secret
     * @param {string} secretId - Secret ID
     * @param {Object} filters - Optional filters { limit, offset, access_type }
     * @returns {Promise<Object>} - Response with access logs
     */
    async getAccessLogs(secretId, filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.limit) params.append('limit', filters.limit);
            if (filters.offset) params.append('offset', filters.offset);
            if (filters.access_type) params.append('access_type', filters.access_type);
            
            const response = await api.get(`/system-secrets/${secretId}/logs?${params}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching access logs for secret ${secretId}:`, error);
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
     * Get icon for secret category
     * @param {string} category - Category name
     * @returns {string} - Icon name
     */
    getCategoryIcon(category) {
        const icons = {
            'infrastructure': 'Database',
            'ai_services': 'Brain',
            'payments': 'CreditCard',
            'communications': 'Mail',
            'communication': 'Mail',
            'security': 'Shield',
            'analytics': 'BarChart',
            'storage': 'HardDrive',
            'integrations': 'Link',
            'system': 'Settings'
        };
        return icons[category] || 'Settings';
    }

    /**
     * Get icon for secret subcategory
     * @param {string} subcategory - Subcategory name
     * @returns {string} - Icon name
     */
    getSubcategoryIcon(subcategory) {
        const icons = {
            'zodiac_system': 'Stars',
            'openai': 'Brain',
            'elevenlabs': 'Mic',
            'stripe': 'CreditCard',
            'supabase': 'Database',
            'general': 'Settings'
        };
        return icons[subcategory] || 'Settings';
    }

    /**
     * Format display name for secret
     * @param {string} secretKey - Secret key
     * @returns {string} - Formatted display name
     */
    formatDisplayName(secretKey) {
        return secretKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/Api/g, 'API')
            .replace(/Ai/g, 'AI')
            .replace(/Url/g, 'URL')
            .replace(/Id/g, 'ID');
    }

    /**
     * Validate secret value based on type
     * @param {Object} secret - Secret metadata
     * @param {string} value - Secret value
     * @returns {Object} - Validation result { valid, error }
     */
    validateSecret(secret, value) {
        if (secret.is_required && (!value || value.trim() === '')) {
            return { valid: false, error: 'This field is required' };
        }

        // Type-specific validation
        switch (secret.secret_category) {
            case 'ai_services':
                if (secret.secret_key.includes('OPENAI') && value && !value.startsWith('sk-')) {
                    return { valid: false, error: 'OpenAI API keys should start with "sk-"' };
                }
                if (secret.secret_key.includes('ELEVENLABS') && value && value.length < 32) {
                    return { valid: false, error: 'ElevenLabs API key seems too short' };
                }
                break;
            case 'payments':
                if (secret.secret_key.includes('STRIPE') && value && !value.startsWith('sk_')) {
                    return { valid: false, error: 'Stripe secret keys should start with "sk_"' };
                }
                break;
            case 'infrastructure':
                if (secret.secret_key.includes('URL') && value && !value.startsWith('http')) {
                    return { valid: false, error: 'URLs should start with http:// or https://' };
                }
                break;
        }

        return { valid: true, error: null };
    }
}

export default new SystemSecretsService(); 