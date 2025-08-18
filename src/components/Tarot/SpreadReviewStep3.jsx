import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * ==========================================
 * SPREAD REVIEW STEP 3 COMPONENT
 * Final Review and Summary
 * ==========================================
 */
const SpreadReviewStep3 = ({ 
  formData,
  layoutType,
  positions,
  draggedPositions
}) => {
  const { currentLanguage } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
        <h4 className="text-purple-300 font-medium mb-2">
          {currentLanguage === 'ar' ? 'المراجعة النهائية' : 'Final Review'}
        </h4>
        <p className="text-gray-300 text-sm">
          {currentLanguage === 'ar' ? 
            'راجع تفاصيل الانتشار قبل الحفظ' :
            'Review spread details before saving'
          }
        </p>
      </div>

      {/* Spread Summary */}
      <div className="bg-dark-700 rounded-lg p-4">
        <h4 className="text-white font-medium mb-4">
          {currentLanguage === 'ar' ? 'ملخص الانتشار' : 'Spread Summary'}
        </h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {currentLanguage === 'ar' ? 'الاسم:' : 'Name:'}
            </label>
            <p className="text-white">
              {currentLanguage === 'ar' ? formData.name_ar : formData.name_en}
            </p>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {currentLanguage === 'ar' ? 'عدد الأوراق:' : 'Card Count:'}
            </label>
            <p className="text-white">{formData.card_count}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">
            {currentLanguage === 'ar' ? 'الوصف:' : 'Description:'}
          </label>
          <p className="text-white">
            {currentLanguage === 'ar' ? formData.description_ar : formData.description_en}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {currentLanguage === 'ar' ? 'نوع الانتشار:' : 'Spread Type:'}
            </label>
            <p className="text-white capitalize">{formData.spread_type}</p>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {currentLanguage === 'ar' ? 'نوع التخطيط:' : 'Layout Type:'}
            </label>
            <p className="text-white capitalize">{layoutType}</p>
          </div>
        </div>
      </div>

      {/* Final Layout Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {currentLanguage === 'ar' ? 'معاينة التخطيط النهائي' : 'Final Layout Preview'}
        </label>
        <div className="bg-dark-700 rounded-lg p-4 h-64 border border-gray-600">
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

      {/* Position Details */}
      {(draggedPositions.length > 0 ? draggedPositions : positions).length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'تفاصيل المواضع' : 'Position Details'}
          </label>
          <div className="bg-dark-700 rounded-lg p-4 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-1 gap-2">
              {(draggedPositions.length > 0 ? draggedPositions : positions).map((pos, index) => (
                <div key={pos.id} className="flex justify-between items-center py-1 border-b border-gray-600 last:border-b-0">
                  <span className="text-sm text-gray-300">
                    {currentLanguage === 'ar' ? `الموضع ${pos.number}:` : `Position ${pos.number}:`}
                  </span>
                  <span className="text-sm text-white">
                    {currentLanguage === 'ar' ? pos.name_ar : pos.name_en}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpreadReviewStep3; 