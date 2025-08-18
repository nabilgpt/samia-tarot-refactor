/**
 * Enhanced Providers & Secrets Management API Service
 * SAMIA TAROT - Dashboard Frontend
 * 
 * Frontend API service for managing providers, services, models, and secrets
 */

import api from './frontendApi';

const enhancedProvidersApi = {
  // =====================================================
  // PROVIDERS MANAGEMENT
  // =====================================================
  
  // Get all providers
  getProviders: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.type) queryParams.append('type', params.type);
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    
    const queryString = queryParams.toString();
    const url = `/enhanced-providers/providers${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Get specific provider
  getProvider: async (id) => {
    const response = await api.get(`/enhanced-providers/providers/${id}`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Create new provider
  createProvider: async (providerData) => {
    const response = await api.post('/enhanced-providers/providers', providerData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Update provider
  updateProvider: async (id, providerData) => {
    const response = await api.put(`/enhanced-providers/providers/${id}`, providerData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Delete provider
  deleteProvider: async (id) => {
    const response = await api.delete(`/enhanced-providers/providers/${id}`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // =====================================================
  // SERVICES MANAGEMENT
  // =====================================================

  // Get all services
  getServices: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.provider_id) queryParams.append('provider_id', params.provider_id);
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    
    const queryString = queryParams.toString();
    const url = `/enhanced-providers/services${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Get specific service
  getService: async (id) => {
    const response = await api.get(`/enhanced-providers/services/${id}`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Create new service
  createService: async (serviceData) => {
    const response = await api.post('/enhanced-providers/services', serviceData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Update service
  updateService: async (id, serviceData) => {
    const response = await api.put(`/enhanced-providers/services/${id}`, serviceData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Delete service
  deleteService: async (id) => {
    const response = await api.delete(`/enhanced-providers/services/${id}`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // =====================================================
  // MODELS MANAGEMENT
  // =====================================================

  // Get all models
  getModels: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.provider_id) queryParams.append('provider_id', params.provider_id);
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    
    const queryString = queryParams.toString();
    const url = `/enhanced-providers/models${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Get specific model
  getModel: async (id) => {
    const response = await api.get(`/enhanced-providers/models/${id}`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Create new model
  createModel: async (modelData) => {
    const response = await api.post('/enhanced-providers/models', modelData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Update model
  updateModel: async (id, modelData) => {
    const response = await api.put(`/enhanced-providers/models/${id}`, modelData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Delete model
  deleteModel: async (id) => {
    const response = await api.delete(`/enhanced-providers/models/${id}`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // =====================================================
  // SECRETS MANAGEMENT (Super Admin Only)
  // =====================================================

  // Get all secrets
  getSecrets: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.provider_id) queryParams.append('provider_id', params.provider_id);
    if (params.service_id) queryParams.append('service_id', params.service_id);
    if (params.model_id) queryParams.append('model_id', params.model_id);
    if (params.region) queryParams.append('region', params.region);
    if (params.usage_scope) queryParams.append('usage_scope', params.usage_scope);
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    
    const queryString = queryParams.toString();
    const url = `/enhanced-providers/secrets${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Get specific secret (with actual value)
  getSecret: async (id) => {
    const response = await api.get(`/enhanced-providers/secrets/${id}`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Create new secret
  createSecret: async (secretData) => {
    const response = await api.post('/enhanced-providers/secrets', secretData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Update secret
  updateSecret: async (id, secretData) => {
    const response = await api.put(`/enhanced-providers/secrets/${id}`, secretData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Delete secret
  deleteSecret: async (id) => {
    const response = await api.delete(`/enhanced-providers/secrets/${id}`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Test secret connection
  testSecret: async (id) => {
    const response = await api.post(`/enhanced-providers/secrets/${id}/test`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  // Get provider statistics
  getProviderStats: async (providerId) => {
    const response = await api.get(`/enhanced-providers/providers/${providerId}/stats`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Get usage analytics
  getUsageAnalytics: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.provider_id) queryParams.append('provider_id', params.provider_id);
    if (params.service_id) queryParams.append('service_id', params.service_id);
    if (params.model_id) queryParams.append('model_id', params.model_id);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    const queryString = queryParams.toString();
    const url = `/enhanced-providers/analytics${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Health check for all providers
  healthCheck: async () => {
    const response = await api.get('/enhanced-providers/health');
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  }
};

export default enhancedProvidersApi; 