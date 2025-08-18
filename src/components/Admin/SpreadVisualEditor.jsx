import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2,
  Grid,
  Circle,
  Square,
  Shuffle,
  MousePointer,
  GripVertical,
  Move,
  RotateCw,
  Settings,
  Palette,
  Edit3
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import BilingualInput from '../UI/BilingualInput';
import BilingualTextarea from '../UI/BilingualTextarea';
import AdminLanguageToggle from '../UI/AdminLanguageToggle';

const SpreadVisualEditor = ({ 
  spread, 
  onSave, 
  onClose, 
  isAdmin = false, 
  language = 'en',
  isCreateMode = false,
  isEmbedded = false 
}) => {
  // ✅ PURE LANGUAGE CONTEXT: Use useLanguage hook instead of direct context import
  const { 
    currentLanguage, 
    getLocalizedText
  } = useLanguage();

  // Use currentLanguage from context instead of prop
  const currentLang = currentLanguage;

  // Enhanced drag-and-drop functionality
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState(null);
  const [tempPositionName, setTempPositionName] = useState('');
  const dragCounter = useRef(0);

  // Parse spread data and ensure positions are properly formatted - Single-language UX
  const parseSpreadData = (spread) => {
    let positions = [];
    
    // Try to parse positions from different possible sources
    if (spread.positions && Array.isArray(spread.positions)) {
      positions = spread.positions.map((pos, index) => ({
        id: pos.id || `pos_${index}`,
        position: pos.position || index + 1,
        name: getLocalizedText(pos, 'name') || getLocalizedText(pos, 'position_name') || 
              (currentLang === 'ar' ? `الموضع ${index + 1}` : `Position ${index + 1}`),
        meaning: getLocalizedText(pos, 'meaning') || 
                (currentLang === 'ar' ? `معنى الموضع ${index + 1}` : `Meaning ${index + 1}`),
        x: pos.x || 50,
        y: pos.y || 50,
        card_id: pos.card_id || null
      }));
    } else if (spread.cards && Array.isArray(spread.cards)) {
      // Convert cards array to positions format
      positions = spread.cards.map((card, index) => ({
        id: card.id || `pos_${index}`,
        position: index + 1,
        name: getLocalizedText(card, 'position_name') || 
              (currentLang === 'ar' ? `الموضع ${index + 1}` : `Position ${index + 1}`),
        meaning: getLocalizedText(card, 'meaning') || 
                (currentLang === 'ar' ? `معنى الموضع ${index + 1}` : `Meaning ${index + 1}`),
        x: card.x || 50,
        y: card.y || 50,
        card_id: card.card_id || null
      }));
    } else if (typeof spread.positions === 'string') {
      // Try to parse JSON string
      try {
        const parsed = JSON.parse(spread.positions);
        positions = parsed.map((pos, index) => ({
          id: pos.id || `pos_${index}`,
          position: pos.position || index + 1,
          name: getLocalizedText(pos, 'name') || getLocalizedText(pos, 'position_name') || 
                (currentLang === 'ar' ? `الموضع ${index + 1}` : `Position ${index + 1}`),
          meaning: getLocalizedText(pos, 'meaning') || 
                  (currentLang === 'ar' ? `معنى الموضع ${index + 1}` : `Meaning ${index + 1}`),
          x: pos.x || 50,
          y: pos.y || 50,
          card_id: pos.card_id || null
        }));
      } catch (e) {
        console.warn('Failed to parse positions JSON:', e);
        positions = [];
      }
    }
    
    return {
      ...spread,
      name: getLocalizedText(spread, 'name') || '',
      description: getLocalizedText(spread, 'description') || '',
      positions: positions
    };
  };

  // Single-language editedSpread state
  const [editedSpread, setEditedSpread] = useState(() => 
    isCreateMode ? {
      name: '',
      description: '',
      layout_type: 'grid',
      card_count: 3,
      assignment_mode: 'manual',
      positions: []
    } : parseSpreadData(spread)
  );
  const [editingPosition, setEditingPosition] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState((spread?.assignment_mode || 'manual'));

  // Layout types
  const layoutTypes = [
    { id: 'grid', name: language === 'ar' ? 'شبكة' : 'Grid', icon: Grid },
    { id: 'circle', name: language === 'ar' ? 'دائرة' : 'Circle', icon: Circle },
    { id: 'line', name: language === 'ar' ? 'خط' : 'Line', icon: Square },
    { id: 'cross', name: language === 'ar' ? 'صليب' : 'Cross', icon: Plus }
  ];

  // Assignment modes
  const assignmentModes = [
    { 
      id: 'manual', 
      name: language === 'ar' ? 'توزيع يدوي' : 'Manual Assignment',
      description: language === 'ar' ? 'القارئ يوزع البطاقات يدوياً' : 'Reader assigns cards manually',
      icon: MousePointer
    },
    { 
      id: 'auto', 
      name: language === 'ar' ? 'توزيع تلقائي' : 'Auto Assignment',
      description: language === 'ar' ? 'النظام يوزع البطاقات تلقائياً' : 'System assigns cards automatically',
      icon: Shuffle
    }
  ];

  useEffect(() => {
    if (isCreateMode) {
      // In create mode, consider any content as changes
      const hasContent = editedSpread.name || editedSpread.description || (editedSpread.positions && editedSpread.positions.length > 0);
      setHasChanges(hasContent);
    } else {
      const hasChangesCheck = JSON.stringify(editedSpread) !== JSON.stringify(spread) || 
                             assignmentMode !== (spread?.assignment_mode || 'manual');
      setHasChanges(hasChangesCheck);
    }
  }, [editedSpread, assignmentMode, spread, isCreateMode]);

  // Drag and drop handlers
  const handleDragStart = (e, position, index) => {
    if (assignmentMode !== 'manual') return;
    
    setDraggedItem({ position, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '';
    setDraggedItem(null);
    setDragOverItem(null);
    dragCounter.current = 0;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    if (assignmentMode !== 'manual') return;
    
    e.preventDefault();
    dragCounter.current++;
    setDragOverItem(index);
  };

  const handleDragLeave = (e) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverItem(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (assignmentMode !== 'manual' || !draggedItem) return;
    
    const updatedPositions = [...(editedSpread.positions || [])];
    const draggedPos = updatedPositions[draggedItem.index];
    
    // Remove the dragged item
    updatedPositions.splice(draggedItem.index, 1);
    
    // Insert at new position
    updatedPositions.splice(dropIndex, 0, draggedPos);
    
    // Update position numbers
    const reorderedPositions = updatedPositions.map((pos, index) => ({
      ...pos,
      position: index + 1
    }));

    setEditedSpread({
      ...editedSpread,
      positions: reorderedPositions
    });
    
    setDraggedItem(null);
    setDragOverItem(null);
    dragCounter.current = 0;
  };

  const handlePositionEdit = (positionIndex, field, value) => {
    const updatedPositions = [...(editedSpread.positions || [])];
    updatedPositions[positionIndex] = {
      ...updatedPositions[positionIndex],
      [field]: value
    };

    setEditedSpread({
      ...editedSpread,
      positions: updatedPositions
    });
  };

  const startEditingPositionName = (position, index) => {
    setEditingPositionId(position.id);
    setTempPositionName(position.name);
  };

  const savePositionName = (positionIndex) => {
    if (tempPositionName.trim()) {
      handlePositionEdit(positionIndex, 'name', tempPositionName.trim());
    }
    setEditingPositionId(null);
    setTempPositionName('');
  };

  const cancelEditingPositionName = () => {
    setEditingPositionId(null);
    setTempPositionName('');
  };

  // Keyboard navigation support
  const handleKeyDown = (e, position, index) => {
    if (assignmentMode !== 'manual') return;
    
    const positions = editedSpread.positions || [];
    const currentIndex = index;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          // Move position up
          const newPositions = [...positions];
          [newPositions[currentIndex], newPositions[currentIndex - 1]] = 
          [newPositions[currentIndex - 1], newPositions[currentIndex]];
          
          const reorderedPositions = newPositions.map((pos, idx) => ({
            ...pos,
            position: idx + 1
          }));
          
          setEditedSpread({ ...editedSpread, positions: reorderedPositions });
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < positions.length - 1) {
          // Move position down
          const newPositions = [...positions];
          [newPositions[currentIndex], newPositions[currentIndex + 1]] = 
          [newPositions[currentIndex + 1], newPositions[currentIndex]];
          
          const reorderedPositions = newPositions.map((pos, idx) => ({
            ...pos,
            position: idx + 1
          }));
          
          setEditedSpread({ ...editedSpread, positions: reorderedPositions });
        }
        break;
        
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (positions.length > 1) {
          removePosition(currentIndex);
        }
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        startEditingPositionName(position, index);
        break;
        
      case 'Escape':
        e.preventDefault();
        if (editingPositionId === position.id) {
          cancelEditingPositionName();
        }
        break;
    }
  };

  const addPosition = () => {
    const newPosition = {
      id: `pos_${Date.now()}`,
      position: (editedSpread.positions?.length || 0) + 1,
      name: getLocalizedText(null, 'position_name') || 
            (currentLang === 'ar' ? `الموضع ${(editedSpread.positions?.length || 0) + 1}` : `Position ${(editedSpread.positions?.length || 0) + 1}`),
      meaning: getLocalizedText(null, 'meaning') || 
              (currentLang === 'ar' ? `معنى الموضع ${(editedSpread.positions?.length || 0) + 1}` : `Meaning ${(editedSpread.positions?.length || 0) + 1}`),
      x: 50,
      y: 50,
      card_id: null
    };

    setEditedSpread({
      ...editedSpread,
      positions: [...(editedSpread.positions || []), newPosition]
    });
    
    // Show toast feedback
    if (language === 'ar') {
      console.log('تم إضافة موضع جديد');
    } else {
      console.log('New position added');
    }
  };

  const removePosition = (positionIndex) => {
    const updatedPositions = (editedSpread.positions || []).filter((_, index) => index !== positionIndex);
    const reorderedPositions = updatedPositions.map((pos, index) => ({
      ...pos,
      position: index + 1
    }));

    setEditedSpread({
      ...editedSpread,
      positions: reorderedPositions
    });
  };

  const duplicatePosition = (positionIndex) => {
    const positions = editedSpread.positions || [];
    const positionToDuplicate = positions[positionIndex];
    
    const newPosition = {
      ...positionToDuplicate,
      id: `pos_${Date.now()}`,
      position: positions.length + 1,
      name: `${positionToDuplicate.name} (نسخة)`,
      meaning: `${positionToDuplicate.meaning} (Copy)`,
      card_id: null
    };

    setEditedSpread({
      ...editedSpread,
      positions: [...positions, newPosition]
    });
  };

  const handleSave = () => {
    const updatedSpread = {
      ...editedSpread,
      assignment_mode: assignmentMode,
      modified_by_admin: isAdmin,
      admin_modifications: hasChanges ? {
        timestamp: new Date().toISOString(),
        changes: getChanges()
      } : null
    };

    onSave(updatedSpread);
  };

  const getChanges = () => {
    const changes = [];
    
    if (editedSpread.name !== spread.name) {
      changes.push(`Name: ${spread.name} → ${editedSpread.name}`);
    }
    
    if (editedSpread.layout_type !== spread.layout_type) {
      changes.push(`Layout: ${spread.layout_type} → ${editedSpread.layout_type}`);
    }
    
    if (assignmentMode !== (spread.assignment_mode || 'manual')) {
      changes.push(`Assignment Mode: ${spread.assignment_mode || 'manual'} → ${assignmentMode}`);
    }
    
    return changes;
  };

  const renderLayoutPreview = () => {
    const positions = editedSpread.positions || [];
    const layoutType = editedSpread.layout_type || 'grid';

    if (assignmentMode === 'auto') {
      return (
        <div className="text-center py-8">
          <Shuffle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {language === 'ar' ? 'توزيع تلقائي' : 'Auto Assignment'}
          </h3>
          <p className="text-gray-400">
            {language === 'ar' 
              ? 'سيقوم النظام بتوزيع البطاقات تلقائياً على المواضع' 
              : 'System will automatically assign cards to positions'}
          </p>
        </div>
      );
    }

    const getLayoutClass = () => {
      switch (layoutType) {
        case 'grid':
          return 'grid grid-cols-3 gap-4';
        case 'circle': 
          return 'flex flex-wrap justify-center items-center gap-4';
        case 'line':
          return 'flex flex-row justify-center items-center gap-4';
        case 'cross':
          return 'grid grid-cols-3 gap-4';
        default:
          return 'grid grid-cols-3 gap-4';
      }
    };

    return (
      <div className={`${getLayoutClass()} p-4 min-h-[400px] bg-gradient-to-br from-gray-900/30 to-gray-800/30 rounded-xl`}>
        {positions.map((position, index) => (
          <motion.div
            key={position.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`
              relative group cursor-move
              ${dragOverItem === index ? 'scale-105 ring-2 ring-purple-500' : ''}
              ${draggedItem?.index === index ? 'opacity-50' : ''}
            `}
            draggable={assignmentMode === 'manual'}
            onDragStart={(e) => handleDragStart(e, position, index)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            tabIndex={assignmentMode === 'manual' ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, position, index)}
            role="button"
            aria-label={`Position ${position.position}: ${position.name}. Press Enter to edit, Arrow keys to reorder, Delete to remove.`}
          >
            {/* Position Card */}
            <div className="
              w-full h-32 
              bg-gradient-to-br from-gold-500/20 to-gold-600/30 
              border border-gold-400/50 
              rounded-xl 
              flex flex-col 
              justify-center 
              items-center 
              text-center 
              p-3
              transition-all 
              duration-200 
              hover:from-gold-500/30 hover:to-gold-600/40
              hover:border-gold-300/60
              hover:shadow-lg
              hover:shadow-gold-500/20
            ">
              {/* Drag Handle */}
              {assignmentMode === 'manual' && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-gold-400" />
                </div>
              )}
              
              {/* Position Number */}
              <div className="absolute top-2 left-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{position.position}</span>
              </div>
              
              {/* Position Name */}
              <div className="flex-1 flex items-center justify-center">
                {editingPositionId === position.id ? (
                  <input
                    type="text"
                    value={tempPositionName}
                    onChange={(e) => setTempPositionName(e.target.value)}
                    onBlur={() => savePositionName(index)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') savePositionName(index);
                      if (e.key === 'Escape') cancelEditingPositionName();
                    }}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm text-center focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                ) : (
                  <h4 
                    className="text-sm font-bold text-gold-300 cursor-pointer hover:text-gold-200 transition-colors"
                    onClick={() => startEditingPositionName(position, index)}
                  >
                    {position.name}
                  </h4>
                )}
              </div>
              
              {/* Action Buttons */}
              {assignmentMode === 'manual' && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditingPositionName(position, index)}
                    className="p-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                    title={language === 'ar' ? 'تعديل الاسم' : 'Edit Name'}
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => duplicatePosition(index)}
                    className="p-1 bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
                    title={language === 'ar' ? 'تكرار' : 'Duplicate'}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removePosition(index)}
                    className="p-1 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                    title={language === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {/* Add Position Button */}
        {assignmentMode === 'manual' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addPosition}
            className="
              w-full h-32 
              border-2 border-dashed border-gray-600 
              rounded-xl 
              flex flex-col 
              justify-center 
              items-center 
              text-gray-400 
              hover:border-purple-500 
              hover:text-purple-400 
              transition-all 
              duration-200
            "
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">
              {language === 'ar' ? 'إضافة موضع' : 'Add Position'}
            </span>
          </motion.button>
        )}
      </div>
    );
  };

  const renderEditor = () => (
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.95 }}
      className="bg-dark-800 rounded-2xl border border-purple-500/20 w-full max-w-6xl max-h-[90vh] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {isCreateMode ? 
                (language === 'ar' ? 'إنشاء انتشار جديد' : 'Create New Spread') :
                (language === 'ar' ? 'محرر الانتشار' : 'Spread Editor')
              }
            </h2>
            <p className="text-gray-400 mt-1">
              {isCreateMode ? 
                (language === 'ar' ? 'صمم انتشار مخصص مع تحكم مرئي كامل' : 'Design custom spread with full visual control') :
                (editedSpread.name || 'Untitled Spread')
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isCreateMode ? 
                  (language === 'ar' ? 'إنشاء الانتشار' : 'Create Spread') :
                  (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                }</span>
              </motion.button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area - Properly constrained with flex layout */}
        <div className="flex h-[calc(90vh-140px)] min-h-0">
          {/* Sidebar - Controls */}
          <div className="
            w-80 flex-shrink-0
            border-r border-white/10 
            overflow-y-auto overflow-x-hidden
            scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-purple-600/50
            hover:scrollbar-thumb-purple-500/70
          ">
            <div className="p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {language === 'ar' ? 'معلومات أساسية' : 'Basic Information'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {language === 'ar' ? 'اسم الانتشار (عربي)' : 'Spread Name (Arabic)'}
                      </label>
                      <input
                        type="text"
                        value={editedSpread.name || ''}
                        onChange={(e) => setEditedSpread({...editedSpread, name: e.target.value})}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50"
                        placeholder={language === 'ar' ? 'أدخل اسم الانتشار' : 'Enter spread name'}
                      />
                    </div>

                    {isCreateMode && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            {language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                          </label>
                          <textarea
                            value={editedSpread.description || ''}
                            onChange={(e) => setEditedSpread({...editedSpread, description: e.target.value})}
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 h-20"
                            placeholder={language === 'ar' ? 'أدخل وصف الانتشار' : 'Enter spread description'}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            {language === 'ar' ? 'عدد البطاقات' : 'Card Count'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="78"
                            value={editedSpread.card_count || 3}
                            onChange={(e) => setEditedSpread({...editedSpread, card_count: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {language === 'ar' ? 'نوع التخطيط' : 'Layout Type'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {layoutTypes.map((layout) => {
                          const Icon = layout.icon;
                          return (
                            <button
                              key={layout.id}
                              onClick={() => setEditedSpread({...editedSpread, layout_type: layout.id})}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                                editedSpread.layout_type === layout.id
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : 'bg-white/5 text-gray-400 border border-white/20 hover:border-gray-500/50'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm">{layout.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignment Mode */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {language === 'ar' ? 'نمط التوزيع' : 'Assignment Mode'}
                  </h3>
                  
                  <div className="space-y-3">
                    {assignmentModes.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => setAssignmentMode(mode.id)}
                          className={`w-full flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                            assignmentMode === mode.id
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-white/5 text-gray-400 border border-white/20 hover:border-gray-500/50'
                          }`}
                        >
                          <Icon className="w-5 h-5 mt-0.5" />
                          <div className="text-left">
                            <div className="font-medium">{mode.name}</div>
                            <div className="text-xs opacity-75">{mode.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Position Controls */}
                {assignmentMode === 'manual' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {language === 'ar' ? 'المواضع' : 'Positions'}
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {language === 'ar' ? 'عدد المواضع' : 'Position Count'}: {editedSpread.positions?.length || 0}
                        </span>
                        <button
                          onClick={addPosition}
                          className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm">{language === 'ar' ? 'إضافة' : 'Add'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Layout Preview */}
          <div className="
            flex-1 
            min-w-0
            overflow-y-auto overflow-x-hidden
            scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-purple-600/50
            hover:scrollbar-thumb-purple-500/70
          ">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">
                  {language === 'ar' ? 'معاينة التخطيط' : 'Layout Preview'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {assignmentMode === 'manual' 
                    ? (language === 'ar' ? 'اضغط على زر التحرير للتعديل' : 'Click edit button to modify positions')
                    : (language === 'ar' ? 'سيقوم النظام بتوزيع البطاقات تلقائياً' : 'System will automatically assign cards')
                  }
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 min-h-96">
                {renderLayoutPreview()}
              </div>
            </div>
          </div>
        </div>

        {/* Position Edit Modal */}
        {editingPosition !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
            onClick={() => setEditingPosition(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-dark-800 rounded-xl border border-purple-500/20 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                {language === 'ar' ? 'تحرير الموضع' : 'Edit Position'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}
                  </label>
                  <input
                    type="text"
                    value={editedSpread.positions?.[editingPosition]?.name || ''}
                    onChange={(e) => handlePositionEdit(editingPosition, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50"
                    placeholder="اسم الموضع بالعربية"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {language === 'ar' ? 'المعنى بالعربية' : 'Arabic Meaning'}
                  </label>
                  <input
                    type="text"
                    value={editedSpread.positions?.[editingPosition]?.meaning || ''}
                    onChange={(e) => handlePositionEdit(editingPosition, 'meaning', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50"
                    placeholder="معنى الموضع بالعربية"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingPosition(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => setEditingPosition(null)}
                  className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
                >
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isEmbedded ? (
        renderEditor()
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          {renderEditor()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SpreadVisualEditor; 