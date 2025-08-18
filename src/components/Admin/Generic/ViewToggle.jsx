import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Rows3,
  LayoutGrid
} from 'lucide-react';

/**
 * VIEW TOGGLE - SAMIA TAROT
 * Toggle component for switching between table and card views
 * Preserves user preference in localStorage with cosmic theme
 */

const ViewToggle = ({
  viewMode = 'table',
  onViewChange,
  entityType = 'user',
  className = ''
}) => {
  const { currentLanguage } = useLanguage();
  const [currentView, setCurrentView] = useState(viewMode);

  // Storage key based on entity type for separate preferences
  const storageKey = `samia_tarot_${entityType}_view_mode`;

  useEffect(() => {
    // Load saved preference from localStorage
    const savedView = localStorage.getItem(storageKey);
    if (savedView && (savedView === 'table' || savedView === 'cards')) {
      setCurrentView(savedView);
      onViewChange(savedView);
    } else {
      // Default to table view for users, cards for decks
      const defaultView = entityType === 'user' ? 'table' : 'cards';
      setCurrentView(defaultView);
      onViewChange(defaultView);
    }
  }, [entityType, storageKey, onViewChange]);

  const handleViewChange = (newView) => {
    setCurrentView(newView);
    localStorage.setItem(storageKey, newView);
    onViewChange(newView);
  };

  const views = [
    {
      key: 'table',
      icon: Rows3,
      label: currentLanguage === 'ar' ? 'جدول' : 'Table',
      description: currentLanguage === 'ar' ? 'عرض الجدول' : 'List View'
    },
    {
      key: 'cards',
      icon: LayoutGrid,
      label: currentLanguage === 'ar' ? 'بطاقات' : 'Cards',
      description: currentLanguage === 'ar' ? 'عرض البطاقات' : 'Grid View'
    }
  ];

  return (
    <div className={`flex items-center ${className}`}>
      {/* Toggle Buttons Container */}
      <div className="relative flex bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-2 gap-2">

        {/* Toggle Buttons */}
        {views.map((view) => {
          const Icon = view.icon;
          const isActive = currentView === view.key;

          return (
            <motion.button
              key={view.key}
              onClick={() => handleViewChange(view.key)}
              className={`relative z-10 flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title={view.description}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium hidden md:inline">{view.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * HOOK: useViewToggle
 * Custom hook for managing view mode state with persistence
 */
export const useViewToggle = (entityType = 'user', defaultView = null) => {
  const storageKey = `samia_tarot_${entityType}_view_mode`;
  
  // Determine initial view based on entity type if no default provided
  const getInitialView = () => {
    if (defaultView) return defaultView;
    
    const savedView = localStorage.getItem(storageKey);
    if (savedView && (savedView === 'table' || savedView === 'cards')) {
      return savedView;
    }
    
    // Default preferences: table for users, cards for decks
    return entityType === 'user' ? 'table' : 'cards';
  };

  const [viewMode, setViewMode] = useState(getInitialView);

  const handleViewChange = (newView) => {
    setViewMode(newView);
    localStorage.setItem(storageKey, newView);
  };

  const isTableView = viewMode === 'table';
  const isCardsView = viewMode === 'cards';

  return {
    viewMode,
    setViewMode: handleViewChange,
    isTableView,
    isCardsView
  };
};

/**
 * ENHANCED VIEW TOGGLE - with statistics and preferences
 */
export const EnhancedViewToggle = ({
  viewMode = 'table',
  onViewChange,
  entityType = 'user',
  itemCount = 0,
  selectedCount = 0,
  showStats = true,
  className = ''
}) => {
  const { currentLanguage } = useLanguage();

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Stats Section */}
      {showStats && (
        <div className="flex items-center space-x-4 text-sm text-cosmic-300">
          <span>
            {itemCount} {currentLanguage === 'ar' 
              ? (entityType === 'user' ? 'مستخدم' : 'مجموعة')
              : (entityType === 'user' ? 'users' : 'decks')
            }
          </span>
          {selectedCount > 0 && (
            <span className="text-gold-400">
              {selectedCount} {currentLanguage === 'ar' ? 'محدد' : 'selected'}
            </span>
          )}
        </div>
      )}

      {/* View Toggle */}
      <ViewToggle
        viewMode={viewMode}
        onViewChange={onViewChange}
        entityType={entityType}
      />
    </div>
  );
};

export default ViewToggle; 