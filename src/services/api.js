// ============================================================================
// SAMIA TAROT - BACKEND API CLIENT
// Backend API client configuration using Node.js environment variables
// ============================================================================

// SECURITY: This file should ONLY be used in backend contexts
if (typeof window !== "undefined") {
  throw new Error("[SECURITY] Backend api.js imported in browser context! Use frontendApi.js instead!");
}

import { supabase } from '../api/lib/supabase.js'; // Direct backend import

// Backend environment configuration
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
const API_BASE_URL = process.env.API_URL || 'http://localhost:5001/api';

console.log('🔧 Backend API Client Configuration:', {
  environment: 'backend-only',
  isDevelopment,
  NODE_ENV: process.env.NODE_ENV,
  API_URL: process.env.API_URL,
  finalURL: API_BASE_URL
});

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.supabaseClient = supabase; // Direct backend supabase
  }

  async getAuthHeaders() {
    try {
      if (!this.supabaseClient) {
        console.warn('⚠️ Backend API Client: No supabase client available');
        return {};
      }

      const { data: { session } } = await this.supabaseClient.auth.getSession();

      if (!session?.access_token) {
        console.warn('⚠️ Backend API Client: No valid session found');
        return {};
      }

      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    } catch (error) {
      console.error('❌ Backend API Client: Failed to get auth headers:', error);
      return {};
    }
  }

  async request(method, url, options = {}) {
    const { data, headers: customHeaders, requireAuth = true, ...fetchOptions } = options;
    
    try {
      let headers = {
        'Content-Type': 'application/json',
        ...customHeaders
      };

      // Add auth headers if required
      if (requireAuth) {
        const authHeaders = await this.getAuthHeaders();
        headers = { ...headers, ...authHeaders };
      }

      const config = {
        method: method.toUpperCase(),
        headers,
        ...fetchOptions
      };

      // Add body for methods that support it
      if (data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        config.body = typeof data === 'string' ? data : JSON.stringify(data);
      }

      const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
      
      if (isDevelopment) {
        console.log(`🔌 API ${method.toUpperCase()}: ${fullUrl}`);
      }

      const response = await fetch(fullUrl, config);
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        };
        throw error;
      }

      if (isDevelopment) {
        console.log(`✅ API ${method.toUpperCase()}: ${fullUrl} - Success`);
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      };

    } catch (error) {
      console.error(`❌ API Network Error:`, error);
      
      // Return a consistent error structure
      const apiError = new Error(error.message || 'Network request failed');
      apiError.response = {
        status: error.response?.status || 0,
        statusText: error.response?.statusText || 'Network Error',
        data: error.response?.data || { error: true, message: error.message || 'fetch failed' }
      };
      
      throw apiError;
    }
  }

  async get(url, options = {}) {
    return this.request('GET', url, options);
  }

  async post(url, data = null, options = {}) {
    return this.request('POST', url, { ...options, data });
  }

  async put(url, data = null, options = {}) {
    return this.request('PUT', url, { ...options, data });
  }

  async patch(url, data = null, options = {}) {
    return this.request('PATCH', url, { ...options, data });
  }

  async delete(url, options = {}) {
    return this.request('DELETE', url, options);
  }
}

// Export singleton instance
export const api = new APIClient();
export default api; 