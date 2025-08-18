import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  RotateCcw,
  Grid,
  Circle,
  Square,
  Shuffle,
  MousePointer
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const SpreadVisualEditor = ({ 
  spread, 
  onSave, 
  onClose, 
  isAdmin = false, 
  language = 'en' 
}) => {
  const [editedSpread, setEditedSpread] = useState(spread);
  const [editingPosition, setEditingPosition] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState(spread.assignment_mode || 'manual');
  const [showLayoutOptions, setShowLayoutOptions] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

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
    const hasChangesCheck = JSON.stringify(editedSpread) !== JSON.stringify(spread) || 
                           assignmentMode !== (spread.assignment_mode || 'manual');
    setHasChanges(hasChangesCheck);
  }, [editedSpread, assignmentMode, spread]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const positions = Array.from(editedSpread.positions || []);
    const [reorderedItem] = positions.splice(result.source.index, 1);
    positions.splice(result.destination.index, 0, reorderedItem);

    // Update position numbers
    const updatedPositions = positions.map((pos, index) => ({
      ...pos,
      position: index + 1
    }));

    setEditedSpread({
      ...editedSpread,
      positions: updatedPositions
    });
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

  const addPosition = () => {
    const newPosition = {
      id: `pos_${Date.now()}`,
      position: (editedSpread.positions?.length || 0) + 1,
      position_name_ar: `الموضع ${(editedSpread.positions?.length || 0) + 1}`,
      position_name_en: `Position ${(editedSpread.positions?.length || 0) + 1}`,
      card_id: null
    };

    setEditedSpread({
      ...editedSpread,
      positions: [...(editedSpread.positions || []), newPosition]
    });
  };

  const removePosition = (positionIndex) => {
    const updatedPositions = (editedSpread.positions || []).filter((_, index) => index !== positionIndex);
    // Reorder positions
    const reorderedPositions = updatedPositions.map((pos, index) => ({
      ...pos,
      position: index + 1
    }));

    setEditedSpread({
      ...editedSpread,
      positions: reorderedPositions
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
    
    if ((editedSpread.positions?.length || 0) !== (spread.positions?.length || 0)) {
      changes.push(`Positions: ${spread.positions?.length || 0} → ${editedSpread.positions?.length || 0}`);
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
          return 'grid grid-cols-3 gap-2';
        default:
          return 'grid grid-cols-3 gap-4';
      }
    };

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="positions">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={getLayoutClass()}
            >
              {positions.map((position, index) => (
                <Draggable key={position.id || index} draggableId={`pos-${index}`} index={index}>
                  {(provided, snapshot) => (
                    <motion.div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      variants={itemVariants}
                      className={`relative bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-white/20 hover:border-gold-400/50 transition-all duration-200 cursor-move ${
                        snapshot.isDragging ? 'z-50 rotate-2 scale-105' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gold-400">
                          {language === 'ar' ? 'موضع' : 'Position'} {position.position}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setEditingPosition(index)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removePosition(index)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="w-16 h-24 bg-gradient-to-b from-indigo-500/30 to-purple-500/30 rounded-lg mx-auto mb-2 flex items-center justify-center border border-white/10">
                          <Star className="w-6 h-6 text-gold-400" />
                        </div>
                        <p className="text-sm font-medium text-white">
                          {language === 'ar' ? position.position_name_ar : position.position_name_en}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="bg-dark-800 rounded-2xl border border-purple-500/20 w-full max-w-6xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {language === 'ar' ? 'محرر الانتشار' : 'Spread Editor'}
              </h2>
              <p className="text-gray-400 mt-1">
                {editedSpread.name || 'Untitled Spread'}
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
                  <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</span>
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

          <div className="flex h-full">
            {/* Sidebar - Controls */}
            <div className="w-80 border-r border-white/10 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {language === 'ar' ? 'معلومات أساسية' : 'Basic Information'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {language === 'ar' ? 'اسم الانتشار' : 'Spread Name'}
                      </label>
                      <input
                        type="text"
                        value={editedSpread.name || ''}
                        onChange={(e) => setEditedSpread({...editedSpread, name: e.target.value})}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50"
                        placeholder={language === 'ar' ? 'أدخل اسم الانتشار' : 'Enter spread name'}
                      />
                    </div>

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
                      
                      <div className="text-xs text-gray-500 bg-white/5 p-2 rounded">
                        {language === 'ar' 
                          ? 'اسحب المواضع لإعادة ترتيبها' 
                          : 'Drag positions to reorder them'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content - Layout Preview */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">
                  {language === 'ar' ? 'معاينة التخطيط' : 'Layout Preview'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {assignmentMode === 'manual' 
                    ? (language === 'ar' ? 'اسحب المواضع لإعادة ترتيبها واضغط على زر التحرير للتعديل' : 'Drag positions to reorder, click edit to modify')
                    : (language === 'ar' ? 'سيقوم النظام بتوزيع البطاقات تلقائياً' : 'System will automatically assign cards')
                  }
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 min-h-96">
                {renderLayoutPreview()}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Position Edit Modal */}
      <AnimatePresence>
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
                    value={editedSpread.positions[editingPosition]?.position_name_ar || ''}
                    onChange={(e) => handlePositionEdit(editingPosition, 'position_name_ar', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50"
                    placeholder="اسم الموضع بالعربية"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {language === 'ar' ? 'الاسم بالانجليزية' : 'English Name'}
                  </label>
                  <input
                    type="text"
                    value={editedSpread.positions[editingPosition]?.position_name_en || ''}
                    onChange={(e) => handlePositionEdit(editingPosition, 'position_name_en', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50"
                    placeholder="Position name in English"
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
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default SpreadVisualEditor; 