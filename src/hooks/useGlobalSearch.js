import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import globalSearchService from '../services/globalSearchService';
import { 
  Users, Briefcase, Calendar, CreditCard, Sparkles, 
  Grid3X3, User, BarChart3, Bell, CheckSquare, 
  Activity, MessageSquare, ThumbsUp, AlertCircle
} from 'lucide-react';

// Dashboard tabs configuration with bilingual support - ordered according to specification
const dashboardTabs = [
  { 
    key: 'overview', 
    labelEn: 'Overview', 
    labelAr: 'نظرة عامة', 
    icon: Grid3X3,
    descriptionEn: 'Dashboard Overview',
    descriptionAr: 'نظرة عامة على اللوحة'
  },
  { 
    key: 'readers', 
    labelEn: 'Readers', 
    labelAr: 'القراء', 
    icon: User,
    descriptionEn: 'Reader Management',
    descriptionAr: 'إدارة القراء'
  },
  { 
    key: 'tarot', 
    labelEn: 'Tarot', 
    labelAr: 'التاروت', 
    icon: Sparkles,
    descriptionEn: 'Tarot Management',
    descriptionAr: 'إدارة التاروت'
  },
  { 
    key: 'services', 
    labelEn: 'Services', 
    labelAr: 'الخدمات', 
    icon: Briefcase,
    descriptionEn: 'Service Management',
    descriptionAr: 'إدارة الخدمات'
  },
  { 
    key: 'reviews', 
    labelEn: 'Reviews', 
    labelAr: 'المراجعات', 
    icon: ThumbsUp,
    descriptionEn: 'Review Management',
    descriptionAr: 'إدارة المراجعات'
  },
  { 
    key: 'approvals', 
    labelEn: 'Approvals', 
    labelAr: 'الموافقات', 
    icon: CheckSquare,
    descriptionEn: 'Approval Queue',
    descriptionAr: 'قائمة الموافقات'
  },
  { 
    key: 'monitoring', 
    labelEn: 'Monitoring', 
    labelAr: 'المراقبة', 
    icon: Activity,
    descriptionEn: 'System Monitoring',
    descriptionAr: 'مراقبة النظام'
  },
  { 
    key: 'users', 
    labelEn: 'Users', 
    labelAr: 'المستخدمين', 
    icon: Users,
    descriptionEn: 'User Management',
    descriptionAr: 'إدارة المستخدمين'
  },
  { 
    key: 'bookings', 
    labelEn: 'Bookings', 
    labelAr: 'الحجوزات', 
    icon: Calendar,
    descriptionEn: 'Booking Management',
    descriptionAr: 'إدارة الحجوزات'
  },
  { 
    key: 'payments', 
    labelEn: 'Payments', 
    labelAr: 'المدفوعات', 
    icon: CreditCard,
    descriptionEn: 'Payment Management',
    descriptionAr: 'إدارة المدفوعات'
  },
  { 
    key: 'analytics', 
    labelEn: 'Analytics', 
    labelAr: 'التحليلات', 
    icon: BarChart3,
    descriptionEn: 'Analytics Dashboard',
    descriptionAr: 'لوحة التحليلات'
  },
  { 
    key: 'finances', 
    labelEn: 'Finance', 
    labelAr: 'الماليات', 
    icon: CreditCard,
    descriptionEn: 'Financial Management',
    descriptionAr: 'الإدارة المالية'
  },
  { 
    key: 'reports', 
    labelEn: 'Reports', 
    labelAr: 'التقارير', 
    icon: BarChart3,
    descriptionEn: 'Reports Management',
    descriptionAr: 'إدارة التقارير'
  },
  { 
    key: 'notifications', 
    labelEn: 'Notifications', 
    labelAr: 'الإشعارات', 
    icon: Bell,
    descriptionEn: 'Notification Center',
    descriptionAr: 'مركز الإشعارات'
  },
  { 
    key: 'messages', 
    labelEn: 'Messages', 
    labelAr: 'الرسائل', 
    icon: MessageSquare,
    descriptionEn: 'Messages Management',
    descriptionAr: 'إدارة الرسائل'
  },
  { 
    key: 'support', 
    labelEn: 'Support', 
    labelAr: 'الدعم', 
    icon: MessageSquare,
    descriptionEn: 'Support Center',
    descriptionAr: 'مركز الدعم'
  },
  
  // System tabs (sidebar only)
  { 
    key: 'incidents', 
    labelEn: 'Incidents', 
    labelAr: 'الحوادث', 
    icon: AlertCircle,
    descriptionEn: 'Incidents Management',
    descriptionAr: 'إدارة الحوادث'
  },
  { 
    key: 'system', 
    labelEn: 'System', 
    labelAr: 'النظام', 
    icon: Grid3X3,
    descriptionEn: 'System Management',
    descriptionAr: 'إدارة النظام'
  },
  { 
    key: 'security', 
    labelEn: 'Security', 
    labelAr: 'الأمان', 
    icon: Users,
    descriptionEn: 'Security Management',
    descriptionAr: 'إدارة الأمان'
  },
  
  // Account tabs (sidebar only)
  { 
    key: 'profile', 
    labelEn: 'Profile', 
    labelAr: 'الملف الشخصي', 
    icon: User,
    descriptionEn: 'Profile Management',
    descriptionAr: 'إدارة الملف الشخصي'
  },
  { 
    key: 'settings', 
    labelEn: 'Settings', 
    labelAr: 'الإعدادات', 
    icon: Grid3X3,
    descriptionEn: 'Settings Management',
    descriptionAr: 'إدارة الإعدادات'
  }
];

/**
 * Custom hook for global search functionality
 * Provides unified search across all admin entities with tab matching
 */
const useGlobalSearch = () => {
  const { currentLanguage } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  
  const inputRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('globalSearchRecent');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery) => {
    if (!searchQuery?.trim()) return;
    
    const updated = [
      searchQuery,
      ...recentSearches.filter(item => item !== searchQuery)
    ].slice(0, 5); // Keep only 5 recent searches
    
    setRecentSearches(updated);
    localStorage.setItem('globalSearchRecent', JSON.stringify(updated));
  }, [recentSearches]);

  // Function to find matching tabs based on search query
  const findMatchingTabs = useCallback((searchQuery) => {
    if (!searchQuery?.trim()) return [];
    
    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    const matchedTabs = dashboardTabs.filter(tab => {
      const matchesEn = tab.labelEn.toLowerCase().includes(normalizedQuery) ||
                        tab.descriptionEn.toLowerCase().includes(normalizedQuery);
      const matchesAr = tab.labelAr.toLowerCase().includes(normalizedQuery) ||
                        tab.descriptionAr.toLowerCase().includes(normalizedQuery);
      return matchesEn || matchesAr;
    });

    return matchedTabs.map(tab => ({
      id: `tab-${tab.key}`,
      title: currentLanguage === 'ar' ? tab.labelAr : tab.labelEn,
      description: currentLanguage === 'ar' ? tab.descriptionAr : tab.descriptionEn,
      entity: tab.key,
      navigateTo: tab.key,
      iconComponent: tab.icon,
      isTabEntity: true,
      priority: 1 // Higher priority to show tabs first
    }));
  }, [currentLanguage]);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery?.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get regular search results - IMPORTANT: Pass current language
      const searchResponse = await globalSearchService.searchAll(searchQuery, currentLanguage);
      
      // Handle different response structures
      const searchResults = Array.isArray(searchResponse) 
        ? searchResponse 
        : (searchResponse?.results || []);
      
      // Get matching tabs
      const tabResults = findMatchingTabs(searchQuery);
      
      // Combine results: tabs first, then regular results
      // Remove duplicates if a regular result matches a tab
      const filteredRegularResults = searchResults.filter(result => 
        !tabResults.some(tab => tab.entity === result.navigateTo)
      );
      
      const combinedResults = [...tabResults, ...filteredRegularResults];
      
      setResults(combinedResults);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [findMatchingTabs, currentLanguage]);

  // Handle input change with debouncing
  const handleInputChange = useCallback((value) => {
    setQuery(value);
    setIsOpen(true);
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    const totalItems = showRecentSearches ? recentSearches.length : results.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (showRecentSearches) {
            handleInputChange(recentSearches[selectedIndex]);
          } else if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeSearch();
        break;
    }
  }, [isOpen, selectedIndex, results, recentSearches]);

  // Handle result selection
  const handleSelectResult = useCallback((result) => {
    if (result) {
      saveRecentSearch(query);
      return result;
    }
  }, [query, saveRecentSearch]);

  // Close search
  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    setError(null);
    
    // Clear any pending search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Blur input if it exists
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    setError(null);
    
    // Clear any pending search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Computed values
  const hasResults = results.length > 0;
  const showRecentSearches = !query.trim() && recentSearches.length > 0;
  const showNoResults = query.trim() && !isLoading && !hasResults && !error;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
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
  };
};

export default useGlobalSearch; 