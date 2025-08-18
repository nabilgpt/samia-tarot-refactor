import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { XMarkIcon } from '@heroicons/react/24/outline';
import SmartBilingualField from '../UI/Enhanced/SmartBilingualField';
import { 
  getFormFieldClasses, 
  getLabelClasses, 
  getValidationErrorClasses,
  getResponsiveGridClasses
} from '../../utils/rtlUtils';

/**
 * ==========================================
 * ADD NEW SPREAD FORM - SINGLE FIELD APPROACH
 * ==========================================
 */
const AddNewSpreadForm = ({ 
  onSubmit, 
  onCancel,
  categories, 
  decks,
  errors = {},
  initialData = null,
  isEditMode = false
}) => {
  const { currentLanguage, direction } = useLanguage();
  const { user: authUser } = useAuth();
  
  // ===================================
  // FORM STATE - SINGLE FIELD APPROACH
  // ===================================
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    name_language: currentLanguage,
    description: initialData?.description || '',
    description_language: currentLanguage,
    category_id: initialData?.category_id || '',
    deck_id: initialData?.deck_id || '',
    card_count: initialData?.card_count || 1,
    spread_type: initialData?.spread_type || '',
    difficulty_level: initialData?.difficulty_level || 'beginner',
    layout_type: initialData?.layout_type || 'linear',
    errors: {}
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [layoutType, setLayoutType] = useState(initialData?.layout_type || 'linear');
  const [positions, setPositions] = useState([]);
  const [draggedPositions, setDraggedPositions] = useState([]);

  // ===================================
  // FORM HANDLERS
  // ===================================
  const handleFormDataChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Track language of the field
      [`${field}_language`]: currentLanguage
    }));
  }, [currentLanguage]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Generate positions based on card count and layout type
  const generatePositions = (cardCount, layout = layoutType) => {
    const newPositions = [];
    for (let i = 1; i <= cardCount; i++) {
      newPositions.push({
        id: `pos_${i}`,
        number: i,
        name: `${currentLanguage === 'ar' ? 'الموضع' : 'Position'} ${i}`,
        name_language: currentLanguage,
        x: 0,
        y: 0,
        rotation: 0
      });
    }
    setPositions(newPositions);
    
    // Auto-arrange positions based on layout type
    if (layout) {
      arrangePositions(newPositions, layout);
    }
  };

  // Auto-arrange positions based on layout type
  const arrangePositions = (posArray, layout) => {
    const arranged = [...posArray];
    const centerX = 250;
    const centerY = 150;
    const radius = 80;
    
    switch (layout) {
      case 'linear':
        arranged.forEach((pos, index) => {
          pos.x = 50 + (index * 80);
          pos.y = centerY;
        });
        break;
      case 'circle':
        arranged.forEach((pos, index) => {
          const angle = (2 * Math.PI * index) / arranged.length;
          pos.x = centerX + radius * Math.cos(angle);
          pos.y = centerY + radius * Math.sin(angle);
        });
        break;
      case 'cross':
        if (arranged.length >= 3) {
          arranged[0].x = centerX;
          arranged[0].y = centerY - 80;
          arranged[1].x = centerX - 80;
          arranged[1].y = centerY;
          arranged[2].x = centerX;
          arranged[2].y = centerY + 80;
          if (arranged.length >= 4) {
            arranged[3].x = centerX + 80;
            arranged[3].y = centerY;
          }
          if (arranged.length >= 5) {
            arranged[4].x = centerX;
            arranged[4].y = centerY;
          }
        }
        break;
      default:
        break;
    }
    
    setPositions(arranged);
  };

  // ===================================
  // STEP NAVIGATION
  // ===================================
  const handleNextStep = () => {
    if (currentStep === 1) {
      const validationErrors = validateStep1();
      if (Object.keys(validationErrors).length > 0) {
        setFormData(prev => ({ ...prev, errors: validationErrors }));
        return;
      }
      generatePositions(formData.card_count || 1);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const validationErrors = validateStep2();
      if (Object.keys(validationErrors).length > 0) {
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ===================================
  // VALIDATION - SINGLE FIELD APPROACH
  // ===================================
  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = currentLanguage === 'ar' ? 'اسم الانتشار مطلوب' : 'Spread name is required';
    }
    
    if (!formData.description?.trim()) {
      newErrors.description = currentLanguage === 'ar' ? 'وصف الانتشار مطلوب' : 'Spread description is required';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = currentLanguage === 'ar' ? 'يجب اختيار فئة' : 'Category is required';
    }
    
    if (!formData.deck_id) {
      newErrors.deck_id = currentLanguage === 'ar' ? 'يجب اختيار مجموعة البطاقات' : 'Deck is required';
    }
    
    if (!formData.card_count || formData.card_count < 1) {
      newErrors.card_count = currentLanguage === 'ar' ? 'عدد البطاقات يجب أن يكون 1 أو أكثر' : 'Card count must be 1 or more';
    }
    
    if (!formData.spread_type) {
      newErrors.spread_type = currentLanguage === 'ar' ? 'يجب اختيار نوع الانتشار' : 'Spread type is required';
    }
    
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (formData.spread_type === 'manual') {
      if (!draggedPositions.length) {
        newErrors.layout = currentLanguage === 'ar' ? 'يجب ترتيب البطاقات' : 'Cards must be arranged';
      }
    }
    
    return newErrors;
  };

  // ===================================
  // FORM SUBMISSION
  // ===================================
  const handleFinalSubmit = async () => {
    const validationErrors = validateFinalData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setFormData(prev => ({ ...prev, errors: validationErrors }));
      return;
    }

    // Prepare data for submission
    const submitData = {
      name: formData.name,
      name_language: formData.name_language,
      description: formData.description,
      description_language: formData.description_language,
      category_id: formData.category_id,
      deck_id: formData.deck_id,
      card_count: formData.card_count,
      spread_type: formData.spread_type,
      difficulty_level: formData.difficulty_level,
      layout_type: layoutType,
      positions: formData.spread_type === 'manual' ? draggedPositions : positions,
      created_by: authUser?.id
    };

    try {
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting spread:', error);
      setFormData(prev => ({ 
        ...prev, 
        errors: { 
          submit: currentLanguage === 'ar' ? 'خطأ في الإرسال' : 'Submission error' 
        } 
      }));
    }
  };

  const validateFinalData = (data) => {
    const newErrors = {};
    
    if (!data.name?.trim()) {
      newErrors.name = currentLanguage === 'ar' ? 'اسم الانتشار مطلوب' : 'Spread name is required';
    }
    
    if (!data.description?.trim()) {
      newErrors.description = currentLanguage === 'ar' ? 'وصف الانتشار مطلوب' : 'Spread description is required';
    }
    
    if (!data.category_id) {
      newErrors.category_id = currentLanguage === 'ar' ? 'يجب اختيار فئة' : 'Category is required';
    }
    
    if (!data.deck_id) {
      newErrors.deck_id = currentLanguage === 'ar' ? 'يجب اختيار مجموعة البطاقات' : 'Deck is required';
    }
    
    if (!data.card_count || data.card_count < 1) {
      newErrors.card_count = currentLanguage === 'ar' ? 'عدد البطاقات يجب أن يكون 1 أو أكثر' : 'Card count must be 1 or more';
    }
    
    if (!data.spread_type) {
      newErrors.spread_type = currentLanguage === 'ar' ? 'يجب اختيار نوع الانتشار' : 'Spread type is required';
    }
    
    return newErrors;
  };

  // ===================================
  // POSITION HANDLERS
  // ===================================
  const convertToManual = () => {
    setDraggedPositions([...positions]);
  };

  const updatePositionName = (positionId, name) => {
    setPositions(prev => prev.map(pos => 
      pos.id === positionId 
        ? { ...pos, name, name_language: currentLanguage }
        : pos
    ));
    
    if (draggedPositions.length > 0) {
      setDraggedPositions(prev => prev.map(pos => 
        pos.id === positionId 
          ? { ...pos, name, name_language: currentLanguage }
          : pos
      ));
    }
  };

  const handleDragPosition = (positionId, newX, newY) => {
    setDraggedPositions(prev => prev.map(pos => 
      pos.id === positionId 
        ? { ...pos, x: newX, y: newY }
        : pos
    ));
  };

  const resetLayout = () => {
    generatePositions(formData.card_count || 1, layoutType);
    setDraggedPositions([]);
  };

  // ===================================
  // RENDER HELPERS
  // ===================================
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo />;
      case 2:
        return formData.spread_type === 'auto' ? <Step2AutoSpread /> : <Step2ManualSpread />;
      case 3:
        return <Step3FinalReview />;
      default:
        return null;
    }
  };

  // ===================================
  // STEP COMPONENTS
  // ===================================
  const Step1BasicInfo = () => {
    return (
      <div className="space-y-6 w-full min-w-0" style={{ width: '100%' }}>
        {/* Name Field */}
        <div className="w-full min-w-0" style={{ width: '100%' }}>
          <SmartBilingualField
            label={currentLanguage === 'ar' ? 'اسم الانتشار' : 'Spread Name'}
            field="name"
            value={formData.name}
            onChange={(value) => handleFormDataChange('name', value)}
            required
            placeholder={currentLanguage === 'ar' ? 'أدخل اسم الانتشار' : 'Enter spread name'}
            className="w-full"
            style={{ width: '100%' }}
          />
          {(formData.errors?.name || errors?.name) && (
            <p className="text-red-400 text-sm mt-1">{formData.errors?.name || errors?.name}</p>
          )}
        </div>

        {/* Description Field */}
        <div className="w-full min-w-0" style={{ width: '100%' }}>
          <SmartBilingualField
            label={currentLanguage === 'ar' ? 'الوصف' : 'Description'}
            field="description"
            value={formData.description}
            onChange={(value) => handleFormDataChange('description', value)}
            type="textarea"
            rows={4}
            required
            placeholder={currentLanguage === 'ar' ? 'أدخل وصف الانتشار' : 'Enter spread description'}
            className="w-full"
            style={{ width: '100%' }}
          />
          {(formData.errors?.description || errors?.description) && (
            <p className="text-red-400 text-sm mt-1">{formData.errors?.description || errors?.description}</p>
          )}
        </div>

        <div className={getResponsiveGridClasses(direction)}>
          {/* Category Selection */}
          <div className="w-full min-w-0" style={{ width: '100%' }}>
            <label className={getLabelClasses(direction)}>
              {currentLanguage === 'ar' ? 'الفئة' : 'Category'} <span className="text-red-400">*</span>
            </label>
            <select
              name="category_id"
              value={formData.category_id || ''}
              onChange={handleInputChange}
              className={getFormFieldClasses(direction)}
            >
              <option value="">
                {currentLanguage === 'ar' ? 'اختر فئة' : 'Select Category'}
              </option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {currentLanguage === 'ar' ? category.name_ar : category.name_en}
                </option>
              ))}
            </select>
            {(formData.errors?.category_id || errors?.category_id) && (
              <p className={getValidationErrorClasses(direction)}>{formData.errors?.category_id || errors?.category_id}</p>
            )}
          </div>

          {/* Deck Selection */}
          <div className="w-full min-w-0" style={{ width: '100%' }}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {currentLanguage === 'ar' ? 'مجموعة البطاقات' : 'Deck'} <span className="text-red-400">*</span>
            </label>
            <select
              name="deck_id"
              value={formData.deck_id || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white hover:border-gray-500 transition-all duration-200"
              style={{ width: '100%' }}
            >
              <option value="">
                {currentLanguage === 'ar' ? 'اختر مجموعة البطاقات' : 'Select Deck'}
              </option>
              {decks.map(deck => (
                <option key={deck.id} value={deck.id}>
                  {currentLanguage === 'ar' ? deck.name_ar : deck.name_en}
                </option>
              ))}
            </select>
            {(formData.errors?.deck_id || errors?.deck_id) && (
              <p className="text-red-400 text-sm mt-1">{formData.errors?.deck_id || errors?.deck_id}</p>
            )}
          </div>

          {/* Card Count */}
          <div className="w-full min-w-0" style={{ width: '100%' }}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {currentLanguage === 'ar' ? 'عدد البطاقات' : 'Card Count'} <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              name="card_count"
              value={formData.card_count || 1}
              onChange={handleInputChange}
              min="1"
              max="50"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white hover:border-gray-500 transition-all duration-200"
              style={{ width: '100%' }}
            />
            {(formData.errors?.card_count || errors?.card_count) && (
              <p className="text-red-400 text-sm mt-1">{formData.errors?.card_count || errors?.card_count}</p>
            )}
          </div>

          {/* Spread Type */}
          <div className="w-full min-w-0" style={{ width: '100%' }}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {currentLanguage === 'ar' ? 'نوع الانتشار' : 'Spread Type'} <span className="text-red-400">*</span>
            </label>
            <select
              name="spread_type"
              value={formData.spread_type || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white hover:border-gray-500 transition-all duration-200"
              style={{ width: '100%' }}
            >
              <option value="">
                {currentLanguage === 'ar' ? 'اختر نوع الانتشار' : 'Select Spread Type'}
              </option>
              <option value="auto">
                {currentLanguage === 'ar' ? 'تلقائي' : 'Auto'}
              </option>
              <option value="manual">
                {currentLanguage === 'ar' ? 'يدوي' : 'Manual'}
              </option>
            </select>
            {(formData.errors?.spread_type || errors?.spread_type) && (
              <p className="text-red-400 text-sm mt-1">{formData.errors?.spread_type || errors?.spread_type}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Step2AutoSpread = () => (
    <div className="space-y-6 w-full">
      <h3 className="text-xl font-semibold text-white mb-4">
        {currentLanguage === 'ar' ? 'تخطيط تلقائي' : 'Auto Layout'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {['linear', 'circle', 'cross'].map((layout) => (
          <button
            key={layout}
            onClick={() => {
              setLayoutType(layout);
              generatePositions(formData.card_count || 1, layout);
            }}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
              layoutType === layout
                ? 'border-purple-500 bg-purple-600/20'
                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
            }`}
          >
            <div className="text-white font-medium mb-2 capitalize">{layout}</div>
            <div className="text-sm text-gray-400">
              {layout === 'linear' && (currentLanguage === 'ar' ? 'خطي' : 'Linear')}
              {layout === 'circle' && (currentLanguage === 'ar' ? 'دائري' : 'Circular')}
              {layout === 'cross' && (currentLanguage === 'ar' ? 'صليبي' : 'Cross')}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg p-4 w-full">
        <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
          {positions.map((pos, index) => (
            <div
              key={pos.id}
              className="absolute w-8 h-12 bg-purple-600 rounded-sm flex items-center justify-center text-white text-xs font-bold transition-all duration-200"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: `rotate(${pos.rotation}deg)`
              }}
            >
              {pos.number}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const Step2ManualSpread = () => (
    <div className="space-y-6 w-full">
      <h3 className="text-xl font-semibold text-white mb-4">
        {currentLanguage === 'ar' ? 'تخطيط يدوي' : 'Manual Layout'}
      </h3>
      
      <div className="bg-gray-800 rounded-lg p-4 w-full">
        <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
          {draggedPositions.map((pos, index) => (
            <div
              key={pos.id}
              className="absolute w-8 h-12 bg-purple-600 rounded-sm flex items-center justify-center text-white text-xs font-bold cursor-move transition-all duration-200"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: `rotate(${pos.rotation}deg)`
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX - pos.x;
                const startY = e.clientY - pos.y;
                
                const handleMouseMove = (e) => {
                  handleDragPosition(pos.id, e.clientX - startX, e.clientY - startY);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              {pos.number}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex gap-4 w-full">
        <button
          onClick={convertToManual}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
        >
          {currentLanguage === 'ar' ? 'تحويل إلى يدوي' : 'Convert to Manual'}
        </button>
        <button
          onClick={resetLayout}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
        >
          {currentLanguage === 'ar' ? 'إعادة تعيين' : 'Reset Layout'}
        </button>
      </div>
    </div>
  );

  const Step3FinalReview = () => (
    <div className="space-y-6 w-full">
      <h3 className="text-xl font-semibold text-white mb-4">
        {currentLanguage === 'ar' ? 'مراجعة نهائية' : 'Final Review'}
      </h3>
      
      <div className="bg-gray-800 rounded-lg p-6 space-y-4 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div className="w-full">
            <h4 className="font-medium text-gray-300 mb-2">
              {currentLanguage === 'ar' ? 'الاسم:' : 'Name:'}
            </h4>
            <p className="text-white">
              {formData.name}
            </p>
          </div>
          
          <div className="w-full">
            <h4 className="font-medium text-gray-300 mb-2">
              {currentLanguage === 'ar' ? 'عدد البطاقات:' : 'Card Count:'}
            </h4>
            <p className="text-white">{formData.card_count}</p>
          </div>
        </div>

        <div className="w-full">
          <h4 className="font-medium text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'الوصف:' : 'Description:'}
          </h4>
          <p className="text-white">
            {formData.description}
          </p>
        </div>

        <div className="w-full">
          <h4 className="font-medium text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'نوع الانتشار:' : 'Spread Type:'}
          </h4>
          <p className="text-white capitalize">{formData.spread_type}</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 w-full">
          <h4 className="font-medium text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'معاينة التخطيط:' : 'Layout Preview:'}
          </h4>
          <div className="relative w-full h-48 bg-gray-800 rounded-lg overflow-hidden">
            {(formData.spread_type === 'manual' ? draggedPositions : positions).map((pos, index) => (
              <div
                key={pos.id}
                className="absolute w-6 h-10 bg-purple-600 rounded-sm flex items-center justify-center text-white text-xs font-bold"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: `rotate(${pos.rotation}deg)`
                }}
              >
                {pos.number}
              </div>
            ))}
          </div>
        </div>

        {(formData.errors?.positions || errors?.positions) && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 w-full">
            <p className="text-red-400 text-sm">
              {formData.errors?.positions || errors?.positions}
            </p>
          </div>
        )}
        
        {(formData.errors?.layout_type || errors?.layout_type) && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 w-full">
            <p className="text-red-400 text-sm">
              {formData.errors?.layout_type || errors?.layout_type}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full min-w-0" dir={direction} style={{ width: '100%', maxWidth: 'none' }}>
      {/* Form Title */}
      <div className="text-center mb-6 w-full">
        <h2 className="text-2xl font-bold text-white">
          {isEditMode 
            ? (currentLanguage === 'ar' ? 'تحرير انتشار التاروت' : 'Edit Tarot Spread')
            : (currentLanguage === 'ar' ? 'إضافة انتشار جديد' : 'Add New Spread')
          }
        </h2>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8 w-full">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === currentStep
                ? 'bg-purple-600 text-white'
                : step < currentStep
                ? 'bg-green-600 text-white'
                : 'bg-gray-600 text-gray-300'
            }`}>
              {step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-0.5 transition-colors ${
                step < currentStep ? 'bg-green-600' : 'bg-gray-600'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="w-full min-w-0" style={{ width: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-8 w-full min-w-0"
            style={{ width: '100%' }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-700 w-full">
        <button
          onClick={handlePrevStep}
          disabled={currentStep === 1}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            currentStep === 1
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-500 text-white'
          }`}
        >
          {currentLanguage === 'ar' ? 'السابق' : 'Previous'}
        </button>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium text-white transition-colors"
          >
            {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          
          {currentStep < 3 ? (
            <button
              onClick={handleNextStep}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white transition-colors"
            >
              {currentLanguage === 'ar' ? 'التالي' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-colors"
            >
              {isEditMode 
                ? (currentLanguage === 'ar' ? 'تحديث الانتشار' : 'Update Spread')
                : (currentLanguage === 'ar' ? 'إنشاء الانتشار' : 'Create Spread')
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddNewSpreadForm; 