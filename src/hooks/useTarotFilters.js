import { useState, useMemo, useCallback } from 'react';

/**
 * ==========================================
 * SAMIA TAROT - TAROT FILTERS HOOK
 * Client-side filtering with debug logging
 * ==========================================
 */

export const useTarotFilters = (spreads = [], decks = []) => {
  // ===================================
  // FILTER STATES
  // ===================================
  const [spreadsFilters, setSpreadsFilters] = useState({
    search: '',
    difficulty: 'all',
    category: 'all',
    visibility: 'all',
    status: 'all'
  });
  
  const [decksFilters, setDecksFilters] = useState({
    search: '',
    type: 'all',
    visibility: 'all',
    uploadStatus: 'all'
  });

  // ===================================
  // FILTERED DATA WITH LOGGING
  // ===================================
  const filteredSpreads = useMemo(() => {
    console.log('🔍 [useTarotFilters] Filtering spreads...', {
      totalSpreads: spreads.length,
      filters: spreadsFilters
    });

    if (!spreads.length) {
      console.log('📭 [useTarotFilters] No spreads to filter');
      return [];
    }

    const filtered = spreads.filter(spread => {
      const matchesSearch = !spreadsFilters.search || 
        spread.name?.toLowerCase().includes(spreadsFilters.search.toLowerCase()) ||
        spread.name_ar?.toLowerCase().includes(spreadsFilters.search.toLowerCase()) ||
        spread.description?.toLowerCase().includes(spreadsFilters.search.toLowerCase()) ||
        spread.description_ar?.toLowerCase().includes(spreadsFilters.search.toLowerCase());
      
      const matchesDifficulty = spreadsFilters.difficulty === 'all' || 
        spread.difficulty_level === spreadsFilters.difficulty;
      
      const matchesCategory = spreadsFilters.category === 'all' || 
        spread.category === spreadsFilters.category;
      
      const matchesVisibility = spreadsFilters.visibility === 'all' || 
        spread.visibility_type === spreadsFilters.visibility;
      
      const matchesStatus = spreadsFilters.status === 'all' || 
        spread.approval_status === spreadsFilters.status;

      const passes = matchesSearch && matchesDifficulty && matchesCategory && matchesVisibility && matchesStatus;
      
      return passes;
    });

    console.log('✅ [useTarotFilters] Spreads filtering completed:', {
      filtered: filtered.length,
      total: spreads.length,
      filtersApplied: Object.entries(spreadsFilters).filter(([_, value]) => value !== 'all' && value !== '').length
    });

    return filtered;
  }, [spreads, spreadsFilters]);

  const filteredDecks = useMemo(() => {
    console.log('🔍 [useTarotFilters] Filtering decks...', {
      totalDecks: decks.length,
      filters: decksFilters
    });

    if (!decks.length) {
      console.log('📭 [useTarotFilters] No decks to filter');
      return [];
    }

    const filtered = decks.filter(deck => {
      const matchesSearch = !decksFilters.search || 
        deck.name?.toLowerCase().includes(decksFilters.search.toLowerCase()) ||
        deck.name_ar?.toLowerCase().includes(decksFilters.search.toLowerCase()) ||
        deck.description?.toLowerCase().includes(decksFilters.search.toLowerCase()) ||
        deck.description_ar?.toLowerCase().includes(decksFilters.search.toLowerCase());
      
      const matchesType = decksFilters.type === 'all' || 
        deck.deck_type === decksFilters.type;
      
      const matchesVisibility = decksFilters.visibility === 'all' || 
        deck.visibility_type === decksFilters.visibility;
      
      const matchesUploadStatus = decksFilters.uploadStatus === 'all' || 
        deck.upload_status === decksFilters.uploadStatus;

      const passes = matchesSearch && matchesType && matchesVisibility && matchesUploadStatus;

      return passes;
    });

    console.log('✅ [useTarotFilters] Decks filtering completed:', {
      filtered: filtered.length,
      total: decks.length,
      filtersApplied: Object.entries(decksFilters).filter(([_, value]) => value !== 'all' && value !== '').length
    });

    return filtered;
  }, [decks, decksFilters]);

  // ===================================
  // FILTER UTILITIES
  // ===================================
  const clearSpreadsFilters = useCallback(() => {
    console.log('🧹 [useTarotFilters] Clearing spreads filters');
    setSpreadsFilters({
      search: '',
      difficulty: 'all',
      category: 'all',
      visibility: 'all',
      status: 'all'
    });
  }, []);

  const clearDecksFilters = useCallback(() => {
    console.log('🧹 [useTarotFilters] Clearing decks filters');
    setDecksFilters({
      search: '',
      type: 'all',
      visibility: 'all',
      uploadStatus: 'all'
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    console.log('🧹 [useTarotFilters] Clearing all filters');
    clearSpreadsFilters();
    clearDecksFilters();
  }, [clearSpreadsFilters, clearDecksFilters]);

  // ===================================
  // DEBUG INFO
  // ===================================
  const debugInfo = useMemo(() => ({
    spreads: {
      total: spreads.length,
      filtered: filteredSpreads.length,
      filtersActive: Object.entries(spreadsFilters).filter(([_, value]) => value !== 'all' && value !== '').length > 0,
      activeFilters: Object.entries(spreadsFilters).filter(([_, value]) => value !== 'all' && value !== '')
    },
    decks: {
      total: decks.length,
      filtered: filteredDecks.length,
      filtersActive: Object.entries(decksFilters).filter(([_, value]) => value !== 'all' && value !== '').length > 0,
      activeFilters: Object.entries(decksFilters).filter(([_, value]) => value !== 'all' && value !== '')
    }
  }), [spreads.length, filteredSpreads.length, spreadsFilters, decks.length, filteredDecks.length, decksFilters]);

  return {
    // Filters state
    spreadsFilters,
    setSpreadsFilters,
    decksFilters,
    setDecksFilters,
    
    // Filtered data
    filteredSpreads,
    filteredDecks,
    
    // Utilities
    clearSpreadsFilters,
    clearDecksFilters,
    clearAllFilters,
    
    // Debug info
    debugInfo
  };
}; 