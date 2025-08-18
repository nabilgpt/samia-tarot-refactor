// Frontend API Configuration for SAMIA TAROT
// Provides axios-like interface for frontend API calls ONLY
// This file is separate from api.js to avoid environment conflicts

console.trace('[DEBUG] 🌐 Frontend API loaded! FILE:', import.meta.url);

import { supabase } from '../lib/supabase.js'; // Frontend supabase only

// 🔥 EXTREME DEBUG MODE - API Logging System
const EXTREME_DEBUG = true;

function debugLog(label, ...args) {
  if (!EXTREME_DEBUG) return;
  const styles = [
    "background: #222; color: #ff6b35; font-weight: bold; padding: 2px 6px; border-radius: 6px;",
    "color: #fff; background: #1a1a1a; padding: 2px 6px; border-radius: 4px;"
  ];
  if (typeof label === "string") {
    console.log(`%c[EXTREME DEBUG - API]%c ${label}`, ...styles, ...args);
  } else {
    console.log("%c[EXTREME DEBUG - API]", styles[0], label, ...args);
  }
}

// Frontend-specific configuration
const isDevelopment = import.meta.env.MODE === 'development';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

console.log('🔧 Frontend API Client Configuration:', {
  environment: 'frontend-only',
  isDevelopment,
  MODE: import.meta.env.MODE,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  finalURL: API_BASE_URL
});

class FrontendAPIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.supabaseClient = supabase; // Direct frontend supabase
    this.refreshing = false; // Track if refresh is in progress
    this.refreshPromise = null; // Store refresh promise to avoid duplicate calls
  }

  async getAuthHeaders() {
    try {
      debugLog('🔍 [AUTH HEADERS] Starting getAuthHeaders...');
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('auth_token');
      debugLog('🔍 [AUTH HEADERS] Token from localStorage:', token ? 'exists' : 'null');
      
      // BULLETPROOF TOKEN VALIDATION - Same as AuthContext
      if (!token) {
        debugLog('⚠️ No JWT token found in localStorage');
        return {};
      }
      
      // Check for invalid token formats
      const isValidToken = token && 
                          token !== 'undefined' && 
                          token !== 'null' && 
                          token !== 'NULL' &&
                          token.length > 50 && 
                          token.includes('.') && 
                          token.split('.').length === 3;
      
      if (!isValidToken) {
        debugLog('❌ Invalid token detected in getAuthHeaders:', {
          tokenLength: token.length,
          hasFormat: token.includes('.'),
          parts: token.split('.').length,
          isUndefined: token === 'undefined'
        });
        
        // Clean up invalid token
        localStorage.removeItem('auth_token');
        return {};
      }

      // Debug the token structure  
      debugLog('Token validation passed:', {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 50) + '...',
        jwtParts: token.split('.').length,
        structureValid: true
      });

      // Check if token is expired (decode payload without verification)
      try {
        const tokenParts = token.split('.');
        const payloadBase64 = tokenParts[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const currentTime = Math.floor(Date.now() / 1000);
        
        debugLog('Token payload decoded:', {
          userId: decodedPayload.user_id,
          email: decodedPayload.email,
          role: decodedPayload.role,
          expiresAt: new Date(decodedPayload.exp * 1000),
          currentTime: new Date(currentTime * 1000),
          isExpired: decodedPayload.exp && decodedPayload.exp < currentTime
        });
        
        if (decodedPayload.exp && decodedPayload.exp < currentTime) {
          debugLog('⏰ Token has expired - removing from localStorage');
          localStorage.removeItem('auth_token');
          return {};
        }
      } catch (decodeError) {
        debugLog('❌ Failed to decode token payload:', {
          error: decodeError.message,
          tokenPreview: token.substring(0, 30) + '...'
        });
        localStorage.removeItem('auth_token');
        return {};
      }

      const authHeader = `Bearer ${token}`;
      debugLog('✅ Authorization header created successfully:', {
        headerLength: authHeader.length,
        headerPreview: authHeader.substring(0, 50) + '...'
      });
      
      return {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    } catch (error) {
      debugLog('❌ CRITICAL ERROR in getAuthHeaders:', {
        message: error.message,
        name: error.name,
        stack: error.stack.substring(0, 200) + '...'
      });
      return {};
    }
  }

  async refreshToken() {
    // JWT tokens from /auth/login don't have refresh capability
    // User needs to login again when token expires
    console.log('⚠️ [REFRESH] JWT tokens cannot be refreshed - user must login again');
    localStorage.removeItem('auth_token');
    return { success: false, error: 'Token refresh not supported - please login again' };
  }

  async _performRefresh() {
    // Not needed for JWT tokens
    return { success: false, error: 'Token refresh not supported - please login again' };
  }

  async checkTokenHealth() {
    try {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      
      if (!session) {
        return { healthy: false, reason: 'No session' };
      }

      if (!session.access_token) {
        return { healthy: false, reason: 'No access token' };
      }

      if (!session.refresh_token) {
        return { healthy: false, reason: 'No refresh token' };
      }

      // Check if token is expired
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        
        if (expiresAt <= now) {
          return { healthy: false, reason: 'Token expired', expired: true };
        }

        // Check if token expires within 1 minute (critical)
        const oneMinute = 60 * 1000;
        if (expiresAt.getTime() - now.getTime() < oneMinute) {
          return { healthy: false, reason: 'Token expires soon', expiresSoon: true };
        }
      }

      return { healthy: true, session };
      
    } catch (error) {
      return { healthy: false, reason: error.message };
    }
  }

  async handleAuthError() {
    console.log('🚫 [AUTH] Authentication failed - redirecting to login');
    
    // Clear any stored session
    await this.supabaseClient.auth.signOut();
    
    // Show user notification
    if (typeof window !== 'undefined') {
      // Try to use any notification system that might be available
      try {
        // Check if there's a notification context or service
        if (window.showNotification) {
          window.showNotification('Session expired. Please log in again.', 'warning');
        } else {
          // Fallback to alert
          alert('Your session has expired. Please log in again.');
        }
      } catch (error) {
        console.warn('Could not show notification:', error);
      }
      
      // Small delay to ensure notification is shown
      setTimeout(() => {
        // Redirect to login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/auth') {
          window.location.href = '/login';
        }
      }, 100);
    }
  }

  async request(method, url, options = {}) {
    return this._makeRequest(method, url, options);
  }

  async _makeRequest(method, url, options = {}, isRetry = false) {
    debugLog('=== [API REQUEST START] ===');
    debugLog('Request details:', {
      method: method.toUpperCase(),
      url,
      isRetry,
      hasData: !!options.data,
      dataType: options.data ? typeof options.data : null,
      optionsKeys: Object.keys(options)
    });

    try {
      const authHeaders = await this.getAuthHeaders();
      const requestURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
      
      debugLog(`🔌 API ${method.toUpperCase()}: ${requestURL}`);
      debugLog('Auth headers retrieved:', {
        hasAuthHeaders: !!authHeaders,
        headerKeys: Object.keys(authHeaders || {}),
        hasAuthorization: !!(authHeaders?.Authorization)
      });

      const config = {
        method: method.toUpperCase(),
        headers: {
          ...authHeaders,
          ...options.headers
        },
        ...options
      };
      
      debugLog('Request config prepared:', {
        method: config.method,
        headerKeys: Object.keys(config.headers || {}),
        hasContentType: !!(config.headers?.['Content-Type']),
        hasAuthorization: !!(config.headers?.Authorization),
        configKeys: Object.keys(config)
      });

      if (options.data && method !== 'GET' && method !== 'DELETE') {
        if (options.data instanceof FormData) {
          debugLog('Processing FormData body...');
          delete config.headers['Content-Type'];
          config.body = options.data;
          debugLog('FormData body set - removed Content-Type header');
        } else {
          debugLog('Processing JSON body...');
          config.headers['Content-Type'] = 'application/json';
          config.body = JSON.stringify(options.data);
          debugLog('JSON body prepared:', {
            originalData: options.data,
            bodyLength: config.body.length,
            bodyPreview: config.body.length > 100 ? config.body.substring(0, 100) + '...' : config.body
          });
        }
      }

      debugLog('Sending fetch request...', {
        url: requestURL,
        method: config.method,
        hasBody: !!config.body,
        finalHeaders: config.headers
      });

      const response = await fetch(requestURL, config);
      
      debugLog('Fetch response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });

      let responseData;
      
      debugLog('Starting response parsing...');
      // Always try to parse as JSON first, regardless of content-type
      try {
        debugLog('Attempting primary JSON parsing...');
        responseData = await response.json();
        debugLog('✅ Primary JSON parsing successful:', {
          dataType: typeof responseData,
          hasData: responseData !== null && responseData !== undefined,
          isObject: typeof responseData === 'object',
          keys: typeof responseData === 'object' ? Object.keys(responseData) : []
        });
      } catch (e) {
        debugLog('❌ Primary JSON parsing failed:', e.message);
        // If JSON parsing fails, try to get text and parse as JSON
        try {
          debugLog('Attempting text parsing fallback...');
          const textResponse = await response.text();
          debugLog('Text response received:', {
            length: textResponse?.length || 0,
            preview: textResponse?.length > 100 ? textResponse.substring(0, 100) + '...' : textResponse
          });
          responseData = JSON.parse(textResponse);
          debugLog('✅ Text->JSON parsing successful:', {
            dataType: typeof responseData,
            originalText: textResponse
          });
        } catch (e2) {
          debugLog('❌ Text->JSON parsing failed:', e2.message);
          // If both fail, return as text
          responseData = textResponse || '';
          debugLog('Using raw text as response data:', {
            dataType: typeof responseData,
            length: responseData?.length || 0
          });
        }
      }

      // Handle 401 Unauthorized with automatic token refresh
      if (response.status === 401 && !isRetry) {
        debugLog('🔄 401 Unauthorized received - analyzing for token refresh...', {
          isRetry,
          responseData,
          code: responseData?.code,
          error: responseData?.error,
          message: responseData?.message
        });
        
        // Check if this is a token expiry issue
        const isTokenIssue = responseData?.code === 'AUTH_TOKEN_INVALID' || 
            responseData?.error?.includes('expired') ||
            responseData?.error?.includes('invalid token') ||
            responseData?.message?.includes('expired');
            
        debugLog('Token issue analysis:', {
          isTokenIssue,
          hasCode: !!responseData?.code,
          hasError: !!responseData?.error,
          hasMessage: !!responseData?.message
        });
        
        if (isTokenIssue) {
          debugLog('Token issue detected - attempting refresh...');
          const refreshResult = await this.refreshToken();
          
          debugLog('Token refresh result:', {
            success: refreshResult?.success,
            hasNewToken: !!refreshResult?.token,
            refreshResult
          });
          
          if (refreshResult.success) {
            debugLog('✅ Token refreshed successfully - retrying original request');
            // Retry the original request with the new token
            return this._makeRequest(method, url, options, true);
          } else {
            debugLog('❌ Token refresh failed - handling auth error');
            await this.handleAuthError();
            
            const authError = new Error('Authentication failed - session expired');
            authError.response = {
              status: 401,
              statusText: 'Authentication Required',
              data: { error: 'Session expired, please log in again' }
            };
            throw authError;
          }
        }
      }

      if (!response.ok) {
        console.error(`❌ Frontend API Network Error: Error: HTTP ${response.status}: ${response.statusText}`);
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        };
        throw error;
      }

      console.log(`✅ Frontend API Success: ${method.toUpperCase()} ${requestURL}`);
      return responseData;

    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('❌ Frontend API Network Error:', error);
        const networkError = new Error('fetch failed');
        networkError.response = {
          status: 0,
          statusText: 'Network Error',
          data: { error: true, message: 'fetch failed' }
        };
        throw networkError;
      }
      
      console.error(`❌ Frontend API Request failed: ${method.toUpperCase()} ${url}`, error);
      throw error;
    }
  }

  // HTTP method shortcuts
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

  // === SPECIFIC API METHODS ===

  async getProfile(userId) {
    try {
      const response = await this.get(`/user/profile/${userId}`);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to get profile:', error);
      throw error;
    }
  }

  async updateProfile(userId, profileData) {
    try {
      const response = await this.put(`/user/profile/${userId}`, profileData);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to update profile:', error);
      throw error;
    }
  }

  async getUserData(userId) {
    try {
      const response = await this.get(`/user/${userId}`);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to get user data:', error);
      throw error;
    }
  }

  async createProfile(profileData) {
    try {
      const response = await this.post('/user/profile', profileData);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to create profile:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      console.log('🔐 [LOGIN] Attempting login for:', email);
      
      const response = await this.post('/auth/login', { email, password }, { requireAuth: false });
      
      console.log('🔐 [LOGIN] Login response:', response);
      console.log('🔐 [LOGIN] Response type:', typeof response);
      console.log('🔐 [LOGIN] Response keys:', Object.keys(response));
      
      // Handle response structure (response might be directly the data)
      const responseData = response.data || response;
      console.log('🔐 [LOGIN] Response data:', responseData);
      console.log('🔐 [LOGIN] Response data type:', typeof responseData);
      
      if (responseData && responseData.success && responseData.token) {
        // Debug the token before storing
        console.log('🔍 [LOGIN] Token details:');
        console.log('  - Type:', typeof responseData.token);
        console.log('  - Length:', responseData.token.length);
        console.log('  - Preview:', responseData.token.substring(0, 50) + '...');
        
        // Validate token structure
        const tokenParts = responseData.token.split('.');
        console.log('  - Parts count:', tokenParts.length);
        console.log('  - Is valid JWT:', tokenParts.length === 3);
        
        if (tokenParts.length !== 3) {
          console.error('❌ [LOGIN] Invalid JWT token structure!');
          throw new Error('Invalid JWT token received from server');
        }
        
        // Store JWT token in localStorage
        localStorage.setItem('auth_token', responseData.token);
        console.log('✅ [LOGIN] JWT token stored in localStorage');
        
        // Verify storage
        const storedToken = localStorage.getItem('auth_token');
        console.log('✅ [LOGIN] Token verification - stored correctly:', storedToken === responseData.token);
        
        return responseData;
      } else {
        console.error('❌ [LOGIN] Invalid response structure:', responseData);
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('❌ Frontend API: Failed to login:', error);
      throw error;
    }
  }

  async signUp(email, password, userData = {}) {
    try {
      const response = await this.post('/auth/signup', { email, password, ...userData });
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to sign up:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      console.log('🔐 [LOGOUT] Attempting logout...');
      
      // Remove JWT token from localStorage
      localStorage.removeItem('auth_token');
      console.log('✅ [LOGOUT] JWT token removed from localStorage');
      
      const response = await this.post('/auth/logout', {}, { requireAuth: false });
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to sign out:', error);
      // Even if logout fails, we should still remove the token
      localStorage.removeItem('auth_token');
      throw error;
    }
  }

  async resetPassword(resetData) {
    try {
      const response = await this.post('/auth/reset-password', resetData);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to reset password:', error);
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const response = await this.post('/auth/forgot-password', { email });
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to send forgot password email:', error);
      throw error;
    }
  }

  // === ADMIN API METHODS ===

  async getAdminStats(options = {}) {
    try {
      const response = await this.get('/admin/stats', options);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to get admin stats:', error);
      throw error;
    }
  }

  async getUsers(options = {}) {
    try {
      const response = await this.get('/admin/users', options);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to get users:', error);
      throw error;
    }
  }

  async getSystemHealth(options = {}) {
    try {
      const response = await this.get('/admin/system-health', options);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to get system health:', error);
      throw error;
    }
  }

  async verifySuperAdmin() {
    try {
      const response = await this.get('/admin/verify-super-admin');
      console.log('🔍 DEBUG: verifySuperAdmin response:', response);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to verify super admin:', error);
      throw error;
    }
  }

  async getDatabaseStats() {
    try {
      const response = await this.get('/admin/database-stats');
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to get database stats:', error);
      throw error;
    }
  }

  async getAllUsers(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      
      const url = `/admin/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await this.get(url);
      return response;
    } catch (error) {
      console.error('❌ Frontend API: Failed to get all users:', error);
      throw error;
    }
  }
}

// Export frontend API client instance with refresh token support
const frontendApi = new FrontendAPIClient();

// Export for compatibility with different import patterns
export const apiService = frontendApi;
export const api = frontendApi;
export default frontendApi;

// Export refresh token methods for direct use
export const refreshToken = () => frontendApi.refreshToken();
export const checkTokenHealth = () => frontendApi.checkTokenHealth(); 