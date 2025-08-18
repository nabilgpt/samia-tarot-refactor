/**
 * ==========================================
 * SPREAD VISIBILITY MANAGER
 * ==========================================
 * Admin component for managing spread visibility (Public/Targeted)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, EyeOff, Users, Globe, Target, Settings, 
  Save, X, ChevronDown, ChevronUp, Search, Filter
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import useResponsive from '../../hooks/useResponsive';
import MobileCompactList from '../UI/MobileCompactList';
import { 
  getFormFieldClasses, 
  getLabelClasses, 
  getFlexContainerClasses,
  getSolidPanelClasses
} from '../../utils/rtlUtils';

const SpreadVisibilityManager = () => {
  const { currentLanguage, direction } = useLanguage();
  const { user } = useAuth();
  const { isMobile } = useResponsive();

  // State management
  const [spreads, setSpreads] = useState([]);
  const [readers, setReaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, public, targeted
  const [saving, setSaving] = useState(false);

  // Form state for visibility settings
  const [visibilityForm, setVisibilityForm] = useState({
    is_public: true,
    targeted_readers: []
  });

  // Load initial data
  useEffect(() => {
    loadSpreads();
    loadReaders();
  }, []);

  const loadSpreads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/spreads/visibility-report', {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load spreads');

      const data = await response.json();
      setSpreads(data.report.details || []);
    } catch (error) {
      console.error('Error loading spreads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReaders = async () => {
    try {
      const response = await fetch('/api/admin/users?role=reader&status=active', {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load readers');

      const data = await response.json();
      setReaders(data.data || []);
    } catch (error) {
      console.error('Error loading readers:', error);
    }
  };

  const openVisibilityModal = async (spread) => {
    try {
      setSelectedSpread(spread);
      
      // Load current visibility settings
      const response = await fetch(`/api/spreads/${spread.id}/visibility`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVisibilityForm({
          is_public: data.data.is_public,
          targeted_readers: data.data.targeted_readers || []
        });
      } else {
        // Default values for new visibility settings
        setVisibilityForm({
          is_public: true,
          targeted_readers: []
        });
      }

      setShowModal(true);
    } catch (error) {
      console.error('Error loading visibility settings:', error);
    }
  };

  const saveVisibilitySettings = async () => {
    if (!selectedSpread) return;

    try {
      setSaving(true);

      const response = await fetch(`/api/spreads/${selectedSpread.id}/visibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(visibilityForm)
      });

      if (!response.ok) throw new Error('Failed to save visibility settings');

      // Update local state
      setSpreads(prev => prev.map(spread => 
        spread.id === selectedSpread.id 
          ? {
              ...spread,
              visibility_type: visibilityForm.is_public ? 'public' : 'targeted',
              targeted_readers_count: visibilityForm.targeted_readers.length,
              targeted_readers: visibilityForm.targeted_readers
            }
          : spread
      ));

      setShowModal(false);
      setSelectedSpread(null);
    } catch (error) {
      console.error('Error saving visibility settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReaderToggle = (readerId) => {
    setVisibilityForm(prev => ({
      ...prev,
      targeted_readers: prev.targeted_readers.includes(readerId)
        ? prev.targeted_readers.filter(id => id !== readerId)
        : [...prev.targeted_readers, readerId]
    }));
  };

  // Filter spreads based on search and filter type
  const filteredSpreads = spreads.filter(spread => {
    const matchesSearch = spread.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
      (filterType === 'public' && spread.visibility_type === 'public') ||
      (filterType === 'targeted' && spread.visibility_type === 'targeted');
    
    return matchesSearch && matchesFilter;
  });

  const getVisibilityIcon = (visibilityType) => {
    switch (visibilityType) {
      case 'public': return Globe;
      case 'targeted': return Target;
      default: return Eye;
    }
  };

  const getVisibilityLabel = (visibilityType) => {
    switch (visibilityType) {
      case 'public': 
        return currentLanguage === 'ar' ? 'عام' : 'Public';
      case 'targeted': 
        return currentLanguage === 'ar' ? 'محدد' : 'Targeted';
      default: 
        return currentLanguage === 'ar' ? 'غير محدد' : 'Unset';
    }
  };

  const renderSpreadItem = (spread) => {
    const VisibilityIcon = getVisibilityIcon(spread.visibility_type);
    
    return (
      <div className="space-y-2">
        <div className={getFlexContainerClasses(direction)}>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-white truncate">
              {spread.name}
            </h3>
          </div>
          <div className={getFlexContainerClasses(direction, 'center')}>
            <VisibilityIcon className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400">
              {getVisibilityLabel(spread.visibility_type)}
            </span>
          </div>
        </div>
        
        {spread.visibility_type === 'targeted' && (
          <div className="text-xs text-gray-500">
            {currentLanguage === 'ar' 
              ? `${spread.targeted_readers_count} قارئ محدد`
              : `${spread.targeted_readers_count} targeted readers`
            }
          </div>
        )}
      </div>
    );
  };

  const VisibilityModal = () => (
    <AnimatePresence>
      {showModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          
          {/* Modal */}
          <motion.div
            className={`${getSolidPanelClasses(direction)} w-full max-w-2xl max-h-[90vh] overflow-hidden`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            dir={direction}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {currentLanguage === 'ar' ? 'إعدادات الرؤية' : 'Visibility Settings'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {selectedSpread && (
                <>
                  {/* Spread Info */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-medium text-white mb-2">
                      {selectedSpread.name}
                    </h3>
                    <div className="text-sm text-gray-400">
                      ID: {selectedSpread.id}
                    </div>
                  </div>

                  {/* Visibility Type */}
                  <div className="space-y-4">
                    <label className={getLabelClasses(direction)}>
                      {currentLanguage === 'ar' ? 'نوع الرؤية' : 'Visibility Type'}
                    </label>
                    
                    <div className="space-y-3">
                      <label className={getFlexContainerClasses(direction, 'center')}>
                        <input
                          type="radio"
                          name="visibility_type"
                          checked={visibilityForm.is_public}
                          onChange={() => setVisibilityForm(prev => ({ 
                            ...prev, 
                            is_public: true,
                            targeted_readers: []
                          }))}
                          className="w-4 h-4 text-purple-500"
                        />
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {currentLanguage === 'ar' ? 'عام - يمكن لجميع القراء الوصول' : 'Public - All readers can access'}
                        </span>
                      </label>

                      <label className={getFlexContainerClasses(direction, 'center')}>
                        <input
                          type="radio"
                          name="visibility_type"
                          checked={!visibilityForm.is_public}
                          onChange={() => setVisibilityForm(prev => ({ 
                            ...prev, 
                            is_public: false 
                          }))}
                          className="w-4 h-4 text-purple-500"
                        />
                        <Target className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {currentLanguage === 'ar' ? 'محدد - قراء مختارون فقط' : 'Targeted - Selected readers only'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Reader Selection */}
                  {!visibilityForm.is_public && (
                    <div className="space-y-4">
                      <label className={getLabelClasses(direction)}>
                        {currentLanguage === 'ar' ? 'اختر القراء' : 'Select Readers'}
                      </label>
                      
                      <div className="max-h-64 overflow-y-auto border border-gray-600 rounded-lg p-3 space-y-2">
                        {readers.map(reader => (
                          <label
                            key={reader.id}
                            className={`${getFlexContainerClasses(direction, 'center')} p-2 hover:bg-gray-700 rounded transition-colors cursor-pointer`}
                          >
                            <input
                              type="checkbox"
                              checked={visibilityForm.targeted_readers.includes(reader.id)}
                              onChange={() => handleReaderToggle(reader.id)}
                              className="w-4 h-4 text-purple-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white text-sm">
                                {reader.full_name || reader.email}
                              </div>
                              {reader.full_name && (
                                <div className="text-xs text-gray-400">
                                  {reader.email}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>

                      <div className="text-sm text-gray-400">
                        {currentLanguage === 'ar' 
                          ? `${visibilityForm.targeted_readers.length} قارئ محدد`
                          : `${visibilityForm.targeted_readers.length} readers selected`
                        }
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={saving}
              >
                {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={saveVisibilitySettings}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {currentLanguage === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          {currentLanguage === 'ar' ? 'إدارة رؤية الانتشارات' : 'Spread Visibility Management'}
        </h2>
        <div className={getFlexContainerClasses(direction, 'center')}>
          <span className="text-sm text-gray-400">
            {filteredSpreads.length} {currentLanguage === 'ar' ? 'انتشار' : 'spreads'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={currentLanguage === 'ar' ? 'بحث في الانتشارات...' : 'Search spreads...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${getFormFieldClasses(direction)} pl-10`}
            />
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={getFormFieldClasses(direction)}
          >
            <option value="all">
              {currentLanguage === 'ar' ? 'جميع الانتشارات' : 'All Spreads'}
            </option>
            <option value="public">
              {currentLanguage === 'ar' ? 'عام فقط' : 'Public Only'}
            </option>
            <option value="targeted">
              {currentLanguage === 'ar' ? 'محدد فقط' : 'Targeted Only'}
            </option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto" />
          <p className="mt-4 text-gray-400">
            {currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      )}

      {/* Spreads List */}
      {!loading && (
        <>
          {isMobile ? (
            <MobileCompactList
              items={filteredSpreads}
              onSettings={openVisibilityModal}
              renderItem={renderSpreadItem}
              extraActions={[
                {
                  icon: Settings,
                  label: currentLanguage === 'ar' ? 'إعدادات الرؤية' : 'Visibility Settings',
                  action: (spread) => openVisibilityModal(spread)
                }
              ]}
            />
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {currentLanguage === 'ar' ? 'الانتشار' : 'Spread'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {currentLanguage === 'ar' ? 'الرؤية' : 'Visibility'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {currentLanguage === 'ar' ? 'القراء المحددون' : 'Targeted Readers'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {currentLanguage === 'ar' ? 'إجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredSpreads.map((spread) => {
                      const VisibilityIcon = getVisibilityIcon(spread.visibility_type);
                      
                      return (
                        <tr key={spread.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">
                              {spread.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {spread.is_active ? 
                                (currentLanguage === 'ar' ? 'نشط' : 'Active') : 
                                (currentLanguage === 'ar' ? 'غير نشط' : 'Inactive')
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={getFlexContainerClasses(direction, 'center')}>
                              <VisibilityIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-300">
                                {getVisibilityLabel(spread.visibility_type)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-300">
                              {spread.visibility_type === 'targeted' 
                                ? spread.targeted_readers_count
                                : '—'
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => openVisibilityModal(spread)}
                              className="text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && filteredSpreads.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <EyeOff className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <p className="text-lg font-medium mb-2">
            {currentLanguage === 'ar' ? 'لا توجد انتشارات' : 'No spreads found'}
          </p>
          <p className="text-sm">
            {currentLanguage === 'ar' 
              ? 'جرب تغيير معايير البحث أو المرشح'
              : 'Try adjusting your search or filter criteria'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      <VisibilityModal />
    </div>
  );
};

export default SpreadVisibilityManager;