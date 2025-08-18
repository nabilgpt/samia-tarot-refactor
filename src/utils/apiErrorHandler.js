// =================================================
// SAMIA TAROT API ERROR HANDLER
// Comprehensive error handling for translation APIs and permissions
// =================================================

import toastService from '../services/toastService';

class APIErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }

  // =================================================
  // MAIN ERROR HANDLING
  // =================================================

  handleError(error, context = {}) {
    const { endpoint, language = 'en', showToast = true, retryCallback = null } = context;
    
    console.error(`🚨 API Error [${endpoint}]:`, error);
    
    // Increment error count
    this.incrementErrorCount(endpoint);
    
    // Handle specific error types
    const errorInfo = this.categorizeError(error);
    const userMessage = this.getUserFriendlyMessage(errorInfo, language);
    
    // Show toast notification if requested
    if (showToast) {
      this.showErrorToast(errorInfo, userMessage);
    }
    
    // Handle retry logic
    if (retryCallback && this.shouldRetry(endpoint, errorInfo)) {
      this.scheduleRetry(endpoint, retryCallback);
    }
    
    return {
      type: errorInfo.type,
      message: userMessage,
      canRetry: this.shouldRetry(endpoint, errorInfo),
      statusCode: errorInfo.statusCode
    };
  }

  // =================================================
  // ERROR CATEGORIZATION
  // =================================================

  categorizeError(error) {
    // Network errors
    if (!error.response) {
      return {
        type: 'network',
        statusCode: 0,
        message: error.message,
        isRetryable: true
      };
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        return {
          type: 'validation',
          statusCode: 400,
          message: data?.error || 'Invalid request data',
          isRetryable: false
        };

      case 401:
        return {
          type: 'authentication',
          statusCode: 401,
          message: data?.error || 'Authentication required',
          isRetryable: false
        };

      case 403:
        return {
          type: 'permission',
          statusCode: 403,
          message: data?.error || 'Access denied',
          isRetryable: false
        };

      case 404:
        return {
          type: 'not_found',
          statusCode: 404,
          message: data?.error || 'Resource not found',
          isRetryable: false
        };

      case 422:
        return {
          type: 'validation',
          statusCode: 422,
          message: data?.error || 'Validation failed',
          isRetryable: false
        };

      case 429:
        return {
          type: 'rate_limit',
          statusCode: 429,
          message: data?.error || 'Too many requests',
          isRetryable: true
        };

      case 500:
        return {
          type: 'server',
          statusCode: 500,
          message: data?.error || 'Internal server error',
          isRetryable: true
        };

      case 502:
      case 503:
      case 504:
        return {
          type: 'service_unavailable',
          statusCode: status,
          message: data?.error || 'Service temporarily unavailable',
          isRetryable: true
        };

      default:
        return {
          type: 'unknown',
          statusCode: status,
          message: data?.error || `Unexpected error (${status})`,
          isRetryable: false
        };
    }
  }

  // =================================================
  // USER-FRIENDLY MESSAGES
  // =================================================

  getUserFriendlyMessage(errorInfo, language) {
    const messages = {
      network: {
        ar: 'مشكلة في الاتصال. يرجى التحقق من اتصال الإنترنت',
        en: 'Connection problem. Please check your internet connection'
      },
      authentication: {
        ar: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى',
        en: 'Session expired. Please log in again'
      },
      permission: {
        ar: 'ليس لديك صلاحية للوصول إلى هذه الميزة',
        en: 'You do not have permission to access this feature'
      },
      not_found: {
        ar: 'المورد المطلوب غير موجود',
        en: 'The requested resource was not found'
      },
      validation: {
        ar: 'البيانات المدخلة غير صحيحة',
        en: 'Invalid input data'
      },
      rate_limit: {
        ar: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً',
        en: 'Too many requests. Please try again later'
      },
      server: {
        ar: 'خطأ في الخادم. يرجى المحاولة مرة أخرى',
        en: 'Server error. Please try again'
      },
      service_unavailable: {
        ar: 'الخدمة غير متاحة مؤقتاً',
        en: 'Service temporarily unavailable'
      },
      unknown: {
        ar: 'حدث خطأ غير متوقع',
        en: 'An unexpected error occurred'
      }
    };

    return messages[errorInfo.type]?.[language] || messages.unknown[language];
  }

  // =================================================
  // TOAST NOTIFICATIONS
  // =================================================

  showErrorToast(errorInfo, message) {
    switch (errorInfo.type) {
      case 'permission':
        toastService.warning(message, {
          duration: 5000,
          icon: '🔒'
        });
        break;

      case 'authentication':
        toastService.error(message, {
          duration: 8000,
          icon: '🔐'
        });
        break;

      case 'network':
      case 'service_unavailable':
        toastService.error(message, {
          duration: 6000,
          icon: '🌐'
        });
        break;

      case 'validation':
        toastService.warning(message, {
          duration: 4000,
          icon: '⚠️'
        });
        break;

      default:
        toastService.error(message, {
          duration: 5000,
          icon: '❌'
        });
    }
  }

  // =================================================
  // RETRY LOGIC
  // =================================================

  shouldRetry(endpoint, errorInfo) {
    if (!errorInfo.isRetryable) return false;
    
    const retryCount = this.retryAttempts.get(endpoint) || 0;
    return retryCount < this.maxRetries;
  }

  scheduleRetry(endpoint, retryCallback, delay = 1000) {
    const retryCount = this.retryAttempts.get(endpoint) || 0;
    this.retryAttempts.set(endpoint, retryCount + 1);
    
    const backoffDelay = delay * Math.pow(2, retryCount); // Exponential backoff
    
    setTimeout(() => {
      console.log(`🔄 Retrying API call to ${endpoint} (attempt ${retryCount + 1})`);
      retryCallback();
    }, backoffDelay);
  }

  resetRetryCount(endpoint) {
    this.retryAttempts.delete(endpoint);
  }

  // =================================================
  // ERROR TRACKING
  // =================================================

  incrementErrorCount(endpoint) {
    const currentCount = this.errorCounts.get(endpoint) || 0;
    this.errorCounts.set(endpoint, currentCount + 1);
  }

  getErrorStats() {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      retryAttempts: Object.fromEntries(this.retryAttempts),
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0)
    };
  }

  clearStats() {
    this.errorCounts.clear();
    this.retryAttempts.clear();
  }

  // =================================================
  // SPECIFIC ERROR HANDLERS
  // =================================================

  handleTranslationError(error, language = 'en') {
    return this.handleError(error, {
      endpoint: 'translation',
      language,
      showToast: true
    });
  }

  handlePermissionError(error, feature = 'translation management', language = 'en') {
    const customMessage = language === 'ar' 
      ? `ليس لديك صلاحية للوصول إلى ${feature}`
      : `You do not have permission to access ${feature}`;
    
    toastService.warning(customMessage, {
      duration: 5000,
      icon: '🔒'
    });
    
    return {
      type: 'permission',
      message: customMessage,
      canRetry: false,
      statusCode: 403
    };
  }

  handleAuthenticationError(language = 'en') {
    const message = language === 'ar' 
      ? 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى'
      : 'Session expired. Please log in again';
    
    toastService.error(message, {
      duration: 8000,
      icon: '🔐'
    });
    
    // Clear local storage token
    localStorage.removeItem('token');
    
    // Redirect to login after delay
    setTimeout(() => {
      window.location.href = '/login';
    }, 3000);
    
    return {
      type: 'authentication',
      message,
      canRetry: false,
      statusCode: 401
    };
  }

  // =================================================
  // AXIOS INTERCEPTOR SETUP
  // =================================================

  setupAxiosInterceptors(axiosInstance) {
    // Request interceptor
    axiosInstance.interceptors.request.use(
      (config) => {
        // Reset retry count on successful request
        this.resetRetryCount(config.url);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        const handled = this.handleError(error, {
          endpoint: error.config?.url,
          language: document.body.classList.contains('rtl') ? 'ar' : 'en',
          showToast: true
        });
        
        // Attach handled error info to the error object
        error.handledInfo = handled;
        
        return Promise.reject(error);
      }
    );
  }
}

// Export singleton instance
export default new APIErrorHandler(); 