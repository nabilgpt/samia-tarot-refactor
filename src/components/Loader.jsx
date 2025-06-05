import React from 'react';
import { useUI } from '../context/UIContext';

const Loader = ({ 
  size = 'md', 
  variant = 'spinner',
  text = '',
  className = '',
  fullScreen = false 
}) => {
  const { language } = useUI();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6';
      case 'lg':
        return 'w-12 h-12';
      case 'xl':
        return 'w-16 h-16';
      default:
        return 'w-8 h-8';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      case 'xl':
        return 'text-xl';
      default:
        return 'text-base';
    }
  };

  const SpinnerLoader = () => (
    <div className={`${getSizeClasses()} relative`}>
      <div className="absolute inset-0 rounded-full border-2 border-gold-400/20"></div>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-400 animate-spin shadow-lg shadow-gold-500/30"></div>
    </div>
  );

  const DotsLoader = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} 
            bg-gradient-to-r from-gold-500 to-gold-600 rounded-full 
            animate-pulse shadow-lg shadow-gold-500/30`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        ></div>
      ))}
    </div>
  );

  const PulseLoader = () => (
    <div className={`${getSizeClasses()} relative`}>
      <div className="absolute inset-0 bg-gradient-to-r from-gold-500 to-gold-600 rounded-full animate-ping opacity-75 shadow-lg shadow-gold-500/30"></div>
      <div className="relative bg-gradient-to-r from-gold-500 to-gold-600 rounded-full w-full h-full shadow-lg shadow-gold-500/50"></div>
    </div>
  );

  const OrbitLoader = () => (
    <div className={`${getSizeClasses()} relative`}>
      <div className="absolute inset-0 border border-gold-400/20 rounded-full"></div>
      <div className="absolute inset-0 animate-spin">
        <div className="w-2 h-2 bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-lg shadow-gold-500/50"></div>
      </div>
      <div className="absolute inset-0 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}>
        <div className="w-1.5 h-1.5 bg-gradient-to-r from-cosmic-400 to-cosmic-500 rounded-full shadow-lg shadow-cosmic-500/50 ml-auto"></div>
      </div>
    </div>
  );

  const CosmicLoader = () => (
    <div className={`${getSizeClasses()} relative`}>
      {/* Outer ring */}
      <div className="absolute inset-0 border-2 border-gold-400/20 rounded-full"></div>
      
      {/* Spinning gradient ring */}
      <div className="absolute inset-0 rounded-full animate-spin">
        <div className="w-full h-full rounded-full border-2 border-transparent border-t-gold-400 border-r-cosmic-400 shadow-lg shadow-gold-500/30"></div>
      </div>
      
      {/* Inner pulsing core */}
      <div className="absolute inset-2 bg-gradient-to-r from-gold-500/50 to-cosmic-500/50 rounded-full animate-pulse shadow-lg shadow-cosmic-500/30"></div>
      
      {/* Center dot */}
      <div className="absolute inset-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full shadow-lg shadow-white/50"></div>
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <DotsLoader />;
      case 'pulse':
        return <PulseLoader />;
      case 'orbit':
        return <OrbitLoader />;
      case 'cosmic':
        return <CosmicLoader />;
      default:
        return <SpinnerLoader />;
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoader()}
      
      {text && (
        <p className={`text-gray-300 font-medium ${getTextSize()} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-50 bg-dark-900/80 backdrop-blur-xl flex items-center justify-center ${
        language === 'ar' ? 'rtl' : 'ltr'
      }`}>
        <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-8 shadow-2xl shadow-cosmic-500/10">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Skeleton Loader Component
export const SkeletonLoader = ({ 
  lines = 3, 
  className = '',
  avatar = false 
}) => (
  <div className={`animate-pulse space-y-3 ${className}`}>
    {avatar && (
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gold-400/20 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gold-400/20 rounded w-1/4"></div>
          <div className="h-3 bg-cosmic-400/20 rounded w-1/3"></div>
        </div>
      </div>
    )}
    
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-4 bg-gradient-to-r from-gold-400/20 to-cosmic-400/20 rounded ${
          i === lines - 1 ? 'w-2/3' : 'w-full'
        }`}
      ></div>
    ))}
  </div>
);

// Card Skeleton Loader
export const CardSkeleton = ({ className = '' }) => (
  <div className={`bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10 ${className}`}>
    <div className="animate-pulse space-y-4">
      {/* Header */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-gold-400/20 rounded-xl"></div>
      </div>
      
      {/* Title */}
      <div className="h-6 bg-gold-400/20 rounded w-3/4 mx-auto"></div>
      
      {/* Description */}
      <div className="space-y-2">
        <div className="h-4 bg-cosmic-400/20 rounded w-full"></div>
        <div className="h-4 bg-cosmic-400/20 rounded w-2/3 mx-auto"></div>
      </div>
      
      {/* Button */}
      <div className="h-10 bg-gold-400/20 rounded-lg"></div>
    </div>
  </div>
);

export default Loader; 