import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Save, Loader, Search, Check, UserPlus } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * ==========================================
 * SAMIA TAROT - ASSIGN DECK READERS MODAL
 * Manage reader assignments for decks
 * ==========================================
 */

const AssignDeckReadersModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  deckData, 
  readers = [], 
  loading = false 
}) => {
  const { currentLanguage } = useLanguage();
  
  // ===================================
  // STATE
  // ===================================
  const [selectedReaders, setSelectedReaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [initialAssignments, setInitialAssignments] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // ===================================
  // FILTERED READERS
  // ===================================
  const filteredReaders = readers.filter(reader => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      reader.name?.toLowerCase().includes(searchLower) ||
      reader.email?.toLowerCase().includes(searchLower) ||
      reader.phone?.toLowerCase().includes(searchLower)
    );
  });

  // ===================================
  // HELPERS
  // ===================================
  const isReaderSelected = (readerId) => {
    return selectedReaders.includes(readerId);
  };

  const getReaderInfo = (readerId) => {
    return readers.find(r => r.id === readerId);
  };

  const checkForChanges = (newSelections) => {
    const changed = newSelections.length !== initialAssignments.length ||
                   newSelections.some(id => !initialAssignments.includes(id)) ||
                   initialAssignments.some(id => !newSelections.includes(id));
    setHasChanges(changed);
  };

  // ===================================
  // EVENT HANDLERS
  // ===================================
  const handleReaderToggle = (readerId) => {
    const newSelections = isReaderSelected(readerId)
      ? selectedReaders.filter(id => id !== readerId)
      : [...selectedReaders, readerId];
    
    setSelectedReaders(newSelections);
    checkForChanges(newSelections);
  };

  const handleSelectAll = () => {
    const allReaderIds = filteredReaders.map(r => r.id);
    setSelectedReaders(allReaderIds);
    checkForChanges(allReaderIds);
  };

  const handleDeselectAll = () => {
    setSelectedReaders([]);
    checkForChanges([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasChanges) {
      console.log('⚠️ [AssignDeckReadersModal] No changes detected');
      onClose();
      return;
    }

    console.log('✅ [AssignDeckReadersModal] Submitting assignments:', {
      deckId: deckData.id,
      readerIds: selectedReaders
    });
    
    try {
      await onSave(deckData.id, selectedReaders);
      onClose();
    } catch (error) {
      console.error('💥 [AssignDeckReadersModal] Assignment failed:', error);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmMessage = currentLanguage === 'ar' ? 
        'هل أنت متأكد من الإغلاق؟ ستفقد التغييرات غير المحفوظة.' : 
        'Are you sure you want to close? You will lose unsaved changes.';
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }
    
    setSelectedReaders([]);
    setInitialAssignments([]);
    setSearchTerm('');
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setSelectedReaders([...initialAssignments]);
    setHasChanges(false);
  };

  // ===================================
  // EFFECTS
  // ===================================
  useEffect(() => {
    if (isOpen && deckData) {
      console.log('🔍 [AssignDeckReadersModal] Modal opened with deck:', deckData.id);
      
      // Get current assignments
      const currentAssignments = deckData.deck_assignments 
        ? deckData.deck_assignments
            .filter(assignment => assignment.is_active)
            .map(assignment => assignment.reader_id)
        : [];
      
      setSelectedReaders([...currentAssignments]);
      setInitialAssignments([...currentAssignments]);
      setHasChanges(false);
      setSearchTerm('');
    }
  }, [isOpen, deckData]);

  // Don't render if no deck data
  if (!deckData) {
    return null;
  }

  // ===================================
  // RENDER
  // ===================================
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          {/* Modal Container - Page-level scrolling */}
          <div className="fixed inset-4 top-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-auto max-w-6xl mx-auto min-h-[calc(100vh-32px)]"
              style={{ top: '0px' }}
            >
              <div className="w-full bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-8 border border-purple-500/20"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {currentLanguage === 'ar' ? 'تخصيص القراء للمجموعة' : 'Assign Readers to Deck'}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {currentLanguage === 'ar' 
                          ? `إدارة تخصيصات: ${deckData.name_ar || deckData.name}`
                          : `Managing assignments for: ${deckData.name}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <div className="flex items-center gap-1 text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">
                        <UserPlus className="w-3 h-3" />
                        {currentLanguage === 'ar' ? 'تغييرات غير محفوظة' : 'Unsaved changes'}
                      </div>
                    )}
                    <button
                      onClick={handleClose}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
              {/* Deck Info */}
              <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                <h3 className="font-semibold text-white mb-2">
                  {currentLanguage === 'ar' ? 'معلومات المجموعة' : 'Deck Information'}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">{currentLanguage === 'ar' ? 'الاسم:' : 'Name:'}</span>
                    <span className="ml-2 text-white">
                      {currentLanguage === 'ar' ? (deckData.name_ar || deckData.name) : deckData.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">{currentLanguage === 'ar' ? 'النوع:' : 'Type:'}</span>
                    <span className="ml-2 text-white">{deckData.deck_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{currentLanguage === 'ar' ? 'البطاقات:' : 'Cards:'}</span>
                    <span className="ml-2 text-white">{deckData.total_cards}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{currentLanguage === 'ar' ? 'مخصص حالياً:' : 'Currently Assigned:'}</span>
                    <span className="ml-2 text-blue-400 font-medium">{initialAssignments.length} readers</span>
                  </div>
                </div>
              </div>

              {/* Search & Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={currentLanguage === 'ar' ? 'البحث عن القراء...' : 'Search readers...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      disabled={loading}
                    >
                      {currentLanguage === 'ar' ? 'تحديد الكل' : 'Select All'}
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      disabled={loading}
                    >
                      {currentLanguage === 'ar' ? 'إلغاء الكل' : 'Clear All'}
                    </button>
                  </div>
                </div>

                {/* Selection Summary */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {currentLanguage === 'ar' 
                      ? `${filteredReaders.length} من ${readers.length} قارئ`
                      : `${filteredReaders.length} of ${readers.length} readers`
                    }
                  </span>
                  <span className="text-blue-400 font-medium">
                    {selectedReaders.length} {currentLanguage === 'ar' ? 'محدد' : 'selected'}
                  </span>
                </div>
              </div>

              {/* Readers List */}
              <div className="space-y-2">
                {filteredReaders.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">
                      {searchTerm ? 
                        (currentLanguage === 'ar' ? 'لا توجد نتائج بحث' : 'No search results') :
                        (currentLanguage === 'ar' ? 'لا يوجد قراء متاحون' : 'No readers available')
                      }
                    </p>
                  </div>
                ) : (
                  filteredReaders.map((reader) => (
                    <motion.div
                      key={reader.id}
                      layout
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isReaderSelected(reader.id)
                          ? 'bg-blue-600/20 border-blue-500/50'
                          : 'bg-dark-700/50 border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => handleReaderToggle(reader.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isReaderSelected(reader.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-400'
                          }`}>
                            {isReaderSelected(reader.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-white">
                              {reader.name || reader.email}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {reader.email}
                            </p>
                            {reader.phone && (
                              <p className="text-xs text-gray-500">
                                {reader.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Reader Status */}
                        <div className="flex flex-col items-end gap-1">
                          {reader.specializations && reader.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {reader.specializations.slice(0, 2).map((spec, index) => (
                                <span key={index} className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 rounded">
                                  {spec}
                                </span>
                              ))}
                              {reader.specializations.length > 2 && (
                                <span className="text-xs text-gray-400">
                                  +{reader.specializations.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <span className={`text-xs px-2 py-1 rounded ${
                            reader.is_active
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-red-600/20 text-red-400'
                          }`}>
                            {reader.is_active 
                              ? (currentLanguage === 'ar' ? 'نشط' : 'Active')
                              : (currentLanguage === 'ar' ? 'غير نشط' : 'Inactive')
                            }
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Current Assignments Info */}
              {initialAssignments.length > 0 && (
                <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                  <h4 className="font-medium text-blue-400 mb-2">
                    {currentLanguage === 'ar' ? 'التخصيصات الحالية' : 'Current Assignments'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {initialAssignments.map(readerId => {
                      const reader = getReaderInfo(readerId);
                      return reader ? (
                        <span key={readerId} className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded">
                          {reader.name || reader.email}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-purple-500/20">
                  <div className="flex items-center gap-3">
                    {hasChanges && (
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={loading}
                        className="px-4 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {currentLanguage === 'ar' ? 'إعادة تعيين' : 'Reset'}
                      </button>
                    )}
                    
                    <span className="text-sm text-gray-400">
                      {selectedReaders.length} {currentLanguage === 'ar' ? 'قارئ محدد' : 'readers selected'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClose}
                      disabled={loading}
                      className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !hasChanges}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          {currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {currentLanguage === 'ar' ? 'حفظ التخصيصات' : 'Save Assignments'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AssignDeckReadersModal; 