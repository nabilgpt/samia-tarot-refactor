// =================================================
// SAMIA TAROT REAL-TIME TRANSLATIONS HOOK
// Automatic data sync with backend translation system
// 🚨 ADMIN/SUPER_ADMIN ONLY - FOR TRANSLATION MANAGEMENT
// =================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import bilingualTranslationService from '../services/bilingualTranslationService';

/**
 * Hook for real-time translation data management
 * 🚨 ADMIN/SUPER_ADMIN ONLY - Regular users should use useRoleBasedAPI
 * @param {string} table - Table name (tarot-decks, tarot-cards, services, spreads)
 * @param {Object} options - Hook options
 * @returns {Object} - Hook state and functions
 */
const useRealTimeTranslations = (table, options = {}) => {
  const { currentLanguage } = useLanguage();
  const { profile } = useAuth();
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    cacheStrategy = 'memory', // 'memory' or 'localStorage'
    subscribeToUpdates = true,
    fields = ['name', 'description'],
    enableSearch = true,
    enableFiltering = true
  } = options;

  // State management
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    completeAr: 0,
    completeEn: 0,
    incomplete: 0,
    empty: 0
  });

  // Refs for cleanup
  const unsubscribeRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // Check if user has admin access
  const hasAdminAccess = useCallback(() => {
    return profile && ['admin', 'super_admin'].includes(profile.role);
  }, [profile]);

  // =================================================
  // ADMIN ACCESS CHECK
  // =================================================

  // Warning for non-admin users
  useEffect(() => {
    if (profile && !hasAdminAccess()) {
      console.warn('⚠️ useRealTimeTranslations: This hook is for admin translation management only. Regular users should use useRoleBasedAPI.');
      setError('This feature is only available to administrators');
      setIsLoading(false);
    }
  }, [profile, hasAdminAccess]);

  // =================================================
  // DATA LOADING
  // =================================================

  // Load translation data (ADMIN ONLY)
  const loadData = useCallback(async (force = false) => {
    if (!table) return;
    
    // Check admin access first
    if (!hasAdminAccess()) {
      setError('Insufficient permissions - Admin access required');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get data from translation service
      const translationData = bilingualTranslationService.getTranslatedData(table, currentLanguage);
      
      if (translationData && translationData.length > 0) {
        setData(translationData);
        setLastUpdated(new Date());
        
        // Calculate statistics
        const newStats = calculateStats(translationData);
        setStats(newStats);
        
        // Cache data if enabled
        if (cacheStrategy === 'localStorage') {
          cacheData(table, translationData);
        }
      } else {
        // Empty data is not an error for admin users
        setData([]);
        setStats({
          total: 0,
          completeAr: 0,
          completeEn: 0,
          incomplete: 0,
          empty: 0
        });
      }
      
    } catch (err) {
      console.error('Error loading translation data:', err);
      setError(err.message || 'Failed to load translation data');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [table, currentLanguage, cacheStrategy, hasAdminAccess]);

  // Calculate translation statistics
  const calculateStats = useCallback((translationData) => {
    const stats = {
      total: translationData.length,
      completeAr: 0,
      completeEn: 0,
      incomplete: 0,
      empty: 0
    };
    
    translationData.forEach(item => {
      let hasArabic = false;
      let hasEnglish = false;
      
      fields.forEach(field => {
        const arValue = item[`${field}_ar`];
        const enValue = item[`${field}_en`];
        
        if (arValue && arValue.trim()) hasArabic = true;
        if (enValue && enValue.trim()) hasEnglish = true;
      });
      
      if (hasArabic && hasEnglish) {
        stats.completeAr++;
        stats.completeEn++;
      } else if (hasArabic) {
        stats.completeAr++;
        stats.incomplete++;
      } else if (hasEnglish) {
        stats.completeEn++;
        stats.incomplete++;
      } else {
        stats.empty++;
      }
    });
    
    return stats;
  }, [fields]);

  // =================================================
  // CACHING
  // =================================================

  // Cache data to localStorage
  const cacheData = useCallback((tableKey, translationData) => {
    try {
      const cacheKey = `samia_translations_${tableKey}`;
      const cacheData = {
        data: translationData,
        timestamp: new Date().toISOString(),
        language: currentLanguage
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (err) {
      console.warn('Failed to cache translation data:', err);
    }
  }, [currentLanguage]);

  // Load cached data
  const loadCachedData = useCallback((tableKey) => {
    try {
      const cacheKey = `samia_translations_${tableKey}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data: cachedData, timestamp, language } = JSON.parse(cached);
        
        // Check if cache is still valid (less than 5 minutes old)
        const cacheAge = Date.now() - new Date(timestamp).getTime();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        if (cacheAge < maxAge && language === currentLanguage) {
          return cachedData;
        }
      }
    } catch (err) {
      console.warn('Failed to load cached data:', err);
    }
    
    return null;
  }, [currentLanguage]);

  // =================================================
  // REAL-TIME UPDATES (ADMIN ONLY)
  // =================================================

  // Subscribe to real-time updates
  useEffect(() => {
    if (!subscribeToUpdates || !table || !hasAdminAccess()) return;
    
    const unsubscribe = bilingualTranslationService.subscribe(
      (event, eventData) => {
        // Only process updates for our table
        if (eventData.table === table) {
          console.log(`🔄 Real-time update for ${table}:`, event);
          
          switch (event) {
            case 'update':
              handleSingleUpdate(eventData);
              break;
            case 'bulkUpdate':
              handleBulkUpdate(eventData);
              break;
            case 'refresh':
              loadData(true);
              break;
            default:
              console.log('Unknown update event:', event);
          }
        }
      },
      { tables: [table] }
    );
    
    unsubscribeRef.current = unsubscribe;
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [table, subscribeToUpdates, hasAdminAccess]);

  // Handle single item update
  const handleSingleUpdate = useCallback((eventData) => {
    if (eventData.id && eventData.data) {
      setData(prev => {
        const newData = [...prev];
        const index = newData.findIndex(item => item.id === eventData.id);
        
        if (index !== -1) {
          newData[index] = { ...newData[index], ...eventData.data };
        }
        
        return newData;
      });
      
      setLastUpdated(new Date());
    }
  }, []);

  // Handle bulk update
  const handleBulkUpdate = useCallback((eventData) => {
    if (eventData.data && Array.isArray(eventData.data)) {
      setData(prev => {
        const newData = [...prev];
        
        eventData.data.forEach(updatedItem => {
          const index = newData.findIndex(item => item.id === updatedItem.id);
          if (index !== -1) {
            newData[index] = { ...newData[index], ...updatedItem };
          }
        });
        
        return newData;
      });
      
      setLastUpdated(new Date());
    }
  }, []);

  // =================================================
  // AUTO REFRESH
  // =================================================

  // Set up auto refresh
  useEffect(() => {
    if (!autoRefresh || !table) return;
    
    refreshTimerRef.current = setInterval(() => {
      loadData();
    }, refreshInterval);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, table, loadData]);

  // =================================================
  // FILTERING & SEARCH
  // =================================================

  // Apply search and filters
  const filteredData = useCallback(() => {
    let result = [...data];
    
    // Apply search
    if (enableSearch && searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item => {
        return fields.some(field => {
          const arValue = item[`${field}_ar`] || '';
          const enValue = item[`${field}_en`] || '';
          return arValue.toLowerCase().includes(searchLower) ||
                 enValue.toLowerCase().includes(searchLower);
        });
      });
    }
    
    // Apply filters
    if (enableFiltering && Object.keys(filters).length > 0) {
      result = result.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === null || value === undefined || value === '') return true;
          
          if (key === 'language') {
            // Language filter
            return fields.some(field => {
              const fieldValue = item[`${field}_${value}`];
              return fieldValue && fieldValue.trim();
            });
          }
          
          if (key === 'completeness') {
            // Completeness filter
            const hasArabic = fields.some(field => {
              const arValue = item[`${field}_ar`];
              return arValue && arValue.trim();
            });
            const hasEnglish = fields.some(field => {
              const enValue = item[`${field}_en`];
              return enValue && enValue.trim();
            });
            
            switch (value) {
              case 'complete':
                return hasArabic && hasEnglish;
              case 'incomplete':
                return (hasArabic || hasEnglish) && !(hasArabic && hasEnglish);
              case 'empty':
                return !hasArabic && !hasEnglish;
              default:
                return true;
            }
          }
          
          // Regular field filter
          return item[key] === value;
        });
      });
    }
    
    return result;
  }, [data, enableSearch, searchTerm, enableFiltering, filters, fields]);

  // =================================================
  // INITIAL LOAD
  // =================================================

  // Load data on mount
  useEffect(() => {
    if (table) {
      // Try to load cached data first
      if (cacheStrategy === 'localStorage') {
        const cachedData = loadCachedData(table);
        if (cachedData) {
          setData(cachedData);
          setLastUpdated(new Date());
          setIsLoading(false);
          
          // Calculate stats for cached data
          const cachedStats = calculateStats(cachedData);
          setStats(cachedStats);
        }
      }
      
      // Load fresh data
      loadData();
    }
  }, [table, loadData, cacheStrategy, loadCachedData, calculateStats]);

  // =================================================
  // UTILITY FUNCTIONS
  // =================================================

  // Manual refresh
  const refresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  // Update search term
  const updateSearchTerm = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
  }, []);

  // Get item by ID
  const getItemById = useCallback((id) => {
    return data.find(item => item.id === id);
  }, [data]);

  // Get translation for specific field
  const getTranslation = useCallback((item, field, language = currentLanguage) => {
    if (!item || !field) return '';
    
    const fieldKey = `${field}_${language}`;
    const value = item[fieldKey];
    
    if (value && value.trim()) {
      return value;
    }
    
    // Fallback to opposite language
    const fallbackLang = language === 'ar' ? 'en' : 'ar';
    const fallbackKey = `${field}_${fallbackLang}`;
    return item[fallbackKey] || '';
  }, [currentLanguage]);

  // =================================================
  // CLEANUP
  // =================================================

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // =================================================
  // RETURN HOOK STATE
  // =================================================

  return {
    // Data state
    data: filteredData(),
    rawData: data,
    isLoading,
    error,
    lastUpdated,
    stats,
    
    // Search and filtering
    searchTerm,
    filters,
    updateSearchTerm,
    updateFilters,
    clearFilters,
    
    // Actions
    refresh,
    loadData,
    
    // Utilities
    getItemById,
    getTranslation,
    
    // Meta information
    tableInfo: {
      name: table,
      fields,
      totalItems: data.length,
      filteredItems: filteredData().length
    }
  };
};

export default useRealTimeTranslations; 