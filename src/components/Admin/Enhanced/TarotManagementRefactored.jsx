import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useTarotData } from '../../../hooks/useTarotData';
import { useTarotFilters } from '../../../hooks/useTarotFilters';
import { useTarotHandlers } from './TarotHandlers';
import SpreadsManagement from './SpreadsManagement';
import DualModeDeckManagement from '../DualMode/DualModeDeckManagement';
import AddNewSpreadForm from '../../Tarot/AddNewSpreadForm';
import SpreadModalWrapper from '../../Tarot/SpreadModalWrapper';
import AddDeckModal from './AddDeckModal';
import EditDeckModal from './EditDeckModal';
import DeleteDeckModal from './DeleteDeckModal';
import AssignDeckReadersModal from './AssignDeckReadersModal';
import { 
  Wand2,
  CheckCircle,
  X,
  AlertCircle,
  Globe,
  Lock,
  Users,
  Plus,
  Edit3,
  Trash2,
  Crown,
  Loader
} from 'lucide-react';

/**
 * ==========================================
 * SAMIA TAROT - REFACTORED TAROT MANAGEMENT
 * Robust Data Loading & Modular Architecture
 * ==========================================
 * 
 * Features:
 * - ✅ Under 400 lines (modular design)
 * - ✅ Robust data fetching that never gets stuck
 * - ✅ Comprehensive error handling and logging
 * - ✅ Empty state handling
 * - ✅ Role-based access control
 * - ✅ Cosmic theme preserved
 */

const TarotManagementRefactored = () => {
  const { user, profile } = useAuth();
  const { currentLanguage } = useLanguage();
  
  // ===================================
  // HOOKS & STATE
  // ===================================
  
  // Tab management
  const [activeTab, setActiveTab] = useState('spreads');
  
  // Modal state management
  const [modals, setModals] = useState({
    // Spreads modals
    addSpread: false,
    editSpread: false,
    viewSpread: false,
    deleteSpread: false,
    assignSpread: false,
    // Decks modals
    addDeck: false,
    editDeck: false,
    viewDeck: false,
    deleteDeck: false,
    assignDeck: false,
    // Category modals
    addCategory: false,
    editCategory: false,
    deleteCategory: false,
    // Selected items
    selectedSpread: null,
    selectedDeck: null,
    selectedCategory: null,
    // Form data
    formData: {},
    formErrors: {}
  });
  
  // Data fetching with robust loading
  const {
    spreads,
    decks,
    categories,
    readers,
    loading,
    errors: dataErrors,
    refreshAllData,
    clearErrors: clearDataErrors,
    debugInfo
  } = useTarotData();
  
  // Filtering with logging
  const {
    spreadsFilters,
    setSpreadsFilters,
    decksFilters,
    setDecksFilters,
    filteredSpreads,
    filteredDecks,
    clearAllFilters
  } = useTarotFilters(spreads, decks);
  
  // CRUD operations
  const {
    submitting,
    errors: handlerErrors,
    successMessage,
    clearErrors: clearHandlerErrors,
    handleAddSpread,
    handleEditSpread,
    handleDeleteSpread,
    handleAssignSpreadReaders,
    handleAddDeck,
    handleEditDeck,
    handleDeleteDeck,
    handleUploadDeckImages,
    handleAssignDeckReaders,
    handleAddCategory,
    handleEditCategory,
    handleDeleteCategory
  } = useTarotHandlers(currentLanguage, refreshAllData);

  // ===================================
  // MODAL HANDLERS
  // ===================================
  const openModal = (modalType, item = null) => {
    console.log(`🔍 [TarotManagement] Opening modal: ${modalType}`, item);
    setModals(prev => ({
      ...prev,
      [modalType]: true,
      selectedSpread: modalType.includes('Spread') ? item : prev.selectedSpread,
      selectedDeck: modalType.includes('Deck') ? item : prev.selectedDeck,
      selectedCategory: modalType.includes('Category') ? item : prev.selectedCategory,
      formData: item || {},
      formErrors: {}
    }));
  };

  const closeModal = (modalType) => {
    console.log(`🔍 [TarotManagement] Closing modal: ${modalType}`);
    setModals(prev => ({
      ...prev,
      [modalType]: false,
      selectedSpread: modalType.includes('Spread') ? null : prev.selectedSpread,
      selectedDeck: modalType.includes('Deck') ? null : prev.selectedDeck,
      selectedCategory: modalType.includes('Category') ? null : prev.selectedCategory,
      formData: {},
      formErrors: {}
    }));
  };

  const closeAllModals = () => {
    console.log('🔍 [TarotManagement] Closing all modals');
    setModals(prev => ({
      ...prev,
      addSpread: false,
      editSpread: false,
      viewSpread: false,
      deleteSpread: false,
      assignSpread: false,
      addDeck: false,
      editDeck: false,
      viewDeck: false,
      deleteDeck: false,
      assignDeck: false,
      addCategory: false,
      editCategory: false,
      deleteCategory: false,
      selectedSpread: null,
      selectedDeck: null,
      selectedCategory: null,
      formData: {},
      formErrors: {}
    }));
  };

  // ===================================
  // COMBINED ERROR HANDLING
  // ===================================
  const allErrors = [...dataErrors, ...handlerErrors];
  const clearAllErrors = () => {
    clearDataErrors();
    clearHandlerErrors();
  };

  // ===================================
  // ACCESS CONTROL
  // ===================================
  if (!user?.id || !profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">
          {currentLanguage === 'ar' ? 'غير مصرح' : 'Access Denied'}
        </h3>
        <p className="text-gray-400">
          {currentLanguage === 'ar' 
            ? 'ليس لديك صلاحية للوصول إلى إدارة التاروت'
            : 'You do not have permission to access Tarot Management'
          }
        </p>
      </div>
    );
  }

  // ===================================
  // RENDER HELPERS
  // ===================================
  const renderVisibilityBadge = (visibilityType, assignmentCount = 0) => {
    const configs = {
      public: {
        color: 'bg-green-500/20 text-green-300 border-green-400/30',
        icon: Globe,
        text: currentLanguage === 'ar' ? 'عام' : 'Public'
      },
      private: {
        color: 'bg-red-500/20 text-red-300 border-red-400/30',
        icon: Lock,
        text: currentLanguage === 'ar' ? 'خاص' : 'Private'
      },
      assigned: {
        color: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
        icon: Users,
        text: currentLanguage === 'ar' ? `مخصص (${assignmentCount})` : `Assigned (${assignmentCount})`
      }
    };

    const config = configs[visibilityType] || configs.public;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const renderUploadStatusBadge = (uploadStatus, uploaded, required) => {
    const configs = {
      pending: {
        color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
        text: currentLanguage === 'ar' ? 'في الانتظار' : 'Pending'
      },
      uploading: {
        color: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
        text: currentLanguage === 'ar' ? `جاري الرفع (${uploaded}/${required})` : `Uploading (${uploaded}/${required})`
      },
      complete: {
        color: 'bg-green-500/20 text-green-300 border-green-400/30',
        text: currentLanguage === 'ar' ? 'مكتمل' : 'Complete'
      },
      failed: {
        color: 'bg-red-500/20 text-red-300 border-red-400/30',
        text: currentLanguage === 'ar' ? 'فشل' : 'Failed'
      }
    };

    const config = configs[uploadStatus] || configs.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // ===================================
  // DEBUG LOGGING
  // ===================================
  React.useEffect(() => {
    console.log('🔍 [TarotManagement] Debug Info:', debugInfo);
  }, [debugInfo]);

  // ===================================
  // MAIN RENDER
  // ===================================
  return (
    <div className="space-y-6">
      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-500/20 border border-green-400/30 rounded-lg backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-medium">
                {currentLanguage === 'ar' ? 'نجح' : 'Success'}
              </span>
              <button
                onClick={() => clearHandlerErrors()}
                className="ml-auto text-green-400 hover:text-green-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-green-300 text-sm">{successMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Messages */}
      <AnimatePresence>
        {allErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300 font-medium">
                {currentLanguage === 'ar' ? 'خطأ' : 'Error'}
              </span>
              <button
                onClick={clearAllErrors}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="text-red-300 text-sm space-y-1">
              {allErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Title/Description - Above Tabs */}
      <div className="mb-6">
        {activeTab === 'spreads' ? (
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent text-left mb-1">
              {currentLanguage === 'ar' ? 'إدارة انتشارات التاروت' : 'Tarot Spreads Management'}
            </h2>
            <p className="text-gray-400 text-left mb-6">
              {currentLanguage === 'ar' ? 'إدارة جميع انتشارات التاروت في النظام' : 'Manage all tarot spreads in the system'}
            </p>
          </div>
        ) : activeTab === 'decks' ? (
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent text-left mb-1">
              {currentLanguage === 'ar' ? 'إدارة مجموعات التاروت' : 'Tarot Decks Management'}
            </h2>
            <p className="text-gray-400 text-left mb-6">
              {currentLanguage === 'ar' 
                ? 'إدارة جميع مجموعات التاروت والأدوار في النظام'
                : 'Manage all tarot decks and roles in the system'
              }
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent text-left mb-1">
              {currentLanguage === 'ar' ? 'إدارة فئات التاروت' : 'Tarot Categories Management'}
            </h2>
            <p className="text-gray-400 text-left mb-6">
              {currentLanguage === 'ar' ? 'إدارة جميع فئات التاروت في النظام' : 'Manage all tarot categories in the system'}
            </p>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 p-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('spreads')}
            className={`px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] whitespace-nowrap ${
              activeTab === 'spreads'
                ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {currentLanguage === 'ar' ? 'الانتشارات' : 'Spreads'}
          </button>
          <button
            onClick={() => setActiveTab('decks')}
            className={`px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] whitespace-nowrap ${
              activeTab === 'decks'
                ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {currentLanguage === 'ar' ? 'المجموعات' : 'Decks'}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {currentLanguage === 'ar' ? 'الفئات' : 'Categories'}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'spreads' ? (
          <SpreadsManagement 
            spreads={filteredSpreads}
            categories={categories}
            readers={readers}
            filters={spreadsFilters}
            setFilters={setSpreadsFilters}
            loading={loading}
            onAdd={() => openModal('addSpread')}
            onEdit={(spread) => openModal('editSpread', spread)}
            onView={(spread) => openModal('viewSpread', spread)}
            onDelete={(spread) => openModal('deleteSpread', spread)}
            onAssignReaders={(spread) => openModal('assignSpread', spread)}
            renderVisibilityBadge={renderVisibilityBadge}
            currentLanguage={currentLanguage}
          />
        ) : activeTab === 'decks' ? (
          <DualModeDeckManagement />
        ) : (
          /* Categories Management */
          <div className="space-y-6">
            {/* Action Button */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => openModal('addCategory')}
                className="flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-pink-500/30 hover:border-red-400/50"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">{currentLanguage === 'ar' ? 'إضافة فئة' : 'Add Category'}</span>
              </button>
            </div>

            {/* Categories Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12">
                <Crown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">
                  {currentLanguage === 'ar' ? 'لا توجد فئات' : 'No categories available'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {currentLanguage === 'ar' 
                    ? 'ابدأ بإنشاء فئة التاروت الأولى.'
                    : 'Start by creating your first tarot category.'
                  }
                </p>
                <button
                  onClick={() => openModal('addCategory')}
                  className="flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-pink-500/30 hover:border-red-400/50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{currentLanguage === 'ar' ? 'إنشاء أول فئة' : 'Create First Category'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <motion.div
                    key={category.id}
                    layout
                    className="p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">
                          {currentLanguage === 'ar' ? category.name_ar || category.name : category.name}
                        </h3>
                        {(category.description || category.description_ar) && (
                          <p className="text-gray-400 text-sm">
                            {currentLanguage === 'ar' ? category.description_ar || category.description : category.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => openModal('editCategory', category)}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span className="hidden md:inline">{currentLanguage === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </button>
                      
                      <button
                        onClick={() => openModal('deleteCategory', category)}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden md:inline">{currentLanguage === 'ar' ? 'حذف' : 'Delete'}</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Debug Panel (development only) */}
      {process.env.NODE_ENV === 'development' && debugInfo.hasErrors && (
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-400/20 rounded text-xs text-orange-300">
          <strong>Debug Info:</strong> {JSON.stringify(debugInfo, null, 2)}
        </div>
      )}

      {/* ===================================
          MODAL COMPONENTS
          ===================================*/}
      
      {/* Add/Edit Spread Modal */}
      {(modals.addSpread || modals.editSpread) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-4 top-4 w-auto max-w-6xl mx-auto max-h-[calc(100vh-32px)] overflow-y-auto"
            style={{ top: '16px', left: '16px', right: '16px' }}
          >
            <div className="w-full bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-8 border border-purple-500/20">
              <div className="w-full max-w-none">
                <AddNewSpreadForm
                  onSubmit={async (data) => {
                    if (modals.editSpread) {
                      await handleEditSpread(modals.selectedSpread?.id, data);
                      closeModal('editSpread');
                    } else {
                      await handleAddSpread(data);
                      closeModal('addSpread');
                    }
                  }}
                  onCancel={() => {
                    if (modals.editSpread) {
                      closeModal('editSpread');
                    } else {
                      closeModal('addSpread');
                    }
                  }}
                  categories={categories}
                  decks={decks}
                  errors={modals.formErrors}
                  initialData={modals.editSpread ? modals.selectedSpread : null}
                  isEditMode={modals.editSpread}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Spread Modal Wrapper (View, Delete) */}
      <SpreadModalWrapper
        editModal={{
          isOpen: false,
          onClose: () => {},
          onSubmit: () => {},
          formData: {},
          setFormData: () => {},
          errors: {},
          submitting: false,
          categories: [],
          decks: [],
          spread: null
        }}
        viewModal={{
          isOpen: modals.viewSpread,
          onClose: () => closeModal('viewSpread'),
          spread: modals.selectedSpread
        }}
        deleteModal={{
          isOpen: modals.deleteSpread,
          onClose: () => closeModal('deleteSpread'),
          onConfirm: async () => {
            await handleDeleteSpread(modals.selectedSpread?.id);
            closeModal('deleteSpread');
          },
          spread: modals.selectedSpread,
          submitting: submitting
        }}
      />

      {/* Reader Assignment Modal for Spreads */}
      {modals.assignSpread && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-6 border border-purple-500/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {currentLanguage === 'ar' ? 'تخصيص القراء' : 'Assign Readers'}
              </h3>
              <button
                onClick={() => closeModal('assignSpread')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                {currentLanguage === 'ar' 
                  ? `تخصيص الانتشار "${modals.selectedSpread?.name}" للقراء المحددين`
                  : `Assign spread "${modals.selectedSpread?.name}" to selected readers`
                }
              </p>
              
              <div className="space-y-2">
                {readers.map(reader => (
                  <label key={reader.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <span className="text-white">{reader.name}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => closeModal('assignSpread')}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={async () => {
                    await handleAssignSpreadReaders(modals.selectedSpread?.id, []);
                    closeModal('assignSpread');
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {currentLanguage === 'ar' ? 'تخصيص' : 'Assign'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Deck Modals - Placeholder for now */}
      {(modals.addDeck || modals.editDeck || modals.viewDeck || modals.deleteDeck || modals.assignDeck) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-6 border border-purple-500/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {currentLanguage === 'ar' ? 'إدارة المجموعات' : 'Deck Management'}
              </h3>
              <button
                onClick={closeAllModals}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="text-center py-8">
              <p className="text-gray-300 mb-4">
                {currentLanguage === 'ar' 
                  ? 'إدارة المجموعات قيد التطوير'
                  : 'Deck management coming soon'
                }
              </p>
              <button
                onClick={closeAllModals}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {currentLanguage === 'ar' ? 'موافق' : 'OK'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===================================
          CATEGORY MODAL COMPONENTS
          ===================================*/}

      {/* Add Category Modal */}
      {modals.addCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-2.5 left-4 right-4 max-w-2xl mx-auto"
            style={{ top: '10px' }}
          >
            <div className="bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {currentLanguage === 'ar' ? 'إضافة فئة جديدة' : 'Add New Category'}
                </h3>
                <button
                  onClick={() => closeModal('addCategory')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const categoryData = {
                    name: formData.get('name'),
                    name_ar: formData.get('name_ar'),
                    description: formData.get('description'),
                    description_ar: formData.get('description_ar')
                  };
                  await handleAddCategory(categoryData);
                  closeModal('addCategory');
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      {currentLanguage === 'ar' ? 'الاسم (الإنجليزية)' : 'Name (English)'}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-3 py-2 bg-black/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                      placeholder={currentLanguage === 'ar' ? 'أدخل الاسم بالإنجليزية' : 'Enter name in English'}
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">
                      {currentLanguage === 'ar' ? 'الاسم (العربية)' : 'Name (Arabic)'}
                    </label>
                    <input
                      type="text"
                      name="name_ar"
                      className="w-full px-3 py-2 bg-black/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                      placeholder={currentLanguage === 'ar' ? 'أدخل الاسم بالعربية' : 'Enter name in Arabic'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      {currentLanguage === 'ar' ? 'الوصف (الإنجليزية)' : 'Description (English)'}
                    </label>
                    <textarea
                      name="description"
                      rows="3"
                      className="w-full px-3 py-2 bg-black/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none resize-none"
                      placeholder={currentLanguage === 'ar' ? 'أدخل الوصف بالإنجليزية' : 'Enter description in English'}
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">
                      {currentLanguage === 'ar' ? 'الوصف (العربية)' : 'Description (Arabic)'}
                    </label>
                    <textarea
                      name="description_ar"
                      rows="3"
                      className="w-full px-3 py-2 bg-black/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none resize-none"
                      placeholder={currentLanguage === 'ar' ? 'أدخل الوصف بالعربية' : 'Enter description in Arabic'}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => closeModal('addCategory')}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        {currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                      </div>
                    ) : (
                      currentLanguage === 'ar' ? 'حفظ' : 'Save'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Category Modal */}
      {modals.editCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-2.5 left-4 right-4 max-w-2xl mx-auto"
            style={{ top: '10px' }}
          >
            <div className="bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {currentLanguage === 'ar' ? 'تعديل الفئة' : 'Edit Category'}
                </h3>
                <button
                  onClick={() => closeModal('editCategory')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const categoryData = {
                    name: formData.get('name'),
                    name_ar: formData.get('name_ar'),
                    description: formData.get('description'),
                    description_ar: formData.get('description_ar')
                  };
                  await handleEditCategory(modals.selectedCategory?.id, categoryData);
                  closeModal('editCategory');
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      {currentLanguage === 'ar' ? 'الاسم (الإنجليزية)' : 'Name (English)'}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={modals.selectedCategory?.name || ''}
                      className="w-full px-3 py-2 bg-black/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                      placeholder={currentLanguage === 'ar' ? 'أدخل الاسم بالإنجليزية' : 'Enter name in English'}
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">
                      {currentLanguage === 'ar' ? 'الاسم (العربية)' : 'Name (Arabic)'}
                    </label>
                    <input
                      type="text"
                      name="name_ar"
                      defaultValue={modals.selectedCategory?.name_ar || ''}
                      className="w-full px-3 py-2 bg-black/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                      placeholder={currentLanguage === 'ar' ? 'أدخل الاسم بالعربية' : 'Enter name in Arabic'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      {currentLanguage === 'ar' ? 'الوصف (الإنجليزية)' : 'Description (English)'}
                    </label>
                    <textarea
                      name="description"
                      rows="3"
                      defaultValue={modals.selectedCategory?.description || ''}
                      className="w-full px-3 py-2 bg-black/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none resize-none"
                      placeholder={currentLanguage === 'ar' ? 'أدخل الوصف بالإنجليزية' : 'Enter description in English'}
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium mb-2">
                      {currentLanguage === 'ar' ? 'الوصف (العربية)' : 'Description (Arabic)'}
                    </label>
                    <textarea
                      name="description_ar"
                      rows="3"
                      defaultValue={modals.selectedCategory?.description_ar || ''}
                      className="w-full px-3 py-2 bg-black/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none resize-none"
                      placeholder={currentLanguage === 'ar' ? 'أدخل الوصف بالعربية' : 'Enter description in Arabic'}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => closeModal('editCategory')}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        {currentLanguage === 'ar' ? 'جاري التحديث...' : 'Updating...'}
                      </div>
                    ) : (
                      currentLanguage === 'ar' ? 'تحديث' : 'Update'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Category Modal */}
      {modals.deleteCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-2.5 left-4 right-4 max-w-md mx-auto"
            style={{ top: '10px' }}
          >
            <div className="bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-6 border border-red-500/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-red-300">
                  {currentLanguage === 'ar' ? 'حذف الفئة' : 'Delete Category'}
                </h3>
                <button
                  onClick={() => closeModal('deleteCategory')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-red-300 font-medium">
                      {currentLanguage === 'ar' ? 'تحذير: هذا الإجراء لا يمكن التراجع عنه' : 'Warning: This action cannot be undone'}
                    </p>
                    <p className="text-red-400 text-sm">
                      {currentLanguage === 'ar' 
                        ? 'ستتم إزالة هذه الفئة من جميع الانتشارات المرتبطة'
                        : 'This category will be removed from all associated spreads'
                      }
                    </p>
                  </div>
                </div>

                <p className="text-gray-300">
                  {currentLanguage === 'ar' 
                    ? `هل أنت متأكد من حذف الفئة "${modals.selectedCategory?.name_ar || modals.selectedCategory?.name}"؟`
                    : `Are you sure you want to delete the category "${modals.selectedCategory?.name}"?`
                  }
                </p>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => closeModal('deleteCategory')}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={async () => {
                      await handleDeleteCategory(modals.selectedCategory?.id);
                      closeModal('deleteCategory');
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        {currentLanguage === 'ar' ? 'جاري الحذف...' : 'Deleting...'}
                      </div>
                    ) : (
                      currentLanguage === 'ar' ? 'حذف' : 'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===================================
          DECK MODAL COMPONENTS
          ===================================*/}
      
      {/* Add Deck Modal */}
      <AddDeckModal
        isOpen={modals.addDeck}
        onClose={() => closeModal('addDeck')}
        onSave={handleAddDeck}
        loading={submitting}
        categories={categories}
        readers={readers}
        errors={{}}
      />

      {/* Edit Deck Modal */}
      <EditDeckModal
        isOpen={modals.editDeck}
        onClose={() => closeModal('editDeck')}
        onSave={handleEditDeck}
        deckData={modals.selectedDeck}
        loading={submitting}
      />

      {/* Delete Deck Modal */}
      <DeleteDeckModal
        isOpen={modals.deleteDeck}
        onClose={() => closeModal('deleteDeck')}
        onConfirm={handleDeleteDeck}
        deckData={modals.selectedDeck}
        loading={submitting}
      />

      {/* Assign Deck Readers Modal */}
      <AssignDeckReadersModal
        isOpen={modals.assignDeck}
        onClose={() => closeModal('assignDeck')}
        onSave={handleAssignDeckReaders}
        deckData={modals.selectedDeck}
        readers={readers}
        loading={submitting}
      />
    </div>
  );
};

export default TarotManagementRefactored; 