/**
 * DECK DATA SERVICE - SAMIA TAROT
 * Service layer for deck management data operations
 * Integrates with existing deck APIs and provides adapter functionality
 */

import api from './frontendApi.js';

export class DeckDataService {
  constructor() {
    this.baseUrl = '/admin/tarot';
  }

  /**
   * Fetch all decks with filtering and sorting
   */
  async getDecks(filters = {}) {
    try {
      console.log('🔄 DeckDataService: Loading decks with filters:', filters);

      const response = await api.get(`${this.baseUrl}/decks`);
      const result = response;
      
      if (result.success) {
        console.log('✅ DeckDataService: Successfully loaded decks:', result.data?.length);
        
        // Transform deck data to match adapter expectations
        const transformedDecks = (result.data || []).map(deck => ({
          ...deck,
          // Ensure we have the required fields for display
          name_en: deck.name_en || deck.name || 'Unnamed Deck',
          name_ar: deck.name_ar || deck.name || 'مجموعة غير مسماة',
          description_en: deck.description_en || deck.description || '',
          description_ar: deck.description_ar || deck.description || '',
          is_active: deck.is_active !== false,
          deck_type: deck.deck_type || 'Custom',
          category: deck.category || 'General',
          visibility_type: deck.visibility_type || 'private',
          total_cards: deck.total_cards || deck.cards?.length || 0,
          assigned_readers: deck.assigned_readers || []
        }));

        return {
          success: true,
          data: transformedDecks,
          total: transformedDecks.length
        };
      } else {
        throw new Error(result.error || 'Failed to load decks');
      }
    } catch (error) {
      console.error('❌ DeckDataService: Error loading decks:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Create a new deck
   */
  async createDeck(deckData) {
    try {
      console.log('🔄 DeckDataService: Creating new deck:', deckData);

      const response = await api.post(`${this.baseUrl}/decks`, deckData);
      const result = response;
      
      if (result.success) {
        console.log('✅ DeckDataService: Successfully created deck:', result.data?.id);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Failed to create deck');
      }
    } catch (error) {
      console.error('❌ DeckDataService: Error creating deck:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing deck
   */
  async updateDeck(deckId, deckData) {
    try {
      console.log('🔄 DeckDataService: Updating deck:', deckId, deckData);

      const response = await api.put(`${this.baseUrl}/decks/${deckId}`, deckData);
      const result = response;
      
      if (result.success) {
        console.log('✅ DeckDataService: Successfully updated deck:', deckId);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Failed to update deck');
      }
    } catch (error) {
      console.error('❌ DeckDataService: Error updating deck:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a deck (soft delete)
   */
  async deleteDeck(deckId) {
    try {
      console.log('🔄 DeckDataService: Deleting deck:', deckId);

      const response = await api.delete(`${this.baseUrl}/decks/${deckId}`);
      const result = response;
      
      if (result.success) {
        console.log('✅ DeckDataService: Successfully deleted deck:', deckId);
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to delete deck');
      }
    } catch (error) {
      console.error('❌ DeckDataService: Error deleting deck:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get deck details by ID
   */
  async getDeckById(deckId) {
    try {
      console.log('🔄 DeckDataService: Loading deck details:', deckId);

      const response = await api.get(`${this.baseUrl}/decks/${deckId}`);
      const result = response;
      
      if (result.success) {
        console.log('✅ DeckDataService: Successfully loaded deck details:', deckId);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Failed to load deck details');
      }
    } catch (error) {
      console.error('❌ DeckDataService: Error loading deck details:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Assign readers to a deck
   */
  async assignReaders(deckId, readerIds) {
    try {
      console.log('🔄 DeckDataService: Assigning readers to deck:', deckId, readerIds);

      const response = await api.post(`${this.baseUrl}/decks/${deckId}/assign-readers`, { reader_ids: readerIds });
      const result = response;
      
      if (result.success) {
        console.log('✅ DeckDataService: Successfully assigned readers to deck:', deckId);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Failed to assign readers');
      }
    } catch (error) {
      console.error('❌ DeckDataService: Error assigning readers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all available readers for assignment
   */
  async getAvailableReaders() {
    try {
      console.log('🔄 DeckDataService: Loading available readers');

      const response = await api.get('/admin/readers');
      const result = response;
      
      if (result.success) {
        console.log('✅ DeckDataService: Successfully loaded readers:', result.data?.length);
        return { success: true, data: result.data || [] };
      } else {
        throw new Error(result.error || 'Failed to load readers');
      }
    } catch (error) {
      console.error('❌ DeckDataService: Error loading readers:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get all readers (alias for getAvailableReaders)
   */
  async getReaders() {
    return this.getAvailableReaders();
  }

  /**
   * Get all categories for decks
   */
  async getCategories() {
    try {
      console.log('🔄 DeckDataService: Loading categories');

      const response = await api.get('/configuration/categories');
      const result = response;
      
      if (result.success) {
        console.log('✅ DeckDataService: Successfully loaded categories:', result.data?.length);
        return { success: true, data: result.data || [] };
      } else {
        throw new Error(result.error || 'Failed to load categories');
      }
    } catch (error) {
      console.error('❌ DeckDataService: Error loading categories:', error);
      // Return default categories if API fails
      return { 
        success: true, 
        data: [
          { id: 1, name_en: 'General', name_ar: 'عام' },
          { id: 2, name_en: 'Love', name_ar: 'الحب' },
          { id: 3, name_en: 'Career', name_ar: 'المهنة' },
          { id: 4, name_en: 'Spiritual', name_ar: 'روحاني' },
          { id: 5, name_en: 'Health', name_ar: 'الصحة' }
        ]
      };
    }
  }

  /**
   * Bulk operations on decks
   */
  async bulkOperation(operation, deckIds) {
    try {
      console.log('🔄 DeckDataService: Performing bulk operation:', operation, deckIds);

      let endpoint = '';
      let method = '';
      let body = { deck_ids: deckIds };

      switch (operation) {
        case 'activate':
          endpoint = `${this.baseUrl}/decks/bulk-activate`;
          method = 'POST';
          break;
        case 'deactivate':
          endpoint = `${this.baseUrl}/decks/bulk-deactivate`;
          method = 'POST';
          break;
        case 'delete':
          endpoint = `${this.baseUrl}/decks/bulk-delete`;
          method = 'DELETE';
          break;
        default:
          throw new Error(`Unknown bulk operation: ${operation}`);
      }

      let response;
      if (method === 'POST') {
        response = await api.post(endpoint, body);
      } else if (method === 'DELETE') {
        response = await api.delete(endpoint, { data: body });
      }
      
      const result = response;
      
      if (result.success) {
        console.log('✅ DeckDataService: Successfully performed bulk operation:', operation);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || `Failed to perform bulk ${operation}`);
      }
    } catch (error) {
      console.error('❌ DeckDataService: Error performing bulk operation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export decks to CSV
   */
  exportToCSV(decks, filename = null) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 DeckDataService: Exporting decks to CSV:', decks.length);

        if (!decks || decks.length === 0) {
          throw new Error('No data to export');
        }

        const headers = ['Deck Name', 'Type', 'Category', 'Cards', 'Status', 'Visibility', 'Created'];
        const csvContent = [
          headers.join(','),
          ...decks.map(deck => [
            `"${deck.name_en || deck.name_ar || 'Unnamed'}"`,
            deck.deck_type || 'Custom',
            deck.category || 'General',
            deck.total_cards || 0,
            deck.is_active ? 'Active' : 'Inactive',
            deck.visibility_type || 'Private',
            new Date(deck.created_at).toLocaleDateString()
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `decks-export-${new Date().toISOString().split('T')[0]}.csv`;
        
        // Add event listener to detect when download starts
        a.addEventListener('click', () => {
          // Give browser time to process the download
          setTimeout(() => {
            // Clean up the URL object
            window.URL.revokeObjectURL(url);
            console.log('✅ DeckDataService: Successfully exported decks to CSV');
            resolve({ success: true, message: 'Export completed successfully' });
          }, 1500); // Increased timeout for more reliability
        });
        
        // Add the link to DOM, click it, then remove it
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

      } catch (error) {
        console.error('❌ DeckDataService: Error exporting to CSV:', error);
        reject({ success: false, error: error.message });
      }
    });
  }

  /**
   * Get deck statistics
   */
  async getDeckStats() {
    try {
      console.log('🔄 DeckDataService: Loading deck statistics');

      const decksResult = await this.getDecks();
      
      if (!decksResult.success) {
        throw new Error(decksResult.error);
      }

      const decks = decksResult.data;
      
      const stats = {
        total: decks.length,
        active: decks.filter(d => d.is_active).length,
        inactive: decks.filter(d => !d.is_active).length,
        byType: {},
        byCategory: {},
        totalCards: decks.reduce((sum, d) => sum + (d.total_cards || 0), 0)
      };

      // Group by type
      decks.forEach(deck => {
        const type = deck.deck_type || 'Unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      // Group by category
      decks.forEach(deck => {
        const category = deck.category || 'Unknown';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });

      console.log('✅ DeckDataService: Successfully loaded deck statistics');
      return { success: true, data: stats };
    } catch (error) {
      console.error('❌ DeckDataService: Error loading deck statistics:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const deckDataService = new DeckDataService();

// Export the service class for testing
export default DeckDataService; 