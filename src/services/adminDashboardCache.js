// =====================================================
// ADMIN DASHBOARD CACHE SERVICE
// =====================================================
// 🚀 Smart caching for admin dashboard data to reduce API calls

class AdminDashboardCache {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 100;
  }

  // Set cache with TTL
  set(key, data, ttl = this.defaultTTL) {
    // Clean old entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup();
    }

    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + ttl);
    
    console.log(`📦 Cached admin data: ${key} (TTL: ${ttl}ms)`);
  }

  // Get from cache
  get(key) {
    const expiry = this.cacheExpiry.get(key);
    
    if (!expiry || Date.now() > expiry) {
      // Expired or doesn't exist
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }

    const data = this.cache.get(key);
    console.log(`📦 Retrieved from admin cache: ${key}`);
    return data;
  }

  // Check if key exists and is valid
  has(key) {
    const expiry = this.cacheExpiry.get(key);
    return expiry && Date.now() <= expiry;
  }

  // Clear specific key
  delete(key) {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    console.log(`🗑️ Cleared admin cache: ${key}`);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('🗑️ Cleared all admin cache');
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys())
    };
  }

  // Cache admin stats with smart invalidation
  async getCachedAdminStats(fetchFunction) {
    const cacheKey = 'admin_stats';
    
    let stats = this.get(cacheKey);
    if (stats) {
      return stats;
    }

    try {
      stats = await fetchFunction();
      this.set(cacheKey, stats, 3 * 60 * 1000); // 3 minutes for stats
      return stats;
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      return null;
    }
  }

  // Cache analytics with short TTL
  async getCachedAnalytics(fetchFunction, period = 'today') {
    const cacheKey = `admin_analytics_${period}`;
    
    let analytics = this.get(cacheKey);
    if (analytics) {
      return analytics;
    }

    try {
      analytics = await fetchFunction();
      this.set(cacheKey, analytics, 2 * 60 * 1000); // 2 minutes for analytics
      return analytics;
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return null;
    }
  }
}

export const adminDashboardCache = new AdminDashboardCache();