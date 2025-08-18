import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Move, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  Plus, 
  X, 
  Save, 
  Grid,
  Layers,
  MousePointer,
  Settings,
  Trash2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

const FreeformSpreadEditor = ({ 
  spread, 
  onSave, 
  onCancel, 
  isVisible = true,
  language = 'en' 
}) => {
  const [positions, setPositions] = useState(spread?.positions || []);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [dragState, setDragState] = useState({ isDragging: false, dragType: null });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [zoom, setZoom] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [rotationInput, setRotationInput] = useState("0");
  
  const canvasRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPosition: null });

  // Initialize positions with default values if missing
  useEffect(() => {
    if (spread?.positions) {
      const initializedPositions = spread.positions.map((pos, index) => ({
        id: pos.id || `pos-${index}`,
        name: pos.name || `Position ${index + 1}`,
        x: pos.x || (100 + (index % 5) * 120),
        y: pos.y || (100 + Math.floor(index / 5) * 150),
        width: pos.width || 80,
        height: pos.height || 120,
        rotation: pos.rotation || 0,
        zIndex: pos.zIndex || index,
        visible: pos.visible !== false,
        description: pos.description || ''
      }));
      setPositions(initializedPositions);
    }
  }, [spread]);

  // Keep selectedPosition in sync with positions array for real-time updates
  useEffect(() => {
    if (selectedPosition) {
      const updatedSelectedPosition = positions.find(pos => pos.id === selectedPosition.id);
      if (updatedSelectedPosition && 
          (updatedSelectedPosition.rotation !== selectedPosition.rotation ||
           updatedSelectedPosition.x !== selectedPosition.x ||
           updatedSelectedPosition.y !== selectedPosition.y ||
           updatedSelectedPosition.width !== selectedPosition.width ||
           updatedSelectedPosition.height !== selectedPosition.height)) {
        setSelectedPosition(updatedSelectedPosition);
        // Update rotationInput when position changes externally (like from dragging)
        setRotationInput(updatedSelectedPosition.rotation.toString());
      }
    }
  }, [positions, selectedPosition]);

  // Update rotationInput when selectedPosition changes
  useEffect(() => {
    if (selectedPosition) {
      setRotationInput(selectedPosition.rotation.toString());
    }
  }, [selectedPosition?.id, selectedPosition?.rotation]);

  // Smart rotation input handler - allows typing "-" and negative numbers
  const handleRotationInputChange = (e) => {
    let value = e.target.value;
    
    // Allow empty string, "-", or valid number strings
    if (value === "" || value === "-") {
      setRotationInput(value);
      return;
    }
    
    // Check if it's a valid number (including negative)
    const num = parseFloat(value);
    if (isNaN(num)) {
      return; // Don't update if it's not a valid number
    }
    
    // Update the input field immediately
    setRotationInput(value);
    
    // Clamp the value and update the position
    const clampedValue = Math.max(-180, Math.min(180, num));
    updatePosition(selectedPosition.id, { rotation: clampedValue });
    
    // If the value was clamped, update the input to show the clamped value
    if (clampedValue !== num) {
      setTimeout(() => setRotationInput(clampedValue.toString()), 100);
    }
  };

  // Handle when user leaves the input field
  const handleRotationInputBlur = () => {
    if (rotationInput === "" || rotationInput === "-") {
      // Reset to current position rotation if empty or just minus
      setRotationInput(selectedPosition?.rotation?.toString() || "0");
    }
  };

  // Snap to grid helper
  const snapToGridHelper = (value) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  // Add new position
  const addPosition = () => {
    const newPosition = {
      id: `pos-${Date.now()}`,
      name: `Position ${positions.length + 1}`,
      x: snapToGridHelper(canvasSize.width / 2 - 40),
      y: snapToGridHelper(canvasSize.height / 2 - 60),
      width: 80,
      height: 120,
      rotation: 0,
      zIndex: positions.length,
      visible: true,
      description: ''
    };
    setPositions([...positions, newPosition]);
  };

  // Delete position
  const deletePosition = (id) => {
    setPositions(positions.filter(pos => pos.id !== id));
    if (selectedPosition?.id === id) {
      setSelectedPosition(null);
    }
  };

  // Update position with real-time sync
  const updatePosition = (id, updates) => {
    const newPositions = positions.map(pos => 
      pos.id === id ? { ...pos, ...updates } : pos
    );
    setPositions(newPositions);
    
    // Immediately update selectedPosition if it's the one being updated
    if (selectedPosition?.id === id) {
      const updatedPosition = newPositions.find(pos => pos.id === id);
      if (updatedPosition) {
        setSelectedPosition(updatedPosition);
      }
    }
  };

  // Mouse down handler
  const handleMouseDown = (e, position, dragType = 'move') => {
    e.preventDefault();
    e.stopPropagation();
    
    // Always use the latest position data from the array
    const latestPosition = positions.find(pos => pos.id === position.id) || position;
    setSelectedPosition(latestPosition);
    setDragState({ isDragging: true, dragType });
    
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: (e.clientX - rect.left) / zoom,
      startY: (e.clientY - rect.top) / zoom,
      startPosition: { ...latestPosition }
    };
  };

  // Mouse move handler
  const handleMouseMove = useCallback((e) => {
    if (!dragState.isDragging || !selectedPosition) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / zoom;
    const currentY = (e.clientY - rect.top) / zoom;
    
    const deltaX = currentX - dragRef.current.startX;
    const deltaY = currentY - dragRef.current.startY;
    
    const startPos = dragRef.current.startPosition;
    
    switch (dragState.dragType) {
      case 'move':
        updatePosition(selectedPosition.id, {
          x: Math.max(0, Math.min(canvasSize.width - startPos.width, 
            snapToGridHelper(startPos.x + deltaX))),
          y: Math.max(0, Math.min(canvasSize.height - startPos.height, 
            snapToGridHelper(startPos.y + deltaY)))
        });
        break;
        
      case 'resize':
        const newWidth = Math.max(40, startPos.width + deltaX);
        const newHeight = Math.max(60, startPos.height + deltaY);
        updatePosition(selectedPosition.id, {
          width: snapToGridHelper(newWidth),
          height: snapToGridHelper(newHeight)
        });
        break;
        
      case 'rotate':
        const centerX = startPos.x + startPos.width / 2;
        const centerY = startPos.y + startPos.height / 2;
        const angle = Math.atan2(currentY - centerY, currentX - centerX) * 180 / Math.PI;
        updatePosition(selectedPosition.id, {
          rotation: Math.round(angle / 15) * 15
        });
        break;
    }
  }, [dragState, selectedPosition, zoom, canvasSize, snapToGrid, gridSize]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setDragState({ isDragging: false, dragType: null });
  }, []);

  // Attach global mouse events
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Save handler
  const handleSave = () => {
    const updatedSpread = {
      ...spread,
      positions: positions.map(pos => ({
        ...pos,
        id: pos.id,
        name: pos.name,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotation: pos.rotation,
        zIndex: pos.zIndex,
        visible: pos.visible,
        description: pos.description
      }))
    };
    
    onSave(updatedSpread);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-bold text-white">
              {language === 'ar' ? 'محرر التوزيع المرن' : 'Freeform Spread Editor'}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`p-2 rounded-md ${isPreviewMode ? 'bg-purple-600' : 'bg-gray-700'} hover:bg-purple-500 transition-colors`}
              >
                {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 rounded-md ${showGrid ? 'bg-purple-600' : 'bg-gray-700'} hover:bg-purple-500 transition-colors`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`p-2 rounded-md ${snapToGrid ? 'bg-purple-600' : 'bg-gray-700'} hover:bg-purple-500 transition-colors`}
              >
                <MousePointer size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={addPosition}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة موضع' : 'Add Position'}</span>
            </button>
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              <Save size={16} />
              <span>{language === 'ar' ? 'حفظ' : 'Save'}</span>
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              <X size={16} />
              <span>{language === 'ar' ? 'إلغاء' : 'Cancel'}</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <div 
              ref={canvasRef}
              className="w-full h-full relative bg-gray-800 overflow-auto"
              style={{ 
                backgroundImage: showGrid ? 
                  `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
                   linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)` : 'none',
                backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
                cursor: dragState.isDragging ? 'grabbing' : 'default'
              }}
            >
              <div 
                className="relative"
                style={{ 
                  width: canvasSize.width * zoom, 
                  height: canvasSize.height * zoom,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left'
                }}
              >
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className={`absolute border-2 rounded-lg cursor-move transition-all duration-200 ${
                      selectedPosition?.id === position.id 
                        ? 'border-purple-400 shadow-lg shadow-purple-400/50' 
                        : 'border-gray-600 hover:border-gray-500'
                    } ${position.visible ? 'opacity-100' : 'opacity-50'}`}
                    style={{
                      left: position.x,
                      top: position.y,
                      width: position.width,
                      height: position.height,
                      transform: `rotate(${position.rotation}deg)`,
                      zIndex: position.zIndex,
                      background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(79, 70, 229, 0.2))',
                      backdropFilter: 'blur(4px)'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, position, 'move')}
                    onClick={() => {
                      // Always use the latest position data from the array
                      const latestPosition = positions.find(pos => pos.id === position.id);
                      setSelectedPosition(latestPosition || position);
                    }}
                  >
                    {/* Position Content */}
                    <div className="h-full flex flex-col items-center justify-center p-2 text-white text-sm">
                      <div className="font-semibold text-center break-words">
                        {position.name}
                      </div>
                      {position.description && (
                        <div className="text-xs text-gray-300 text-center mt-1">
                          {position.description}
                        </div>
                      )}
                    </div>

                    {/* Control Handles */}
                    {selectedPosition?.id === position.id && !isPreviewMode && (
                      <>
                        <div
                          className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-500 rounded-full cursor-se-resize hover:bg-purple-400 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, position, 'resize')}
                        />
                        
                        <div
                          className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-400 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, position, 'rotate')}
                        >
                          <RotateCw size={12} className="text-white" />
                        </div>
                        
                        <div
                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full cursor-pointer hover:bg-red-400 transition-colors flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePosition(position.id);
                          }}
                        >
                          <X size={10} className="text-white" />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          {selectedPosition && !isPreviewMode && (
            <div className="w-80 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto">
              <h4 className="text-lg font-semibold text-white mb-4">
                {language === 'ar' ? 'خصائص الموضع' : 'Position Properties'}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </label>
                  <input
                    type="text"
                    value={selectedPosition.name}
                    onChange={(e) => updatePosition(selectedPosition.id, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {language === 'ar' ? 'الوصف' : 'Description'}
                  </label>
                  <textarea
                    value={selectedPosition.description}
                    onChange={(e) => updatePosition(selectedPosition.id, { description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">X</label>
                    <input
                      type="number"
                      value={selectedPosition.x}
                      onChange={(e) => updatePosition(selectedPosition.id, { x: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Y</label>
                    <input
                      type="number"
                      value={selectedPosition.y}
                      onChange={(e) => updatePosition(selectedPosition.id, { y: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {language === 'ar' ? 'العرض' : 'Width'}
                    </label>
                    <input
                      type="number"
                      value={selectedPosition.width}
                      onChange={(e) => updatePosition(selectedPosition.id, { width: parseInt(e.target.value) || 40 })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {language === 'ar' ? 'الارتفاع' : 'Height'}
                    </label>
                    <input
                      type="number"
                      value={selectedPosition.height}
                      onChange={(e) => updatePosition(selectedPosition.id, { height: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {language === 'ar' ? 'الدوران' : 'Rotation'}
                  </label>
                  
                  {/* Numeric Input */}
                  <div className="flex items-center mb-2 gap-2">
                    <label className="text-xs font-bold text-right w-20 text-gray-400">
                      {language === 'ar' ? 'الدوران (°)' : 'Rotation (°)'}
                    </label>
                    <input
                      type="text"
                      className="w-20 rounded border px-2 py-1 text-center text-sm bg-gray-800 text-white border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      value={rotationInput}
                      onChange={handleRotationInputChange}
                      onBlur={handleRotationInputBlur}
                    />
                    <span className="text-xs text-gray-400">°</span>
                  </div>
                  
                  {/* Range Slider */}
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={selectedPosition.rotation}
                    onChange={(e) => {
                      const newRotation = parseInt(e.target.value);
                      updatePosition(selectedPosition.id, { rotation: newRotation });
                      setRotationInput(newRotation.toString());
                    }}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedPosition.visible}
                    onChange={(e) => updatePosition(selectedPosition.id, { visible: e.target.checked })}
                    className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <label className="text-sm text-gray-300">
                    {language === 'ar' ? 'مرئي' : 'Visible'}
                  </label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={() => {
                      const duplicate = {
                        ...selectedPosition,
                        id: `pos-${Date.now()}`,
                        name: `${selectedPosition.name} Copy`,
                        x: selectedPosition.x + 20,
                        y: selectedPosition.y + 20,
                        zIndex: positions.length
                      };
                      setPositions([...positions, duplicate]);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Copy size={16} />
                    <span>{language === 'ar' ? 'نسخ' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => deletePosition(selectedPosition.id)}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 text-sm text-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>{language === 'ar' ? 'المواضع' : 'Positions'}: {positions.length}</span>
              <span>{language === 'ar' ? 'المحدد' : 'Selected'}: {selectedPosition?.name || 'None'}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>{language === 'ar' ? 'التكبير' : 'Zoom'}: {Math.round(zoom * 100)}%</span>
              <span>{language === 'ar' ? 'المحاذاة' : 'Snap'}: {snapToGrid ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeformSpreadEditor; 