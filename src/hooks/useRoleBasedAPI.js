// =================================================
// SAMIA TAROT ROLE-BASED API HOOK
// Smart hook that routes to correct API endpoints based on user role
// =================================================

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiErrorHandler from '../utils/apiErrorHandler';

const useRoleBasedAPI = () => {
  const { currentLanguage } = useLanguage();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Determine if user has admin access
  const hasAdminAccess = useCallback(() => {
    return profile && ['admin', 'super_admin'].includes(profile.role);
  }, [profile]);

  // Get appropriate API endpoint based on user role and data type
  const getAPIEndpoint = useCallback((dataType, action = 'get') => {
    const isAdmin = hasAdminAccess();
    
    const endpoints = {
      // Spread Categories
      spread_categories: {
        admin: '/api/admin/translations/spread_categories',
        public: '/api/spread-manager/categories'
      },
      // Tarot Cards
      tarot_cards: {
        admin: '/api/admin/translations/tarot-cards',
        public: '/api/spread-manager/cards' // We'll need to create this
      },
      // Tarot Decks
      tarot_decks: {
        admin: '/api/admin/translations/tarot-decks',
        public: '/api/spread-manager/decks'
      },
      // Spreads
      spreads: {
        admin: '/api/admin/translations/spreads',
        public: '/api/spread-manager/spreads'
      },
      // Services
      services: {
        admin: '/api/admin/translations/services',
        public: '/api/configuration/category/services'
      },
      // Configuration
      configuration: {
        admin: '/api/configuration/categories',
        public: '/api/configuration/categories'
      }
    };

    const endpointConfig = endpoints[dataType];
    if (!endpointConfig) {
      console.warn(`⚠️ No endpoint configuration found for: ${dataType}`);
      return null;
    }

    return isAdmin ? endpointConfig.admin : endpointConfig.public;
  }, [hasAdminAccess]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle API errors
  const handleError = useCallback((apiError, context = {}) => {
    const errorInfo = apiErrorHandler.handleError(apiError, {
      ...context,
      language: currentLanguage,
      showToast: context.showToast !== false
    });
    
    setError(errorInfo);
    setLoading(false);
    
    return errorInfo;
  }, [currentLanguage]);

  // Generic API call wrapper
  const makeAPICall = useCallback(async (apiFunction, context = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction();
      setData(result);
      setLastUpdated(new Date().toISOString());
      return result;
    } catch (apiError) {
      return handleError(apiError, context);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // =================================================
  // DATA FETCHING FUNCTIONS
  // =================================================

  // Get data with language support and fallback
  const getData = useCallback(async (dataType, options = {}) => {
    const endpoint = getAPIEndpoint(dataType);
    if (!endpoint) {
      throw new Error(`No API endpoint available for ${dataType}`);
    }

    return makeAPICall(
      async () => {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw { response };
        }

        const data = await response.json();
        let result = data.data || data;

        // Apply language-specific formatting
        if (options.applyLanguageFormat && Array.isArray(result)) {
          result = result.map(item => ({
            ...item,
            display_name: currentLanguage === 'ar' 
              ? (item.name_ar || item.display_name_ar || item.name_en || item.display_name_en || item.name)
              : (item.name_en || item.display_name_en || item.name_ar || item.display_name_ar || item.name),
            display_description: currentLanguage === 'ar'
              ? (item.description_ar || item.description_en || item.description)
              : (item.description_en || item.description_ar || item.description)
          }));
        }

        return result;
      },
      {
        endpoint,
        feature: `${dataType} viewing`,
        ...options
      }
    );
  }, [getAPIEndpoint, makeAPICall, currentLanguage]);

  // Update data (admin only)
  const updateData = useCallback(async (dataType, id, updates, options = {}) => {
    if (!hasAdminAccess()) {
      throw new Error('Admin access required for data updates');
    }

    const endpoint = getAPIEndpoint(dataType);
    if (!endpoint) {
      throw new Error(`No API endpoint available for ${dataType}`);
    }

    return makeAPICall(
      async () => {
        const response = await fetch(`${endpoint}/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });

        if (!response.ok) {
          throw { response };
        }

        const data = await response.json();
        return data.data || data;
      },
      {
        endpoint: `${endpoint}/${id}`,
        feature: `${dataType} editing`,
        ...options
      }
    );
  }, [hasAdminAccess, getAPIEndpoint, makeAPICall]);

  // =================================================
  // SPECIFIC DATA FUNCTIONS
  // =================================================

  // Get spread categories with language support
  const getSpreadCategories = useCallback(async (options = {}) => {
    return getData('spread_categories', {
      applyLanguageFormat: true,
      ...options
    });
  }, [getData]);

  // Get tarot decks with language support
  const getTarotDecks = useCallback(async (options = {}) => {
    return getData('tarot_decks', {
      applyLanguageFormat: true,
      ...options
    });
  }, [getData]);

  // Get spreads with language support
  const getSpreads = useCallback(async (filters = {}, options = {}) => {
    const endpoint = getAPIEndpoint('spreads');
    if (!endpoint) {
      throw new Error('No API endpoint available for spreads');
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

    return makeAPICall(
      async () => {
        const response = await fetch(fullEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw { response };
        }

        const data = await response.json();
        return data.data || data;
      },
      {
        endpoint: fullEndpoint,
        feature: 'spreads viewing',
        ...options
      }
    );
  }, [getAPIEndpoint, makeAPICall]);

  // Get services/configuration with language support
  const getServices = useCallback(async (options = {}) => {
    return getData('services', {
      applyLanguageFormat: true,
      ...options
    });
  }, [getData]);

  // =================================================
  // UTILITY FUNCTIONS
  // =================================================

  // Get user role info
  const getUserRoleInfo = useCallback(() => {
    return {
      role: profile?.role || 'guest',
      hasAdminAccess: hasAdminAccess(),
      canEdit: hasAdminAccess(),
      canViewTranslations: hasAdminAccess()
    };
  }, [profile, hasAdminAccess]);

  // Get endpoint info for debugging
  const getEndpointInfo = useCallback((dataType) => {
    return {
      endpoint: getAPIEndpoint(dataType),
      isAdmin: hasAdminAccess(),
      userRole: profile?.role || 'guest'
    };
  }, [getAPIEndpoint, hasAdminAccess, profile]);

  return {
    // State
    loading,
    error,
    data,
    lastUpdated,

    // Generic functions
    getData,
    updateData,
    clearError,

    // Specific data functions
    getSpreadCategories,
    getTarotDecks,
    getSpreads,
    getServices,

    // Utility functions
    getUserRoleInfo,
    getEndpointInfo,
    hasAdminAccess
  };
};

export default useRoleBasedAPI; 