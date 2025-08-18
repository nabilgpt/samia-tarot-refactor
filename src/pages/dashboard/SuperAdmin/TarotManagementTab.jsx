import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Sparkles, 
  Grid3X3, 
  BookOpen, 
  Settings,
  Star,
  Layers,
  Archive,
  Plus,
  TrendingUp
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import DeckTypesManager from '../../../components/Tarot/DeckTypesManager.jsx';

/**
 * ==========================================
 * SAMIA TAROT - TAROT MANAGEMENT TAB
 * Comprehensive tarot management for Super Admin Dashboard
 * ==========================================
 */

const TarotManagementTab = () => {
  const { currentLanguage, direction } = useLanguage();
  const { profile } = useAuth();
  
  // ===================================
  // STATE MANAGEMENT
  // ===================================
  const [activeSection, setActiveSection] = useState('deck-types');
  
  // ===================================
  // CONFIGURATION
  // ===================================
  const sections = [
    {
      id: 'deck-types',
      name: currentLanguage === 'ar' ? 'أنواع المجموعات' : 'Deck Types',
      description: currentLanguage === 'ar' ? 'إدارة أنواع مجموعات التاروت المختلفة' : 'Manage different tarot deck types',
      icon: Crown,
      color: 'purple',
      available: true,
      component: DeckTypesManager
    },
    {
      id: 'categories',
      name: currentLanguage === 'ar' ? 'فئات التاروت' : 'Tarot Categories',
      description: currentLanguage === 'ar' ? 'تصنيف وتنظيم مجموعات التاروت' : 'Categorize and organize tarot decks',
      icon: Grid3X3,
      color: 'blue',
      available: false,
      component: null // TODO: Create CategoriesManager component
    },
    {
      id: 'spreads',
      name: currentLanguage === 'ar' ? 'أشكال التوزيع' : 'Tarot Spreads',
      description: currentLanguage === 'ar' ? 'إدارة أشكال توزيع أوراق التاروت' : 'Manage tarot card spread layouts',
      icon: Layers,
      color: 'green',
      available: false,
      component: null // TODO: Create SpreadsManager component
    },
    {
      id: 'card-meanings',
      name: currentLanguage === 'ar' ? 'معاني البطاقات' : 'Card Meanings',
      description: currentLanguage === 'ar' ? 'إدارة معاني وتفسيرات البطاقات' : 'Manage card meanings and interpretations',
      icon: BookOpen,
      color: 'yellow',
      available: false,
      component: null // TODO: Create CardMeaningsManager component
    },
    {
      id: 'reading-templates',
      name: currentLanguage === 'ar' ? 'قوالب القراءة' : 'Reading Templates',
      description: currentLanguage === 'ar' ? 'قوالب جاهزة لقراءات التاروت' : 'Pre-made templates for tarot readings',
      icon: Star,
      color: 'pink',
      available: false,
      component: null // TODO: Create ReadingTemplatesManager component
    },
    {
      id: 'analytics',
      name: currentLanguage === 'ar' ? 'تحليلات التاروت' : 'Tarot Analytics',
      description: currentLanguage === 'ar' ? 'إحصائيات واستخدام قراءات التاروت' : 'Statistics and usage analytics for tarot readings',
      icon: TrendingUp,
      color: 'cyan',
      available: false,
      component: null // TODO: Create TarotAnalytics component
    }
  ];

  // ===================================
  // HELPERS
  // ===================================
  const getText = (ar, en) => currentLanguage === 'ar' ? ar : en;

  const getColorClasses = (color, active = false) => {
    const colors = {
      purple: active 
        ? 'bg-purple-600 text-white border-purple-500' 
        : 'text-purple-400 hover:bg-purple-500/20 border-purple-500/30',
      blue: active 
        ? 'bg-blue-600 text-white border-blue-500' 
        : 'text-blue-400 hover:bg-blue-500/20 border-blue-500/30',
      green: active 
        ? 'bg-green-600 text-white border-green-500' 
        : 'text-green-400 hover:bg-green-500/20 border-green-500/30',
      yellow: active 
        ? 'bg-yellow-600 text-white border-yellow-500' 
        : 'text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/30',
      pink: active 
        ? 'bg-pink-600 text-white border-pink-500' 
        : 'text-pink-400 hover:bg-pink-500/20 border-pink-500/30',
      cyan: active 
        ? 'bg-cyan-600 text-white border-cyan-500' 
        : 'text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/30'
    };
    return colors[color] || colors.purple;
  };

  // ===================================
  // RENDER HELPERS
  // ===================================
  const renderSectionCard = (section) => (
    <motion.div
      key={section.id}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-6 border rounded-xl cursor-pointer transition-all duration-300 ${
        section.available 
          ? `bg-white/5 backdrop-blur-sm border-white/20 hover:bg-white/10` 
          : 'bg-gray-500/10 border-gray-500/20 cursor-not-allowed opacity-60'
      }`}
      onClick={() => section.available && setActiveSection(section.id)}
    >
      {/* Coming Soon Badge */}
      {!section.available && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-gray-600 text-white text-xs rounded-full">
          {getText('قريباً', 'Coming Soon')}
        </div>
      )}
      
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-lg border ${getColorClasses(section.color)}`}>
          <section.icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {section.name}
          </h3>
          <p className="text-gray-300 text-sm">
            {section.description}
          </p>
        </div>
      </div>
      
      {section.available && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {getText('انقر للإدارة', 'Click to manage')}
          </span>
          <div className={`w-2 h-2 rounded-full ${getColorClasses(section.color, true).split(' ')[0]}`} />
        </div>
      )}
    </motion.div>
  );

  const renderComingSoonSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 max-w-md mx-auto">
        <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          {getText('هذا القسم قيد التطوير', 'This Section is Under Development')}
        </h3>
        <p className="text-gray-300 mb-4">
          {getText(
            'سيتم إطلاق هذه الميزة قريباً مع المزيد من إمكانيات إدارة التاروت المتقدمة.',
            'This feature will be released soon with more advanced tarot management capabilities.'
          )}
        </p>
        <div className="text-sm text-gray-400">
          {getText('ترقب التحديثات القادمة', 'Stay tuned for upcoming updates')}
        </div>
      </div>
    </motion.div>
  );

  const renderActiveSection = () => {
    const section = sections.find(s => s.id === activeSection);
    
    if (!section || !section.available || !section.component) {
      return renderComingSoonSection();
    }
    
    const Component = section.component;
    return <Component />;
  };

  // ===================================
  // MAIN RENDER
  // ===================================
  return (
    <div className="space-y-8" dir={direction}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Crown className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            {getText('إدارة التاروت', 'Tarot Management')}
          </h1>
        </div>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          {getText(
            'مركز شامل لإدارة جميع جوانب نظام التاروت - من أنواع المجموعات إلى معاني البطاقات وأشكال التوزيع',
            'Comprehensive center for managing all aspects of the tarot system - from deck types to card meanings and spread layouts'
          )}
        </p>
      </div>

      {/* Section Selector (Only show if more than one available) */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
          <Settings className="w-6 h-6 text-purple-400" />
          {getText('أقسام إدارة التاروت', 'Tarot Management Sections')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(renderSectionCard)}
        </div>
      </div>

      {/* Active Section Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderActiveSection()}
        </motion.div>
      </AnimatePresence>

      {/* Footer with development roadmap */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 mt-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
          <Archive className="w-5 h-5 text-cyan-400" />
          {getText('خريطة طريق التطوير', 'Development Roadmap')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.filter(s => !s.available).map((section) => (
            <div key={section.id} className="p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <section.icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">
                  {section.name}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {section.description}
              </p>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            {getText(
              'سيتم تطوير هذه الأقسام تدريجياً لتوفير نظام إدارة تاروت شامل ومتقدم.',
              'These sections will be developed progressively to provide a comprehensive and advanced tarot management system.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TarotManagementTab; 