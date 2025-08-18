import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, TrashIcon, UserGroupIcon, PhotoIcon, CheckIcon, ArrowLeftIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import bilingualTranslationService from '../../services/bilingualTranslationService';
import api from '../../services/frontendApi';

const DEFAULT_FORM = {
  name_en: "",
  name_ar: "",
  description_en: "",
  description_ar: "",
  admin_notes: "",
  category_id: "",
  deck_type: "",
  total_cards: 78,
  deck_image_url: "",
  card_back_image_url: "",
  visibility_type: "public",
  status: "draft",
  cards: [],
  assigned_readers: [],
  errors: {},
};

// ===========================================
// AUTO-TRANSLATION FUNCTION
// ===========================================
const autoTranslate = async (text, sourceLanguage, targetLanguage) => {
  try {
    console.log('🔄 [AUTO-TRANSLATE] Attempting translation:', { text, sourceLanguage, targetLanguage });
    
    // Use the correct auto-translate endpoint
    const response = await api.post('/admin/tarot/auto-translate', {
      text,
      from_language: sourceLanguage,
      to_language: targetLanguage
    });
    
    if (response.data.success) {
      console.log('✅ [AUTO-TRANSLATE] Success:', response.data.translated_text);
      return response.data.translated_text;
    } else {
      console.warn('⚠️ [AUTO-TRANSLATE] Failed, using fallback');
      return text; // Fallback to original text
    }
  } catch (error) {
    console.error('❌ [AUTO-TRANSLATE] Error:', error);
    return text; // Fallback to original text
  }
};

// ===========================================
// BILINGUAL FIELD PROCESSOR
// ===========================================
const processBilingualFields = async (formData) => {
  const processedData = { ...formData };
  
  // Process name fields
  if (processedData.name_en && !processedData.name_ar) {
    processedData.name_ar = await autoTranslate(processedData.name_en, 'en', 'ar');
  } else if (processedData.name_ar && !processedData.name_en) {
    processedData.name_en = await autoTranslate(processedData.name_ar, 'ar', 'en');
  }
  
  // Process description fields
  if (processedData.description_en && !processedData.description_ar) {
    processedData.description_ar = await autoTranslate(processedData.description_en, 'en', 'ar');
  } else if (processedData.description_ar && !processedData.description_en) {
    processedData.description_en = await autoTranslate(processedData.description_ar, 'ar', 'en');
  }
  
  return processedData;
};

export default function AddNewDeckForm({
  categories = [],
  readers = [],
  onSubmit, 
  onCancel,
  initialData,
  isEditMode,
}) {
  const { currentLanguage, direction } = useLanguage();

  // Local state for the form fields
  const [form, setForm] = useState(
    initialData ? { ...DEFAULT_FORM, ...initialData } : { ...DEFAULT_FORM }
  );
  const [step, setStep] = useState(1);
  
  // Database-driven deck types
  const [deckTypes, setDeckTypes] = useState([]);
  const [loadingDeckTypes, setLoadingDeckTypes] = useState(true);
  const [showNewDeckTypeInput, setShowNewDeckTypeInput] = useState(false);
  const [newDeckType, setNewDeckType] = useState("");
  const [addingDeckType, setAddingDeckType] = useState(false);
  
  const [cardIdCounter, setCardIdCounter] = useState(
    initialData?.cards?.length > 0 
      ? Math.max(...initialData.cards.map(c => c.id)) + 1
      : 1
  );
  
  // Image preview states
  const [imagePreview, setImagePreview] = useState({
    deck_image: null,
    card_back: null
  });
  
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Load deck types from database (already integrated with auto-translation)
  useEffect(() => {
    const fetchDeckTypes = async () => {
      try {
        setLoadingDeckTypes(true);
        const response = await api.get('/admin/tarot/deck-types');
        
        console.log('🔍 [AddNewDeckForm] Deck types response:', {
          success: response.success,
          data: response.data,
          fullResponse: response
        });
        
        if (response.success) {
          console.log('✅ [AddNewDeckForm] Setting deck types:', response.data);
          setDeckTypes(response.data || []);
        } else {
          console.error('❌ [AddNewDeckForm] API returned error:', response.error);
        }
      } catch (error) {
        console.error('❌ [AddNewDeckForm] Error loading deck types:', error);
      } finally {
        setLoadingDeckTypes(false);
      }
    };

    fetchDeckTypes();
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save deck type to database using bilingual enforcement
  const saveDeckType = async (nameEn, nameAr) => {
    try {
      console.log('🔍 [DECK-FORM] Saving deck type with bilingual enforcement:', { nameEn, nameAr });
      
      const response = await api.post('/admin/tarot/deck-types', {
        name_en: nameEn,
        name_ar: nameAr
      });
      
      console.log('✅ [DECK-FORM] Deck type saved successfully:', response.data);
      
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error('Failed to save deck type');
    } catch (error) {
      console.error('❌ [DECK-FORM] Save deck type error:', error);
      throw error;
    }
  };

  // Add new deck type with auto-translation
  const handleAddNewDeckType = useCallback(async () => {
    if (!newDeckType.trim() || newDeckType.length > 50 || addingDeckType) return;
    
    try {
      setAddingDeckType(true);
      const inputText = newDeckType.trim();
      
      console.log('🔄 [FRONTEND] Adding new deck type with unified translation:', {
        inputText,
        detectedLanguage: /[\u0600-\u06FF]/.test(inputText) ? 'Arabic' : 'English'
      });
      
      // Determine if input is Arabic or English using Unicode range
      const isArabic = /[\u0600-\u06FF]/.test(inputText);
      
      let nameEn, nameAr;
      
      if (isArabic) {
        // Arabic input → translate to English
        nameAr = inputText;
        console.log(`🔄 [FRONTEND] Translating AR→EN: "${inputText}"`);
        nameEn = await autoTranslate(inputText, 'ar', 'en');
        console.log(`✅ [FRONTEND] Translation AR→EN result: "${nameEn}"`);
      } else {
        // English input → translate to Arabic
        nameEn = inputText;
        console.log(`🔄 [FRONTEND] Translating EN→AR: "${inputText}"`);
        nameAr = await autoTranslate(inputText, 'en', 'ar');
        console.log(`✅ [FRONTEND] Translation EN→AR result: "${nameAr}"`);
      }
      
      console.log('📤 [FRONTEND] Final bilingual data for API:', { 
        original: inputText,
        nameEn, 
        nameAr,
        translationDirection: isArabic ? 'AR→EN' : 'EN→AR'
      });
      
      // Save to database using bilingual enforcement
      const savedDeckType = await saveDeckType(nameEn, nameAr);
      
      // Update local state without losing focus
      setDeckTypes(prev => [...prev, savedDeckType]);
      setForm(prev => ({ 
        ...prev, 
        deck_type: currentLanguage === 'ar' ? nameAr : nameEn 
      }));
      
      // Reset input without causing focus loss
      setNewDeckType("");
      setShowNewDeckTypeInput(false);
      
    } catch (error) {
      console.error('Failed to add deck type:', error);
    } finally {
      setAddingDeckType(false);
    }
  }, [newDeckType, addingDeckType, currentLanguage]);

  const handleNewDeckTypeKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewDeckType();
    } else if (e.key === 'Escape') {
      setNewDeckType("");
      setShowNewDeckTypeInput(false);
    }
  };

  const handleCancelNewDeckType = () => {
    setNewDeckType("");
    setShowNewDeckTypeInput(false);
  };

  // Cards
  const handleAddCard = () => {
    setForm(prev => ({
      ...prev,
      cards: [
        ...prev.cards,
        {
          id: `card_${cardIdCounter}`,
          name_en: "",
          name_ar: "",
          meaning_en: "",
          meaning_ar: "",
          card_type: "major_arcana",
        }
      ]
    }));
    setCardIdCounter(c => c + 1);
  };

  const handleRemoveCard = (cardId) => {
    setForm(prev => ({
      ...prev,
      cards: prev.cards.filter(card => card.id !== cardId)
    }));
  };

  const handleCardChange = (cardId, field, value) => {
    setForm(prev => ({
      ...prev,
      cards: prev.cards.map(card =>
        card.id === cardId
          ? { ...card, [field]: value }
          : card
      )
    }));
  };

  // Bulk create cards (example: Rider-Waite standard 78)
  const generateStandardCards = () => {
    let currentId = cardIdCounter;
    const majorArcana = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
      'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
      'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
      'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
    ];
    const suits = ['Cups', 'Pentacles', 'Swords', 'Wands'];
    const ranks = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Page', 'Knight', 'Queen', 'King'];
    const cards = [];

    majorArcana.forEach((name, idx) => {
      cards.push({
        id: `card_${currentId++}`,
        name_en: name,
        name_ar: "",
        meaning_en: "",
        meaning_ar: "",
        card_type: "major_arcana",
      });
    });
    suits.forEach(suit => {
      ranks.forEach(rank => {
        cards.push({
          id: `card_${currentId++}`,
          name_en: `${rank} of ${suit}`,
          name_ar: "",
          meaning_en: "",
          meaning_ar: "",
          card_type: "minor_arcana",
        });
      });
    });

    setForm(prev => ({
      ...prev,
      cards: cards
    }));
    setCardIdCounter(currentId);
  };

  // Readers
  const handleReadersChange = (readerId) => {
    setForm(prev => {
      const assigned = prev.assigned_readers.includes(readerId)
        ? prev.assigned_readers.filter(id => id !== readerId)
        : [...prev.assigned_readers, readerId];
      return { ...prev, assigned_readers: assigned };
    });
  };
  const selectAllReaders = () => setForm(prev => ({
    ...prev,
    assigned_readers: readers.map(r => r.id)
  }));
  const clearAllReaders = () => setForm(prev => ({
    ...prev,
    assigned_readers: []
  }));

  // Images
  const handleImageUpload = (file, type) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImagePreview(prev => ({
        ...prev,
        [type]: e.target.result
      }));
      setForm(prev => ({
        ...prev,
        [type === "deck_image" ? "deck_image_url" : "card_back_image_url"]: e.target.result
      }));
    };
    reader.readAsDataURL(file);
  };
  const removeImage = (type) => {
    setImagePreview(prev => ({ ...prev, [type]: null }));
    setForm(prev => ({
      ...prev,
      [type === "deck_image" ? "deck_image_url" : "card_back_image_url"]: ""
    }));
  };

  // Step nav
  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));
  
  // ===========================================
  // ENHANCED FORM SUBMISSION WITH BILINGUAL ENFORCEMENT
  // ===========================================
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔄 [DECK-FORM] Starting bilingual form submission...');
    
    // STEP 1: Validate basic required fields
    if (!form.name_en && !form.name_ar) {
      alert(currentLanguage === 'ar' ? 'مطلوب اسم المجموعة' : 'Deck name is required');
      return;
    }
    
    try {
      // STEP 2: Process bilingual fields with auto-translation
      console.log('🔄 [DECK-FORM] Processing bilingual fields...');
      const processedForm = await processBilingualFields(form);
      
      // STEP 3: Validate that both languages are now populated
      if (!processedForm.name_en || !processedForm.name_ar) {
        alert(currentLanguage === 'ar' ? 'فشل في معالجة البيانات ثنائية اللغة' : 'Failed to process bilingual data');
        return;
      }
      
      console.log('✅ [DECK-FORM] Bilingual processing complete:', {
        name_en: processedForm.name_en,
        name_ar: processedForm.name_ar,
        description_en: processedForm.description_en,
        description_ar: processedForm.description_ar
      });
      
      // STEP 4: Submit the processed form
      if (onSubmit) {
        console.log('🔄 [DECK-FORM] Submitting processed form to parent...');
        await onSubmit(processedForm);
        console.log('✅ [DECK-FORM] Form submitted successfully');
      }
      
    } catch (error) {
      console.error('❌ [DECK-FORM] Bilingual submission error:', error);
      alert(currentLanguage === 'ar' ? 'خطأ في إرسال النموذج' : 'Form submission error');
    }
  };

  // Filter readers
  const filteredReaders = readers.filter(
    r =>
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ---- UI/Design with exact admin dashboard cosmic theme ----
  return (
    <div className="w-full min-w-0 bg-[#22173a] rounded-2xl shadow-2xl p-6 md:p-8 border border-[#2e1d53] transition-all duration-300" dir={direction} style={{ width: '100%', maxWidth: 'none' }}>
      {/* Form Title */}
      <div className="text-center mb-8 w-full">
        <h2 className="text-2xl font-bold text-white mb-2">
          {isEditMode 
            ? (currentLanguage === 'ar' ? 'تحرير مجموعة التاروت' : 'Edit Tarot Deck')
            : (currentLanguage === 'ar' ? 'إضافة مجموعة جديدة' : 'Add New Deck')
          }
        </h2>
        <p className="text-gray-300 text-sm">
          {currentLanguage === 'ar' 
            ? 'أكمل جميع الخطوات لإنشاء مجموعة تاروت جديدة'
            : 'Complete all steps to create a new tarot deck'
          }
        </p>
      </div>

      {/* Step Indicator - Admin Dashboard Tab Style */}
      <div className="flex items-center justify-center mb-8 w-full">
        {[
          { step: 1, label: currentLanguage === 'ar' ? 'المعلومات الأساسية' : 'Basic Info' },
          { step: 2, label: currentLanguage === 'ar' ? 'البطاقات' : 'Cards' },
          { step: 3, label: currentLanguage === 'ar' ? 'الصور' : 'Images' },
          { step: 4, label: currentLanguage === 'ar' ? 'الإعدادات' : 'Settings' }
        ].map((s, index) => (
          <div key={s.step} className="flex items-center">
            <div className={`group relative px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
              s.step === step
                ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white border border-red-500/30 shadow-lg shadow-red-500/20'
                : s.step < step
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-200 border border-green-500/30'
                : 'bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                s.step === step
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                  : s.step < step
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-gray-500/30 text-gray-400'
              }`}>
                {s.step < step ? <CheckIcon className="w-4 h-4" /> : s.step}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {index < 3 && (
              <div className={`w-8 h-0.5 mx-2 transition-colors ${
                s.step < step ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-500/30'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Animated Steps */}
      <div className="w-full min-w-0" style={{ width: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-8 w-full min-w-0"
            style={{ width: '100%' }}
          >
                        {/* Step 1: Basic Info */}
            {step === 1 && (
      <div className="space-y-6 w-full min-w-0" style={{ width: '100%' }}>
        {/* Language Indicator */}
                <div className="bg-[#2a1f3d] border border-[#2e1d53] rounded-lg p-4 mb-6">
                  <div className="text-sm text-white text-center flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full block"></span>
                    {currentLanguage === 'ar'
                      ? 'إدخال البيانات باللغة العربية'
                      : 'Entering data in English'}
          </div>
        </div>

        {/* Deck Name */}
        <div className="w-full min-w-0" style={{ width: '100%' }}>
                  <label className="block text-base font-medium text-white mb-3">
            {currentLanguage === 'ar' ? 'اسم مجموعة التاروت' : 'Tarot Deck Name'} 
                    <span className="text-red-400 ml-1">*</span>
          </label>
          <input
            type="text"
            name={currentLanguage === 'ar' ? 'name_ar' : 'name_en'}
            value={currentLanguage === 'ar' ? form.name_ar : form.name_en}
            onChange={handleInputChange}
            placeholder={currentLanguage === 'ar'
              ? 'أدخل اسم مجموعة التاروت'
              : 'Enter tarot deck name'}
            className="w-full px-4 py-3 bg-[#22173a] border border-[#2e1d53] rounded-lg focus:ring-2 focus:ring-[#a259ef] text-white placeholder-gray-400 hover:border-[#a259ef]/60 transition-all duration-300"
            style={{ width: '100%' }}
            autoFocus
          />
        </div>

        {/* Deck Type */}
        <div className="w-full min-w-0" style={{ width: '100%' }}>
                  <label className="block text-base font-medium text-white mb-3">
            {currentLanguage === 'ar' ? 'نوع مجموعة التاروت' : 'Deck Type'} 
                    <span className="text-red-400 ml-1">*</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              name="deck_type"
              value={form.deck_type}
              onChange={handleInputChange}
              disabled={loadingDeckTypes}
              className="w-full px-4 py-3 bg-[#22173a] border border-[#2e1d53] rounded-lg focus:ring-2 focus:ring-[#a259ef] text-white hover:border-[#a259ef]/60 transition-all duration-300 disabled:opacity-50"
              style={{ width: '100%' }}
            >
              <option value="">
                {loadingDeckTypes 
                  ? (currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...') 
                  : (currentLanguage === 'ar' ? 'اختر نوع المجموعة' : 'Select deck type')
                }
              </option>
              {deckTypes.map((type) => (
                <option key={type.id} value={currentLanguage === 'ar' ? type.name_ar : type.name_en}>
                  {currentLanguage === 'ar' ? type.name_ar : type.name_en}
                </option>
              ))}
            </select>
            <button
              type="button"
                      className="flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all duration-300 transform hover:scale-105"
                      onClick={() => setShowNewDeckTypeInput(true)}
                      title={currentLanguage === 'ar' ? 'إضافة نوع جديد' : 'Add new type'}
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>

          {showNewDeckTypeInput && (
            <div className="mt-4 p-4 bg-[#2a1f3d] border border-[#2e1d53] rounded-lg">
                      <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDeckType}
                  onChange={e => setNewDeckType(e.target.value)}
                  onKeyDown={handleNewDeckTypeKeyPress}
                  maxLength={50}
                          className="flex-1 px-4 py-3 bg-[#22173a] border border-[#2e1d53] rounded-lg focus:ring-2 focus:ring-[#a259ef] text-white placeholder-gray-400 hover:border-[#a259ef]/60 transition-all duration-300"
                          placeholder={currentLanguage === 'ar' ? 'أدخل نوع المجموعة الجديد (حد أقصى 50 حرف)' : 'Enter new deck type (max 50 characters)'}
                          autoFocus
                />
                <button
                  type="button"
                  disabled={addingDeckType}
                  className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-lg shadow-green-500/30 transition-all duration-300 transform hover:scale-105 disabled:transform-none"
                  onClick={handleAddNewDeckType}
                >
                  {addingDeckType ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckIcon className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="button"
                          className="flex items-center justify-center px-4 py-3 bg-gray-500/20 text-gray-300 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                  onClick={handleCancelNewDeckType}
                        >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
                      <div className="text-xs text-gray-400 mt-2">
                        {currentLanguage === 'ar' 
                          ? `${newDeckType.length}/50 حرف`
                          : `${newDeckType.length}/50 characters`}
              </div>
            </div>
          )}
        </div>

        {/* Total Cards */}
        <div className="w-full min-w-0" style={{ width: '100%' }}>
                  <label className="block text-base font-medium text-white mb-3">
            {currentLanguage === 'ar' ? 'إجمالي عدد البطاقات' : 'Total Cards'} 
                    <span className="text-red-400 ml-1">*</span>
          </label>
          <input
            type="number"
            name="total_cards"
                    value={form.total_cards}
            onChange={handleInputChange}
            min="1"
            max="200"
                    className="w-full px-4 py-3 bg-[#22173a] border border-[#2e1d53] rounded-lg focus:ring-2 focus:ring-[#a259ef] text-white hover:border-[#a259ef]/60 transition-all duration-300"
            style={{ width: '100%' }}
          />
        </div>
      </div>
            )}

            {/* Step 2: Cards */}
            {step === 2 && (
      <div className="space-y-6 w-full min-w-0" style={{ width: '100%' }}>
                <div className="bg-[#2a1f3d] border border-[#2e1d53] rounded-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">
              {currentLanguage === 'ar' ? 'إدارة البطاقات' : 'Cards Management'}
            </h3>
                    <div className="text-sm text-gray-300 bg-[#22173a] px-3 py-1 rounded-lg border border-[#2e1d53]">
                      {currentLanguage === 'ar'
                        ? `العدد الحالي: ${form.cards.length}`
                        : `Current count: ${form.cards.length}`}
            </div>
          </div>

                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
                      type="button"
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-lg font-semibold shadow-lg shadow-pink-500/30 transition-all duration-300 transform hover:scale-105"
                      onClick={handleAddCard}
            >
                      <PlusIcon className="w-5 h-5" />
                      {currentLanguage === 'ar' ? 'إضافة بطاقة جديدة' : 'Add New Card'}
            </button>
            <button
                      type="button"
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-lg shadow-green-500/30 transition-all duration-300 transform hover:scale-105"
                      onClick={generateStandardCards}
            >
                      <UserGroupIcon className="w-5 h-5" />
                      {currentLanguage === 'ar' ? 'توليد 78 بطاقة قياسية' : 'Generate Standard 78 Cards'}
            </button>
          </div>

                  <div className="overflow-x-auto max-h-[50vh] overflow-y-auto border border-[#2e1d53] rounded-lg bg-[#22173a]/50">
                    {form.cards.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <UserGroupIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{currentLanguage === 'ar' ? 'لا توجد بطاقات بعد' : 'No cards added yet'}</p>
              </div>
            ) : (
                      <div className="space-y-2 p-4">
                        {form.cards.map((card, idx) => (
                          <div
                            key={card.id}
                            className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#2a1f3d] border border-[#2e1d53] py-3 px-4 items-center rounded-lg hover:bg-[#2a1f3d]/80 transition-all"
                          >
                      <input
                        type="text"
                              value={card.name_en}
                              placeholder={currentLanguage === 'ar' ? "اسم البطاقة بالانكليزي" : "Card Name (EN)"}
                              onChange={e =>
                                handleCardChange(card.id, 'name_en', e.target.value)
                              }
                              className="px-3 py-2 bg-[#22173a] border border-[#2e1d53] rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#a259ef] focus:border-[#a259ef] transition-all"
                            />
                            <input
                              type="text"
                              value={card.name_ar}
                              placeholder={currentLanguage === 'ar' ? "اسم البطاقة بالعربي" : "Card Name (AR)"}
                              onChange={e =>
                                handleCardChange(card.id, 'name_ar', e.target.value)
                              }
                              className="px-3 py-2 bg-[#22173a] border border-[#2e1d53] rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#a259ef] focus:border-[#a259ef] transition-all"
                      />
                            <input
                              type="text"
                              value={card.meaning_en}
                              placeholder={currentLanguage === 'ar' ? "المعنى بالانكليزي" : "Meaning (EN)"}
                              onChange={e =>
                                handleCardChange(card.id, 'meaning_en', e.target.value)
                              }
                              className="px-3 py-2 bg-[#22173a] border border-[#2e1d53] rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#a259ef] focus:border-[#a259ef] transition-all"
                            />
                            <input
                              type="text"
                              value={card.meaning_ar}
                              placeholder={currentLanguage === 'ar' ? "المعنى بالعربي" : "Meaning (AR)"}
                              onChange={e =>
                                handleCardChange(card.id, 'meaning_ar', e.target.value)
                              }
                              className="px-3 py-2 bg-[#22173a] border border-[#2e1d53] rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#a259ef] focus:border-[#a259ef] transition-all"
                            />
                            <button
                              type="button"
                              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded-lg shadow-lg shadow-red-500/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                              onClick={() => handleRemoveCard(card.id)}
                              title={currentLanguage === 'ar' ? "حذف" : "Remove"}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                    </div>
                        ))}
                  </div>
            )}
          </div>
        </div>
      </div>
            )}

            {/* Step 3: Images */}
            {step === 3 && (
      <div className="space-y-6 w-full min-w-0" style={{ width: '100%' }}>
                <div className="bg-[#2a1f3d] border border-[#2e1d53] rounded-lg p-6 space-y-6">
                  <h3 className="text-xl font-bold text-white mb-6">
                    {currentLanguage === 'ar' ? 'صور المجموعة' : 'Deck Images'}
          </h3>

                  {/* Deck Image */}
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="w-full md:w-1/2 space-y-3">
                      <label className="block text-base font-medium text-white">
                        {currentLanguage === 'ar' ? 'صورة المجموعة' : 'Deck Image'}
            </label>
              {imagePreview.deck_image ? (
                        <div className="relative w-40 h-40">
                  <img
                    src={imagePreview.deck_image}
                            alt="Deck Preview"
                            className="w-full h-full object-cover rounded-lg border-2 border-[#a259ef] shadow-lg"
                  />
                  <button
                            type="button"
                            className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full p-2 hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
                    onClick={() => removeImage('deck_image')}
                            title={currentLanguage === 'ar' ? "إزالة" : "Remove"}
                  >
                            <XCircle className="w-5 h-5 text-white" />
                  </button>
                </div>
              ) : (
                        <label className="w-40 h-40 flex flex-col items-center justify-center bg-[#22173a] border-2 border-dashed border-[#2e1d53] rounded-lg cursor-pointer hover:border-[#a259ef] hover:bg-[#2a1f3d]/50 transition-all duration-300">
                          <PhotoIcon className="w-12 h-12 text-gray-400 mb-3" />
                          <span className="text-sm text-gray-300 font-medium">{currentLanguage === 'ar' ? 'تحميل صورة' : 'Upload Image'}</span>
                          <span className="text-xs text-gray-500 mt-1">{currentLanguage === 'ar' ? 'PNG, JPG' : 'PNG, JPG'}</span>
              <input
                type="file"
                accept="image/*"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files[0]) handleImageUpload(e.target.files[0], 'deck_image');
                            }}
              />
                        </label>
            )}
          </div>

          {/* Card Back Image */}
                    <div className="w-full md:w-1/2 space-y-3">
                      <label className="block text-base font-medium text-white">
                        {currentLanguage === 'ar' ? 'صورة خلفية البطاقة' : 'Card Back Image'}
            </label>
              {imagePreview.card_back ? (
                        <div className="relative w-40 h-40">
                  <img
                    src={imagePreview.card_back}
                            alt="Back Preview"
                            className="w-full h-full object-cover rounded-lg border-2 border-[#a259ef] shadow-lg"
                  />
                  <button
                            type="button"
                            className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full p-2 hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
                    onClick={() => removeImage('card_back')}
                            title={currentLanguage === 'ar' ? "إزالة" : "Remove"}
                  >
                            <XCircle className="w-5 h-5 text-white" />
                  </button>
                </div>
              ) : (
                        <label className="w-40 h-40 flex flex-col items-center justify-center bg-[#22173a] border-2 border-dashed border-[#2e1d53] rounded-lg cursor-pointer hover:border-[#a259ef] hover:bg-[#2a1f3d]/50 transition-all duration-300">
                          <PhotoIcon className="w-12 h-12 text-gray-400 mb-3" />
                          <span className="text-sm text-gray-300 font-medium">{currentLanguage === 'ar' ? 'تحميل صورة' : 'Upload Image'}</span>
                          <span className="text-xs text-gray-500 mt-1">{currentLanguage === 'ar' ? 'PNG, JPG' : 'PNG, JPG'}</span>
              <input
                type="file"
                accept="image/*"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files[0]) handleImageUpload(e.target.files[0], 'card_back');
                            }}
              />
                        </label>
            )}
          </div>
                  </div>
              </div>
            </div>
          )}

            {/* Step 4: Readers & Settings */}
            {step === 4 && (
      <div className="space-y-6 w-full min-w-0" style={{ width: '100%' }}>
                {/* Assign Readers */}
                <div className="bg-[#2a1f3d] border border-[#2e1d53] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">
                      {currentLanguage === 'ar' ? 'تعيين القراء' : 'Assign Readers'}
            </h3>
                    <div className="flex gap-2">
                <button
                        type="button"
              onClick={selectAllReaders}
                        className={`flex items-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30 hover:bg-gradient-to-r hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50`}
            >
                        <UserGroupIcon className="w-4 h-4" />
              <span className="hidden md:inline">{currentLanguage === 'ar' ? 'تحديد الكل' : 'Select All'}</span>
            </button>
            <button
                        type="button"
              onClick={clearAllReaders}
                        className={`flex items-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] bg-gray-500/20 text-gray-300 border border-gray-500/30 hover:bg-gray-500/30 hover:border-gray-500/50`}
            >
                        <XMarkIcon className="w-4 h-4" />
                        <span className="hidden md:inline">{currentLanguage === 'ar' ? 'إلغاء تحديد الكل' : 'Clear All'}</span>
            </button>
          </div>
              </div>

            <input
              type="text"
                    placeholder={currentLanguage === 'ar' ? 'بحث عن قارئ...' : 'Search reader...'}
                    className="w-full mb-4 px-4 py-3 bg-[#22173a] border border-[#2e1d53] rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#a259ef] focus:border-[#a259ef] transition-all"
              value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                    {filteredReaders.map(reader => (
                      <label key={reader.id} className="flex items-center gap-3 bg-[#22173a] border border-[#2e1d53] rounded-lg px-4 py-3 cursor-pointer hover:border-[#a259ef]/60 hover:bg-[#2a1f3d]/50 transition-all">
                    <input
                      type="checkbox"
                          checked={form.assigned_readers.includes(reader.id)}
                          onChange={() => handleReadersChange(reader.id)}
                          className="w-4 h-4 text-[#a259ef] bg-[#22173a] border-[#2e1d53] rounded focus:ring-[#a259ef] focus:ring-2"
                    />
                        <span className="text-white text-sm font-medium">{reader.name_en || reader.name_ar || reader.email}</span>
                      </label>
                    ))}
          </div>
        </div>

                {/* Settings */}
                <div className="bg-[#2a1f3d] border border-[#2e1d53] rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {currentLanguage === 'ar' ? 'إعدادات النشر' : 'Publishing Settings'}
          </h3>
                  <label className="flex items-center gap-3 bg-[#22173a] border border-[#2e1d53] rounded-lg px-4 py-3 cursor-pointer hover:border-[#a259ef]/60 hover:bg-[#2a1f3d]/50 transition-all">
                    <input
                      type="checkbox"
                      name="status"
                      checked={form.status === "published"}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          status: e.target.checked ? "published" : "draft"
                        }))
                      }
                      className="w-4 h-4 text-[#a259ef] bg-[#22173a] border-[#2e1d53] rounded focus:ring-[#a259ef] focus:ring-2"
                    />
                    <span className="text-white font-medium">{currentLanguage === 'ar' ? 'نشر المجموعة فور الإنشاء' : 'Publish deck immediately'}</span>
                  </label>
                </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons - Mobile: Stack with Next on top, Desktop: Side by side */}
      <div className="flex flex-col gap-4 mt-8 w-full">
        {/* Mobile: Next/Create button on top */}
        <div className="flex justify-center sm:hidden w-full">
          {step < 4 && (
          <button
              type="button"
              className={`flex items-center justify-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] w-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30 hover:bg-gradient-to-r hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50`}
              onClick={handleNext}
            >
              <span>{currentLanguage === 'ar' ? 'التالي' : 'Next'}</span>
              {currentLanguage === 'ar' ? 
                <ArrowLeftIcon className="w-4 h-4 ml-2" /> : 
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              }
          </button>
          )}
          {step === 4 && (
            <button
              type="submit"
              className={`flex items-center justify-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] w-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30 hover:bg-gradient-to-r hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50`}
              >
              <span>
                  {isEditMode 
                  ? (currentLanguage === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                  : (currentLanguage === 'ar' ? 'إنشاء المجموعة' : 'Create Deck')}
                </span>
              <CheckIcon className="w-4 h-4 ml-2" />
              </button>
            )}
        </div>

        {/* Mobile: Back and Cancel buttons below */}
        <div className="flex gap-3 w-full sm:hidden">
            <button
            type="button"
            className={`flex items-center justify-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] flex-1 ${
              step === 1
                ? 'bg-gray-500/10 text-gray-500 border border-gray-500/20 cursor-not-allowed'
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30 hover:bg-gray-500/30 hover:border-gray-500/50'
              }`}
            onClick={handleBack}
            disabled={step === 1}
          >
            {currentLanguage === 'ar' ? 
              <ArrowRightIcon className="w-4 h-4" /> : 
              <ArrowLeftIcon className="w-4 h-4" />
            }
            <span>{currentLanguage === 'ar' ? 'السابق' : 'Back'}</span>
            </button>
            <button
            type="button"
            className={`flex items-center justify-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] flex-1 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border border-red-400/30 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 hover:border-red-400/50`}
              onClick={onCancel}
            >
            <XMarkIcon className="w-4 h-4" />
            <span>{currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}</span>
            </button>
        </div>

        {/* Desktop: Original layout */}
        <div className="hidden sm:flex items-center justify-between w-full">
          <div>
            {step < 4 && (
            <button
                type="button"
                className={`flex items-center justify-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-6 md:px-8 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] w-48 md:w-64 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30 hover:bg-gradient-to-r hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50`}
                onClick={handleNext}
              >
                <span className="md:inline">{currentLanguage === 'ar' ? 'التالي' : 'Next'}</span>
                {currentLanguage === 'ar' ? 
                  <ArrowLeftIcon className="w-4 h-4 ml-2" /> : 
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                }
            </button>
            )}
            {step === 4 && (
              <button
                type="submit"
                className={`flex items-center justify-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-6 md:px-8 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] w-48 md:w-64 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30 hover:bg-gradient-to-r hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50`}
                >
                <span className="md:inline">
                    {isEditMode 
                    ? (currentLanguage === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                    : (currentLanguage === 'ar' ? 'إنشاء المجموعة' : 'Create Deck')}
                  </span>
                <CheckIcon className="w-4 h-4 ml-2" />
                </button>
              )}
          </div>

          <div className="flex gap-3">
              <button
              type="button"
              className={`flex items-center justify-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] md:w-32 ${
                step === 1
                  ? 'bg-gray-500/10 text-gray-500 border border-gray-500/20 cursor-not-allowed'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-500/30 hover:bg-gray-500/30 hover:border-gray-500/50'
                }`}
              onClick={handleBack}
              disabled={step === 1}
            >
              {currentLanguage === 'ar' ? 
                <ArrowRightIcon className="w-4 h-4" /> : 
                <ArrowLeftIcon className="w-4 h-4" />
              }
              <span className="hidden md:inline">{currentLanguage === 'ar' ? 'السابق' : 'Back'}</span>
              </button>
              <button
              type="button"
              className={`flex items-center justify-center ${currentLanguage === 'ar' ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px] md:w-32 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border border-red-400/30 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 hover:border-red-400/50`}
                onClick={onCancel}
              >
              <XMarkIcon className="w-4 h-4" />
              <span className="hidden md:inline">{currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}</span>
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
