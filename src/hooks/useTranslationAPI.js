// =================================================
// SAMIA TAROT TRANSLATION API HOOK
// Custom hook for handling translation APIs with error handling
// 🚨 ADMIN/SUPER_ADMIN ONLY - FOR TRANSLATION MANAGEMENT SCREENS
// =================================================

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiErrorHandler from '../utils/apiErrorHandler';
import bilingualTranslationService from '../services/bilingualTranslationService';

const useTranslationAPI = () => {
  const { currentLanguage } = useLanguage();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Check if user has translation access (ADMIN/SUPER_ADMIN ONLY)
  const hasTranslationAccess = useCallback(() => {
    return profile && ['admin', 'super_admin'].includes(profile.role);
  }, [profile]);

  // WARNING: This hook is for ADMIN TRANSLATION MANAGEMENT ONLY
  // Regular users should use useRoleBasedAPI instead
  useEffect(() => {
    if (!hasTranslationAccess()) {
      console.warn('⚠️ useTranslationAPI: This hook is for admin translation management only. Regular users should use useRoleBasedAPI.');
    }
  }, [hasTranslationAccess]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle API errors
  const handleError = useCallback((apiError, context = {}) => {
    const errorInfo = apiErrorHandler.handleError(apiError, {
      ...context,
      language: currentLanguage,
      showToast: context.showToast !== false // Default to true
    });
    
    setError(errorInfo);
    setLoading(false);
    
    return errorInfo;
  }, [currentLanguage]);

  // Generic API call wrapper - ADMIN ONLY
  const makeAPICall = useCallback(async (apiFunction, context = {}) => {
    if (!hasTranslationAccess()) {
      const permissionError = apiErrorHandler.handlePermissionError(
        { response: { status: 403 } },
        'translation management (admin only)',
        currentLanguage
      );
      setError(permissionError);
      return null;
    }

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
  }, [hasTranslationAccess, currentLanguage, handleError]);

  // =================================================
  // TRANSLATION DATA FETCHING (ADMIN ONLY)
  // =================================================

  // Get all translations for a table
  const getTranslations = useCallback(async (table, options = {}) => {
    return makeAPICall(
      async () => {
        const response = await fetch(`/api/admin/translations/${table}`, {
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
        endpoint: `/api/admin/translations/${table}`,
        feature: 'translation viewing (admin only)',
        ...options
      }
    );
  }, [makeAPICall]);

  // Update translation (ADMIN ONLY)
  const updateTranslation = useCallback(async (table, id, translations, options = {}) => {
    return makeAPICall(
      async () => {
        const response = await fetch(`/api/admin/translations/${table}/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(translations)
        });

        if (!response.ok) {
          throw { response };
        }

        const data = await response.json();
        return data.data || data;
      },
      {
        endpoint: `/api/admin/translations/${table}/${id}`,
        feature: 'translation editing (admin only)',
        ...options
      }
    );
  }, [makeAPICall]);

  // Check for translation updates (ADMIN ONLY)
  const checkForUpdates = useCallback(async (since = null, options = {}) => {
    return makeAPICall(
      async () => {
        const params = since ? `?since=${encodeURIComponent(since)}` : '';
        const response = await fetch(`/api/admin/translations/updates${params}`, {
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
        return data;
      },
      {
        endpoint: '/api/admin/translations/updates',
        feature: 'translation updates (admin only)',
        showToast: false, // Don't show toast for update checks
        ...options
      }
    );
  }, [makeAPICall]);

  // =================================================
  // BULK OPERATIONS (ADMIN ONLY)
  // =================================================

  // Bulk translate (ADMIN ONLY)
  const bulkTranslate = useCallback(async (table, items, targetLanguage, options = {}) => {
    return makeAPICall(
      async () => {
        const response = await fetch('/api/admin/translations/bulk-translate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            table_name: table,
            items,
            target_language: targetLanguage
          })
        });

        if (!response.ok) {
          throw { response };
        }

        const data = await response.json();
        return data.data || data;
      },
      {
        endpoint: '/api/admin/translations/bulk-translate',
        feature: 'bulk translation (admin only)',
        ...options
      }
    );
  }, [makeAPICall]);

  // =================================================
  // CACHED DATA ACCESS (ADMIN ONLY)
  // =================================================

  // Get cached translation data
  const getCachedData = useCallback((table, language = null) => {
    if (!hasTranslationAccess()) {
      console.warn('⚠️ Access denied: Admin translation cache access requires admin privileges');
      return null;
    }

    return bilingualTranslationService.getCachedData(table, language || currentLanguage);
  }, [hasTranslationAccess, currentLanguage]);

  // =================================================
  // UTILITY FUNCTIONS
  // =================================================

  // Get translation stats (ADMIN ONLY)
  const getTranslationStats = useCallback(() => {
    if (!hasTranslationAccess()) {
      return { error: 'Admin access required' };
    }

    return {
      hasAccess: hasTranslationAccess(),
      userRole: profile?.role || 'unknown',
      lastUpdated,
      loading,
      errorState: error
    };
  }, [hasTranslationAccess, profile, lastUpdated, loading, error]);

  return {
    // State
    loading,
    error,
    data,
    lastUpdated,

    // Access control
    hasTranslationAccess,
    
    // Core functions (ADMIN ONLY)
    getTranslations,
    updateTranslation,
    checkForUpdates,
    bulkTranslate,
    
    // Cached data (ADMIN ONLY)
    getCachedData,
    
    // Utility functions
    getTranslationStats,
    clearError
  };
};

export default useTranslationAPI; 