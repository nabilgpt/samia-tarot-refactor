// =================================================
// SAMIA TAROT ERROR DISPLAY COMPONENT
// User-friendly error handling for API and permission errors
// =================================================

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  FaExclamationTriangle, 
  FaLock, 
  FaWifi, 
  FaServer, 
  FaRefresh,
  FaTimes,
  FaInfoCircle,
  FaExclamationCircle
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const ErrorDisplay = ({ 
  error, 
  onRetry = null, 
  onDismiss = null,
  className = '',
  variant = 'banner', // 'banner', 'modal', 'inline', 'toast'
  showDetails = false 
}) => {
  const { currentLanguage } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!error) return null;

  // Get error icon based on type
  const getErrorIcon = () => {
    switch (error.type) {
      case 'permission':
        return <FaLock className="w-5 h-5" />;
      case 'authentication':
        return <FaLock className="w-5 h-5" />;
      case 'network':
        return <FaWifi className="w-5 h-5" />;
      case 'server':
      case 'service_unavailable':
        return <FaServer className="w-5 h-5" />;
      case 'validation':
        return <FaExclamationCircle className="w-5 h-5" />;
      default:
        return <FaExclamationTriangle className="w-5 h-5" />;
    }
  };

  // Get error color theme
  const getErrorTheme = () => {
    switch (error.type) {
      case 'permission':
        return {
          bg: 'bg-yellow-900/20',
          border: 'border-yellow-600/30',
          text: 'text-yellow-300',
          icon: 'text-yellow-400'
        };
      case 'authentication':
        return {
          bg: 'bg-red-900/20',
          border: 'border-red-600/30',
          text: 'text-red-300',
          icon: 'text-red-400'
        };
      case 'network':
        return {
          bg: 'bg-blue-900/20',
          border: 'border-blue-600/30',
          text: 'text-blue-300',
          icon: 'text-blue-400'
        };
      case 'validation':
        return {
          bg: 'bg-orange-900/20',
          border: 'border-orange-600/30',
          text: 'text-orange-300',
          icon: 'text-orange-400'
        };
      default:
        return {
          bg: 'bg-red-900/20',
          border: 'border-red-600/30',
          text: 'text-red-300',
          icon: 'text-red-400'
        };
    }
  };

  const theme = getErrorTheme();

  // Get user-friendly title
  const getErrorTitle = () => {
    const titles = {
      permission: {
        ar: 'غير مصرح',
        en: 'Access Denied'
      },
      authentication: {
        ar: 'مطلوب تسجيل الدخول',
        en: 'Authentication Required'
      },
      network: {
        ar: 'مشكلة في الاتصال',
        en: 'Connection Problem'
      },
      server: {
        ar: 'خطأ في الخادم',
        en: 'Server Error'
      },
      service_unavailable: {
        ar: 'الخدمة غير متاحة',
        en: 'Service Unavailable'
      },
      validation: {
        ar: 'بيانات غير صحيحة',
        en: 'Invalid Data'
      },
      rate_limit: {
        ar: 'تجاوز الحد المسموح',
        en: 'Rate Limited'
      },
      not_found: {
        ar: 'غير موجود',
        en: 'Not Found'
      },
      unknown: {
        ar: 'خطأ غير متوقع',
        en: 'Unexpected Error'
      }
    };

    return titles[error.type]?.[currentLanguage] || titles.unknown[currentLanguage];
  };

  // Get action suggestions
  const getActionSuggestions = () => {
    const suggestions = {
      permission: {
        ar: 'تواصل مع المدير للحصول على الصلاحيات المطلوبة',
        en: 'Contact administrator for required permissions'
      },
      authentication: {
        ar: 'يرجى تسجيل الدخول مرة أخرى',
        en: 'Please log in again'
      },
      network: {
        ar: 'تحقق من اتصال الإنترنت وأعد المحاولة',
        en: 'Check your internet connection and try again'
      },
      server: {
        ar: 'يرجى المحاولة مرة أخرى خلال بضع دقائق',
        en: 'Please try again in a few minutes'
      },
      service_unavailable: {
        ar: 'الخدمة قيد الصيانة، يرجى المحاولة لاحقاً',
        en: 'Service under maintenance, please try again later'
      },
      validation: {
        ar: 'يرجى مراجعة البيانات المدخلة وتصحيحها',
        en: 'Please review and correct the input data'
      },
      rate_limit: {
        ar: 'انتظر قليلاً قبل المحاولة مرة أخرى',
        en: 'Wait a moment before trying again'
      },
      not_found: {
        ar: 'المورد المطلوب غير موجود',
        en: 'The requested resource was not found'
      },
      unknown: {
        ar: 'حاول إعادة تحميل الصفحة',
        en: 'Try refreshing the page'
      }
    };

    return suggestions[error.type]?.[currentLanguage] || suggestions.unknown[currentLanguage];
  };

  // Render content based on variant
  const renderContent = () => (
    <div className={`${theme.bg} ${theme.border} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <div className={`${theme.icon} flex-shrink-0 mt-0.5`}>
          {getErrorIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium ${theme.text}`}>
              {getErrorTitle()}
            </h3>
            
            <div className="flex items-center space-x-2">
              {/* Details toggle */}
              {showDetails && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`${theme.text} hover:opacity-80 transition-opacity`}
                  title={currentLanguage === 'ar' ? 'التفاصيل' : 'Details'}
                >
                  <FaInfoCircle className="w-4 h-4" />
                </button>
              )}
              
              {/* Dismiss button */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`${theme.text} hover:opacity-80 transition-opacity`}
                  title={currentLanguage === 'ar' ? 'إخفاء' : 'Dismiss'}
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-2">
            <p className="text-sm text-gray-300">
              {error.message}
            </p>
            
            <p className="text-xs text-gray-400 mt-1">
              {getActionSuggestions()}
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="mt-3 flex items-center space-x-3">
            {onRetry && error.canRetry && (
              <button
                onClick={onRetry}
                className={`
                  inline-flex items-center space-x-2 px-3 py-1 
                  bg-white/10 hover:bg-white/20 text-white text-sm rounded-md 
                  transition-colors
                `}
              >
                <FaRefresh className="w-3 h-3" />
                <span>
                  {currentLanguage === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </span>
              </button>
            )}
            
            {error.type === 'authentication' && (
              <button
                onClick={() => window.location.href = '/login'}
                className={`
                  inline-flex items-center space-x-2 px-3 py-1 
                  bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md 
                  transition-colors
                `}
              >
                <FaLock className="w-3 h-3" />
                <span>
                  {currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Log In'}
                </span>
              </button>
            )}
          </div>
          
          {/* Expanded details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-white/10"
              >
                <div className="text-xs text-gray-400 space-y-1">
                  <div>
                    <strong>
                      {currentLanguage === 'ar' ? 'نوع الخطأ:' : 'Error Type:'}
                    </strong> {error.type}
                  </div>
                  {error.statusCode && (
                    <div>
                      <strong>
                        {currentLanguage === 'ar' ? 'رمز الحالة:' : 'Status Code:'}
                      </strong> {error.statusCode}
                    </div>
                  )}
                  <div>
                    <strong>
                      {currentLanguage === 'ar' ? 'وقت الحدوث:' : 'Timestamp:'}
                    </strong> {new Date().toLocaleString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US')}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  // Render based on variant
  switch (variant) {
    case 'modal':
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-md w-full"
          >
            {renderContent()}
          </motion.div>
        </div>
      );
      
    case 'toast':
      return (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          {renderContent()}
        </motion.div>
      );
      
    case 'inline':
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {renderContent()}
        </motion.div>
      );
      
    default: // banner
      return (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full"
        >
          {renderContent()}
        </motion.div>
      );
  }
};

// Specialized error components
export const PermissionError = ({ feature, onDismiss }) => {
  const { currentLanguage } = useLanguage();
  
  return (
    <ErrorDisplay
      error={{
        type: 'permission',
        message: currentLanguage === 'ar' 
          ? `ليس لديك صلاحية للوصول إلى ${feature}`
          : `You do not have permission to access ${feature}`,
        canRetry: false,
        statusCode: 403
      }}
      onDismiss={onDismiss}
      data-error-message="permission"
    />
  );
};

export const AuthenticationError = ({ onRetry, onDismiss }) => {
  const { currentLanguage } = useLanguage();
  
  return (
    <ErrorDisplay
      error={{
        type: 'authentication',
        message: currentLanguage === 'ar' 
          ? 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى'
          : 'Session expired. Please log in again',
        canRetry: false,
        statusCode: 401
      }}
      onRetry={onRetry}
      onDismiss={onDismiss}
      data-error-message="authentication"
    />
  );
};

export const NetworkError = ({ onRetry, onDismiss }) => {
  const { currentLanguage } = useLanguage();
  
  return (
    <ErrorDisplay
      error={{
        type: 'network',
        message: currentLanguage === 'ar' 
          ? 'مشكلة في الاتصال. يرجى التحقق من اتصال الإنترنت'
          : 'Connection problem. Please check your internet connection',
        canRetry: true,
        statusCode: 0
      }}
      onRetry={onRetry}
      onDismiss={onDismiss}
      data-error-message="network"
    />
  );
};

export default ErrorDisplay; 