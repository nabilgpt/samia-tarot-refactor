import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { supabase } from '../../../lib/supabase';
import SpreadsManagement from './SpreadsManagement';
import DecksManagement from './DecksManagement';
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
  Filter,
  Users,
  Settings,
  Image,
  Upload,
  Crown,
  Lock,
  Globe,
  UserPlus,
  Tag,
  Star
} from 'lucide-react';

/**
 * ==========================================
 * SAMIA TAROT - ADMIN TAROT MANAGEMENT
 * Enhanced Spreads & Decks Management with Admin Controls
 * ==========================================
 * 
 * Features:
 * - ✅ Copy Reader Spreads layout but add admin controls
 * - ✅ Spread Visibility Controls (Public/Private/Assigned)
 * - ✅ Reader Assignment Management
 * - ✅ Tarot Deck Management with Image Upload
 * - ✅ Card Image Upload System (card count + 1 back)
 * - ✅ Activity Logging
 * - ✅ Cosmic Theme Preservation
 */

const TarotManagement = () => {
  const { user, profile } = useAuth();
  const { currentLanguage } = useLanguage();
  
  // ===================================
  // STATE MANAGEMENT
  // ===================================

  // Tab management
  const [activeTab, setActiveTab] = useState('spreads');
  
  // Spreads management
  const [spreads, setSpreads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [decks, setDecks] = useState([]);
  const [readers, setReaders] = useState([]);
  
  // Decks management
  const [deckImages, setDeckImages] = useState({});
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [showAddSpreadForm, setShowAddSpreadForm] = useState(false);
  const [showEditSpreadForm, setShowEditSpreadForm] = useState(false);
  const [showAddDeckForm, setShowAddDeckForm] = useState(false);
  const [showEditDeckForm, setShowEditDeckForm] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [showReaderAssignmentModal, setShowReaderAssignmentModal] = useState(false);
  
  // Form states
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Filter states
  const [spreadsFilters, setSpreadsFilters] = useState({
    search: '',
    difficulty: 'all',
    category: 'all',
    visibility: 'all',
    status: 'all'
  });
  
  const [decksFilters, setDecksFilters] = useState({
    search: '',
    type: 'all',
    visibility: 'all',
    uploadStatus: 'all'
  });

  // ===================================
  // DATA FETCHING
  // ===================================

  const fetchSpreads = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tarot_spreads')
        .select(`
          *,
          admin_created_by:profiles!admin_created_by(name, email),
          spread_assignments:tarot_spread_reader_assignments(
            id,
            reader_id,
            assigned_by,
            assigned_at,
            reader:profiles!reader_id(name, email)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpreads(data || []);
    } catch (err) {
      console.error('Error fetching spreads:', err);
      setErrors(['Failed to fetch spreads']);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDecks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tarot_decks')
        .select(`
          *,
          admin_created_by:profiles!admin_created_by(name, email),
          deck_images:tarot_deck_card_images(
            id,
            image_type,
            image_url,
            upload_order
          ),
          deck_assignments:tarot_deck_reader_assignments(
            id,
            reader_id,
            assigned_by,
            assigned_at,
            reader:profiles!reader_id(name, email)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDecks(data || []);
    } catch (err) {
      console.error('Error fetching decks:', err);
      setErrors(['Failed to fetch decks']);
    }
  }, []);

  const fetchReaders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'reader')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setReaders(data || []);
    } catch (err) {
      console.error('Error fetching readers:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('spread_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  // ===================================
  // FILTERED DATA
  // ===================================

  const filteredSpreads = useMemo(() => {
    return spreads.filter(spread => {
      const matchesSearch = !spreadsFilters.search || 
        spread.name?.toLowerCase().includes(spreadsFilters.search.toLowerCase()) ||
        spread.name_ar?.toLowerCase().includes(spreadsFilters.search.toLowerCase());
      
      const matchesDifficulty = spreadsFilters.difficulty === 'all' || 
        spread.difficulty_level === spreadsFilters.difficulty;
      
      const matchesCategory = spreadsFilters.category === 'all' || 
        spread.category === spreadsFilters.category;
      
      const matchesVisibility = spreadsFilters.visibility === 'all' || 
        spread.visibility_type === spreadsFilters.visibility;
      
      const matchesStatus = spreadsFilters.status === 'all' || 
        spread.approval_status === spreadsFilters.status;

      return matchesSearch && matchesDifficulty && matchesCategory && matchesVisibility && matchesStatus;
    });
  }, [spreads, spreadsFilters]);

  const filteredDecks = useMemo(() => {
    return decks.filter(deck => {
      const matchesSearch = !decksFilters.search || 
        deck.name?.toLowerCase().includes(decksFilters.search.toLowerCase()) ||
        deck.name_ar?.toLowerCase().includes(decksFilters.search.toLowerCase());
      
      const matchesType = decksFilters.type === 'all' || 
        deck.deck_type === decksFilters.type;
      
      const matchesVisibility = decksFilters.visibility === 'all' || 
        deck.visibility_type === decksFilters.visibility;
      
      const matchesUploadStatus = decksFilters.uploadStatus === 'all' || 
        deck.upload_status === decksFilters.uploadStatus;

      return matchesSearch && matchesType && matchesVisibility && matchesUploadStatus;
    });
  }, [decks, decksFilters]);

  // ===================================
  // HANDLERS
  // ===================================

  const handleAddSpread = useCallback(() => {
    setSelectedSpread(null);
    setShowAddSpreadForm(true);
  }, []);

  const handleEditSpread = useCallback((spread) => {
    setSelectedSpread(spread);
    setShowEditSpreadForm(true);
  }, []);

  const handleDeleteSpread = useCallback(async (spreadId) => {
    if (!window.confirm(currentLanguage === 'ar' ? 
      'هل أنت متأكد من حذف هذا الانتشار؟' : 
      'Are you sure you want to delete this spread?')) {
      return;
    }

    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('tarot_spreads')
        .update({ is_active: false })
        .eq('id', spreadId);

      if (error) throw error;

      setSuccessMessage(currentLanguage === 'ar' ? 
        'تم حذف الانتشار بنجاح' : 
        'Spread deleted successfully');
      
      await fetchSpreads();
    } catch (err) {
      console.error('Error deleting spread:', err);
      setErrors(['Failed to delete spread']);
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, fetchSpreads]);

  const handleAddDeck = useCallback(() => {
    setSelectedDeck(null);
    setShowAddDeckForm(true);
  }, []);

  const handleEditDeck = useCallback((deck) => {
    setSelectedDeck(deck);
    setShowEditDeckForm(true);
  }, []);

  const handleUploadImages = useCallback((deck) => {
    setSelectedDeck(deck);
    setShowImageUploadModal(true);
  }, []);

  const handleAssignReaders = useCallback((item, type) => {
    setSelectedSpread(type === 'spread' ? item : null);
    setSelectedDeck(type === 'deck' ? item : null);
    setShowReaderAssignmentModal(true);
  }, []);

  // ===================================
  // EFFECTS
  // ===================================

  useEffect(() => {
    if (user?.id && profile?.role === 'admin') {
      Promise.all([
        fetchSpreads(),
        fetchDecks(),
        fetchReaders(),
        fetchCategories()
      ]);
    }
  }, [user?.id, profile?.role, fetchSpreads, fetchDecks, fetchReaders, fetchCategories]);

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
              <span className="text-green-300 font-medium">Success</span>
              <button
                onClick={() => setSuccessMessage('')}
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
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm"
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

      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wand2 className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">
            {currentLanguage === 'ar' ? 'إدارة التاروت' : 'Tarot Management'}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-black/30 rounded-lg border border-purple-500/20">
          <button
            onClick={() => setActiveTab('spreads')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'spreads'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {currentLanguage === 'ar' ? 'الانتشارات' : 'Spreads'}
          </button>
          <button
            onClick={() => setActiveTab('decks')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'decks'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {currentLanguage === 'ar' ? 'المجموعات' : 'Decks'}
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
            onAdd={handleAddSpread}
            onEdit={handleEditSpread}
            onDelete={handleDeleteSpread}
            onAssignReaders={(spread) => handleAssignReaders(spread, 'spread')}
            renderVisibilityBadge={renderVisibilityBadge}
            currentLanguage={currentLanguage}
          />
        ) : (
          <DecksManagement 
            decks={filteredDecks}
            readers={readers}
            filters={decksFilters}
            setFilters={setDecksFilters}
            loading={loading}
            onAdd={handleAddDeck}
            onEdit={handleEditDeck}
            onUploadImages={handleUploadImages}
            onAssignReaders={(deck) => handleAssignReaders(deck, 'deck')}
            renderVisibilityBadge={renderVisibilityBadge}
            renderUploadStatusBadge={renderUploadStatusBadge}
            currentLanguage={currentLanguage}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TarotManagement; 