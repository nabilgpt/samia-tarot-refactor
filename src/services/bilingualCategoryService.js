// ============================================================================
// SAMIA TAROT - BILINGUAL CATEGORY SERVICE
// Frontend service for category management
// ============================================================================

import api from './frontendApi.js';

class BilingualCategoryService {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Map();
    this.isInitialized = false;
    this.lastUpdate = null;
    this.userProfile = null;
    
    // Initialize the service
    this.initialize();
  }

  // =================================================
  // INITIALIZATION
  // =================================================

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔄 BilingualCategoryService: Initializing...');
    
    try {
      // Get user profile to determine API endpoints
      await this.updateUserProfile();
      await this.loadCategories();
      this.isInitialized = true;
      console.log('✅ BilingualCategoryService: Initialized successfully');
      
    } catch (error) {
      console.error('❌ BilingualCategoryService: Failed to initialize:', error);
      this.isInitialized = false;
    }
  }

  // =================================================
  // USER PROFILE MANAGEMENT
  // =================================================

  async updateUserProfile() {
    try {
      // Get user profile from auth context or API
      const token = localStorage.getItem('token');
      if (!token) {
        this.userProfile = null;
        return;
      }

      const response = await api.get('/user/profile');
      this.userProfile = response.data;
      console.log('👤 User profile updated:', this.userProfile?.role);
    } catch (error) {
      console.warn('⚠️ Could not fetch user profile:', error);
      this.userProfile = null;
    }
  }

  // =================================================
  // CATEGORY LOADING
  // =================================================

  async loadCategories() {
    try {
      let apiEndpoint;
      
      // Choose API endpoint based on user role
      if (this.userProfile && ['admin', 'super_admin'].includes(this.userProfile.role)) {
        // Admin users can use admin translation endpoints
        apiEndpoint = '/admin/translations/spread_categories';
        console.log('👑 Using admin translation API for categories');
      } else {
        // Regular users use public endpoints
        apiEndpoint = '/spread-manager/categories';
        console.log('👥 Using public API for categories');
      }

      const response = await api.get(apiEndpoint);
      
      if (response.data) {
        // Add "All Categories" option
        const allCategoriesOption = {
          id: 'all',
          category_key: 'all',
          name_ar: 'جميع الفئات',
          name_en: 'All Categories',
          description_ar: 'عرض جميع الفئات',
          description_en: 'Show all categories',
          sort_order: 0,
          is_active: true
        };

        const categories = [allCategoriesOption, ...response.data];
        
        this.cache.set('spread_categories', {
          data: categories,
          lastUpdated: new Date().toISOString(),
          apiEndpoint
        });
        
        this.lastUpdate = new Date().toISOString();
        console.log(`✅ Loaded ${categories.length} categories from ${apiEndpoint}`);
        
        // Notify subscribers
        this.notifySubscribers('categories_updated', categories);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to load categories:', error);
      
      // Fallback to hardcoded categories if API fails
      this.loadFallbackCategories();
    }
  }

  // =================================================
  // FALLBACK CATEGORIES
  // =================================================

  loadFallbackCategories() {
    console.log('📦 Loading fallback categories...');
    
    const fallbackCategories = [
      { id: 'all', category_key: 'all', name_ar: 'جميع الفئات', name_en: 'All Categories', sort_order: 0 },
      { id: 'general', category_key: 'general', name_ar: 'عام', name_en: 'General', sort_order: 1 },
      { id: 'love', category_key: 'love', name_ar: 'الحب والعلاقات', name_en: 'Love & Relationships', sort_order: 2 },
      { id: 'career', category_key: 'career', name_ar: 'المهنة والعمل', name_en: 'Career & Work', sort_order: 3 },
      { id: 'spiritual', category_key: 'spiritual', name_ar: 'روحانية', name_en: 'Spiritual', sort_order: 4 },
      { id: 'health', category_key: 'health', name_ar: 'الصحة والعافية', name_en: 'Health & Wellness', sort_order: 5 },
      { id: 'flexible', category_key: 'flexible', name_ar: 'مرن', name_en: 'Flexible', sort_order: 6 }
    ];

    this.cache.set('spread_categories', {
      data: fallbackCategories,
      lastUpdated: new Date().toISOString(),
      isFallback: true
    });
    
    console.log('✅ Fallback categories loaded');
  }

  // =================================================
  // DATA RETRIEVAL
  // =================================================

  // Get all categories with bilingual support
  getCategories(language = 'en', format = 'default') {
    const cached = this.cache.get('spread_categories');
    
    if (!cached) {
      console.warn('⚠️ No cached categories available');
      return [];
    }
    
    const categories = cached.data;
    
    switch (format) {
      case 'moroccan':
        // Format for MoroccanSpreadSelector
        return categories.map(category => ({
          id: category.category_key || category.id,
          name: language === 'ar' ? (category.name_ar || category.name_en) : (category.name_en || category.name_ar),
          name_ar: category.name_ar,
          name_en: category.name_en,
          icon: this.getCategoryIcon(category.category_key || category.id),
          color: this.getCategoryColor(category.category_key || category.id)
        }));
        
      case 'spread_manager':
        // Format for SpreadManager
        return categories.map(category => ({
          value: category.category_key || category.id,
          label: language === 'ar' ? (category.name_ar || category.name_en) : (category.name_en || category.name_ar),
          label_ar: category.name_ar,
          label_en: category.name_en
        }));
        
      case 'admin':
        // Format for admin interfaces
        return categories.map(category => ({
          id: category.id || category.category_key,
          key: category.category_key || category.id,
          name_ar: category.name_ar,
          name_en: category.name_en,
          description_ar: category.description_ar || '',
          description_en: category.description_en || '',
          sort_order: category.sort_order || 0,
          is_active: category.is_active !== false
        }));
        
      default:
        // Default format with current language
        return categories.map(category => ({
          id: category.category_key || category.id,
          key: category.category_key || category.id,
          name: language === 'ar' ? (category.name_ar || category.name_en) : (category.name_en || category.name_ar),
          name_ar: category.name_ar,
          name_en: category.name_en,
          description: language === 'ar' ? (category.description_ar || category.description_en) : (category.description_en || category.description_ar),
          sort_order: category.sort_order || 0
        }));
    }
  }

  // Get a single category by key
  getCategory(categoryKey, language = 'en') {
    const categories = this.getCategories(language);
    return categories.find(cat => cat.key === categoryKey || cat.id === categoryKey);
  }

  // Get category display name
  getCategoryName(categoryKey, language = 'en') {
    const category = this.getCategory(categoryKey, language);
    return category ? category.name : categoryKey;
  }

  // =================================================
  // CATEGORY METADATA
  // =================================================

  getCategoryIcon(categoryKey) {
    const iconMap = {
      all: 'Grid',
      general: 'Star',
      love: 'Heart',
      career: 'Briefcase',
      spiritual: 'Sparkles',
      health: 'Zap',
      flexible: 'Wand2',
      finance: 'DollarSign'
    };
    return iconMap[categoryKey] || 'Star';
  }

  getCategoryColor(categoryKey) {
    const colorMap = {
      all: 'from-purple-500 to-pink-500',
      general: 'from-blue-500 to-indigo-500',
      love: 'from-red-500 to-pink-500',
      career: 'from-green-500 to-emerald-500',
      spiritual: 'from-purple-500 to-violet-500',
      health: 'from-orange-500 to-yellow-500',
      flexible: 'from-gray-500 to-slate-500',
      finance: 'from-emerald-500 to-teal-500'
    };
    return colorMap[categoryKey] || 'from-gray-500 to-gray-600';
  }

  // =================================================
  // SUBSCRIPTION MANAGEMENT
  // =================================================

  subscribe(callback, options = {}) {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscribers.set(id, { callback, options });
    
    // Immediate callback with current data if available
    if (options.immediate && this.cache.has('spread_categories')) {
      const cached = this.cache.get('spread_categories');
      callback('categories_updated', cached.data);
    }
    
    return id;
  }

  unsubscribe(id) {
    return this.subscribers.delete(id);
  }

  notifySubscribers(event, data) {
    this.subscribers.forEach(({ callback, options }) => {
      try {
        callback(event, data);
      } catch (error) {
        console.warn('⚠️ Subscriber callback error:', error);
      }
    });
  }

  // =================================================
  // CACHE MANAGEMENT
  // =================================================

  async refreshCategories() {
    await this.updateUserProfile();
    await this.loadCategories();
  }

  getCacheStats() {
    const cached = this.cache.get('spread_categories');
    return {
      isInitialized: this.isInitialized,
      cacheSize: this.cache.size,
      lastUpdate: this.lastUpdate,
      categoriesCount: cached ? cached.data.length : 0,
      isFallback: cached ? cached.isFallback : false,
      apiEndpoint: cached ? cached.apiEndpoint : null,
      userRole: this.userProfile?.role || 'unknown'
    };
  }

  isReady() {
    return this.isInitialized && this.cache.has('spread_categories');
  }

  destroy() {
    this.subscribers.clear();
    this.cache.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export default new BilingualCategoryService(); 