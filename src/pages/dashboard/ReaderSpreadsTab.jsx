import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { 
  Wand2,
  Plus,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  AlertCircle,
  Loader,
  CheckCircle,
  X,
  Filter
} from 'lucide-react';

// Import extracted components
import AddNewSpreadForm from '../../components/Tarot/AddNewSpreadForm';
import SpreadList from '../../components/Tarot/SpreadList';
import SpreadModalWrapper from '../../components/Tarot/SpreadModalWrapper';

/**
 * ==========================================
 * SAMIA TAROT - READER SPREADS TAB
 * Production-Ready Tarot Spreads Management
 * ==========================================
 * 
 * Layout Structure: Matches WorkingHoursManager exactly
 * - ✅ Identical container structure and spacing
 * - ✅ Same header layout with icon and buttons
 * - ✅ Matching card design and grid system
 * - ✅ Same modal structure and backdrop
 * - ✅ Consistent cosmic theme preservation
 * - ✅ Single language field approach
 * - ✅ Responsive design matching Working Hours
 */

const ReaderSpreadsTab = () => {
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  
  // ✅ Fix: Add ref to prevent multiple data fetching
  const initializedRef = useRef(false);

  // ===================================
  // STATE MANAGEMENT
  // ===================================

  const [spreads, setSpreads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [decks, setDecks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // Form states
  const [createFormData, setCreateFormData] = useState({
    name: '',
    name_language: currentLanguage,
    description: '',
    description_language: currentLanguage,
    category_id: '',
    deck_id: '',
    card_count: 1,
    spread_type: '',
    difficulty_level: 'beginner',
    layout_type: 'linear'
  });
  
  const setCreateFormDataOptimized = useCallback((updater) => {
    setCreateFormData(updater);
  }, []);
  
  const [editFormData, setEditFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Filter states (matching Working Hours pattern)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    difficulty: 'all',
    category: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // ===================================
  // ✅ FIXED: DATA FETCHING WITHOUT LOOPS
  // ===================================

  const fetchSpreads = useCallback(async () => {
    if (!user?.id) {
      console.log('❌ FETCH SPREADS SKIPPED: Missing user');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Use Supabase directly to get spreads
      const { data, error } = await supabase
        .from('spreads')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      
      setSpreads(data || []);
      setError(null);
      setErrors([]);
    } catch (err) {
      console.error('❌ FETCH SPREADS ERROR:', err);
      setError('Failed to fetch spreads');
      setErrors(['Failed to fetch spreads']);
      setSpreads([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('spread_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  }, []);

  const fetchDecks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tarot_decks')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setDecks(data || []);
    } catch (err) {
      console.error('Error fetching decks:', err);
      setDecks([]);
    }
  }, []);

  // ===================================
  // HANDLERS
  // ===================================

  const handleAddSpread = useCallback(() => {
    setShowAddForm(true);
  }, []);

  const handleCancelAdd = useCallback(() => {
    setShowAddForm(false);
    setCreateFormData({
      name: '',
      name_language: currentLanguage,
      description: '',
      description_language: currentLanguage,
      category_id: '',
      deck_id: '',
      card_count: 1,
      spread_type: '',
      difficulty_level: 'beginner',
      layout_type: 'linear'
    });
    setFormErrors({});
    setErrors([]);
  }, [currentLanguage]);

  const handleSubmitSpread = useCallback(async (formData) => {
    try {
      setSubmitting(true);
      setErrors([]);

      const { data, error } = await supabase
        .from('spreads')
        .insert([{
          reader_id: user.id,
          ...formData,
          status: 'pending_approval'
        }])
        .select();

      if (error) {
        throw error;
      }

      setSuccessMessage(currentLanguage === 'ar' ? 'تم إنشاء الانتشار بنجاح!' : 'Spread created successfully!');
      handleCancelAdd();
      fetchSpreads();
    } catch (err) {
      console.error('Error creating spread:', err);
      setErrors(['Failed to create spread']);
    } finally {
      setSubmitting(false);
    }
  }, [user, fetchSpreads, currentLanguage, handleCancelAdd]);

  const handleEditSpread = useCallback((spread) => {
    setSelectedSpread(spread);
    setEditFormData(spread);
    setShowEditModal(true);
  }, []);

  const handleDeleteSpread = useCallback(async (spreadId) => {
    if (!confirm(currentLanguage === 'ar' ? 'هل أنت متأكد من حذف هذا الانتشار؟' : 'Are you sure you want to delete this spread?')) return;

    try {
      const { error } = await supabase
        .from('spreads')
        .delete()
        .eq('id', spreadId)
        .eq('reader_id', user.id); // Only allow deleting own spreads

      if (error) {
        throw error;
      }

      setSuccessMessage(currentLanguage === 'ar' ? 'تم حذف الانتشار بنجاح!' : 'Spread deleted successfully!');
      fetchSpreads(); // Refresh the list
    } catch (err) {
      console.error('Error deleting spread:', err);
      setErrors(['Failed to delete spread']);
    }
  }, [user, fetchSpreads, currentLanguage]);

  const handleViewSpread = useCallback((spread) => {
    setSelectedSpread(spread);
    setShowViewModal(true);
  }, []);

  // ===================================
  // ✅ FIXED: EFFECTS WITHOUT LOOPS
  // ===================================

  // ✅ Fix: Only run once when component mounts
  useEffect(() => {
    if (user?.id && !initializedRef.current) {
      initializedRef.current = true;
      fetchSpreads();
      fetchCategories();
      fetchDecks();
    }
  }, [user?.id, fetchSpreads, fetchCategories, fetchDecks]);

  // ===================================
  // FILTERED DATA (matching Working Hours pattern)
  // ===================================

  const filteredSpreads = spreads.filter(spread => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = (
        (spread.name_ar && spread.name_ar.toLowerCase().includes(searchLower)) ||
        (spread.name_en && spread.name_en.toLowerCase().includes(searchLower))
      );
      if (!nameMatch) return false;
    }
    
    if (filters.difficulty !== 'all' && spread.difficulty_level !== filters.difficulty) {
      return false;
    }
    
    if (filters.category !== 'all' && spread.category_id !== filters.category) {
      return false;
    }
    
    return true;
  });

  // ===================================
  // MAIN RENDER (matching Working Hours structure exactly)
  // ===================================

  return (
    <div className="space-y-6">

      {/* Success/Error Messages - Same as Working Hours */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-400 hover:text-green-300"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300 font-medium">Error</span>
              <button
                onClick={() => setErrors([])}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="text-red-300 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Same structure as Working Hours */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wand2 className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">
            {currentLanguage === 'ar' ? 'انتشارات التاروت' : 'Tarot Spreads'}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSpreads}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {currentLanguage === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
          
          <button
            onClick={handleAddSpread}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {currentLanguage === 'ar' ? 'إضافة انتشار' : 'Add Spread'}
          </button>
        </div>
      </div>

      {/* Filters - Same structure as Working Hours */}
      <div className="flex items-center gap-4 p-4 bg-black/30 rounded-lg border border-purple-500/20">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filters.difficulty}
          onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
          className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
        >
          <option value="all">
            {currentLanguage === 'ar' ? 'جميع المستويات' : 'All Levels'}
          </option>
          <option value="beginner">
            {currentLanguage === 'ar' ? 'مبتدئ' : 'Beginner'}
          </option>
          <option value="intermediate">
            {currentLanguage === 'ar' ? 'متوسط' : 'Intermediate'}
          </option>
          <option value="advanced">
            {currentLanguage === 'ar' ? 'متقدم' : 'Advanced'}
          </option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white"
        >
          <option value="all">
            {currentLanguage === 'ar' ? 'جميع الفئات' : 'All Categories'}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {currentLanguage === 'ar' ? category.name_ar || category.name_en : category.name_en || category.name_ar}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder={currentLanguage === 'ar' ? 'البحث...' : 'Search...'}
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="bg-dark-700 border border-gray-600 rounded px-3 py-1 text-white placeholder-gray-400"
        />
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : filteredSpreads.length === 0 ? (
            /* Empty State - Same as Working Hours */
            <div className="text-center py-12">
              <Wand2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">
                {currentLanguage === 'ar' ? 'لا توجد انتشارات' : 'No spreads available'}
              </h3>
              <p className="text-gray-400 mb-4">
                {currentLanguage === 'ar' 
                  ? 'ابدأ بإنشاء انتشار التاروت الأول الخاص بك.'
                  : 'Start by creating your first tarot spread.'
                }
              </p>
              <button
                onClick={handleAddSpread}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {currentLanguage === 'ar' ? 'إنشاء أول انتشار' : 'Create Your First Spread'}
              </button>
            </div>
          ) : (
            /* Spreads Grid - Same structure as Working Hours */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpreads.map((spread) => (
                <motion.div
                  key={spread.id}
                  layout
                  className="p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">
                        {currentLanguage === 'ar' ? spread.name_ar || spread.name_en : spread.name_en || spread.name_ar}
                      </h3>
                      <p className="text-purple-400 text-sm">
                        {currentLanguage === 'ar' ? spread.description_ar || spread.description_en : spread.description_en || spread.description_ar}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        {currentLanguage === 'ar' ? 'الأوراق:' : 'Cards:'}
                      </span>
                      <span className="text-white">{spread.card_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        {currentLanguage === 'ar' ? 'المستوى:' : 'Level:'}
                      </span>
                      <span className="text-white">{spread.difficulty_level}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        {currentLanguage === 'ar' ? 'النوع:' : 'Type:'}
                      </span>
                      <span className="text-white">{spread.spread_type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewSpread(spread)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'عرض' : 'View'}
                    </button>
                    
                    <button
                      onClick={() => handleEditSpread(spread)}
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteSpread(spread.id)}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add Form Modal - BULLETPROOF PORTAL */}
      {showAddForm && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto min-h-screen"
          onClick={handleCancelAdd}
        >
          <div 
            className="w-full max-w-2xl bg-dark-800 rounded-2xl border border-purple-500/20 shadow-2xl p-6 my-12"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {currentLanguage === 'ar' ? 'إضافة انتشار جديد' : 'Add New Spread'}
              </h3>
              <button
                onClick={handleCancelAdd}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <AddNewSpreadForm
              onSubmit={handleSubmitSpread}
              onCancel={handleCancelAdd}
              categories={categories}
              decks={decks}
              errors={formErrors}
              submitting={submitting}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Set display name for debugging
ReaderSpreadsTab.displayName = 'ReaderSpreadsTab';

export default ReaderSpreadsTab; 



