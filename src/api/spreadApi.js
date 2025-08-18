// import api from '../services/api'; // REMOVED - causes backend to load frontend services

export class SpreadAPI {
  // =====================================================
  // TAROT DECKS MANAGEMENT
  // =====================================================

  async getAllDecks(includeInactive = false) {
    try {
      const queryParams = new URLSearchParams();
      if (includeInactive) {
        queryParams.append('include_inactive', 'true');
      }
      
      const queryString = queryParams.toString();
      const url = queryString ? `/spread-manager/decks?${queryString}` : '/spread-manager/decks';
      
      const response = await api.get(url);
      return { success: true, data: response.data || [], error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch decks' };
    }
  },

  async getDeckById(deckId) {
    try {
      const response = await api.get(`/spread-manager/decks/${deckId}`);
      return { success: true, data: response.data, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch deck' };
    }
  },

  async getDefaultDeck() {
    try {
      const response = await api.get('/spread-manager/decks?is_default=true');
      const defaultDeck = response.data.find(deck => deck.is_default);
      return { success: true, data: defaultDeck, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch default deck' };
    }
  },

  // =====================================================
  // SPREAD MANAGEMENT (READERS)
  // =====================================================

  async getReaderSpreads(readerId, includeSystemSpreads = true) {
    try {
      if (includeSystemSpreads) {
        // Use new admin-controlled access system
        // This will only return public spreads and spreads assigned to this reader
        const response = await api.get(`/reader/available-spreads?reader_id=${readerId}`);
        return { success: true, data: response.data || [], error: null };
      } else {
        // Get only spreads created by this reader
        const queryParams = new URLSearchParams();
        queryParams.append('creator_id', readerId);
        queryParams.append('status', 'approved');
        
        const response = await api.get(`/spread-manager/spreads?${queryParams.toString()}`);
        return { success: true, data: response.data || [], error: null };
      }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch spreads' };
    }
  },

  async createCustomSpread(spreadData) {
    try {
      const response = await api.post('/spread-manager/spreads', {
        ...spreadData,
        mode: 'custom'
      });
      return { success: true, data: response.data, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to create spread' };
    }
  },

  async updateSpread(spreadId, updates, userId) {
    try {
      const response = await api.put(`/spread-manager/spreads/${spreadId}`, updates);
      return { success: true, data: response.data, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to update spread' };
    }
  },

  async deleteSpread(spreadId, userId) {
    try {
      await api.delete(`/spread-manager/spreads/${spreadId}`);
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to delete spread' };
    }
  },

  // =====================================================
  // SPREAD SERVICE ASSIGNMENTS
  // =====================================================

  async assignSpreadToService(spreadId, serviceId, readerId, isGift = false, order = 1) {
    try {
      const response = await api.post(`/spread-manager/spreads/${spreadId}/assign`, {
        service_id: serviceId,
        reader_id: readerId,
        is_gift: isGift,
        assignment_order: order
      });
      return { success: true, data: response.data, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to assign spread to service' };
    }
  },

  async removeSpreadFromService(spreadId, serviceId, readerId) {
    try {
      await api.delete(`/spread-manager/spreads/${spreadId}/assign`, {
        data: { service_id: serviceId, reader_id: readerId }
      });
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to remove spread from service' };
    }
  },

  async getSpreadAssignments(readerId) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('reader_id', readerId);
      
      const response = await api.get(`/spread-manager/assignments?${queryParams.toString()}`);
      return { success: true, data: response.data || [], error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch assignments' };
    }
  },

  // =====================================================
  // SPREAD CATEGORIES
  // =====================================================

  async getSpreadCategories() {
    try {
      const response = await api.get('/spread-manager/categories');
      return { success: true, data: response.data || [], error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch categories' };
    }
  },

  // =====================================================
  // SPREAD DETAILS
  // =====================================================

  async getSpreadById(spreadId) {
    try {
      const response = await api.get(`/spread-manager/spreads/${spreadId}`);
      return { success: true, data: response.data, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch spread' };
    }
  },

  // =====================================================
  // VALIDATION AND UTILITIES
  // =====================================================

  validateSpreadData(spreadData, currentLanguage = 'en') {
    const errors = {};
    
    // ✅ BILINGUAL AUTO-TRANSLATION COMPLIANT VALIDATION
    // Only require the current language field, not both
    if (currentLanguage === 'en') {
    if (!spreadData.name && !spreadData.name_en) {
      errors.name = 'English name is required';
    }
      if (!spreadData.description && !spreadData.description_en) {
        errors.description = 'English description is required';
      }
    } else {
    if (!spreadData.name_ar) {
      errors.name_ar = 'Arabic name is required';
    }
    if (!spreadData.description_ar) {
      errors.description_ar = 'Arabic description is required';
      }
    }
    
    if (!spreadData.category_id) {
      errors.category_id = 'Category is required';
    }
    
    if (!spreadData.deck_id) {
      errors.deck_id = 'Deck is required';
    }
    
    if (!spreadData.card_count || spreadData.card_count < 1 || spreadData.card_count > 78) {
      errors.card_count = 'Card count must be between 1 and 78';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // =====================================================
  // SPREAD STATISTICS
  // =====================================================

  async getSpreadStats(readerId = null) {
    try {
      const queryParams = new URLSearchParams();
      if (readerId) {
        queryParams.append('reader_id', readerId);
      }
      
      const queryString = queryParams.toString();
      const url = queryString ? `/spread-manager/stats?${queryString}` : '/spread-manager/stats';
      
      const response = await api.get(url);
      return { success: true, data: response.data, error: null };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch stats' };
    }
  }
}; 