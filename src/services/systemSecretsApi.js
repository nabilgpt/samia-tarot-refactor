import api from './frontendApi.js';

export const systemSecretsApi = {
  // Get all system secrets (with masked values)
  getSecrets: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);
    if (params.active_only) queryParams.append('active_only', params.active_only);
    
    const queryString = queryParams.toString();
    const url = `/system-secrets${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (Array.isArray(response)) {
      return { success: true, data: response };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: [] };
    }
  },

  // Get all available categories
  getCategories: async () => {
    const response = await api.get('/system-secrets/categories');
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (Array.isArray(response)) {
      return { success: true, data: response };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: [] };
    }
  },

  // Get specific system secret (with actual value)
  getSecret: async (id) => {
    const response = await api.get(`/system-secrets/${id}`);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Create new system secret
  createSecret: async (secretData) => {
    const response = await api.post('/system-secrets', secretData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Update system secret
  updateSecret: async (id, secretData) => {
    const response = await api.put(`/system-secrets/${id}`, secretData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Delete system secret
  deleteSecret: async (id, confirmData) => {
    const response = await api.delete(`/system-secrets/${id}`, { data: confirmData });
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Get audit logs for system secrets
  getAuditLogs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.config_key) queryParams.append('config_key', params.config_key);
    if (params.action) queryParams.append('action', params.action);
    if (params.user_id) queryParams.append('user_id', params.user_id);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const url = `/system-secrets/audit-logs${queryString ? `?${queryString}` : ''}`;
    
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

  // Test connection for specific secret
  testConnection: async (id) => {
    const response = await api.post(`/system-secrets/${id}/test`);
    
    // Backend returns { success: true, test_result: { success: boolean, message: string } }
    // Extract the test_result from the response
    const testResult = response.test_result || response.data?.test_result || response.data;
    
    return { success: true, data: testResult };
  },

  // Auto-populate with default secrets
  bulkPopulate: async (options = {}) => {
    const response = await api.post('/system-secrets/bulk-populate', options);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // Export secrets to JSON
  exportSecrets: async (options = {}) => {
    const queryParams = new URLSearchParams();
    
    if (options.include_values) queryParams.append('include_values', options.include_values);
    if (options.categories && options.categories.length > 0) {
      options.categories.forEach(cat => queryParams.append('categories[]', cat));
    }
    if (options.include_inactive) queryParams.append('include_inactive', options.include_inactive);
    if (options.mask_values) queryParams.append('mask_values', options.mask_values);
    
    const queryString = queryParams.toString();
    const url = `/system-secrets/export${queryString ? `?${queryString}` : ''}`;
    
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

  // Import secrets from JSON
  importSecrets: async (importData) => {
    const response = await api.post('/system-secrets/import', importData);
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: response };
    }
  },

  // New function to get all AI providers for the secrets management UI
  getProviders: async () => {
    const response = await api.get('/dynamic-ai/providers');
    
    // Handle different response structures after JSON parsing fix
    if (response.success) {
      return { success: true, data: response.data };
    } else if (Array.isArray(response)) {
      return { success: true, data: response };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: [] };
    }
  },

  // Get subcategories for a specific category
  getSubcategories: async (categoryId) => {
    const response = await api.get(`/secret-categories/${categoryId}/subcategories`);
    
    if (response.success) {
      return { success: true, data: response.data };
    } else if (Array.isArray(response)) {
      return { success: true, data: response };
    } else if (response.data) {
      return { success: true, data: response.data };
    } else {
      return { success: true, data: [] };
    }
  },

  // Create new category
  createCategory: async (categoryData) => {
    const response = await api.post('/secret-categories', categoryData);
    return response;
  },

  // Update existing category
  updateCategory: async (categoryId, categoryData) => {
    const response = await api.put(`/secret-categories/${categoryId}`, categoryData);
    return response;
  },

  // Delete category
  deleteCategory: async (categoryId) => {
    const response = await api.delete(`/secret-categories/${categoryId}`);
    return response;
  },

  // Create new subcategory
  createSubcategory: async (subcategoryData) => {
    const response = await api.post('/secret-categories/subcategories', subcategoryData);
    return response;
  },

  // Update existing subcategory
  updateSubcategory: async (subcategoryId, subcategoryData) => {
    const response = await api.put(`/secret-categories/subcategories/${subcategoryId}`, subcategoryData);
    return response;
  },

  // Delete subcategory
  deleteSubcategory: async (subcategoryId) => {
    const response = await api.delete(`/secret-categories/subcategories/${subcategoryId}`);
    return response;
  }
};

export default systemSecretsApi; 