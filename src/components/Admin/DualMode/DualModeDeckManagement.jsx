import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';
import { deckDataService } from '../../../services/deckDataService';
import { GenericDataAdapter } from '../Generic/GenericDataAdapter';
import GenericDataTable from '../Generic/GenericDataTable';
import GenericDataCards from '../Generic/GenericDataCards';
import ViewToggle, { useViewToggle, EnhancedViewToggle } from '../Generic/ViewToggle';
import AddDeckModal from '../Enhanced/AddDeckModal';
import EditDeckModal from '../Enhanced/EditDeckModal';
import ViewDeckModal from '../Enhanced/ViewDeckModal';
import AssignDeckReadersModal from '../Enhanced/AssignDeckReadersModal';
import DeleteDeckModal from '../Enhanced/DeleteDeckModal';
import api from '../../../services/frontendApi';
import {
  PlusIcon,
  StarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  Rows3,
  LayoutGrid
} from 'lucide-react';

/**
 * DUAL MODE DECK MANAGEMENT - SAMIA TAROT
 * Comprehensive deck management with toggle between table and card views
 * Reuses User Management components with perfect consistency
 */

const DualModeDeckManagement = ({ className = '' }) => {

  const { currentLanguage } = useLanguage();
  const { viewMode, setViewMode, isTableView, isCardsView } = useViewToggle('deck', 'cards');

  // Component state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Categories and readers state for AddDeckModal
  const [categories, setCategories] = useState([]);
  const [readers, setReaders] = useState([]);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState(null);
  
  // Filter panel visibility state
  const [showFilters, setShowFilters] = useState(false);

  // ===================================
  // ADD DECK FORM STATE - MOVED FROM AddNewDeckForm
  // ===================================
  const [addDeckFormData, setAddDeckFormData] = useState({
    // Basic Information
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    category_id: '',
    deck_type: 'Rider-Waite',
    total_cards: 78,
    
    // Images
    deck_image_url: '',
    card_back_image_url: '',
    
    // Status & Settings
    visibility_type: 'public',
    status: 'draft',
    admin_notes: '',
    
    // Arrays
    cards: [],
    assigned_readers: [],
    
    errors: {}
  });

  const [addDeckCurrentStep, setAddDeckCurrentStep] = useState(1);
  const [addDeckCardIdCounter, setAddDeckCardIdCounter] = useState(0);
  const [addDeckImagePreview, setAddDeckImagePreview] = useState({
    deck_image: null,
    card_back: null
  });
  const [addDeckUploading, setAddDeckUploading] = useState(false);
  const [addDeckSearchTerm, setAddDeckSearchTerm] = useState('');

  // Create deck adapter configuration
  const createDeckAdapter = useCallback(() => {
    const DECK_ADAPTER_CONFIG = {
      entityType: 'deck',
      entityName: currentLanguage === 'ar' ? 'مجموعة تاروت' : 'Tarot Deck',
      entityNamePlural: currentLanguage === 'ar' ? 'مجموعات التاروت' : 'Tarot Decks',
      
      columns: [
        {
          key: 'name',
          label: currentLanguage === 'ar' ? 'اسم المجموعة' : 'Deck Name',
          sortable: true
        },
        {
          key: 'deck_type',
          label: currentLanguage === 'ar' ? 'النوع' : 'Type',
          sortable: true
        },
        {
          key: 'category',
          label: currentLanguage === 'ar' ? 'الفئة' : 'Category',
          sortable: true
        },
        {
          key: 'total_cards',
          label: currentLanguage === 'ar' ? 'عدد البطاقات' : 'Cards',
          sortable: true
        },
        {
          key: 'visibility_type',
          label: currentLanguage === 'ar' ? 'الرؤية' : 'Visibility',
          sortable: true
        },
        {
          key: 'status',
          label: currentLanguage === 'ar' ? 'الحالة' : 'Status',
          sortable: true
        },
        {
          key: 'created_at',
          label: currentLanguage === 'ar' ? 'تاريخ الإنشاء' : 'Created',
          sortable: true
        }
      ],

      filters: [
        {
          key: 'search',
          type: 'search',
          placeholder: currentLanguage === 'ar' ? 'البحث في المجموعات...' : 'Search decks...'
        },
        {
          key: 'deck_type',
          type: 'select',
          options: [
            { value: '', label: currentLanguage === 'ar' ? 'جميع الأنواع' : 'All Types' },
            { value: 'Standard', label: 'Standard' },
            { value: 'Custom', label: 'Custom' },
            { value: 'Themed', label: 'Themed' },
            { value: 'Oracle', label: 'Oracle' }
          ]
        },
        {
          key: 'category',
          type: 'select',
          options: [
            { value: '', label: currentLanguage === 'ar' ? 'جميع الفئات' : 'All Categories' },
            { value: 'General', label: currentLanguage === 'ar' ? 'عام' : 'General' },
            { value: 'Love', label: currentLanguage === 'ar' ? 'الحب' : 'Love' },
            { value: 'Career', label: currentLanguage === 'ar' ? 'المهنة' : 'Career' },
            { value: 'Spiritual', label: currentLanguage === 'ar' ? 'روحاني' : 'Spiritual' },
            { value: 'Health', label: currentLanguage === 'ar' ? 'الصحة' : 'Health' }
          ]
        },
        {
          key: 'visibility_type',
          type: 'select',
          options: [
            { value: '', label: currentLanguage === 'ar' ? 'جميع أنواع الرؤية' : 'All Visibility' },
            { value: 'public', label: currentLanguage === 'ar' ? 'عام' : 'Public' },
            { value: 'private', label: currentLanguage === 'ar' ? 'خاص' : 'Private' },
            { value: 'readers_only', label: currentLanguage === 'ar' ? 'القراء فقط' : 'Readers Only' }
          ]
        },
        {
          key: 'is_active',
          type: 'select',
          options: [
            { value: '', label: currentLanguage === 'ar' ? 'جميع الحالات' : 'All Status' },
            { value: 'true', label: currentLanguage === 'ar' ? 'نشط' : 'Active' },
            { value: 'false', label: currentLanguage === 'ar' ? 'غير نشط' : 'Inactive' }
          ]
        }
      ],

      actions: [
        {
          key: 'view',
          label: currentLanguage === 'ar' ? 'عرض' : 'View',
          icon: 'EyeIcon',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
        },
        {
          key: 'edit',
          label: currentLanguage === 'ar' ? 'تعديل' : 'Edit',
          icon: 'PencilIcon',
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30'
        },
        {
          key: 'assign',
          label: currentLanguage === 'ar' ? 'تعيين قراء' : 'Assign Readers',
          icon: 'UserPlusIcon',
          color: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
        },
        {
          key: 'delete',
          label: currentLanguage === 'ar' ? 'حذف' : 'Delete',
          icon: 'TrashIcon',
          color: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
        }
      ],

      emptyIcon: 'StarIcon',

      getBadgeColor: (field, value) => {
        switch (field) {
          case 'deck_type':
            switch (value) {
              case 'Standard':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
              case 'Custom':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
              case 'Themed':
                return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
              case 'Oracle':
                return 'bg-gold-500/20 text-gold-400 border-gold-500/30';
              default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            }
          case 'visibility_type':
            switch (value) {
              case 'public':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
              case 'private':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
              case 'readers_only':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
              default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            }
          default:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
      },

      getStatusColor: (isActive) => {
        return isActive
          ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : 'bg-red-500/20 text-red-400 border-red-500/30';
      },

      getAvatarContent: (item) => {
        const name = item.name_en || item.name_ar || 'D';
        return name.charAt(0).toUpperCase();
      }
    };

    return new GenericDataAdapter(DECK_ADAPTER_CONFIG);
  }, [currentLanguage]);

  const adapter = createDeckAdapter();

  // Data loading
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 DualModeDeckManagement: Loading deck data');
      const result = await deckDataService.getDecks(filters);
      
      if (result.success) {
        setData(result.data || []);
        setMessage(result.data?.length === 0 
          ? (currentLanguage === 'ar' ? 'لا توجد مجموعات مطابقة للفلاتر' : 'No decks match your filters')
          : ''
        );
        console.log('✅ DualModeDeckManagement: Successfully loaded deck data:', result.data?.length);
      } else {
        throw new Error(result.error || 'Failed to load decks');
      }
    } catch (err) {
      console.error('❌ DualModeDeckManagement: Error loading deck data:', err);
      setError(err.message);
      setMessage(`Error: ${err.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters, currentLanguage]);

  // Load categories and readers for AddDeckModal
  const loadCategoriesAndReaders = useCallback(async () => {

    try {
      console.log('🔄 DualModeDeckManagement: Loading categories and readers');
      
      // Load categories and readers in parallel
      const [categoriesResult, readersResult] = await Promise.all([
        deckDataService.getCategories(),
        deckDataService.getReaders()
      ]);
      
      if (categoriesResult.success) {
        setCategories(categoriesResult.data || []);
        console.log('✅ DualModeDeckManagement: Successfully loaded categories:', categoriesResult.data?.length);
      }
      
      if (readersResult.success) {
        setReaders(readersResult.data || []);
        console.log('✅ DualModeDeckManagement: Successfully loaded readers:', readersResult.data?.length);
      }
    } catch (err) {
      console.error('❌ DualModeDeckManagement: Error loading categories and readers:', err);
    }
  }, []);

  // Load data on mount and refresh trigger
  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  // Load categories and readers on mount
  useEffect(() => {
    loadCategoriesAndReaders();
  }, [loadCategoriesAndReaders]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Event handlers
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedItems([]);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setSelectedItems([]);
  };

  const handleExport = async (filteredData) => {
    try {
      console.log('🔄 DualModeDeckManagement: Starting export of', filteredData.length, 'decks');
      
      // Wait for the export to complete - NO loading message shown
      const result = await deckDataService.exportToCSV(filteredData);
      
      if (result.success) {
        console.log('✅ DualModeDeckManagement: Export completed successfully');
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('❌ DualModeDeckManagement: Export failed:', error);
      setMessage(currentLanguage === 'ar'
        ? `خطأ في التصدير: ${error.message}`
        : `Export failed: ${error.message}`
      );
    }
  };

  const handleView = (item) => {
    console.log('🔄 DualModeDeckManagement: View deck:', item);
    setSelectedDeck(item);
    setShowViewModal(true);
    setMessage(currentLanguage === 'ar'
      ? `عرض تفاصيل المجموعة: ${item.name_en || item.name_ar}`
      : `Viewing deck details: ${item.name_en || item.name_ar}`
    );
  };

  const handleEdit = (item) => {
    console.log('🔄 DualModeDeckManagement: Edit deck:', item);
    setSelectedDeck(item);
    setShowEditModal(true);
    setMessage(currentLanguage === 'ar'
      ? `تعديل المجموعة: ${item.name_en || item.name_ar}`
      : `Editing deck: ${item.name_en || item.name_ar}`
    );
  };

  const handleAssign = (item) => {
    console.log('🔄 DualModeDeckManagement: Assign readers to deck:', item);
    setSelectedDeck(item);
    setShowAssignModal(true);
    setMessage(currentLanguage === 'ar'
      ? `تعيين قراء للمجموعة: ${item.name_en || item.name_ar}`
      : `Assigning readers to deck: ${item.name_en || item.name_ar}`
    );
  };

  const handleDelete = (item) => {
    console.log('🔄 DualModeDeckManagement: Delete deck:', item);
    setSelectedDeck(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDeck) return;

    try {
      setLoading(true);
      const result = await deckDataService.deleteDeck(selectedDeck.id);
      if (result.success) {
        setMessage(currentLanguage === 'ar'
          ? 'تم حذف المجموعة بنجاح'
          : 'Deck deleted successfully'
        );
        setShowDeleteModal(false);
        setSelectedDeck(null);
        handleRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('❌ DualModeDeckManagement: Error deleting deck:', err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, item) => {
    console.log('🔄 DualModeDeckManagement: Handling action:', action, item);

    try {
      switch (action) {
        case 'view':
          handleView(item);
          break;
        case 'edit':
          handleEdit(item);
          break;
        case 'assign':
          handleAssign(item);
          break;
        case 'delete':
          handleDelete(item);
          break;
        case 'bulk_export':
          // Handle bulk export - export only selected items
          const selectedDecks = data.filter(deck => item.includes(deck.id));
          await handleExport(selectedDecks);
          break;
        case 'bulk_activate':
        case 'bulk_deactivate':
        case 'bulk_delete':
          // Handle bulk operations
          const operation = action.replace('bulk_', '');
          const result = await deckDataService.bulkOperation(operation, item);
          if (result.success) {
            setMessage(currentLanguage === 'ar'
              ? `تم تنفيذ العملية "${operation}" بنجاح`
              : `Bulk ${operation} completed successfully`
            );
            handleRefresh();
          } else {
            throw new Error(result.error);
          }
          break;
        default:
          console.warn('❌ DualModeDeckManagement: Unknown action:', action);
      }
    } catch (err) {
      console.error('❌ DualModeDeckManagement: Error handling action:', err);
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleSelectionChange = (newSelection) => {
    setSelectedItems(newSelection);
  };

  // ===================================
  // ADD DECK FORM HANDLERS - MOVED FROM AddNewDeckForm
  // ===================================
  const handleAddDeckFormDataChange = useCallback((field, value) => {
    setAddDeckFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleAddDeckInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setAddDeckFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleAddDeckStepChange = useCallback((step) => {
    setAddDeckCurrentStep(step);
  }, []);

  const resetAddDeckForm = useCallback(() => {
    setAddDeckFormData({
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      category_id: '',
      deck_type: 'Rider-Waite',
      total_cards: 78,
      deck_image_url: '',
      card_back_image_url: '',
      visibility_type: 'public',
      status: 'draft',
      admin_notes: '',
      cards: [],
      assigned_readers: [],
      errors: {}
    });
    setAddDeckCurrentStep(1);
    setAddDeckCardIdCounter(0);
    setAddDeckImagePreview({
      deck_image: null,
      card_back: null
    });
    setAddDeckUploading(false);
    setAddDeckSearchTerm('');
  }, []);

  // ===========================================
  // DECK CREATION HANDLER WITH BILINGUAL ENFORCEMENT
  // ===========================================
  const handleCreateDeck = async (formData) => {
    console.log('🔄 [DECK-MANAGEMENT] Creating deck with bilingual enforcement:', formData);
    
    try {
      // Call the admin tarot decks API endpoint using the api service
      const response = await api.post('/admin/tarot/decks', formData);
      const result = response.data;

      if (result.success) {
        console.log('✅ [DECK-MANAGEMENT] Deck created successfully:', result.deck);
        
        // Show success message
        setMessage(currentLanguage === 'ar' 
          ? 'تم إضافة المجموعة بنجاح' 
          : 'Deck added successfully'
        );
        
        // Close modal and reset form
        setShowAddModal(false);
        resetAddDeckForm();
        
        // Refresh the data
        handleRefresh();
        
        return result.deck;
      } else {
        throw new Error(result.error || 'Failed to create deck');
      }
    } catch (error) {
      console.error('❌ [DECK-MANAGEMENT] Deck creation failed:', error);
      
      // Show error message
      setMessage(currentLanguage === 'ar' 
        ? `خطأ في إنشاء المجموعة: ${error.message}` 
        : `Failed to create deck: ${error.message}`
      );
      
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleAddSuccess = () => {
    setMessage(currentLanguage === 'ar' 
      ? 'تم إضافة المجموعة بنجاح' 
      : 'Deck added successfully'
    );
    setShowAddModal(false);
    resetAddDeckForm(); // Reset form after successful creation
    handleRefresh();
  };

  const handleEditSuccess = () => {
    setMessage(currentLanguage === 'ar' 
      ? 'تم تحديث المجموعة بنجاح' 
      : 'Deck updated successfully'
    );
    setShowEditModal(false);
    setSelectedDeck(null);
    handleRefresh();
  };

  const handleAssignSuccess = () => {
    setMessage(currentLanguage === 'ar' 
      ? 'تم تعيين القراء بنجاح' 
      : 'Readers assigned successfully'
    );
    setShowAssignModal(false);
    setSelectedDeck(null);
    handleRefresh();
  };

  const closeAllModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowAssignModal(false);
    setShowDeleteModal(false);
    setSelectedDeck(null);
  };

  return (
    <div className={`deck-management-container space-y-6 ${className}`}>
      {/* Unified Actions Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        {/* Left-aligned group: Main Actions */}
        <div className="flex items-center gap-2">
          {/* Add Deck Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30 hover:bg-gradient-to-r hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden md:inline">{currentLanguage === 'ar' ? 'إضافة مجموعة' : 'Add Deck'}</span>
          </motion.button>

          {/* Export Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleExport(data)}
            className="flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-gray-500/20 text-gray-300 border border-gray-500/30 hover:bg-gray-500/30 hover:border-gray-500/50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden md:inline">{currentLanguage === 'ar' ? 'تصدير' : 'Export'}</span>
          </motion.button>

          {/* Filters Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] ${
              showFilters 
                ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30' 
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30 hover:bg-gray-500/30 hover:border-gray-500/50'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            <span className="hidden md:inline">{currentLanguage === 'ar' ? 'فلاتر' : 'Filters'}</span>
          </motion.button>
        </div>

        {/* Right-aligned group: View Controls */}
        <div className="flex items-center gap-2">
          {/* Table Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('table')}
            className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] ${
              viewMode === 'table'
                ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30 hover:bg-gray-500/30 hover:border-gray-500/50'
            }`}
          >
            <Rows3 className="w-4 h-4" />
            <span className="hidden md:inline">{currentLanguage === 'ar' ? 'جدول' : 'Table'}</span>
          </motion.button>

          {/* Cards Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('cards')}
            className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] ${
              viewMode === 'cards'
                ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30 hover:bg-gray-500/30 hover:border-gray-500/50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden md:inline">{currentLanguage === 'ar' ? 'بطاقات' : 'Cards'}</span>
          </motion.button>

          {/* Refresh Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            className="flex items-center justify-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-gray-500/20 text-gray-300 border border-gray-500/30 hover:bg-gray-500/30 hover:border-gray-500/50"
            title={currentLanguage === 'ar' ? 'تحديث' : 'Refresh'}
          >
            <ArrowPathIcon className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      {/* Deck Count Display */}
      <div className="text-cosmic-300 text-sm">
        {data.length} {currentLanguage === 'ar' ? 'مجموعة' : 'decks'}
      </div>

      {/* Dynamic Content based on View Mode */}
      <AnimatePresence mode="wait">
        {isTableView ? (
          <motion.div
            key="table-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <GenericDataTable
              data={data}
              columns={[
                { key: 'name_en', label: currentLanguage === 'ar' ? 'اسم المجموعة' : 'Deck Name' },
                { key: 'deck_type', label: currentLanguage === 'ar' ? 'النوع' : 'Type' },
                { key: 'category', label: currentLanguage === 'ar' ? 'الفئة' : 'Category' },
                { key: 'total_cards', label: currentLanguage === 'ar' ? 'عدد البطاقات' : 'Cards' },
                { key: 'visibility_type', label: currentLanguage === 'ar' ? 'الرؤية' : 'Visibility' },
                { key: 'created_at', label: currentLanguage === 'ar' ? 'تاريخ الإنشاء' : 'Created' }
              ]}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAssign={handleAssign}
              isLoading={loading}
              emptyMessage={currentLanguage === 'ar' ? 'لا توجد مجموعات تاروت' : 'No tarot decks found'}
            />
          </motion.div>
        ) : (
          <motion.div
            key="cards-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <GenericDataCards
              adapter={adapter}
              data={data}
              loading={loading}
              error={error}
              message={message}
              onRefresh={handleRefresh}
              onExport={handleExport}
              onAction={handleAction}
              onFiltersChange={handleFiltersChange}
              filters={filters}
              selectedItems={selectedItems}
              onSelectionChange={handleSelectionChange}
              showFilters={showFilters}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Deck Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddDeckModal
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              resetAddDeckForm(); // Reset form when closing modal
            }}
            onSave={handleCreateDeck}
            categories={categories}
            readers={readers}
            loading={loading}
            // Form state and handlers
            formData={addDeckFormData}
            setFormData={setAddDeckFormData}
            onFormDataChange={handleAddDeckFormDataChange}
            onInputChange={handleAddDeckInputChange}
            currentStep={addDeckCurrentStep}
            onStepChange={handleAddDeckStepChange}
            cardIdCounter={addDeckCardIdCounter}
            setCardIdCounter={setAddDeckCardIdCounter}
            imagePreview={addDeckImagePreview}
            setImagePreview={setAddDeckImagePreview}
            uploading={addDeckUploading}
            setUploading={setAddDeckUploading}
            searchTerm={addDeckSearchTerm}
            setSearchTerm={setAddDeckSearchTerm}
          />
        )}
      </AnimatePresence>

      {/* View Deck Modal */}
      <AnimatePresence>
        {showViewModal && selectedDeck && (
          <ViewDeckModal
            isOpen={showViewModal}
            onClose={closeAllModals}
            deckData={selectedDeck}
          />
        )}
      </AnimatePresence>

      {/* Edit Deck Modal */}
      <AnimatePresence>
        {showEditModal && selectedDeck && (
          <EditDeckModal
            isOpen={showEditModal}
            onClose={closeAllModals}
            onSave={handleEditSuccess}
            deckData={selectedDeck}
            loading={loading}
          />
        )}
      </AnimatePresence>

      {/* Assign Readers Modal */}
      <AnimatePresence>
        {showAssignModal && selectedDeck && (
          <AssignDeckReadersModal
            isOpen={showAssignModal}
            onClose={closeAllModals}
            onSave={handleAssignSuccess}
            deckData={selectedDeck}
            loading={loading}
          />
        )}
      </AnimatePresence>

      {/* Delete Deck Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedDeck && (
          <DeleteDeckModal
            isOpen={showDeleteModal}
            onClose={closeAllModals}
            onConfirm={handleDeleteConfirm}
            deckData={selectedDeck}
            loading={loading}
          />
        )}
      </AnimatePresence>


    </div>
  );
};

export default DualModeDeckManagement; 