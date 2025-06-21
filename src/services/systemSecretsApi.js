import api from './api';

// Check if we're in development mode
const isDevelopmentMode = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Mock data for development mode
const mockSystemSecrets = {
  secrets: [
    {
      id: 1,
      key: 'SUPABASE_URL',
      category: 'Database',
      description: 'Supabase project URL',
      value: 'https://*****.supabase.co',
      masked_value: 'https://*****.supabase.co',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      key: 'SUPABASE_ANON_KEY',
      category: 'Database',
      description: 'Supabase anonymous key',
      value: 'eyJhbGciOiJIUzI1NiIs*****',
      masked_value: 'eyJhbGciOiJIUzI1NiIs*****',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 3,
      key: 'STRIPE_SECRET_KEY',
      category: 'Payment',
      description: 'Stripe secret key for payments',
      value: 'sk_test_*****',
      masked_value: 'sk_test_*****',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 4,
      key: 'JWT_SECRET',
      category: 'Security',
      description: 'JWT signing secret',
      value: 'super_secret_jwt_key_*****',
      masked_value: 'super_secret_jwt_key_*****',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  categories: [
    { name: 'Database', count: 2, description: 'Database connection settings' },
    { name: 'Payment', count: 1, description: 'Payment gateway configurations' },
    { name: 'Security', count: 1, description: 'Security and authentication keys' },
    { name: 'Email', count: 0, description: 'Email service configurations' },
    { name: 'External APIs', count: 0, description: 'Third-party API keys' }
  ],
  auditLogs: [
    {
      id: 1,
      config_key: 'SUPABASE_URL',
      action: 'VIEW',
      user_id: 'c3922fea-329a-4d6e-800c-3e03c9fe341d',
      timestamp: new Date().toISOString(),
      ip_address: '127.0.0.1'
    },
    {
      id: 2,
      config_key: 'STRIPE_SECRET_KEY',
      action: 'UPDATE',
      user_id: 'c3922fea-329a-4d6e-800c-3e03c9fe341d',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      ip_address: '127.0.0.1'
    }
  ]
};

export const systemSecretsApi = {
  // Get all system secrets (with masked values)
  getSecrets: async (params = {}) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Returning system secrets data');
      
      let filteredSecrets = [...mockSystemSecrets.secrets];
      
      // Apply filters
      if (params.category) {
        filteredSecrets = filteredSecrets.filter(secret => secret.category === params.category);
      }
      if (params.search) {
        const searchLower = params.search.toLowerCase();
        filteredSecrets = filteredSecrets.filter(secret => 
          secret.key.toLowerCase().includes(searchLower) ||
          secret.description.toLowerCase().includes(searchLower)
        );
      }
      if (params.active_only === 'true' || params.active_only === true) {
        filteredSecrets = filteredSecrets.filter(secret => secret.is_active);
      }
      
      return {
        success: true,
        data: filteredSecrets,
        total: filteredSecrets.length
      };
    }
    
    const queryParams = new URLSearchParams();
    
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);
    if (params.active_only) queryParams.append('active_only', params.active_only);
    
    const queryString = queryParams.toString();
    const url = `/system-secrets${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },

  // Get all available categories
  getCategories: async () => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Returning system secrets categories');
      return {
        success: true,
        data: mockSystemSecrets.categories
      };
    }
    
    const response = await api.get('/system-secrets/categories');
    return response.data;
  },

  // Get specific system secret (with actual value)
  getSecret: async (id) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Returning specific system secret');
      const secret = mockSystemSecrets.secrets.find(s => s.id === parseInt(id));
      return {
        success: true,
        data: secret || null
      };
    }
    
    const response = await api.get(`/system-secrets/${id}`);
    return response.data;
  },

  // Create new system secret
  createSecret: async (secretData) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Creating system secret', secretData);
      const newSecret = {
        id: mockSystemSecrets.secrets.length + 1,
        ...secretData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockSystemSecrets.secrets.push(newSecret);
      return {
        success: true,
        data: newSecret
      };
    }
    
    const response = await api.post('/system-secrets', secretData);
    return response.data;
  },

  // Update system secret
  updateSecret: async (id, secretData) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Updating system secret', id, secretData);
      const secretIndex = mockSystemSecrets.secrets.findIndex(s => s.id === parseInt(id));
      if (secretIndex !== -1) {
        mockSystemSecrets.secrets[secretIndex] = {
          ...mockSystemSecrets.secrets[secretIndex],
          ...secretData,
          updated_at: new Date().toISOString()
        };
        return {
          success: true,
          data: mockSystemSecrets.secrets[secretIndex]
        };
      }
      return { success: false, error: 'Secret not found' };
    }
    
    const response = await api.put(`/system-secrets/${id}`, secretData);
    return response.data;
  },

  // Delete system secret
  deleteSecret: async (id, confirmData) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Deleting system secret', id);
      const secretIndex = mockSystemSecrets.secrets.findIndex(s => s.id === parseInt(id));
      if (secretIndex !== -1) {
        mockSystemSecrets.secrets.splice(secretIndex, 1);
        return {
          success: true,
          message: 'Secret deleted successfully'
        };
      }
      return { success: false, error: 'Secret not found' };
    }
    
    const response = await api.delete(`/system-secrets/${id}`, { data: confirmData });
    return response.data;
  },

  // Get audit logs
  getAuditLogs: async (params = {}) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Returning audit logs');
      return {
        success: true,
        data: mockSystemSecrets.auditLogs,
        total: mockSystemSecrets.auditLogs.length
      };
    }
    
    const queryParams = new URLSearchParams();
    
    if (params.config_key) queryParams.append('config_key', params.config_key);
    if (params.action) queryParams.append('action', params.action);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    const queryString = queryParams.toString();
    const url = `/system-secrets/audit/logs${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },

  // Export system secrets
  exportSecrets: async (exportOptions = {}) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Exporting system secrets');
      return {
        success: true,
        data: {
          filename: 'system-secrets-export.json',
          url: 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mockSystemSecrets.secrets, null, 2))
        }
      };
    }
    
    const response = await api.post('/system-secrets/export', exportOptions);
    return response.data;
  },

  // Import system secrets
  importSecrets: async (importData) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Importing system secrets');
      return {
        success: true,
        data: {
          imported: 0,
          skipped: 0,
          errors: 0
        }
      };
    }
    
    const response = await api.post('/system-secrets/import', importData);
    return response.data;
  },

  // Test connection for specific secret
  testConnection: async (id) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Testing connection for secret', id);
      return {
        success: true,
        data: {
          status: 'connected',
          message: 'Connection test successful',
          response_time: '120ms'
        }
      };
    }
    
    const response = await api.post(`/system-secrets/test-connection/${id}`);
    return response.data;
  },

  // Auto-populate with default secrets
  bulkPopulate: async (options = {}) => {
    if (isDevelopmentMode) {
      console.log('🔧 Mock mode: Bulk populating system secrets');
      return {
        success: true,
        data: {
          created: 5,
          updated: 2,
          skipped: 1
        }
      };
    }
    
    const response = await api.post('/system-secrets/bulk-populate', options);
    return response.data;
  }
};

export default systemSecretsApi; 