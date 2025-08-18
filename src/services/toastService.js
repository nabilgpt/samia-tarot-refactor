// =================================================
// SAMIA TAROT BILINGUAL TOAST SERVICE
// Language-aware notification system
// =================================================

import { toast } from 'react-toastify';

// Default translations for common messages
const DEFAULT_TRANSLATIONS = {
  success: {
    ar: 'تم بنجاح',
    en: 'Success'
  },
  error: {
    ar: 'خطأ',
    en: 'Error'
  },
  warning: {
    ar: 'تحذير',
    en: 'Warning'
  },
  info: {
    ar: 'معلومات',
    en: 'Information'
  },
  loading: {
    ar: 'جاري التحميل...',
    en: 'Loading...'
  },
  saved: {
    ar: 'تم الحفظ بنجاح',
    en: 'Saved successfully'
  },
  deleted: {
    ar: 'تم الحذف بنجاح',
    en: 'Deleted successfully'
  },
  updated: {
    ar: 'تم التحديث بنجاح',
    en: 'Updated successfully'
  },
  created: {
    ar: 'تم الإنشاء بنجاح',
    en: 'Created successfully'
  },
  networkError: {
    ar: 'خطأ في الاتصال',
    en: 'Network error'
  },
  permissionDenied: {
    ar: 'تم رفض الصلاحية',
    en: 'Permission denied'
  },
  invalidData: {
    ar: 'بيانات غير صحيحة',
    en: 'Invalid data'
  },
  operationCancelled: {
    ar: 'تم إلغاء العملية',
    en: 'Operation cancelled'
  },
  sessionExpired: {
    ar: 'انتهت صلاحية الجلسة',
    en: 'Session expired'
  },
  accessDenied: {
    ar: 'ممنوع الوصول',
    en: 'Access denied'
  }
};

class BilingualToastService {
  constructor() {
    this.currentLanguage = 'en';
    this.customTranslations = {};
  }

  // Set current language
  setLanguage(language) {
    this.currentLanguage = language;
  }

  // Add custom translations
  addTranslations(translations) {
    this.customTranslations = { ...this.customTranslations, ...translations };
  }

  // Get translated message
  getMessage(key, fallback = null) {
    // Check custom translations first
    if (this.customTranslations[key]) {
      return this.customTranslations[key][this.currentLanguage] || 
             this.customTranslations[key].en || 
             fallback || key;
    }

    // Check default translations
    if (DEFAULT_TRANSLATIONS[key]) {
      return DEFAULT_TRANSLATIONS[key][this.currentLanguage] || 
             DEFAULT_TRANSLATIONS[key].en || 
             fallback || key;
    }

    // Return fallback or key if no translation found
    return fallback || key;
  }

  // Get toast options based on language
  getToastOptions(options = {}) {
    const baseOptions = {
      position: this.currentLanguage === 'ar' ? 'top-left' : 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      rtl: this.currentLanguage === 'ar',
      theme: 'dark',
      className: `toast-${this.currentLanguage}`,
      bodyClassName: `toast-body-${this.currentLanguage}`,
      progressClassName: 'toast-progress-purple',
      ...options
    };

    return baseOptions;
  }

  // Success toast
  success(message, options = {}) {
    const translatedMessage = typeof message === 'string' ? 
      this.getMessage(message, message) : message;
    
    return toast.success(translatedMessage, this.getToastOptions(options));
  }

  // Error toast
  error(message, options = {}) {
    const translatedMessage = typeof message === 'string' ? 
      this.getMessage(message, message) : message;
    
    return toast.error(translatedMessage, this.getToastOptions({
      autoClose: 5000, // Keep error messages longer
      ...options
    }));
  }

  // Warning toast
  warning(message, options = {}) {
    const translatedMessage = typeof message === 'string' ? 
      this.getMessage(message, message) : message;
    
    return toast.warning(translatedMessage, this.getToastOptions(options));
  }

  // Info toast
  info(message, options = {}) {
    const translatedMessage = typeof message === 'string' ? 
      this.getMessage(message, message) : message;
    
    return toast.info(translatedMessage, this.getToastOptions(options));
  }

  // Loading toast
  loading(message, options = {}) {
    const translatedMessage = typeof message === 'string' ? 
      this.getMessage(message, message) : message;
    
    return toast.loading(translatedMessage, this.getToastOptions({
      autoClose: false,
      closeOnClick: false,
      ...options
    }));
  }

  // Promise-based toast
  promise(promise, messages, options = {}) {
    const translatedMessages = {
      pending: this.getMessage(messages.pending || 'loading'),
      success: this.getMessage(messages.success || 'success'),
      error: this.getMessage(messages.error || 'error')
    };

    return toast.promise(promise, translatedMessages, this.getToastOptions(options));
  }

  // Update existing toast
  update(toastId, options = {}) {
    const updateOptions = {
      ...this.getToastOptions(),
      ...options
    };

    if (options.message) {
      updateOptions.render = this.getMessage(options.message, options.message);
    }

    return toast.update(toastId, updateOptions);
  }

  // Dismiss toast
  dismiss(toastId) {
    return toast.dismiss(toastId);
  }

  // Dismiss all toasts
  dismissAll() {
    return toast.dismiss();
  }

  // Custom toast with specific styling
  custom(message, type = 'default', options = {}) {
    const translatedMessage = typeof message === 'string' ? 
      this.getMessage(message, message) : message;

    const customOptions = {
      ...this.getToastOptions(),
      className: `toast-custom-${type} toast-${this.currentLanguage}`,
      ...options
    };

    return toast(translatedMessage, customOptions);
  }

  // Quick notification methods
  saved(message = 'saved', options = {}) {
    return this.success(message, options);
  }

  deleted(message = 'deleted', options = {}) {
    return this.success(message, options);
  }

  updated(message = 'updated', options = {}) {
    return this.success(message, options);
  }

  created(message = 'created', options = {}) {
    return this.success(message, options);
  }

  networkError(message = 'networkError', options = {}) {
    return this.error(message, options);
  }

  permissionDenied(message = 'permissionDenied', options = {}) {
    return this.error(message, options);
  }

  invalidData(message = 'invalidData', options = {}) {
    return this.error(message, options);
  }

  sessionExpired(message = 'sessionExpired', options = {}) {
    return this.error(message, {
      autoClose: 7000,
      ...options
    });
  }

  accessDenied(message = 'accessDenied', options = {}) {
    return this.error(message, {
      autoClose: 5000,
      ...options
    });
  }
}

// Create and export singleton instance
const toastService = new BilingualToastService();

export default toastService;

// Export individual methods for convenience
export const {
  success,
  error,
  warning,
  info,
  loading,
  promise,
  custom,
  saved,
  deleted,
  updated,
  created,
  networkError,
  permissionDenied,
  invalidData,
  sessionExpired,
  accessDenied,
  setLanguage,
  addTranslations,
  dismiss,
  dismissAll
} = toastService;

// Hook for components to use the toast service
export const useToast = () => {
  return {
    toast: toastService,
    success: toastService.success.bind(toastService),
    error: toastService.error.bind(toastService),
    warning: toastService.warning.bind(toastService),
    info: toastService.info.bind(toastService),
    loading: toastService.loading.bind(toastService),
    promise: toastService.promise.bind(toastService),
    custom: toastService.custom.bind(toastService),
    saved: toastService.saved.bind(toastService),
    deleted: toastService.deleted.bind(toastService),
    updated: toastService.updated.bind(toastService),
    created: toastService.created.bind(toastService),
    networkError: toastService.networkError.bind(toastService),
    permissionDenied: toastService.permissionDenied.bind(toastService),
    invalidData: toastService.invalidData.bind(toastService),
    sessionExpired: toastService.sessionExpired.bind(toastService),
    accessDenied: toastService.accessDenied.bind(toastService)
  };
}; 