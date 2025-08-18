// =================================================
// SAMIA TAROT ADMIN TRANSLATION MANAGEMENT
// Direct translation editing with real-time sync
// =================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import bilingualTranslationService from '../../services/bilingualTranslationService';
import { FaEdit, FaSave, FaTimes, FaSync, FaGlobe, FaCheck, FaExclamationTriangle, FaLanguage } from 'react-icons/fa';

const AdminTranslationManagement = () => {
  const { currentLanguage } = useLanguage();
  const { profile: userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  
  // Component state
  const [selectedTable, setSelectedTable] = useState('tarot-decks');
  const [translationData, setTranslationData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({});

  // Available tables for translation management
  const availableTables = [
    { id: 'tarot-decks', name: 'Tarot Decks', nameAr: 'مجموعات التاروت', fields: ['name', 'description'] },
    { id: 'tarot-cards', name: 'Tarot Cards', nameAr: 'أوراق التاروت', fields: ['name', 'description', 'upright_meaning', 'reversed_meaning'] },
    { id: 'services', name: 'Services', nameAr: 'الخدمات', fields: ['name', 'description'] },
    { id: 'spreads', name: 'Spreads', nameAr: 'الفروشات', fields: ['name', 'description', 'question'] },
    { id: 'spread_categories', name: 'Spread Categories', nameAr: 'فئات الفروشات', fields: ['name', 'description'] }
  ];

  // Check if user has admin privileges
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FaExclamationTriangle className="mx-auto text-6xl text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            {currentLanguage === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h3>
          <p className="text-gray-400">
            {currentLanguage === 'ar' 
              ? 'هذه الصفحة متاحة للمديرين فقط' 
              : 'This page is only available to administrators'}
          </p>
        </div>
      </div>
    );
  }

  // =================================================
  // DATA LOADING
  // =================================================

  // Load translation data for selected table
  const loadTranslationData = useCallback(async () => {
    if (!selectedTable) return;
    
    setIsLoading(true);
    try {
      const data = bilingualTranslationService.getTranslatedData(selectedTable);
      setTranslationData(data);
      
      // Calculate statistics
      const tableStats = calculateTableStats(data);
      setStats(prev => ({ ...prev, [selectedTable]: tableStats }));
      
    } catch (error) {
      console.error('Error loading translation data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable]);

  // Calculate translation statistics
  const calculateTableStats = (data) => {
    if (!Array.isArray(data)) return {};
    
    const stats = {
      total: data.length,
      completeAr: 0,
      completeEn: 0,
      incomplete: 0,
      empty: 0
    };
    
    const currentTableConfig = availableTables.find(t => t.id === selectedTable);
    const fields = currentTableConfig?.fields || ['name', 'description'];
    
    data.forEach(item => {
      let hasArabic = false;
      let hasEnglish = false;
      let hasAny = false;
      
      fields.forEach(field => {
        const arValue = item[`${field}_ar`];
        const enValue = item[`${field}_en`];
        
        if (arValue && arValue.trim()) {
          hasArabic = true;
          hasAny = true;
        }
        if (enValue && enValue.trim()) {
          hasEnglish = true;
          hasAny = true;
        }
      });
      
      if (hasArabic && hasEnglish) {
        stats.completeAr++;
        stats.completeEn++;
      } else if (hasArabic) {
        stats.completeAr++;
        stats.incomplete++;
      } else if (hasEnglish) {
        stats.completeEn++;
        stats.incomplete++;
      } else {
        stats.empty++;
      }
    });
    
    return stats;
  };

  // =================================================
  // REAL-TIME SYNC
  // =================================================

  useEffect(() => {
    // Subscribe to translation updates
    const unsubscribe = bilingualTranslationService.subscribe((event, data) => {
      if (data.table === selectedTable) {
        loadTranslationData();
      }
    });
    
    return unsubscribe;
  }, [selectedTable, loadTranslationData]);

  // Load data when table changes
  useEffect(() => {
    loadTranslationData();
  }, [loadTranslationData]);

  // =================================================
  // EDITING FUNCTIONS
  // =================================================

  // Start editing an item
  const startEditing = (item) => {
    setEditingItem(item.id);
    
    const currentTableConfig = availableTables.find(t => t.id === selectedTable);
    const fields = currentTableConfig?.fields || ['name', 'description'];
    
    const formData = { ...item };
    fields.forEach(field => {
      if (!formData[`${field}_ar`]) formData[`${field}_ar`] = '';
      if (!formData[`${field}_en`]) formData[`${field}_en`] = '';
    });
    
    setEditForm(formData);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingItem(null);
    setEditForm({});
  };

  // Save translation changes
  const saveTranslation = async () => {
    if (!editingItem || !editForm) return;
    
    setIsSaving(true);
    try {
      const updatedItem = await bilingualTranslationService.updateTranslation(
        selectedTable,
        editingItem,
        editForm
      );
      
      // Update local state
      setTranslationData(prev => 
        prev.map(item => 
          item.id === editingItem ? { ...item, ...updatedItem } : item
        )
      );
      
      // Clear editing state
      setEditingItem(null);
      setEditForm({});
      
      // Show success message
      console.log('Translation updated successfully');
      
    } catch (error) {
      console.error('Error saving translation:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // =================================================
  // FILTERING & SEARCH
  // =================================================

  // Filter and search data
  const filteredData = translationData.filter(item => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = Object.keys(item).some(key => {
        const value = item[key];
        return typeof value === 'string' && value.toLowerCase().includes(searchLower);
      });
      if (!matchesSearch) return false;
    }
    
    // Language filter
    if (filterLanguage !== 'all') {
      const currentTableConfig = availableTables.find(t => t.id === selectedTable);
      const fields = currentTableConfig?.fields || ['name', 'description'];
      
      const hasLanguage = fields.some(field => {
        const value = item[`${field}_${filterLanguage}`];
        return value && value.trim();
      });
      
      if (!hasLanguage) return false;
    }
    
    return true;
  });

  // =================================================
  // BULK OPERATIONS
  // =================================================

  // Force refresh all data
  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      await bilingualTranslationService.forceRefresh();
      await loadTranslationData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // =================================================
  // RENDER FUNCTIONS
  // =================================================

  // Render table selector
  const renderTableSelector = () => (
    <div className="bg-gray-800 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-bold text-white mb-4">
        {currentLanguage === 'ar' ? 'اختر الجدول' : 'Select Table'}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {availableTables.map(table => (
          <button
            key={table.id}
            onClick={() => setSelectedTable(table.id)}
            className={`
              p-3 rounded-lg font-medium transition-all duration-200
              ${selectedTable === table.id
                ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            <div className="text-sm">
              {currentLanguage === 'ar' ? table.nameAr : table.name}
            </div>
            {stats[table.id] && (
              <div className="text-xs opacity-75 mt-1">
                {stats[table.id].total} {currentLanguage === 'ar' ? 'عنصر' : 'items'}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // Render filters and search
  const renderFilters = () => (
    <div className="bg-gray-800 p-4 rounded-lg mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'البحث' : 'Search'}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={currentLanguage === 'ar' ? 'ابحث في الترجمات...' : 'Search translations...'}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        {/* Language filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'تصفية اللغة' : 'Filter Language'}
          </label>
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">{currentLanguage === 'ar' ? 'جميع اللغات' : 'All Languages'}</option>
            <option value="ar">{currentLanguage === 'ar' ? 'العربية فقط' : 'Arabic Only'}</option>
            <option value="en">{currentLanguage === 'ar' ? 'الإنجليزية فقط' : 'English Only'}</option>
          </select>
        </div>
        
        {/* Refresh button */}
        <div className="flex items-end">
          <button
            onClick={refreshAllData}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <FaSync className={isLoading ? 'animate-spin' : ''} />
            <span>{currentLanguage === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render statistics
  const renderStats = () => {
    const currentStats = stats[selectedTable];
    if (!currentStats) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-white">{currentStats.total}</div>
          <div className="text-sm text-gray-400">
            {currentLanguage === 'ar' ? 'المجموع' : 'Total'}
          </div>
        </div>
        <div className="bg-green-900 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-400">{currentStats.completeAr}</div>
          <div className="text-sm text-green-300">
            {currentLanguage === 'ar' ? 'عربي' : 'Arabic'}
          </div>
        </div>
        <div className="bg-blue-900 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-400">{currentStats.completeEn}</div>
          <div className="text-sm text-blue-300">
            {currentLanguage === 'ar' ? 'إنجليزي' : 'English'}
          </div>
        </div>
        <div className="bg-yellow-900 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-400">{currentStats.incomplete}</div>
          <div className="text-sm text-yellow-300">
            {currentLanguage === 'ar' ? 'ناقص' : 'Incomplete'}
          </div>
        </div>
        <div className="bg-red-900 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-400">{currentStats.empty}</div>
          <div className="text-sm text-red-300">
            {currentLanguage === 'ar' ? 'فارغ' : 'Empty'}
          </div>
        </div>
      </div>
    );
  };

  // Render translation table
  const renderTranslationTable = () => {
    const currentTableConfig = availableTables.find(t => t.id === selectedTable);
    const fields = currentTableConfig?.fields || ['name', 'description'];
    
    if (isLoading) {
      return (
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">
            {currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      );
    }
    
    if (filteredData.length === 0) {
      return (
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <FaLanguage className="mx-auto text-4xl text-gray-500 mb-4" />
          <p className="text-gray-400">
            {currentLanguage === 'ar' ? 'لا توجد بيانات للعرض' : 'No data to display'}
          </p>
        </div>
      );
    }
    
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-700 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  ID
                </th>
                {fields.map(field => (
                  <th key={field} className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {field.replace('_', ' ')}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  {currentLanguage === 'ar' ? 'إجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredData.map(item => (
                <tr key={item.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {item.id.slice(0, 8)}...
                  </td>
                  {fields.map(field => (
                    <td key={field} className="px-4 py-3">
                      {editingItem === item.id ? (
                        // Admin editing mode - show both languages
                        <div className="space-y-2" data-admin-dual-language="true">
                          <input
                            type="text"
                            value={editForm[`${field}_ar`] || ''}
                            onChange={(e) => handleFieldChange(`${field}_ar`, e.target.value)}
                            placeholder={`${field} (Arabic)`}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                            dir="rtl"
                          />
                          <input
                            type="text"
                            value={editForm[`${field}_en`] || ''}
                            onChange={(e) => handleFieldChange(`${field}_en`, e.target.value)}
                            placeholder={`${field} (English)`}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                            dir="ltr"
                          />
                        </div>
                      ) : (
                        // Admin view mode - show both languages with clear labels
                        <div className="space-y-1" data-admin-dual-language="true">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-purple-400">AR:</span>
                            <div className="text-sm text-white" dir="rtl">
                              {item[`${field}_ar`] || <span className="text-red-400">—</span>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-blue-400">EN:</span>
                            <div className="text-sm text-gray-300" dir="ltr">
                              {item[`${field}_en`] || <span className="text-red-400">—</span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    {editingItem === item.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={saveTranslation}
                          disabled={isSaving}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-sm transition-colors"
                        >
                          {isSaving ? <FaSync className="animate-spin" /> : <FaSave />}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(item)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                      >
                        <FaEdit />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // =================================================
  // MAIN RENDER
  // =================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <FaGlobe className="text-purple-400" />
            <span>
              {currentLanguage === 'ar' ? 'إدارة الترجمات' : 'Translation Management'}
            </span>
          </h2>
          <p className="text-gray-400 mt-1">
            {currentLanguage === 'ar' 
              ? 'تحرير الترجمات مباشرة مع المزامنة الفورية' 
              : 'Edit translations directly with real-time sync'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm ${
            bilingualTranslationService.isInitialized 
              ? 'bg-green-900 text-green-300' 
              : 'bg-red-900 text-red-300'
          }`}>
            {bilingualTranslationService.isInitialized 
              ? (currentLanguage === 'ar' ? 'متصل' : 'Connected')
              : (currentLanguage === 'ar' ? 'غير متصل' : 'Disconnected')
            }
          </div>
        </div>
      </div>

      {/* Table selector */}
      {renderTableSelector()}

      {/* Filters */}
      {renderFilters()}

      {/* Statistics */}
      {renderStats()}

      {/* Translation table */}
      {renderTranslationTable()}
    </div>
  );
};

export default AdminTranslationManagement; 