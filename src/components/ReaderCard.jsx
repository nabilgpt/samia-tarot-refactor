import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../context/UIContext';
import { Star, MapPin, Clock } from 'lucide-react';
import Button from './Button';

const ReaderCard = ({ 
  reader, 
  onSelect, 
  className = '',
  showRating = true,
  showBio = true,
  showAvailability = true 
}) => {
  const { t } = useTranslation();
  const { language } = useUI();

  const handleSelect = () => {
    if (onSelect) {
      onSelect(reader);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-gold-400 text-gold-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-4 h-4 fill-gold-400/50 text-gold-400" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-500" />
      );
    }

    return stars;
  };

  return (
    <div className={`
      bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 
      shadow-2xl shadow-cosmic-500/10 hover:border-gold-400/40 
      transition-all duration-300 transform hover:scale-105 hover:shadow-gold-500/20
      ${className}
    `}>
      {/* Reader Avatar */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          {reader.avatar_url ? (
            <img
              src={reader.avatar_url}
              alt={`${reader.first_name} ${reader.last_name}`}
              className="w-20 h-20 rounded-full object-cover border-2 border-gold-400/30 shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center text-dark-900 text-2xl font-bold shadow-lg">
              {reader.first_name?.[0]}{reader.last_name?.[0]}
            </div>
          )}
          
          {/* Online Status */}
          {reader.is_online && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-dark-800 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </div>

      {/* Reader Name */}
      <h3 className="text-xl font-bold text-white text-center mb-2">
        {reader.first_name} {reader.last_name}
      </h3>

      {/* Reader Zodiac */}
      {reader.zodiac && (
        <p className="text-cosmic-300 text-center text-sm mb-3 font-medium">
          ✨ {reader.zodiac}
        </p>
      )}

      {/* Rating */}
      {showRating && reader.rating && (
        <div className="flex items-center justify-center mb-3">
          <div className="flex items-center space-x-1">
            {renderStars(reader.rating)}
          </div>
          <span className="ml-2 text-gold-400 font-medium text-sm">
            {reader.rating.toFixed(1)}
          </span>
          {reader.total_reviews && (
            <span className="text-gray-400 text-sm ml-1">
              ({reader.total_reviews})
            </span>
          )}
        </div>
      )}

      {/* Location */}
      {reader.country && (
        <div className="flex items-center justify-center mb-3 text-gray-300 text-sm">
          <MapPin className="w-4 h-4 mr-1 text-gold-400" />
          {reader.country}
        </div>
      )}

      {/* Bio */}
      {showBio && reader.bio && (
        <p className="text-gray-300 text-center text-sm mb-4 line-clamp-3">
          {language === 'ar' ? reader.bio_ar : reader.bio}
        </p>
      )}

      {/* Specialties */}
      {reader.specialties && reader.specialties.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap justify-center gap-1">
            {reader.specialties.slice(0, 3).map((specialty, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-cosmic-700/30 border border-cosmic-400/30 text-cosmic-300 text-xs rounded-full"
              >
                {specialty}
              </span>
            ))}
            {reader.specialties.length > 3 && (
              <span className="px-2 py-1 bg-cosmic-700/30 border border-cosmic-400/30 text-cosmic-300 text-xs rounded-full">
                +{reader.specialties.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Availability */}
      {showAvailability && (
        <div className="mb-4">
          <div className="flex items-center justify-center text-sm">
            <Clock className="w-4 h-4 mr-1 text-gold-400" />
            <span className={`font-medium ${reader.is_available ? 'text-green-400' : 'text-red-400'}`}>
              {reader.is_available 
                ? (language === 'ar' ? 'متاح الآن' : 'Available Now')
                : (language === 'ar' ? 'غير متاح' : 'Unavailable')
              }
            </span>
          </div>
          
          {reader.next_available && !reader.is_available && (
            <p className="text-gray-400 text-xs text-center mt-1">
              {language === 'ar' ? 'متاح في' : 'Next available:'} {reader.next_available}
            </p>
          )}
        </div>
      )}

      {/* Experience */}
      {reader.years_experience && (
        <div className="mb-4 text-center">
          <span className="text-gold-300 text-sm font-medium">
            {reader.years_experience} {language === 'ar' ? 'سنوات خبرة' : 'years experience'}
          </span>
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={handleSelect}
        disabled={!reader.is_available}
        className={`w-full font-bold shadow-lg transition-all duration-200 transform hover:scale-105 ${
          reader.is_available
            ? 'bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 shadow-gold-500/30'
            : 'bg-gray-600/50 text-gray-400 cursor-not-allowed shadow-gray-500/20'
        }`}
        size="sm"
      >
        {reader.is_available 
          ? (language === 'ar' ? 'اختر هذا القارئ' : 'Select Reader')
          : (language === 'ar' ? 'غير متاح' : 'Unavailable')
        }
      </Button>
    </div>
  );
};

export default ReaderCard; 