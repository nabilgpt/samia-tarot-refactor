import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../context/UIContext';
import Button from './Button';

const ServiceCard = ({ 
  service, 
  onSelect, 
  className = '',
  showPrice = true,
  showDescription = true 
}) => {
  const { t } = useTranslation();
  const { language } = useUI();

  const handleSelect = () => {
    if (onSelect) {
      onSelect(service);
    }
  };

  return (
    <div className={`
      bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 
      shadow-2xl shadow-cosmic-500/10 hover:border-gold-400/40 
      transition-all duration-300 transform hover:scale-105 hover:shadow-gold-500/20
      ${className}
    `}>
      {/* Service Icon */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/30">
          <span className="text-2xl">{service.icon || '🔮'}</span>
        </div>
      </div>

      {/* Service Title */}
      <h3 className="text-xl font-bold text-white text-center mb-2">
        {language === 'ar' ? service.name_ar : service.name}
      </h3>

      {/* Service Description */}
      {showDescription && (
        <p className="text-gray-300 text-center text-sm mb-4 line-clamp-3">
          {language === 'ar' ? service.description_ar : service.description}
        </p>
      )}

      {/* Service Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">
            {language === 'ar' ? 'المدة' : 'Duration'}
          </span>
          <span className="text-gold-300 font-medium">
            {service.duration_minutes} {language === 'ar' ? 'دقيقة' : 'min'}
          </span>
        </div>
        
        {showPrice && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">
              {language === 'ar' ? 'السعر' : 'Price'}
            </span>
            <span className="text-gold-400 font-bold text-lg">
              ${service.price}
            </span>
          </div>
        )}

        {service.is_vip && (
          <div className="flex justify-center">
            <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-medium rounded-full">
              {language === 'ar' ? 'VIP' : 'VIP'}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <Button
        onClick={handleSelect}
        className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105"
        size="sm"
      >
        {language === 'ar' ? 'اختر هذه الخدمة' : 'Select Service'}
      </Button>
    </div>
  );
};

export default ServiceCard; 