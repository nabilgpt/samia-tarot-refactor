// ============================================================================
// SAMIA TAROT - PUBLIC DATA SERVICE
// Frontend service for public data access
// ============================================================================

import api from './frontendApi.js';

class PublicDataService {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Map();
    this.isInitialized = false;
    this.lastUpdate = null;
    
    // Initialize the service
    this.initialize();
  }

  // =================================================
  // INITIALIZATION
  // =================================================

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔄 PublicDataService: Initializing for regular users...');
    
    try {
      // Load all data types
      await Promise.all([
        this.loadSpreadCategories(),
        this.loadTarotDecks(),
        this.loadSpreads()
      ]);
      
      this.isInitialized = true;
      console.log('✅ PublicDataService: Initialized successfully');
      
    } catch (error) {
      console.error('❌ PublicDataService: Failed to initialize:', error);
      this.isInitialized = false;
    }
  }

  // =================================================
  // SPREAD CATEGORIES
  // =================================================

  async loadSpreadCategories() {
    try {
      console.log('📂 Loading spread categories from public API...');
      const response = await api.get('/spread-manager/categories');
      
      if (response.data) {
        // Add "All Categories" option
        const allCategoriesOption = {
          id: 'all',
          name_ar: 'جميع الفئات',
          name_en: 'All Categories',
          description_ar: 'عرض جميع الفئات',
          description_en: 'Show all categories',
          is_active: true
        };

        const categories = [allCategoriesOption, ...response.data];
        
        this.cache.set('spread_categories', {
          data: categories,
          lastUpdated: new Date().toISOString()
        });
        
        console.log(`✅ Loaded ${categories.length} spread categories`);
        this.notifySubscribers('spread_categories_updated', categories);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to load spread categories:', error);
      this.loadFallbackCategories();
    }
  }

  loadFallbackCategories() {
    console.log('📦 Loading fallback categories...');
    
    const fallbackCategories = [
      { id: 'all', name_ar: 'جميع الفئات', name_en: 'All Categories' },
      { id: 'general', name_ar: 'عام', name_en: 'General' },
      { id: 'love', name_ar: 'الحب والعلاقات', name_en: 'Love & Relationships' },
      { id: 'career', name_ar: 'المهنة والعمل', name_en: 'Career & Work' },
      { id: 'spiritual', name_ar: 'روحانية', name_en: 'Spiritual' },
      { id: 'health', name_ar: 'الصحة والعافية', name_en: 'Health & Wellness' },
      { id: 'flexible', name_ar: 'مرن', name_en: 'Flexible' }
    ];

    this.cache.set('spread_categories', {
      data: fallbackCategories,
      lastUpdated: new Date().toISOString(),
      isFallback: true
    });
    
    console.log('✅ Fallback categories loaded');
  }

  // =================================================
  // TAROT DECKS
  // =================================================

  async loadTarotDecks() {
    try {
      console.log('🃏 Loading tarot decks from public API...');
      const response = await api.get('/spread-manager/decks');
      
      if (response.data) {
        this.cache.set('tarot_decks', {
          data: response.data,
          lastUpdated: new Date().toISOString()
        });
        
        console.log(`✅ Loaded ${response.data.length} tarot decks`);
        this.notifySubscribers('tarot_decks_updated', response.data);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to load tarot decks:', error);
      this.loadFallbackDecks();
    }
  }

  loadFallbackDecks() {
    console.log('📦 Loading fallback decks...');
    
    const fallbackDecks = [
      { id: 'rider-waite', name: 'Rider-Waite', name_ar: 'رايدر-وايت', deck_type: 'traditional', total_cards: 78 },
      { id: 'universal', name: 'Universal Tarot', name_ar: 'التاروت العالمي', deck_type: 'traditional', total_cards: 78 },
      { id: 'modern', name: 'Modern Tarot', name_ar: 'التاروت الحديث', deck_type: 'contemporary', total_cards: 78 }
    ];

    this.cache.set('tarot_decks', {
      data: fallbackDecks,
      lastUpdated: new Date().toISOString(),
      isFallback: true
    });
    
    console.log('✅ Fallback decks loaded');
  }

  // =================================================
  // SPREADS
  // =================================================

  async loadSpreads(filters = {}) {
    try {
      console.log('🎯 Loading spreads from public API...', filters);
      
      // Build query string
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/spread-manager/spreads?${queryString}` : '/spread-manager/spreads';
      
      const response = await api.get(endpoint);
      
      if (response.data) {
        this.cache.set('spreads', {
          data: response.data,
          lastUpdated: new Date().toISOString(),
          filters
        });
        
        console.log(`✅ Loaded ${response.data.length} spreads`);
        this.notifySubscribers('spreads_updated', response.data);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to load spreads:', error);
    }
  }

  // =================================================
  // DATA RETRIEVAL WITH LANGUAGE SUPPORT
  // =================================================

  getSpreadCategories(language = 'en') {
    const cached = this.cache.get('spread_categories');
    if (!cached) return [];
    
    return cached.data.map(category => ({
      id: category.id,
      name: language === 'ar' ? (category.name_ar || category.name_en) : (category.name_en || category.name_ar),
      name_ar: category.name_ar,
      name_en: category.name_en,
      description: language === 'ar' ? (category.description_ar || category.description_en) : (category.description_en || category.description_ar),
      is_active: category.is_active
    }));
  }

  getTarotDecks(language = 'en') {
    const cached = this.cache.get('tarot_decks');
    if (!cached) return [];
    
    return cached.data.map(deck => ({
      id: deck.id,
      name: language === 'ar' ? (deck.name_ar || deck.name) : (deck.name || deck.name_ar),
      name_ar: deck.name_ar,
      name_en: deck.name_en || deck.name,
      deck_type: deck.deck_type,
      total_cards: deck.total_cards,
      is_active: deck.is_active
    }));
  }

  getSpreads(language = 'en') {
    const cached = this.cache.get('spreads');
    if (!cached) return [];
    
    return cached.data.map(spread => ({
      id: spread.id,
      name: language === 'ar' ? (spread.name_ar || spread.name_en) : (spread.name_en || spread.name_ar),
      name_ar: spread.name_ar,
      name_en: spread.name_en,
      description: language === 'ar' ? (spread.description_ar || spread.description_en) : (spread.description_en || spread.description_ar),
      status: spread.status,
      category: spread.category,
      creator: spread.creator,
      cards: spread.cards || []
    }));
  }

  // =================================================
  // SPECIFIC DATA FUNCTIONS
  // =================================================

  getSpreadCategory(categoryId, language = 'en') {
    const categories = this.getSpreadCategories(language);
    return categories.find(cat => cat.id === categoryId);
  }

  getTarotDeck(deckId, language = 'en') {
    const decks = this.getTarotDecks(language);
    return decks.find(deck => deck.id === deckId);
  }

  getSpread(spreadId, language = 'en') {
    const spreads = this.getSpreads(language);
    return spreads.find(spread => spread.id === spreadId);
  }

  // =================================================
  // SUBSCRIPTION MANAGEMENT
  // =================================================

  subscribe(callback, options = {}) {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscribers.set(id, { callback, options });
    
    // Immediate callback with current data if available
    if (options.immediate) {
      if (this.cache.has('spread_categories')) {
        const cached = this.cache.get('spread_categories');
        callback('spread_categories_updated', cached.data);
      }
      if (this.cache.has('tarot_decks')) {
        const cached = this.cache.get('tarot_decks');
        callback('tarot_decks_updated', cached.data);
      }
      if (this.cache.has('spreads')) {
        const cached = this.cache.get('spreads');
        callback('spreads_updated', cached.data);
      }
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

  async refresh() {
    console.log('🔄 Refreshing all data...');
    
    await Promise.all([
      this.loadSpreadCategories(),
      this.loadTarotDecks(),
      this.loadSpreads()
    ]);
    
    this.lastUpdate = new Date().toISOString();
    console.log('✅ Data refresh completed');
  }

  getCacheStats() {
    const stats = {
      isInitialized: this.isInitialized,
      lastUpdate: this.lastUpdate,
      subscriberCount: this.subscribers.size,
      cache: {}
    };

    // Add cache stats for each data type
    ['spread_categories', 'tarot_decks', 'spreads'].forEach(key => {
      const cached = this.cache.get(key);
      if (cached) {
        stats.cache[key] = {
          count: cached.data.length,
          lastUpdated: cached.lastUpdated,
          isFallback: cached.isFallback || false
        };
      }
    });

    return stats;
  }

  isReady() {
    return this.isInitialized && this.cache.size > 0;
  }

  destroy() {
    this.subscribers.clear();
    this.cache.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export default new PublicDataService(); 