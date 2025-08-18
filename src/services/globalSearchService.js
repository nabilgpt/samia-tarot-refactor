import api from './frontendApi.js';

/**
 * Global Search Service for Admin Dashboard
 * Searches across all major admin entities: users, services, bookings, payments, tarot entities
 */

export const globalSearchService = {
  /**
   * Perform unified search across all admin entities
   * @param {string} query - Search term
   * @param {string} language - Current language (en/ar)
   * @returns {Promise<Object>} - Grouped search results
   */
  async searchAll(query, language = 'en') {
    if (!query || query.trim().length < 2) {
      return { results: [], totalCount: 0 };
    }

    try {
      const searchPromises = [
        this.searchUsers(query, language),
        this.searchServices(query, language),
        this.searchBookings(query, language),
        this.searchPayments(query, language),
        this.searchTarotDecks(query, language),
        this.searchTarotSpreads(query, language),
        this.searchReaders(query, language),
      ];

      const results = await Promise.allSettled(searchPromises);
      
      const groupedResults = {
        users: results[0].status === 'fulfilled' ? results[0].value : [],
        services: results[1].status === 'fulfilled' ? results[1].value : [],
        bookings: results[2].status === 'fulfilled' ? results[2].value : [],
        payments: results[3].status === 'fulfilled' ? results[3].value : [],
        tarotDecks: results[4].status === 'fulfilled' ? results[4].value : [],
        tarotSpreads: results[5].status === 'fulfilled' ? results[5].value : [],
        readers: results[6].status === 'fulfilled' ? results[6].value : [],
      };

      // Flatten and add metadata
      const flatResults = [];
      Object.entries(groupedResults).forEach(([entityType, items]) => {
        items.forEach(item => {
          flatResults.push({
            ...item,
            entityType,
            searchRelevance: this.calculateRelevance(item, query)
          });
        });
      });

      // Sort by relevance
      flatResults.sort((a, b) => b.searchRelevance - a.searchRelevance);

      return {
        results: flatResults.slice(0, 20), // Limit to top 20 results
        totalCount: flatResults.length,
        groupedResults
      };
    } catch (error) {
      console.error('Global search error:', error);
      return { results: [], totalCount: 0, error: error.message };
    }
  },

  /**
   * Search users
   */
  async searchUsers(query, language) {
    try {
      const response = await api.get(`/admin/users/search?q=${encodeURIComponent(query)}&lang=${language}`);
      return response.data.map(user => ({
        id: user.id,
        title: user.title,
        description: user.description,
        icon: 'Users',
        iconColor: 'text-blue-400',
        navigateTo: 'users',
        highlightId: user.id,
        metadata: user.metadata
      }));
    } catch (error) {
      console.error('Users search error:', error);
      return [];
    }
  },

  /**
   * Search services
   */
  async searchServices(query, language) {
    try {
      const response = await api.get(`/admin/services/search?q=${encodeURIComponent(query)}&lang=${language}`);
      return response.data.map(service => ({
        id: service.id,
        title: service.title,
        description: service.description,
        icon: 'Briefcase',
        iconColor: 'text-green-400',
        navigateTo: 'services',
        highlightId: service.id,
        metadata: service.metadata
      }));
    } catch (error) {
      console.error('Services search error:', error);
      return [];
    }
  },

  /**
   * Search bookings
   */
  async searchBookings(query, language) {
    try {
      const response = await api.get(`/admin/bookings/search?q=${encodeURIComponent(query)}&lang=${language}`);
      return response.data.map(booking => ({
        id: booking.id,
        title: booking.title,
        description: booking.description,
        icon: 'Calendar',
        iconColor: 'text-purple-400',
        navigateTo: 'bookings',
        highlightId: booking.id,
        metadata: booking.metadata
      }));
    } catch (error) {
      console.error('Bookings search error:', error);
      return [];
    }
  },

  /**
   * Search payments
   */
  async searchPayments(query, language) {
    try {
      const response = await api.get(`/admin/payments/search?q=${encodeURIComponent(query)}&lang=${language}`);
      return response.data.map(payment => ({
        id: payment.id,
        title: payment.title,
        description: payment.description,
        icon: 'CreditCard',
        iconColor: 'text-yellow-400',
        navigateTo: 'payments',
        highlightId: payment.id,
        metadata: payment.metadata
      }));
    } catch (error) {
      console.error('Payments search error:', error);
      return [];
    }
  },

  /**
   * Search tarot decks
   */
  async searchTarotDecks(query, language) {
    try {
      const response = await api.get(`/admin/tarot/decks/search?q=${encodeURIComponent(query)}&lang=${language}`);
      return response.data.map(deck => ({
        id: deck.id,
        title: deck.title,
        description: deck.description,
        icon: 'Sparkles',
        iconColor: 'text-pink-400',
        navigateTo: 'tarot',
        subTab: 'decks',
        highlightId: deck.id,
        metadata: deck.metadata
      }));
    } catch (error) {
      console.error('Tarot decks search error:', error);
      return [];
    }
  },

  /**
   * Search tarot spreads
   */
  async searchTarotSpreads(query, language) {
    try {
      const response = await api.get(`/admin/tarot/spreads/search?q=${encodeURIComponent(query)}&lang=${language}`);
      return response.data.map(spread => ({
        id: spread.id,
        title: spread.title,
        description: spread.description,
        icon: 'Sparkles',
        iconColor: 'text-indigo-400',
        navigateTo: 'tarot',
        subTab: 'spreads',
        highlightId: spread.id,
        metadata: spread.metadata
      }));
    } catch (error) {
      console.error('Tarot spreads search error:', error);
      return [];
    }
  },

  /**
   * Search readers
   */
  async searchReaders(query, language) {
    try {
      const response = await api.get(`/admin/readers/search?q=${encodeURIComponent(query)}&lang=${language}`);
      return response.data.map(reader => ({
        id: reader.id,
        title: reader.title,
        description: reader.description,
        icon: 'Users',
        iconColor: 'text-emerald-400',
        navigateTo: 'readers',
        highlightId: reader.id,
        metadata: reader.metadata
      }));
    } catch (error) {
      console.error('Readers search error:', error);
      return [];
    }
  },

  /**
   * Calculate search relevance score
   */
  calculateRelevance(item, query) {
    const queryLower = query.toLowerCase();
    const titleLower = item.title.toLowerCase();
    const descLower = item.description.toLowerCase();
    
    let score = 0;
    
    // Exact title match gets highest score
    if (titleLower === queryLower) score += 100;
    // Title starts with query
    else if (titleLower.startsWith(queryLower)) score += 80;
    // Title contains query
    else if (titleLower.includes(queryLower)) score += 60;
    
    // Description matches
    if (descLower.includes(queryLower)) score += 30;
    
    // Boost active items
    if (item.metadata?.status === 'active') score += 10;
    
    return score;
  },

  /**
   * Get recent searches from localStorage
   */
  getRecentSearches() {
    try {
      const recent = localStorage.getItem('globalSearchRecent');
      return recent ? JSON.parse(recent) : [];
    } catch (error) {
      console.error('Error getting recent searches:', error);
      return [];
    }
  },

  /**
   * Save a search term to recent searches
   */
  saveRecentSearch(query) {
    try {
      const recent = this.getRecentSearches();
      const filtered = recent.filter(item => item !== query);
      const updated = [query, ...filtered].slice(0, 5); // Keep only 5 recent searches
      localStorage.setItem('globalSearchRecent', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  }
};

export default globalSearchService; 