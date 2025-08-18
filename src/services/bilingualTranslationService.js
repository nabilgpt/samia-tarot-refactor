// ============================================================================
// SAMIA TAROT - BILINGUAL TRANSLATION SERVICE (FRONTEND)
// Frontend service for translation operations
// ============================================================================

import api from './frontendApi.js';

class BilingualTranslationService {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Map();
    this.isInitialized = false;
    this.pollInterval = null;
    this.eventSource = null;
    this.userRole = null;
    
    // DO NOT auto-initialize - wait for role-based initialization
    console.log('🔄 BilingualTranslationService: Instance created (waiting for role-based init)');
  }

  // =================================================
  // ROLE-BASED INITIALIZATION
  // =================================================

  // Initialize the service only for admin/super_admin users
  async initializeForRole(userRole) {
    if (this.isInitialized) return;
    
    this.userRole = userRole;
    
    // Only initialize for admin/super_admin users
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      console.log('🔐 BilingualTranslationService: Skipping initialization for non-admin user');
      return;
    }

    console.log('🔄 BilingualTranslationService: Initializing for role:', userRole);
    
    try {
      // Initialize cache with current data
      await this.loadAllTranslations();
      
      // Set up real-time updates
      this.setupRealTimeUpdates();
      
      this.isInitialized = true;
      console.log('✅ BilingualTranslationService: Initialized successfully for role:', userRole);
      
    } catch (error) {
      console.error('❌ BilingualTranslationService: Failed to initialize:', error);
      this.isInitialized = false;
    }
  }

  // Legacy initialize method for backward compatibility
  async initialize() {
    console.warn('⚠️ BilingualTranslationService: Legacy initialize() called without role check');
    // Don't auto-initialize without role check
    return;
  }

  // Check if user has admin permissions
  isAdminUser() {
    return this.userRole === 'admin' || this.userRole === 'super_admin';
  }

  // =================================================
  // REAL-TIME SYNC SYSTEM
  // =================================================

  setupRealTimeUpdates() {
    // Only set up real-time updates for admin users
    if (!this.isAdminUser()) {
      console.log('🔐 BilingualTranslationService: Skipping real-time updates for non-admin user');
      return;
    }

    // Use polling as fallback for real-time updates
    this.pollInterval = setInterval(() => {
      this.checkForUpdates();
    }, 5000); // Check every 5 seconds
    
    console.log('🔔 Real-time translation sync enabled');
  }

  async checkForUpdates() {
    if (!this.isInitialized || this.subscribers.size === 0 || !this.isAdminUser()) return;
    
    try {
      // Get last update timestamp from cache
      const lastUpdate = this.getLastUpdateTime();
      
      // Check if there are any updates since last check
      const response = await api.get('/admin/translations/updates', {
        params: { since: lastUpdate }
      });
      
      if (response.data.hasUpdates) {
        console.log('🔄 New translation updates detected, refreshing cache...');
        await this.refreshCache();
        this.notifySubscribers('update', response.data);
      }
    } catch (error) {
      console.warn('⚠️ Failed to check for translation updates:', error);
    }
  }

  // =================================================
  // CACHE MANAGEMENT
  // =================================================

  async loadAllTranslations() {
    // Only load translations for admin users
    if (!this.isAdminUser()) {
      console.log('🔐 BilingualTranslationService: Skipping translation loading for non-admin user');
      return;
    }

    const tables = ['tarot-decks', 'tarot-cards', 'services', 'spreads', 'spread_categories'];
    
    for (const table of tables) {
      try {
        const response = await api.get(`/admin/translations/${table}`);
        if (response.data && response.data.success) {
          this.cache.set(table, {
            data: response.data.data || response.data,
            lastUpdated: new Date().toISOString()
          });
          console.log(`✅ Loaded ${table} translations (${response.data.data?.length || 0} items)`);
        } else {
          console.warn(`⚠️ No data returned for ${table} translations`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load ${table} translations:`, error.response?.status === 403 ? 'Permission denied' : error.message);
      }
    }
  }

  async refreshCache() {
    if (!this.isAdminUser()) {
      console.log('🔐 BilingualTranslationService: Skipping cache refresh for non-admin user');
      return;
    }
    await this.loadAllTranslations();
  }

  getLastUpdateTime() {
    let lastUpdate = new Date(0).toISOString();
    
    for (const [table, cache] of this.cache) {
      if (cache.lastUpdated > lastUpdate) {
        lastUpdate = cache.lastUpdated;
      }
    }
    
    return lastUpdate;
  }

  // =================================================
  // DATA RETRIEVAL
  // =================================================

  // Get translated data for a specific table (ADMIN ONLY)
  getTranslatedData(table, language = 'en') {
    // Only allow admin users to access translation data
    if (!this.isAdminUser()) {
      console.warn('🔐 BilingualTranslationService: Non-admin user attempted to access translation data');
      return [];
    }

    const cached = this.cache.get(table);
    
    if (!cached) {
      console.warn(`⚠️ No cached data for table: ${table}`);
      return [];
    }
    
    // Return data with current language fields
    return this.processTranslatedData(cached.data, language);
  }

  // Process raw bilingual data for specific language
  processTranslatedData(data, language) {
    if (!Array.isArray(data)) return data;
    
    return data.map(item => {
      const processed = { ...item };
      
      // Find bilingual fields and create current language versions
      const bilingualFields = this.findBilingualFields(item);
      
      bilingualFields.forEach(field => {
        const currentValue = item[`${field}_${language}`];
        const fallbackLang = language === 'ar' ? 'en' : 'ar';
        const fallbackValue = item[`${field}_${fallbackLang}`];
        
        // Set current language value with fallback
        processed[field] = currentValue || fallbackValue || '';
      });
      
      return processed;
    });
  }

  // Find bilingual fields in a data object
  findBilingualFields(item) {
    const fields = new Set();
    
    Object.keys(item).forEach(key => {
      if (key.endsWith('_ar') || key.endsWith('_en')) {
        const baseField = key.replace(/_(ar|en)$/, '');
        fields.add(baseField);
      }
    });
    
    return Array.from(fields);
  }

  // =================================================
  // TRANSLATION UPDATES
  // =================================================

  // Update translation for a specific item (ADMIN ONLY)
  async updateTranslation(table, id, translations) {
    // Only allow admin users to update translations
    if (!this.isAdminUser()) {
      console.warn('🔐 BilingualTranslationService: Non-admin user attempted to update translation');
      throw new Error('Insufficient permissions');
    }

    try {
      const response = await api.put(`/admin/translations/${table}/${id}`, translations);
      
      // Update cache immediately
      this.updateCacheItem(table, id, response.data);
      
      // Notify subscribers
      this.notifySubscribers('update', { table, id, data: response.data });
      
      console.log(`✅ Updated ${table} translation for ID: ${id}`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to update ${table} translation:`, error);
      throw error;
    }
  }

  // Bulk translate multiple items (ADMIN ONLY)
  async bulkTranslate(table, items, targetLanguage) {
    // Only allow admin users to bulk translate
    if (!this.isAdminUser()) {
      console.warn('🔐 BilingualTranslationService: Non-admin user attempted to bulk translate');
      throw new Error('Insufficient permissions');
    }

    try {
      const response = await api.post('/admin/translations/bulk-translate', {
        table_name: table,
        items,
        target_language: targetLanguage
      });
      
      // Update cache with bulk data
      this.updateCacheBulk(table, response.data);
      
      // Notify subscribers
      this.notifySubscribers('bulkUpdate', { table, data: response.data });
      
      console.log(`✅ Bulk translated ${items.length} items for ${table}`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to bulk translate ${table}:`, error);
      throw error;
    }
  }

  // =================================================
  // CACHE UPDATES
  // =================================================

  updateCacheItem(table, id, newData) {
    const cached = this.cache.get(table);
    
    if (cached && Array.isArray(cached.data)) {
      const updatedData = cached.data.map(item => 
        item.id === id ? { ...item, ...newData } : item
      );
      
      this.cache.set(table, {
        data: updatedData,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  updateCacheBulk(table, newData) {
    if (!Array.isArray(newData)) return;
    
    const cached = this.cache.get(table);
    
    if (cached && Array.isArray(cached.data)) {
      let updatedData = [...cached.data];
      
      newData.forEach(newItem => {
        const existingIndex = updatedData.findIndex(item => item.id === newItem.id);
        if (existingIndex !== -1) {
          updatedData[existingIndex] = { ...updatedData[existingIndex], ...newItem };
        } else {
          updatedData.push(newItem);
        }
      });
      
      this.cache.set(table, {
        data: updatedData,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  // =================================================
  // SUBSCRIPTION SYSTEM
  // =================================================

  // Subscribe to translation updates (ADMIN ONLY)
  subscribe(callback, options = {}) {
    // Only allow admin users to subscribe to translation updates
    if (!this.isAdminUser()) {
      console.warn('🔐 BilingualTranslationService: Non-admin user attempted to subscribe to translation updates');
      // Return a dummy unsubscribe function
      return () => {};
    }

    const subscriberId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscribers.set(subscriberId, {
      callback,
      options,
      createdAt: new Date().toISOString()
    });
    
    console.log(`📡 New translation subscriber: ${subscriberId}`);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriberId);
      console.log(`📡 Unsubscribed: ${subscriberId}`);
    };
  }

  // Notify all subscribers of changes
  notifySubscribers(event, data) {
    this.subscribers.forEach((subscriber, id) => {
      try {
        subscriber.callback(event, data);
      } catch (error) {
        console.warn(`⚠️ Subscriber ${id} callback error:`, error);
      }
    });
  }

  // =================================================
  // UTILITY METHODS
  // =================================================

  // Get current cache stats
  getCacheStats() {
    const stats = {
      tables: this.cache.size,
      totalItems: 0,
      lastUpdated: null,
      subscribers: this.subscribers.size
    };
    
    for (const [table, cache] of this.cache) {
      stats.totalItems += Array.isArray(cache.data) ? cache.data.length : 0;
      if (!stats.lastUpdated || cache.lastUpdated > stats.lastUpdated) {
        stats.lastUpdated = cache.lastUpdated;
      }
    }
    
    return stats;
  }

  // Force refresh all data
  async forceRefresh() {
    console.log('🔄 Forcing translation cache refresh...');
    await this.refreshCache();
    this.notifySubscribers('refresh', { timestamp: new Date().toISOString() });
  }

  // Clean up resources
  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.cache.clear();
    this.subscribers.clear();
    this.isInitialized = false;
    
    console.log('🛑 BilingualTranslationService destroyed');
  }
}

// Create and export singleton instance
const bilingualTranslationService = new BilingualTranslationService();

export default bilingualTranslationService;
export { BilingualTranslationService }; 