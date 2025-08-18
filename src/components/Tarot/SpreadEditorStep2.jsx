import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * ==========================================
 * SPREAD EDITOR STEP 2 COMPONENT
 * Auto and Manual Spread Configuration
 * ==========================================
 */
const SpreadEditorStep2 = ({ 
  spreadType,
  layoutType,
  setLayoutType,
  positions,
  draggedPositions,
  arrangePositions,
  updatePositionName,
  handleDragPosition,
  resetLayout,
  convertToManual
}) => {
  const { currentLanguage, direction } = useLanguage();

  // Step 2A: Auto Spread Configuration
  const Step2AutoSpread = () => (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
        <h4 className="text-blue-300 font-medium mb-2">
          {currentLanguage === 'ar' ? 'تكوين الانتشار التلقائي' : 'Auto Spread Configuration'}
        </h4>
        <p className="text-gray-300 text-sm">
          {currentLanguage === 'ar' ? 
            'اختر نوع التخطيط وسيقوم النظام بترتيب الأوراق تلقائياً' :
            'Choose a layout type and the system will automatically arrange the cards'
          }
        </p>
      </div>

      {/* Layout Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {currentLanguage === 'ar' ? 'نوع التخطيط' : 'Layout Type'}
        </label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'linear', name_ar: 'خطي (صف)', name_en: 'Linear (Row)', desc_ar: 'ترتيب الأوراق في صف واحد', desc_en: 'Arrange cards in a single row' },
            { id: 'circle', name_ar: 'دائري', name_en: 'Circle', desc_ar: 'ترتيب الأوراق في شكل دائري', desc_en: 'Arrange cards in a circle' },
            { id: 'cross', name_ar: 'صليبي', name_en: 'Cross', desc_ar: 'ترتيب الأوراق في شكل صليب', desc_en: 'Arrange cards in cross formation' },
            { id: 'custom', name_ar: 'مخصص', name_en: 'Custom', desc_ar: 'ترتيب مخصص قابل للتعديل', desc_en: 'Custom arrangeable layout' }
          ].map(layout => (
            <div
              key={layout.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                layoutType === layout.id 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-gray-600 bg-dark-700 hover:border-purple-500/50'
              }`}
              onClick={() => {
                setLayoutType(layout.id);
                arrangePositions(positions, layout.id);
              }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="layout_type"
                  value={layout.id}
                  checked={layoutType === layout.id}
                  onChange={() => {}}
                  className="w-4 h-4 text-purple-600 bg-dark-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <div>
                  <h4 className="text-white font-semibold">
                    {currentLanguage === 'ar' ? layout.name_ar : layout.name_en}
                  </h4>
                  <p className="text-gray-400 text-sm">
                    {currentLanguage === 'ar' ? layout.desc_ar : layout.desc_en}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Layout Preview */}
      {layoutType && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'معاينة التخطيط' : 'Layout Preview'}
          </label>
          <div className="bg-dark-700 rounded-lg p-4 h-64 relative border border-gray-600">
            <svg className="w-full h-full" viewBox="0 0 500 300">
              {(draggedPositions.length > 0 ? draggedPositions : positions).map((pos, index) => (
                <g key={pos.id}>
                  <rect
                    x={pos.x - 20}
                    y={pos.y - 30}
                    width="40"
                    height="60"
                    fill="#a259ef"
                    stroke="#ffffff"
                    strokeWidth="2"
                    rx="4"
                  />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {pos.number}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Position Names */}
      {layoutType && positions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'أسماء المواضع' : 'Position Names'}
          </label>
          <div className="grid grid-cols-2 gap-4 max-h-48 overflow-y-auto">
            {positions.map((pos, index) => (
              <div key={pos.id}>
                <label className="block text-xs text-gray-400 mb-1">
                  {currentLanguage === 'ar' ? `الموضع ${pos.number}` : `Position ${pos.number}`}
                </label>
                <input
                  type="text"
                  value={currentLanguage === 'ar' ? pos.name_ar : pos.name_en}
                  onChange={(e) => updatePositionName(pos.id, e.target.value)}
                  className="w-full px-2 py-1 bg-dark-600 border border-gray-500 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                  dir={direction}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Convert to Manual Option */}
      {layoutType && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-yellow-300 font-medium mb-1">
                {currentLanguage === 'ar' ? 'تحويل إلى يدوي' : 'Convert to Manual'}
              </h4>
              <p className="text-gray-300 text-sm">
                {currentLanguage === 'ar' ? 
                  'للحصول على تحكم كامل في مواضع الأوراق' :
                  'For full control over card positions'
                }
              </p>
            </div>
            <button
              type="button"
              onClick={convertToManual}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
            >
              {currentLanguage === 'ar' ? 'تحويل' : 'Convert'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Step 2B: Manual Spread Configuration
  const Step2ManualSpread = () => (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
        <h4 className="text-green-300 font-medium mb-2">
          {currentLanguage === 'ar' ? 'تكوين الانتشار اليدوي' : 'Manual Spread Configuration'}
        </h4>
        <p className="text-gray-300 text-sm">
          {currentLanguage === 'ar' ? 
            'اسحب وإفلت الأوراق لترتيبها كما تريد' :
            'Drag and drop cards to arrange them as you want'
          }
        </p>
      </div>

      {/* Interactive Canvas */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {currentLanguage === 'ar' ? 'محرر التخطيط' : 'Layout Editor'}
        </label>
        <div className="bg-dark-700 rounded-lg p-4 h-64 relative border border-gray-600">
          <svg className="w-full h-full" viewBox="0 0 500 300">
            {/* Grid Background */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#444" strokeWidth="1" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="500" height="300" fill="url(#grid)" />
            
            {/* Draggable Cards */}
            {draggedPositions.map((pos, index) => (
              <g key={pos.id}>
                <rect
                  x={pos.x - 20}
                  y={pos.y - 30}
                  width="40"
                  height="60"
                  fill="#a259ef"
                  stroke="#ffffff"
                  strokeWidth="2"
                  rx="4"
                  className="cursor-move"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const svg = e.currentTarget.closest('svg');
                    const rect = svg.getBoundingClientRect();
                    
                    const handleMouseMove = (moveEvent) => {
                      const newX = moveEvent.clientX - rect.left;
                      const newY = moveEvent.clientY - rect.top;
                      
                      // Convert to SVG coordinates
                      const svgX = (newX / rect.width) * 500;
                      const svgY = (newY / rect.height) * 300;
                      
                      // Constrain within bounds
                      const constrainedX = Math.max(20, Math.min(480, svgX));
                      const constrainedY = Math.max(30, Math.min(270, svgY));
                      
                      handleDragPosition(pos.id, constrainedX, constrainedY);
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {pos.number}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Position Names */}
      {draggedPositions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'أسماء المواضع' : 'Position Names'}
          </label>
          <div className="grid grid-cols-2 gap-4 max-h-48 overflow-y-auto">
            {draggedPositions.map((pos, index) => (
              <div key={pos.id}>
                <label className="block text-xs text-gray-400 mb-1">
                  {currentLanguage === 'ar' ? `الموضع ${pos.number}` : `Position ${pos.number}`}
                </label>
                <input
                  type="text"
                  value={currentLanguage === 'ar' ? pos.name_ar : pos.name_en}
                  onChange={(e) => updatePositionName(pos.id, e.target.value)}
                  className="w-full px-2 py-1 bg-dark-600 border border-gray-500 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                  dir={direction}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset Layout */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={resetLayout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          {currentLanguage === 'ar' ? 'إعادة تعيين التخطيط' : 'Reset Layout'}
        </button>
      </div>
    </div>
  );

  // Render the appropriate step based on spread type
  return spreadType === 'auto' ? <Step2AutoSpread /> : <Step2ManualSpread />;
};

export default SpreadEditorStep2; 