import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Save, Eye, Trash2, Move, RotateCcw, 
  Grid, Circle, Square, Triangle, Star,
  Settings, Info, Share2, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const CustomSpreadCreator = () => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [spreadData, setSpreadData] = useState({
    name: '',
    description: '',
    card_count: 0,
    positions: [],
    layout_type: 'custom',
    difficulty_level: 'beginner',
    reading_time_minutes: 30,
    categories: [],
    is_public: false
  });
  
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [showPreview, setShowPreview] = useState(false);
  const [savedSpreads, setSavedSpreads] = useState([]);

  useEffect(() => {
    loadSavedSpreads();
  }, [user?.id]);

  const loadSavedSpreads = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_tarot_spreads')
        .select('*')
        .eq('reader_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSpreads(data || []);
    } catch (error) {
      console.error('Error loading spreads:', error);
    }
  };

  const addPosition = () => {
    const newPosition = {
      id: Date.now(),
      name: `Position ${spreadData.positions.length + 1}`,
      meaning: '',
      x: Math.random() * (canvasSize.width - 80) + 40,
      y: Math.random() * (canvasSize.height - 120) + 60,
      rotation: 0
    };

    setSpreadData(prev => ({
      ...prev,
      positions: [...prev.positions, newPosition],
      card_count: prev.positions.length + 1
    }));
  };

  const updatePosition = (id, updates) => {
    setSpreadData(prev => ({
      ...prev,
      positions: prev.positions.map(pos => 
        pos.id === id ? { ...pos, ...updates } : pos
      )
    }));
  };

  const deletePosition = (id) => {
    setSpreadData(prev => ({
      ...prev,
      positions: prev.positions.filter(pos => pos.id !== id),
      card_count: prev.positions.length - 1
    }));
    setSelectedPosition(null);
  };

  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a position
    const clickedPosition = spreadData.positions.find(pos => {
      const distance = Math.sqrt(
        Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
      );
      return distance <= 40; // Card radius
    });

    if (clickedPosition) {
      setSelectedPosition(clickedPosition);
      setIsDragging(true);
      setDragOffset({
        x: x - clickedPosition.x,
        y: y - clickedPosition.y
      });
    } else {
      setSelectedPosition(null);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging || !selectedPosition) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    // Keep within canvas bounds
    const boundedX = Math.max(40, Math.min(canvasSize.width - 40, x));
    const boundedY = Math.max(60, Math.min(canvasSize.height - 60, y));

    updatePosition(selectedPosition.id, { x: boundedX, y: boundedY });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const applyLayout = (layoutType) => {
    let newPositions = [];
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const count = spreadData.positions.length;

    switch (layoutType) {
      case 'linear':
        newPositions = spreadData.positions.map((pos, index) => ({
          ...pos,
          x: (canvasSize.width / (count + 1)) * (index + 1),
          y: centerY,
          rotation: 0
        }));
        break;

      case 'circular':
        newPositions = spreadData.positions.map((pos, index) => {
          const angle = (2 * Math.PI * index) / count;
          const radius = Math.min(centerX, centerY) - 80;
          return {
            ...pos,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
            rotation: 0
          };
        });
        break;

      case 'cross':
        if (count >= 5) {
          const positions = [
            { x: centerX, y: centerY - 80 }, // Top
            { x: centerX - 80, y: centerY }, // Left
            { x: centerX, y: centerY }, // Center
            { x: centerX + 80, y: centerY }, // Right
            { x: centerX, y: centerY + 80 }, // Bottom
          ];
          newPositions = spreadData.positions.map((pos, index) => ({
            ...pos,
            ...(positions[index] || { x: pos.x, y: pos.y }),
            rotation: 0
          }));
        }
        break;

      default:
        return;
    }

    setSpreadData(prev => ({
      ...prev,
      positions: newPositions,
      layout_type: layoutType
    }));
  };

  const saveSpread = async () => {
    if (!user?.id || !spreadData.name.trim()) {
      alert('Please enter a spread name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('custom_tarot_spreads')
        .insert({
          reader_id: user.id,
          ...spreadData,
          positions: spreadData.positions
        })
        .select()
        .single();

      if (error) throw error;

      alert('Spread saved successfully!');
      loadSavedSpreads();
      
      // Reset form
      setSpreadData({
        name: '',
        description: '',
        card_count: 0,
        positions: [],
        layout_type: 'custom',
        difficulty_level: 'beginner',
        reading_time_minutes: 30,
        categories: [],
        is_public: false
      });
      setSelectedPosition(null);
    } catch (error) {
      console.error('Error saving spread:', error);
      alert('Error saving spread');
    }
  };

  const loadSpread = (spread) => {
    setSpreadData({
      ...spread,
      name: `${spread.name} (Copy)`,
      positions: spread.positions.map(pos => ({ ...pos, id: Date.now() + Math.random() }))
    });
    setSelectedPosition(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Spread Creator</h1>
            <p className="text-gray-600 mt-2">Design your own tarot spreads</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={saveSpread}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Spread
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Spread Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Spread Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spread Name *
                  </label>
                  <input
                    type="text"
                    value={spreadData.name}
                    onChange={(e) => setSpreadData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter spread name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={spreadData.description}
                    onChange={(e) => setSpreadData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows="3"
                    placeholder="Describe your spread"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={spreadData.difficulty_level}
                    onChange={(e) => setSpreadData(prev => ({ ...prev, difficulty_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reading Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={spreadData.reading_time_minutes}
                    onChange={(e) => setSpreadData(prev => ({ ...prev, reading_time_minutes: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    min="5"
                    max="120"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={spreadData.is_public}
                    onChange={(e) => setSpreadData(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
                    Make public
                  </label>
                </div>
              </div>
            </div>

            {/* Layout Tools */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Layout Tools</h3>
              
              <div className="space-y-4">
                <button
                  onClick={addPosition}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Position
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => applyLayout('linear')}
                    className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Linear Layout"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => applyLayout('circular')}
                    className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Circular Layout"
                  >
                    <Circle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => applyLayout('cross')}
                    className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Cross Layout"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSpreadData(prev => ({ ...prev, positions: [] }))}
                    className="flex items-center justify-center px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  Cards: {spreadData.card_count}
                </div>
              </div>
            </div>

            {/* Position Details */}
            {selectedPosition && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Position Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position Name
                    </label>
                    <input
                      type="text"
                      value={selectedPosition.name}
                      onChange={(e) => updatePosition(selectedPosition.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meaning
                    </label>
                    <textarea
                      value={selectedPosition.meaning}
                      onChange={(e) => updatePosition(selectedPosition.id, { meaning: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      rows="3"
                      placeholder="What does this position represent?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rotation (degrees)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={selectedPosition.rotation}
                      onChange={(e) => updatePosition(selectedPosition.id, { rotation: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center">
                      {selectedPosition.rotation}°
                    </div>
                  </div>

                  <button
                    onClick={() => deletePosition(selectedPosition.id)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Position
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Spread Canvas</h3>
              
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <svg
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="cursor-crosshair"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                >
                  {/* Grid */}
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Card Positions */}
                  {spreadData.positions.map((position) => (
                    <g key={position.id}>
                      {/* Card */}
                      <rect
                        x={position.x - 30}
                        y={position.y - 40}
                        width="60"
                        height="80"
                        rx="4"
                        fill={selectedPosition?.id === position.id ? "#8B5CF6" : "#E5E7EB"}
                        stroke={selectedPosition?.id === position.id ? "#7C3AED" : "#9CA3AF"}
                        strokeWidth="2"
                        transform={`rotate(${position.rotation} ${position.x} ${position.y})`}
                        className="cursor-move"
                      />
                      
                      {/* Position Number */}
                      <circle
                        cx={position.x}
                        cy={position.y - 50}
                        r="12"
                        fill="#8B5CF6"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={position.x}
                        y={position.y - 46}
                        textAnchor="middle"
                        className="text-xs font-bold fill-white"
                      >
                        {spreadData.positions.indexOf(position) + 1}
                      </text>

                      {/* Position Name */}
                      <text
                        x={position.x}
                        y={position.y + 55}
                        textAnchor="middle"
                        className="text-xs fill-gray-600"
                      >
                        {position.name}
                      </text>
                    </g>
                  ))}
                </svg>

                {spreadData.positions.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Plus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Click &ldquo;Add Position&rdquo; to start creating your spread</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>• Click and drag cards to reposition them</p>
                <p>• Click on a card to select and edit its details</p>
                <p>• Use layout tools to apply predefined arrangements</p>
              </div>
            </div>
          </div>

          {/* Saved Spreads */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Spreads</h3>
              
              <div className="space-y-3">
                {savedSpreads.map((spread) => (
                  <div key={spread.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{spread.name}</h4>
                      <span className="text-xs text-gray-500">{spread.card_count} cards</span>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {spread.description}
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => loadSpread(spread)}
                        className="flex-1 text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                      >
                        Load
                      </button>
                      <button className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">
                        <Eye className="w-3 h-3" />
                      </button>
                      <button className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">
                        <Share2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {savedSpreads.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No saved spreads yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomSpreadCreator; 