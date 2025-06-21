import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  UserIcon,
  CalendarIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';

const UniversalSearchBar = ({
  onSearchResults,
  onFilterChange,
  className = '',
  placeholder
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [advancedFilters, setAdvancedFilters] = useState({});
  
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Search types with icons and labels
  const searchTypes = [
    { value: 'all', label: t('admin.search.all'), icon: MagnifyingGlassIcon },
    { value: 'users', label: t('admin.search.users'), icon: UserIcon },
    { value: 'bookings', label: t('admin.search.bookings'), icon: CalendarIcon },
    { value: 'payments', label: t('admin.search.payments'), icon: CreditCardIcon },
    { value: 'reviews', label: t('admin.search.reviews'), icon: ChatBubbleLeftRightIcon }
  ];

  // Advanced filter fields
  const filterFields = {
    users: [
      { key: 'role', label: t('admin.filters.role'), type: 'select', options: ['client', 'reader', 'admin'] },
      { key: 'status', label: t('admin.filters.status'), type: 'select', options: ['active', 'inactive', 'banned'] },
      { key: 'created_date', label: t('admin.filters.createdDate'), type: 'daterange' },
      { key: 'last_login', label: t('admin.filters.lastLogin'), type: 'daterange' }
    ],
    bookings: [
      { key: 'status', label: t('admin.filters.status'), type: 'select', options: ['pending', 'confirmed', 'completed', 'cancelled'] },
      { key: 'service_type', label: t('admin.filters.serviceType'), type: 'select', options: ['tarot_reading', 'consultation', 'emergency_session'] },
      { key: 'date_range', label: t('admin.filters.dateRange'), type: 'daterange' },
      { key: 'amount_range', label: t('admin.filters.amountRange'), type: 'numberrange' }
    ],
    payments: [
      { key: 'status', label: t('admin.filters.status'), type: 'select', options: ['pending', 'completed', 'failed', 'refunded'] },
      { key: 'payment_method', label: t('admin.filters.paymentMethod'), type: 'select', options: ['stripe', 'square', 'paypal'] },
      { key: 'amount_range', label: t('admin.filters.amountRange'), type: 'numberrange' },
      { key: 'date_range', label: t('admin.filters.dateRange'), type: 'daterange' }
    ],
    reviews: [
      { key: 'rating', label: t('admin.filters.rating'), type: 'select', options: ['1', '2', '3', '4', '5'] },
      { key: 'status', label: t('admin.filters.status'), type: 'select', options: ['pending', 'approved', 'rejected'] },
      { key: 'date_range', label: t('admin.filters.dateRange'), type: 'daterange' }
    ]
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query, type) => {
      if (query.length < 2) {
        setSearchResults({});
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      
      try {
        const params = new URLSearchParams({
          q: query,
          type: type,
          limit: '20'
        });

        // Add advanced filters
        if (Object.keys(advancedFilters).length > 0) {
          params.append('filters', JSON.stringify(advancedFilters));
        }

        const response = await fetch(`/api/admin/search?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setSearchResults(data.results || {});
        setShowResults(true);
        
        // Save to recent searches
        const newSearch = {
          query,
          type,
          timestamp: Date.now(),
          resultCount: data.total_results
        };
        
        setRecentSearches(prev => {
          const filtered = prev.filter(s => s.query !== query || s.type !== type);
          return [newSearch, ...filtered].slice(0, 10);
        });

        // Call parent callback
        if (onSearchResults) {
          onSearchResults(data);
        }

      } catch (error) {
        console.error('Search error:', error);
        setSearchResults({});
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [advancedFilters, onSearchResults]
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value, searchType);
  };

  // Handle search type change
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    if (searchQuery.length >= 2) {
      debouncedSearch(searchQuery, type);
    }
  };

  // Handle advanced filter change
  const handleAdvancedFilterChange = (key, value) => {
    const newFilters = { ...advancedFilters, [key]: value };
    if (!value || value === '') {
      delete newFilters[key];
    }
    setAdvancedFilters(newFilters);
    
    if (onFilterChange) {
      onFilterChange(newFilters);
    }

    // Re-search with new filters
    if (searchQuery.length >= 2) {
      debouncedSearch(searchQuery, searchType);
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = (recentSearch) => {
    setSearchQuery(recentSearch.query);
    setSearchType(recentSearch.type);
    debouncedSearch(recentSearch.query, recentSearch.type);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults({});
    setShowResults(false);
    setAdvancedFilters({});
    if (onSearchResults) {
      onSearchResults(null);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  useEffect(() => {
    localStorage.setItem('admin_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Get result icon for entity type
  const getResultIcon = (type) => {
    const iconMap = {
      users: UserIcon,
      bookings: CalendarIcon,
      payments: CreditCardIcon,
      reviews: ChatBubbleLeftRightIcon
    };
    return iconMap[type] || MagnifyingGlassIcon;
  };

  // Format result preview
  const formatResultPreview = (result, type) => {
    switch (type) {
      case 'users':
        return `${result.full_name} - ${result.email}`;
      case 'bookings':
        return `${result.booking_code} - ${result.service_type}`;
      case 'payments':
        return `${result.transaction_id} - $${result.amount}`;
      case 'reviews':
        return `${result.rating}★ - ${result.comment?.substring(0, 50)}...`;
      default:
        return JSON.stringify(result).substring(0, 50);
    }
  };

  return (
    <div className={`universal-search-bar relative ${className}`} ref={resultsRef}>
      {/* Main Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={placeholder || t('admin.search.placeholder')}
          className="block w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
          onFocus={() => {
            if (searchQuery.length >= 2) {
              setShowResults(true);
            }
          }}
        />

        {/* Search Type Selector */}
        <div className="absolute inset-y-0 right-0 flex items-center">
          <select
            value={searchType}
            onChange={(e) => handleSearchTypeChange(e.target.value)}
            className="h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 dark:text-gray-400 sm:text-sm rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            {searchTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Button */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-16 flex items-center pr-2"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}

        {/* Loading Indicator */}
        {isSearching && (
          <div className="absolute inset-y-0 right-24 flex items-center pr-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
          </div>
        )}
      </div>

      {/* Advanced Filters Toggle */}
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="inline-flex items-center px-3 py-1 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
          {t('admin.search.advancedFilters')}
        </button>

        {Object.keys(advancedFilters).length > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('admin.search.filtersApplied', { count: Object.keys(advancedFilters).length })}
          </span>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterFields[searchType]?.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                  </label>
                  
                  {field.type === 'select' && (
                    <select
                      value={advancedFilters[field.key] || ''}
                      onChange={(e) => handleAdvancedFilterChange(field.key, e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="">{t('admin.filters.all')}</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {t(`admin.filters.options.${option}`, option)}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'daterange' && (
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={advancedFilters[`${field.key}_start`] || ''}
                        onChange={(e) => handleAdvancedFilterChange(`${field.key}_start`, e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600"
                      />
                      <input
                        type="date"
                        value={advancedFilters[`${field.key}_end`] || ''}
                        onChange={(e) => handleAdvancedFilterChange(`${field.key}_end`, e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600"
                      />
                    </div>
                  )}

                  {field.type === 'numberrange' && (
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder={t('admin.filters.min')}
                        value={advancedFilters[`${field.key}_min`] || ''}
                        onChange={(e) => handleAdvancedFilterChange(`${field.key}_min`, e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600"
                      />
                      <input
                        type="number"
                        placeholder={t('admin.filters.max')}
                        value={advancedFilters[`${field.key}_max`] || ''}
                        onChange={(e) => handleAdvancedFilterChange(`${field.key}_max`, e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {Object.keys(advancedFilters).length > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setAdvancedFilters({})}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400"
                >
                  {t('admin.filters.clearAll')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && (searchQuery.length >= 2 || recentSearches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {/* Recent Searches */}
            {searchQuery.length < 2 && recentSearches.length > 0 && (
              <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {t('admin.search.recentSearches')}
                </h4>
                <div className="space-y-1">
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(search)}
                      className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-3 w-3 text-gray-400" />
                        <span>{search.query}</span>
                        <span className="text-xs text-gray-500">({search.type})</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {search.resultCount} {t('admin.search.results')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchQuery.length >= 2 && Object.keys(searchResults).length > 0 && (
              <div className="p-3">
                {Object.entries(searchResults).map(([type, results]) => {
                  if (!results || results.length === 0) return null;
                  
                  const Icon = getResultIcon(type);
                  
                  return (
                    <div key={type} className="mb-4 last:mb-0">
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center">
                        <Icon className="h-3 w-3 mr-1" />
                        {t(`admin.search.${type}`)} ({results.length})
                      </h4>
                      <div className="space-y-1">
                        {results.slice(0, 5).map((result) => (
                          <div
                            key={result.id}
                            className="px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                          >
                            <div className="font-medium">
                              {formatResultPreview(result, type)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(result.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                        {results.length > 5 && (
                          <div className="px-2 py-1 text-xs text-purple-600 dark:text-purple-400">
                            +{results.length - 5} {t('admin.search.moreResults')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No Results */}
            {searchQuery.length >= 2 && Object.keys(searchResults).length === 0 && !isSearching && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('admin.search.noResults')}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UniversalSearchBar; 