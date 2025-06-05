import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  RotateCcw, 
  Grid3X3, 
  Circle, 
  Minus, 
  Save,
  Maximize2,
  X,
  CheckCircle,
  Plus,
  Copy,
  Trash2
} from 'lucide-react';
import { useUI } from '../../context/UIContext';

const SpreadPositionEditor = ({ 
  cardCount, 
  positions = [], 
  onPositionsChange,
  onSave,
  onCancel,
  spreadName = ''
}) => {
  const { t } = useTranslation();
  const { language } = useUI();
  const canvasRef = useRef(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Add validation state
  const [validationErrors, setValidationErrors] = useState([]);

  // Validation function
  const validatePositions = useCallback(() => {
    const errors = [];
    
    currentPositions.forEach((position, index) => {
      const positionNum = index + 1;
      
      if (!position.name || !position.name.trim()) {
        errors.push(`Position ${positionNum}: English name is required`);
      }
      
      if (!position.name_ar || !position.name_ar.trim()) {
        errors.push(`Position ${positionNum}: Arabic name is required`);
      }
      
      if (!position.meaning || !position.meaning.trim()) {
        errors.push(`Position ${positionNum}: English meaning is required`);
      }
      
      if (!position.meaning_ar || !position.meaning_ar.trim()) {
        errors.push(`Position ${positionNum}: Arabic meaning is required`);
      }
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [currentPositions]);

  // Initialize positions if empty or count mismatch
  const [currentPositions, setCurrentPositions] = useState(() => {
    if (positions.length === cardCount) {
      return positions;
    }
    
    // Generate default positions in a grid layout
    const defaultPositions = [];
    const cols = Math.ceil(Math.sqrt(cardCount));
    const rows = Math.ceil(cardCount / cols);
    
    for (let i = 0; i < cardCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      defaultPositions.push({
        position: i + 1,
        name: `Position ${i + 1}`,
        name_ar: `الموضع ${i + 1}`,
        meaning: `Meaning for position ${i + 1}`,
        meaning_ar: `معنى الموضع ${i + 1}`,
        x: (col / Math.max(cols - 1, 1)) * 80 + 10,
        y: (row / Math.max(rows - 1, 1)) * 80 + 10
      });
    }
    return defaultPositions;
  });

  const snapToGridPosition = useCallback((x, y) => {
    if (!snapToGrid) return { x, y };
    
    const gridSize = 5; // 5% grid
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }, [snapToGrid]);

  const getCanvasPosition = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    return snapToGridPosition(
      Math.max(0, Math.min(100, x)),
      Math.max(0, Math.min(100, y))
    );
  }, [snapToGridPosition]);

  const handleMouseDown = (e, cardIndex) => {
    e.preventDefault();
    setDraggedCard(cardIndex);
    setSelectedCard(cardIndex);
  };

  const handleMouseMove = useCallback((e) => {
    if (draggedCard === null) return;
    
    const newPosition = getCanvasPosition(e.clientX, e.clientY);
    
    setCurrentPositions(prev => prev.map((pos, index) => 
      index === draggedCard 
        ? { ...pos, x: newPosition.x, y: newPosition.y }
        : pos
    ));
  }, [draggedCard, getCanvasPosition]);

  const handleMouseUp = useCallback(() => {
    if (draggedCard !== null) {
      setDraggedCard(null);
      onPositionsChange?.(currentPositions);
    }
  }, [draggedCard, currentPositions, onPositionsChange]);

  // Mouse event listeners
  React.useEffect(() => {
    if (draggedCard !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedCard, handleMouseMove, handleMouseUp]);

  const handlePositionEdit = (index, field, value) => {
    setCurrentPositions(prev => prev.map((pos, i) => 
      i === index ? { ...pos, [field]: value } : pos
    ));
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const resetToGrid = () => {
    const cols = Math.ceil(Math.sqrt(cardCount));
    const rows = Math.ceil(cardCount / cols);
    
    const gridPositions = currentPositions.map((pos, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      return {
        ...pos,
        x: (col / Math.max(cols - 1, 1)) * 80 + 10,
        y: (row / Math.max(rows - 1, 1)) * 80 + 10
      };
    });
    
    setCurrentPositions(gridPositions);
    onPositionsChange?.(gridPositions);
  };

  const resetToCircle = () => {
    const radius = 35;
    const centerX = 50;
    const centerY = 50;
    
    const circlePositions = currentPositions.map((pos, i) => {
      const angle = (i / cardCount) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      return {
        ...pos,
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y))
      };
    });
    
    setCurrentPositions(circlePositions);
    onPositionsChange?.(circlePositions);
  };

  const resetToLine = () => {
    const linePositions = currentPositions.map((pos, i) => ({
      ...pos,
      x: (i / Math.max(cardCount - 1, 1)) * 80 + 10,
      y: 50
    }));
    
    setCurrentPositions(linePositions);
    onPositionsChange?.(linePositions);
  };

  const duplicatePosition = (index) => {
    if (currentPositions.length >= 15) {
      return;
    }
    
    const originalPos = currentPositions[index];
    const newPosition = {
      ...originalPos,
      position: currentPositions.length + 1,
      name: `${originalPos.name} Copy`,
      name_ar: `${originalPos.name_ar} نسخة`,
      x: Math.min(95, originalPos.x + 5),
      y: Math.min(95, originalPos.y + 5)
    };
    
    setCurrentPositions([...currentPositions, newPosition]);
  };

  const deletePosition = (index) => {
    if (currentPositions.length <= 1) {
      return;
    }
    
    const newPositions = currentPositions
      .filter((_, i) => i !== index)
      .map((pos, i) => ({ ...pos, position: i + 1 }));
    
    setCurrentPositions(newPositions);
    setSelectedCard(null);
  };

  const addNewPosition = () => {
    if (currentPositions.length >= 15) {
      return;
    }
    
    const newPosition = {
      position: currentPositions.length + 1,
      name: `Position ${currentPositions.length + 1}`,
      name_ar: `الموضع ${currentPositions.length + 1}`,
      meaning: `Meaning for position ${currentPositions.length + 1}`,
      meaning_ar: `معنى الموضع ${currentPositions.length + 1}`,
      x: 50,
      y: 50
    };
    
    setCurrentPositions([...currentPositions, newPosition]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'ar' ? 'محرر مواضع الانتشار' : 'Spread Position Editor'}
        </h2>
        {spreadName && (
          <p className="text-gray-300">
            {spreadName} - {language === 'ar' ? `${cardCount} ورقة` : `${cardCount} cards`}
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-dark-800/50 border border-white/20 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 font-medium">
            {language === 'ar' ? 'تخطيطات:' : 'Layouts:'}
          </span>
          <motion.button
            onClick={resetToGrid}
            whileHover={{ scale: 1.05 }}
            className="p-2 bg-dark-700/50 border border-white/20 rounded-lg hover:bg-dark-600/50 transition-colors"
            title={language === 'ar' ? 'شبكة' : 'Grid'}
          >
            <Grid3X3 className="w-4 h-4 text-white" />
          </motion.button>
          
          <motion.button
            onClick={resetToCircle}
            whileHover={{ scale: 1.05 }}
            className="p-2 bg-dark-700/50 border border-white/20 rounded-lg hover:bg-dark-600/50 transition-colors"
            title={language === 'ar' ? 'دائرة' : 'Circle'}
          >
            <Circle className="w-4 h-4 text-white" />
          </motion.button>
          
          <motion.button
            onClick={resetToLine}
            whileHover={{ scale: 1.05 }}
            className="p-2 bg-dark-700/50 border border-white/20 rounded-lg hover:bg-dark-600/50 transition-colors"
            title={language === 'ar' ? 'خط' : 'Line'}
          >
            <Minus className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setShowGrid(!showGrid)}
            whileHover={{ scale: 1.05 }}
            className={`p-2 border rounded-lg transition-colors ${
              showGrid 
                ? 'bg-gold-600/20 border-gold-400/50 text-gold-300' 
                : 'bg-dark-700/50 border-white/20 text-white hover:bg-dark-600/50'
            }`}
            title={language === 'ar' ? 'إظهار الشبكة' : 'Show Grid'}
          >
            <Grid3X3 className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            onClick={() => setSnapToGrid(!snapToGrid)}
            whileHover={{ scale: 1.05 }}
            className={`p-2 border rounded-lg transition-colors ${
              snapToGrid 
                ? 'bg-blue-600/20 border-blue-400/50 text-blue-300' 
                : 'bg-dark-700/50 border-white/20 text-white hover:bg-dark-600/50'
            }`}
            title={language === 'ar' ? 'محاذاة للشبكة' : 'Snap to Grid'}
          >
            <Maximize2 className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">
            {language === 'ar' ? `المواضع: ${currentPositions.length}` : `Positions: ${currentPositions.length}`}
          </span>
          
          <motion.button
            onClick={addNewPosition}
            disabled={currentPositions.length >= 15}
            whileHover={{ scale: 1.05 }}
            className="p-2 bg-green-600/20 border border-green-400/50 text-green-300 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={language === 'ar' ? 'إضافة موضع' : 'Add Position'}
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full h-96 bg-dark-900/50 border border-white/20 rounded-2xl overflow-hidden">
        {/* Grid overlay */}
        {showGrid && (
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 21 }).map((_, i) => (
              <div key={`v-${i}`} 
                   className="absolute top-0 bottom-0 w-px bg-white/30" 
                   style={{ left: `${i * 5}%` }} />
            ))}
            {Array.from({ length: 21 }).map((_, i) => (
              <div key={`h-${i}`} 
                   className="absolute left-0 right-0 h-px bg-white/30" 
                   style={{ top: `${i * 5}%` }} />
            ))}
          </div>
        )}
        
        {/* Canvas area */}
        <div 
          ref={canvasRef}
          className="relative w-full h-full cursor-crosshair"
        >
          {currentPositions.map((position, index) => (
            <motion.div
              key={index}
              className={`absolute cursor-move group ${
                selectedCard === index ? 'z-20' : 'z-10'
              }`}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onMouseDown={(e) => handleMouseDown(e, index)}
              onClick={() => setSelectedCard(selectedCard === index ? null : index)}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: draggedCard === index ? 1.1 : 1
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Card representation */}
              <div className={`relative w-12 h-16 rounded-lg border-2 transition-all duration-200 ${
                selectedCard === index 
                  ? 'border-gold-400 shadow-lg shadow-gold-400/50' 
                  : draggedCard === index
                    ? 'border-blue-400 shadow-lg shadow-blue-400/50'
                    : 'border-white/40 hover:border-white/60'
              }`}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-lg" />
                <div className="absolute inset-1 bg-gradient-to-br from-gold-400/20 to-gold-600/20 rounded border border-gold-400/30" />
                
                {/* Position number */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{position.position}</span>
                </div>
                
                {/* Position label */}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="text-xs text-white font-medium bg-dark-800/80 px-2 py-1 rounded">
                    {language === 'ar' && position.name_ar ? position.name_ar : position.name}
                  </div>
                </div>
                
                {/* Selection indicator */}
                {selectedCard === index && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-gold-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-dark-900" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Position details */}
      <AnimatePresence>
        {selectedCard !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-dark-800/50 border border-white/20 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">
                {language === 'ar' ? `الموضع ${currentPositions[selectedCard].position}` : `Position ${currentPositions[selectedCard].position}`}
              </h4>
              
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => duplicatePosition(selectedCard)}
                  whileHover={{ scale: 1.05 }}
                  className="p-2 bg-blue-600/20 border border-blue-400/50 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-colors"
                  title={language === 'ar' ? 'نسخ' : 'Duplicate'}
                >
                  <Copy className="w-4 h-4" />
                </motion.button>
                
                <motion.button
                  onClick={() => deletePosition(selectedCard)}
                  disabled={currentPositions.length <= 1}
                  whileHover={{ scale: 1.05 }}
                  className="p-2 bg-red-600/20 border border-red-400/50 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={language === 'ar' ? 'حذف' : 'Delete'}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'الاسم' : 'Name'}
                </label>
                <input
                  type="text"
                  value={currentPositions[selectedCard].name}
                  onChange={(e) => handlePositionEdit(selectedCard, 'name', e.target.value)}
                  className="w-full px-3 py-2 bg-dark-700/50 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
                  placeholder={language === 'ar' ? 'اسم الموضع' : 'Position name'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}
                </label>
                <input
                  type="text"
                  value={currentPositions[selectedCard].name_ar}
                  onChange={(e) => handlePositionEdit(selectedCard, 'name_ar', e.target.value)}
                  className="w-full px-3 py-2 bg-dark-700/50 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
                  placeholder={language === 'ar' ? 'الاسم بالعربية' : 'Arabic name'}
                  dir="rtl"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'المعنى' : 'Meaning'}
                </label>
                <textarea
                  value={currentPositions[selectedCard].meaning}
                  onChange={(e) => handlePositionEdit(selectedCard, 'meaning', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-700/50 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 resize-none"
                  placeholder={language === 'ar' ? 'معنى هذا الموضع' : 'Meaning of this position'}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'المعنى بالعربية' : 'Arabic Meaning'}
                </label>
                <textarea
                  value={currentPositions[selectedCard].meaning_ar}
                  onChange={(e) => handlePositionEdit(selectedCard, 'meaning_ar', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-700/50 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 resize-none"
                  placeholder={language === 'ar' ? 'المعنى بالعربية' : 'Arabic meaning'}
                  dir="rtl"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onCancel}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600/20 border border-gray-400/50 text-gray-300 rounded-xl hover:bg-gray-600/30 transition-colors"
          >
            <X className="w-4 h-4" />
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </motion.button>
          
          <motion.button
            onClick={() => {
              setCurrentPositions(positions);
              onPositionsChange?.(positions);
            }}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-6 py-3 bg-yellow-600/20 border border-yellow-400/50 text-yellow-300 rounded-xl hover:bg-yellow-600/30 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
          </motion.button>
        </div>
        
        <motion.button
          onClick={() => {
            if (validatePositions()) {
              onSave(currentPositions);
            }
          }}
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-gold-400 to-gold-600 text-dark-900 font-bold rounded-xl hover:shadow-lg hover:shadow-gold-400/25 transition-all duration-300"
        >
          <Save className="w-4 h-4" />
          {language === 'ar' ? 'حفظ التخطيط' : 'Save Layout'}
        </motion.button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-900/20 border border-red-400/30 rounded-xl">
          <h4 className="text-red-300 font-semibold mb-2">
            {language === 'ar' ? 'يرجى إصلاح الأخطاء التالية:' : 'Please fix the following errors:'}
          </h4>
          <ul className="text-red-200 text-sm space-y-1 list-disc list-inside">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-blue-900/20 border border-blue-400/30 rounded-xl">
        <h4 className="text-blue-300 font-semibold mb-2">
          {language === 'ar' ? 'تعليمات:' : 'Instructions:'}
        </h4>
        <ul className="text-blue-200 text-sm space-y-1 list-disc list-inside">
          <li>{language === 'ar' ? 'اسحب وأفلت الأوراق لتحريكها' : 'Drag and drop cards to move them'}</li>
          <li>{language === 'ar' ? 'انقر على ورقة لتحديدها وتحرير تفاصيلها' : 'Click a card to select and edit its details'}</li>
          <li>{language === 'ar' ? 'استخدم التخطيطات المسبقة للبدء السريع' : 'Use preset layouts for quick start'}</li>
          <li>{language === 'ar' ? 'فعّل المحاذاة للشبكة للحصول على تخطيط منظم' : 'Enable snap to grid for organized layout'}</li>
          <li className="text-yellow-300 font-medium">{language === 'ar' ? 'ملء جميع الحقول مطلوب لكل موضع' : 'All fields are required for each position'}</li>
        </ul>
      </div>
    </div>
  );
};

export default SpreadPositionEditor; 