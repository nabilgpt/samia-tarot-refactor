// =================================================
// SAMIA TAROT SINGLE LANGUAGE DISPLAY
// Component to ensure only current language is shown
// =================================================

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const SingleLanguageDisplay = ({ 
  data, 
  fields = [], 
  className = '',
  fallbackText = null,
  allowAdminDualView = false,
  renderContent = null
}) => {
  const { currentLanguage } = useLanguage();
  const { profile } = useAuth();
  
  const isAdmin = profile && ['admin', 'super_admin'].includes(profile.role);
  
  // Get the current language value for a field
  const getCurrentLanguageValue = (fieldName) => {
    if (!data) return null;
    
    const arField = `${fieldName}_ar`;
    const enField = `${fieldName}_en`;
    
    if (currentLanguage === 'ar') {
      return data[arField] || data[enField] || null;
    } else {
      return data[enField] || data[arField] || null;
    }
  };

  // Get fallback text for current language
  const getFallbackText = () => {
    if (typeof fallbackText === 'object' && fallbackText) {
      return fallbackText[currentLanguage] || fallbackText.en || 'No content available';
    }
    
    return fallbackText || (currentLanguage === 'ar' ? 'لا يوجد محتوى' : 'No content available');
  };

  // Check if we should show dual language view
  const shouldShowDualView = allowAdminDualView && isAdmin && data;

  // Custom render function
  if (renderContent) {
    return renderContent({
      data,
      currentLanguage,
      getCurrentLanguageValue,
      getFallbackText,
      shouldShowDualView,
      isAdmin
    });
  }

  // Default single field display
  if (fields.length === 1) {
    const fieldName = fields[0];
    const value = getCurrentLanguageValue(fieldName);
    
    return (
      <div className={`single-language-display ${className}`} data-single-language="true">
        <div 
          className="content"
          dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
        >
          {value || (
            <span className="text-gray-500 italic">
              {getFallbackText()}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Multiple fields display
  return (
    <div className={`single-language-display ${className}`} data-single-language="true">
      {fields.map((fieldName) => {
        const value = getCurrentLanguageValue(fieldName);
        
        return (
          <div 
            key={fieldName}
            className="field-content"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
          >
            {value || (
              <span className="text-gray-500 italic">
                {getFallbackText()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Specialized components for common use cases
export const SingleLanguageName = ({ data, className = '', fallbackText = null }) => (
  <SingleLanguageDisplay
    data={data}
    fields={['name']}
    className={className}
    fallbackText={fallbackText}
  />
);

export const SingleLanguageDescription = ({ data, className = '', fallbackText = null }) => (
  <SingleLanguageDisplay
    data={data}
    fields={['description']}
    className={className}
    fallbackText={fallbackText}
  />
);

export const SingleLanguageTitle = ({ data, className = '', fallbackText = null }) => (
  <SingleLanguageDisplay
    data={data}
    fields={['title']}
    className={className}
    fallbackText={fallbackText}
  />
);

// Card component for displaying single language card data
export const SingleLanguageCard = ({ data, className = '', showDescription = true }) => {
  const { currentLanguage } = useLanguage();
  
  return (
    <SingleLanguageDisplay
      data={data}
      fields={showDescription ? ['name', 'description'] : ['name']}
      className={className}
      renderContent={({ getCurrentLanguageValue, getFallbackText }) => (
        <div className="space-y-2">
          <h3 className="font-semibold text-white" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {getCurrentLanguageValue('name') || (
              <span className="text-gray-500 italic">
                {currentLanguage === 'ar' ? 'بلا اسم' : 'Unnamed'}
              </span>
            )}
          </h3>
          {showDescription && (
            <p className="text-gray-300 text-sm" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
              {getCurrentLanguageValue('description') || (
                <span className="text-gray-500 italic">
                  {currentLanguage === 'ar' ? 'لا يوجد وصف' : 'No description'}
                </span>
              )}
            </p>
          )}
        </div>
      )}
    />
  );
};

// Category component
export const SingleLanguageCategory = ({ data, className = '', showIcon = true }) => {
  const { currentLanguage } = useLanguage();
  
  return (
    <SingleLanguageDisplay
      data={data}
      fields={['name']}
      className={className}
      renderContent={({ getCurrentLanguageValue }) => (
        <div className="flex items-center space-x-2">
          {showIcon && data.icon && (
            <span className="text-lg">{data.icon}</span>
          )}
          <span 
            className="font-medium"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
          >
            {getCurrentLanguageValue('name') || (
              <span className="text-gray-500 italic">
                {currentLanguage === 'ar' ? 'تصنيف غير محدد' : 'Unnamed category'}
              </span>
            )}
          </span>
        </div>
      )}
    />
  );
};

// Service component
export const SingleLanguageService = ({ data, className = '', detailed = false }) => {
  const { currentLanguage } = useLanguage();
  
  return (
    <SingleLanguageDisplay
      data={data}
      fields={detailed ? ['name', 'description', 'details'] : ['name', 'description']}
      className={className}
      renderContent={({ getCurrentLanguageValue }) => (
        <div className="space-y-2">
          <h3 className="font-semibold text-white" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {getCurrentLanguageValue('name') || (
              <span className="text-gray-500 italic">
                {currentLanguage === 'ar' ? 'خدمة غير محددة' : 'Unnamed service'}
              </span>
            )}
          </h3>
          <p className="text-gray-300 text-sm" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {getCurrentLanguageValue('description') || (
              <span className="text-gray-500 italic">
                {currentLanguage === 'ar' ? 'لا يوجد وصف' : 'No description'}
              </span>
            )}
          </p>
          {detailed && (
            <div className="text-gray-400 text-xs" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
              {getCurrentLanguageValue('details') || (
                <span className="text-gray-500 italic">
                  {currentLanguage === 'ar' ? 'لا توجد تفاصيل' : 'No details'}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    />
  );
};

export default SingleLanguageDisplay; 