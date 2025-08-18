import React from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import useGlobalSearch from '../../hooks/useGlobalSearch';
import SearchResultsPanel from './SearchResultsPanel';

/**
 * Global Search Field Component for Admin Dashboard Sidebar
 * Provides unified search across all admin entities
 */
const GlobalSearchField = ({ onNavigate }) => {
  const { language, direction } = useLanguage();
  
  const {
    query,
    results,
    isLoading,
    isOpen,
    selectedIndex,
    error,
    recentSearches,
    inputRef,
    handleInputChange,
    handleKeyDown,
    handleSelectResult,
    closeSearch,
    clearSearch,
    showRecentSearches,
    hasResults,
    showNoResults
  } = useGlobalSearch();

  // Handle result selection and navigation
  const handleResultSelect = (result) => {
    const selectedResult = handleSelectResult(result);
    
    // Always trigger navigation and close for any selection
    if (onNavigate && !result.isRecentSearch) {
      onNavigate(result);
      
      // Close search panel after navigation
      setTimeout(() => {
        closeSearch();
      }, 100);
    }
    
    if (result.isRecentSearch) {
      // For recent searches, repeat the search
      handleInputChange(result.title);
    }
    
    return selectedResult;
  };

  // Get placeholder text
  const getPlaceholder = () => {
    if (language === 'ar') {
      return 'بحث شامل... (Ctrl+K)';
    }
    return 'Global search... (Ctrl+K)';
  };

  return (
    <div className="relative">
      <div className="rounded-xl bg-white/0 backdrop-blur-sm flex items-center px-3 py-2.5 transition-all duration-300 focus-within:bg-white/8 hover:bg-white/7">
        <Search className={`w-4 h-4 text-gray-300 ${direction === 'rtl' ? 'ml-3' : 'mr-3'} flex-shrink-0`} />
        
        <input
          ref={inputRef}
          type="text"
          placeholder={getPlaceholder()}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => !isOpen && handleInputChange(query)}
          className="bg-white/80 outline-none rounded-xl text-white placeholder-gray-300 flex-1 text-sm px-2 py-1 transition-all duration-200 focus:bg-white/90 focus:text-gray-800"
          autoComplete="off"
          spellCheck="false"
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={clearSearch}
            className={`${direction === 'rtl' ? 'mr-2' : 'ml-2'} p-1 rounded-full hover:bg-white/10 transition-colors`}
            type="button"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Search Results Panel */}
      {isOpen && (
        <SearchResultsPanel
          results={results}
          recentSearches={recentSearches}
          isLoading={isLoading}
          error={error}
          selectedIndex={selectedIndex}
          showRecentSearches={showRecentSearches}
          showNoResults={showNoResults}
          onSelectResult={handleResultSelect}
          onClose={closeSearch}
          searchInputRef={inputRef}
        />
      )}
    </div>
  );
};

export default GlobalSearchField; 