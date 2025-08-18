import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import AddNewDeckForm from '../../Tarot/AddNewDeckForm';

/**
 * ==========================================
 * SAMIA TAROT - ADD DECK MODAL (ENHANCED)
 * Clean single-background structure
 * ==========================================
 */

const AddDeckModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  loading = false,
  categories = [],
  readers = [],
  errors = {},
  // Form state and handlers from parent
  formData,
  setFormData,
  onFormDataChange,
  onInputChange,
  currentStep,
  onStepChange,
  cardIdCounter,
  setCardIdCounter,
  imagePreview,
  setImagePreview,
  uploading,
  setUploading,
  searchTerm,
  setSearchTerm
}) => {
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();

  // ===================================
  // MODAL STATE
  // ===================================
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===================================
  // EVENT HANDLERS
  // ===================================
  const handleFormSubmit = async (formData) => {
    console.log('✅ [AddDeckModal] Form submitted:', formData);
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      console.log('✅ [AddDeckModal] Save successful');
    } catch (error) {
      console.error('💥 [AddDeckModal] Save failed:', error);
      throw error; // Re-throw to let the form handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !loading) {
      onClose();
    }
  };

  // ===================================
  // KEYBOARD NAVIGATION
  // ===================================
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting && !loading) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, loading]);

  // ===================================
  // RENDER - Clean single-background structure
  // ===================================
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay backdrop - Single layer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40"
            onClick={handleClose}
          />

          {/* Modal container - Clean wrapper without background */}
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative mx-auto w-full max-w-6xl mt-4 mb-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal content */}
              <AddNewDeckForm
                onSubmit={handleFormSubmit}
                onCancel={handleClose}
                categories={categories}
                readers={readers}
                errors={errors}
                isEditMode={false}
                initialData={null}
                // Form state and handlers from parent
                formData={formData}
                setFormData={setFormData}
                onFormDataChange={onFormDataChange}
                onInputChange={onInputChange}
                currentStep={currentStep}
                onStepChange={onStepChange}
                cardIdCounter={cardIdCounter}
                setCardIdCounter={setCardIdCounter}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                uploading={uploading}
                setUploading={setUploading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />

              {/* Loading Overlay */}
              {(isSubmitting || loading) && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                  <div className="bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-lg p-6 flex items-center gap-3 border border-purple-500/20 shadow-xl">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                    <span className="text-white">
                      {currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddDeckModal; 