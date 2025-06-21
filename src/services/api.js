// API Configuration for SAMIA TAROT
// Provides axios-like interface for backend API calls

import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async getAuthHeaders() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return {
          'Authorization': `Bearer ${session.access_token}`
        };
      }
    } catch (error) {
      console.warn('Failed to get auth headers:', error);
    }
    return {};
  }

  async request(method, url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    // Get authentication headers
    const authHeaders = await this.getAuthHeaders();
    
    const config = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      },
      ...options
    };

    // Add body for POST, PUT, PATCH requests
    if (options.data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      config.body = JSON.stringify(options.data);
    }

    try {
      const response = await fetch(fullUrl, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, status: response.status, statusText: response.statusText };
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
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

// Create and export default instance
const api = new APIClient();

export default api;
export { APIClient }; 