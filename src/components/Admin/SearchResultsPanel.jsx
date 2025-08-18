import React from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Briefcase, Calendar, CreditCard, Sparkles, 
  Grid3X3, User, Clock, Loader2, AlertCircle, Search, ChevronRight, Clock as ClockIcon 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getSolidPanelClasses, getFlexContainerClasses } from '../../utils/rtlUtils';

/**
 * Search Results Panel Component
 * Displays search results with cosmic theme and keyboard navigation
 */
const SearchResultsPanel = ({
  results = [],
  recentSearches = [],
  isLoading = false,
  error = null,
  selectedIndex = -1,
  showRecentSearches = false,
  showNoResults = false,
  onSelectResult,
  onClose,
  searchInputRef = null
}) => {
  const { currentLanguage, direction } = useLanguage();

  // Click handler for results
  const handleClick = (result) => {
    if (onSelectResult) {
      onSelectResult(result);
    }
  };

  // Add comprehensive event debugging
  const handlePanelClick = (e) => {
    e.stopPropagation();
  };

  const handleMouseDown = (e) => {
    // Mouse down handler
  };

  const handlePointerDown = (e) => {
    // Pointer down handler
  };

  // Calculate position for portal with RTL support
  const getPortalPosition = () => {
    if (!searchInputRef?.current) {
      return { top: 100, left: 20, width: 400 };
    }
    
    const rect = searchInputRef.current.getBoundingClientRect();
    const panelWidth = Math.max(rect.width, 400);
    
    if (direction === 'rtl') {
      return {
        top: rect.bottom + 8,
        left: rect.right - panelWidth, // Align to right edge of input for RTL
        width: panelWidth
      };
    } else {
      return {
        top: rect.bottom + 8,
        left: rect.left,
        width: panelWidth
      };
    }
  };

  // Function to render the appropriate icon for a result
  const renderResultIcon = (result) => {
    // If it's a tab entity with iconComponent, use that
    if (result.isTabEntity && result.iconComponent) {
      const IconComponent = result.iconComponent;
      return <IconComponent className="h-5 w-5 text-purple-400" />;
    }

    // Default icons based on entity type
    const iconMap = {
      users: Users,
      services: Briefcase,
      bookings: Calendar,
      payments: CreditCard,
      tarotDecks: Sparkles,
      tarotSpreads: Grid3X3,
      readers: User,
      analytics: Clock,
      notifications: AlertCircle,
      approvals: Clock,
      monitoring: Clock,
      support: Clock,
      reviews: Clock
    };

    const IconComponent = iconMap[result.navigateTo] || iconMap[result.entity] || Search;
    return <IconComponent className="h-5 w-5 text-purple-400" />;
  };

  // Get display results (either search results or recent searches)
  const displayResults = showRecentSearches 
    ? recentSearches.map((search, index) => ({
        id: search,
        title: search,
        description: currentLanguage === 'ar' ? 'بحث سابق' : 'Recent search',
        icon: 'Clock',
        iconColor: 'text-gray-400',
        isRecentSearch: true
      }))
    : results;
  
  const position = getPortalPosition();

  // Panel content to be rendered via Portal
  const panelContent = (
    <div
      dir={direction}
      className={getSolidPanelClasses(direction)}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 999999,
        minWidth: '300px',
        pointerEvents: 'auto',
        direction: direction
      }}
      onClick={handlePanelClick}
      onMouseDown={handleMouseDown}
      onPointerDown={handlePointerDown}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-400">
            {currentLanguage === 'ar' ? 'جاري البحث...' : 'Searching...'}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 text-center">
          <p className="text-red-400 text-sm">
            {currentLanguage === 'ar' ? 'خطأ في البحث. حاول مرة أخرى.' : 'Search error. Please try again.'}
          </p>
        </div>
      )}

      {/* No Results State */}
      {showNoResults && !isLoading && !error && (
        <div className="p-4 text-center">
          <p className="text-gray-400 text-sm">
            {currentLanguage === 'ar' ? 'لا توجد نتائج' : 'No results found'}
          </p>
        </div>
      )}

      {/* Recent Searches */}
      {showRecentSearches && recentSearches.length > 0 && (
        <div className="p-2">
          <h3 className="text-xs font-medium text-gray-400 px-2 py-1 mb-1">
            {currentLanguage === 'ar' ? 'عمليات البحث الأخيرة' : 'Recent Searches'}
          </h3>
          {recentSearches.map((search, index) => (
            <div
              key={index}
              className={`px-3 py-2 cursor-pointer rounded-lg transition-colors hover:bg-gray-700 ${
                selectedIndex === index ? 'bg-purple-500/20' : ''
              }`}
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick({ 
                  id: search,
                  title: search,
                  description: currentLanguage === 'ar' ? 'بحث سابق' : 'Recent search',
                  entity: 'recent',
                  isRecentSearch: true 
                });
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <div className={getFlexContainerClasses(direction)}>
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-white">{search}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && !isLoading && (
        <div className="max-h-80 overflow-y-auto hide-scrollbar">
          {results.map((result, index) => (
            <div
              key={`${result.entity}-${result.id || index}`}
              className={`px-4 py-3 border-b border-gray-700/50 transition-colors cursor-pointer hover:bg-gray-700/50 ${
                selectedIndex === index ? 'bg-purple-500/20' : ''
              }`}
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick(result);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {renderResultIcon(result)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Tab indicator for tab entities */}
                      {result.isTabEntity && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                          {currentLanguage === 'ar' ? 'صفحة' : 'Tab'}
                        </span>
                      )}
                      {/* Entity type for regular results */}
                      {!result.isTabEntity && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                          {result.entity}
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-white truncate">
                      {result.title}
                    </h4>
                    <p className="text-sm text-gray-400 truncate">
                      {result.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keyboard Navigation Hint */}
      {(results.length > 0 || showRecentSearches) && (
        <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">
            {currentLanguage === 'ar' 
              ? 'استخدم الأسهم للتنقل، Enter للاختيار، Esc للإغلاق'
              : 'Use arrows to navigate, Enter to select, Esc to close'
            }
          </p>
        </div>
      )}
    </div>
  );

  // Render via Portal to document.body
  return createPortal(panelContent, document.body);
};

export default SearchResultsPanel; 