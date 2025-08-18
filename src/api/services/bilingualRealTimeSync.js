// =================================================
// SAMIA TAROT BILINGUAL REAL-TIME SYNC SERVICE
// Ensures instant translation updates across all systems
// =================================================

import { supabaseAdmin } from '../lib/supabase.js';

class BilingualRealTimeSync {
  constructor() {
    this.subscribers = new Map();
    this.syncQueue = [];
    this.isProcessing = false;
    this.syncIntervalId = null;
    
    // Start the sync process
    this.startSyncProcessor();
    
    console.log('🔄 BilingualRealTimeSync service initialized');
  }

  /**
   * Subscribe to translation updates for a specific table
   * @param {string} tableName - Table to monitor
   * @param {Function} callback - Callback function for updates
   * @returns {string} - Subscription ID
   */
  subscribe(tableName, callback) {
    const subscriptionId = `${tableName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.subscribers.has(tableName)) {
      this.subscribers.set(tableName, new Map());
    }
    
    this.subscribers.get(tableName).set(subscriptionId, callback);
    
    console.log(`📡 [SYNC] New subscription for ${tableName}: ${subscriptionId}`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from translation updates
   * @param {string} tableName - Table name
   * @param {string} subscriptionId - Subscription ID to remove
   */
  unsubscribe(tableName, subscriptionId) {
    if (this.subscribers.has(tableName)) {
      this.subscribers.get(tableName).delete(subscriptionId);
      
      // Clean up empty table subscriptions
      if (this.subscribers.get(tableName).size === 0) {
        this.subscribers.delete(tableName);
      }
      
      console.log(`📡 [SYNC] Unsubscribed from ${tableName}: ${subscriptionId}`);
    }
  }

  /**
   * Queue a translation update for real-time sync
   * @param {Object} updateData - Update information
   */
  queueTranslationUpdate(updateData) {
    const syncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...updateData
    };
    
    this.syncQueue.push(syncItem);
    
    console.log(`📦 [SYNC] Queued translation update for ${updateData.tableName}:${updateData.recordId}`);
    
    // Process immediately if not already processing
    if (!this.isProcessing) {
      this.processSyncQueue();
    }
  }

  /**
   * Start the sync processor (runs every 1 second)
   */
  startSyncProcessor() {
    this.syncIntervalId = setInterval(() => {
      if (this.syncQueue.length > 0 && !this.isProcessing) {
        this.processSyncQueue();
      }
    }, 1000);
  }

  /**
   * Stop the sync processor
   */
  stopSyncProcessor() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Process the sync queue
   */
  async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 [SYNC] Processing ${this.syncQueue.length} sync items...`);

    try {
      const itemsToProcess = [...this.syncQueue];
      this.syncQueue = [];

      for (const item of itemsToProcess) {
        await this.processSyncItem(item);
      }

      console.log(`✅ [SYNC] Processed ${itemsToProcess.length} sync items`);
    } catch (error) {
      console.error('❌ [SYNC] Error processing sync queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single sync item
   * @param {Object} item - Sync item to process
   */
  async processSyncItem(item) {
    try {
      const { tableName, recordId, action, data } = item;
      
      // Notify subscribers
      await this.notifySubscribers(tableName, {
        recordId,
        action,
        data,
        timestamp: item.timestamp
      });

      // Perform additional sync operations based on table
      await this.performTableSpecificSync(tableName, recordId, action, data);

      console.log(`✅ [SYNC] Processed ${action} for ${tableName}:${recordId}`);
    } catch (error) {
      console.error(`❌ [SYNC] Error processing sync item:`, error);
    }
  }

  /**
   * Notify all subscribers for a table
   * @param {string} tableName - Table name
   * @param {Object} updateInfo - Update information
   */
  async notifySubscribers(tableName, updateInfo) {
    if (!this.subscribers.has(tableName)) {
      return;
    }

    const tableSubscribers = this.subscribers.get(tableName);
    
    for (const [subscriptionId, callback] of tableSubscribers) {
      try {
        await callback(updateInfo);
      } catch (error) {
        console.error(`❌ [SYNC] Error in subscriber callback ${subscriptionId}:`, error);
      }
    }
  }

  /**
   * Perform table-specific sync operations
   * @param {string} tableName - Table name
   * @param {string} recordId - Record ID
   * @param {string} action - Action performed
   * @param {Object} data - Update data
   */
  async performTableSpecificSync(tableName, recordId, action, data) {
    switch (tableName) {
      case 'tarot_cards':
        await this.syncTarotCardTranslations(recordId, action, data);
        break;
      case 'tarot_decks':
        await this.syncTarotDeckTranslations(recordId, action, data);
        break;
      case 'services':
        await this.syncServiceTranslations(recordId, action, data);
        break;
      case 'spreads':
        await this.syncSpreadTranslations(recordId, action, data);
        break;
    }
  }

  /**
   * Sync tarot card translations
   * @param {string} recordId - Card ID
   * @param {string} action - Action performed
   * @param {Object} data - Update data
   */
  async syncTarotCardTranslations(recordId, action, data) {
    try {
      // Invalidate any cached card data
      await this.invalidateCache(`tarot_card_${recordId}`);
      
      // Update any related reading sessions that use this card
      if (action === 'translation_updated') {
        await this.updateRelatedCardUsages(recordId, data);
      }
    } catch (error) {
      console.error(`❌ [SYNC] Error syncing tarot card ${recordId}:`, error);
    }
  }

  /**
   * Sync tarot deck translations
   * @param {string} recordId - Deck ID
   * @param {string} action - Action performed
   * @param {Object} data - Update data
   */
  async syncTarotDeckTranslations(recordId, action, data) {
    try {
      // Invalidate any cached deck data
      await this.invalidateCache(`tarot_deck_${recordId}`);
      
      // Update all cards in this deck if deck info changed
      if (action === 'translation_updated') {
        await this.updateDeckCardReferences(recordId, data);
      }
    } catch (error) {
      console.error(`❌ [SYNC] Error syncing tarot deck ${recordId}:`, error);
    }
  }

  /**
   * Sync service translations
   * @param {string} recordId - Service ID
   * @param {string} action - Action performed
   * @param {Object} data - Update data
   */
  async syncServiceTranslations(recordId, action, data) {
    try {
      // Invalidate any cached service data
      await this.invalidateCache(`service_${recordId}`);
      
      // Update any active bookings for this service
      if (action === 'translation_updated') {
        await this.updateServiceBookingReferences(recordId, data);
      }
    } catch (error) {
      console.error(`❌ [SYNC] Error syncing service ${recordId}:`, error);
    }
  }

  /**
   * Sync spread translations
   * @param {string} recordId - Spread ID
   * @param {string} action - Action performed
   * @param {Object} data - Update data
   */
  async syncSpreadTranslations(recordId, action, data) {
    try {
      // Invalidate any cached spread data
      await this.invalidateCache(`spread_${recordId}`);
      
      // Update any active sessions using this spread
      if (action === 'translation_updated') {
        await this.updateSpreadSessionReferences(recordId, data);
      }
    } catch (error) {
      console.error(`❌ [SYNC] Error syncing spread ${recordId}:`, error);
    }
  }

  /**
   * Invalidate cache for a specific key
   * @param {string} cacheKey - Cache key to invalidate
   */
  async invalidateCache(cacheKey) {
    // This would integrate with your caching system
    // For now, just log the action
    console.log(`🗑️ [SYNC] Cache invalidated: ${cacheKey}`);
  }

  /**
   * Update related card usages when card translations change
   * @param {string} cardId - Card ID
   * @param {Object} data - Updated data
   */
  async updateRelatedCardUsages(cardId, data) {
    // This would update any active reading sessions that use this card
    console.log(`🔄 [SYNC] Updating related usages for card: ${cardId}`);
  }

  /**
   * Update deck card references when deck translations change
   * @param {string} deckId - Deck ID
   * @param {Object} data - Updated data
   */
  async updateDeckCardReferences(deckId, data) {
    // This would update references in related systems
    console.log(`🔄 [SYNC] Updating deck card references for deck: ${deckId}`);
  }

  /**
   * Update service booking references when service translations change
   * @param {string} serviceId - Service ID
   * @param {Object} data - Updated data
   */
  async updateServiceBookingReferences(serviceId, data) {
    // This would update active bookings
    console.log(`🔄 [SYNC] Updating service booking references for service: ${serviceId}`);
  }

  /**
   * Update spread session references when spread translations change
   * @param {string} spreadId - Spread ID
   * @param {Object} data - Updated data
   */
  async updateSpreadSessionReferences(spreadId, data) {
    // This would update active reading sessions
    console.log(`🔄 [SYNC] Updating spread session references for spread: ${spreadId}`);
  }

  /**
   * Get sync service statistics
   * @returns {Object} - Service statistics
   */
  getStats() {
    const totalSubscribers = Array.from(this.subscribers.values())
      .reduce((sum, tableMap) => sum + tableMap.size, 0);

    return {
      queueSize: this.syncQueue.length,
      isProcessing: this.isProcessing,
      totalSubscribers,
      subscribedTables: Array.from(this.subscribers.keys()),
      uptime: process.uptime()
    };
  }

  /**
   * Manually trigger a sync for a specific record
   * @param {string} tableName - Table name
   * @param {string} recordId - Record ID
   * @param {string} action - Action type
   * @param {Object} data - Data to sync
   */
  triggerManualSync(tableName, recordId, action = 'manual_sync', data = {}) {
    this.queueTranslationUpdate({
      tableName,
      recordId,
      action,
      data
    });
  }
}

// Create and export singleton instance
export const bilingualRealTimeSync = new BilingualRealTimeSync();

export default bilingualRealTimeSync; 