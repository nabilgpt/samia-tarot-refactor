/**
 * Common form validation utilities
 */

/**
 * Email validation
 */
export const validateEmail = (email) => {
  if (!email) {
    return {
      isValid: false,
      error: {
        en: 'Email is required',
        ar: 'البريد الإلكتروني مطلوب'
      }
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: {
        en: 'Please enter a valid email address',
        ar: 'يرجى إدخال عنوان بريد إلكتروني صحيح'
      }
    };
  }

  return { isValid: true };
};

/**
 * Password validation
 */
export const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false
  } = options;

  if (!password) {
    return {
      isValid: false,
      error: {
        en: 'Password is required',
        ar: 'كلمة المرور مطلوبة'
      }
    };
  }

  if (password.length < minLength) {
    return {
      isValid: false,
      error: {
        en: `Password must be at least ${minLength} characters long`,
        ar: `يجب أن تكون كلمة المرور ${minLength} أحرف على الأقل`
      }
    };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: {
        en: 'Password must contain at least one uppercase letter',
        ar: 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل'
      }
    };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: {
        en: 'Password must contain at least one lowercase letter',
        ar: 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل'
      }
    };
  }

  if (requireNumbers && !/\d/.test(password)) {
    return {
      isValid: false,
      error: {
        en: 'Password must contain at least one number',
        ar: 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل'
      }
    };
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      error: {
        en: 'Password must contain at least one special character',
        ar: 'يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل'
      }
    };
  }

  return { isValid: true };
};

/**
 * Confirm password validation
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: {
        en: 'Please confirm your password',
        ar: 'يرجى تأكيد كلمة المرور'
      }
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: {
        en: 'Passwords do not match',
        ar: 'كلمات المرور غير متطابقة'
      }
    };
  }

  return { isValid: true };
};

/**
 * Name validation (supports Arabic and English)
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      error: {
        en: `${fieldName} is required`,
        ar: `${fieldName === 'First Name' ? 'الاسم الأول' : fieldName === 'Last Name' ? 'اسم العائلة' : 'الاسم'} مطلوب`
      }
    };
  }

  const trimmedName = name.trim();
  
  // Check minimum length
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: {
        en: `${fieldName} must be at least 2 characters long`,
        ar: `يجب أن يكون ${fieldName === 'First Name' ? 'الاسم الأول' : fieldName === 'Last Name' ? 'اسم العائلة' : 'الاسم'} حرفين على الأقل`
      }
    };
  }

  // Check maximum length
  if (trimmedName.length > 50) {
    return {
      isValid: false,
      error: {
        en: `${fieldName} must be less than 50 characters`,
        ar: `يجب أن يكون ${fieldName === 'First Name' ? 'الاسم الأول' : fieldName === 'Last Name' ? 'اسم العائلة' : 'الاسم'} أقل من 50 حرف`
      }
    };
  }

  // Allow Arabic, English letters, spaces, and common name characters
  const nameRegex = /^[\u0600-\u06FFa-zA-Z\s\-'.]+$/;
  if (!nameRegex.test(trimmedName)) {
    return {
      isValid: false,
      error: {
        en: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`,
        ar: `يمكن أن يحتوي ${fieldName === 'First Name' ? 'الاسم الأول' : fieldName === 'Last Name' ? 'اسم العائلة' : 'الاسم'} على أحرف ومسافات وشرطات فقط`
      }
    };
  }

  return { isValid: true };
};

/**
 * Phone number validation
 */
export const validatePhone = (phone) => {
  if (!phone || !phone.trim()) {
    return {
      isValid: false,
      error: {
        en: 'Phone number is required',
        ar: 'رقم الهاتف مطلوب'
      }
    };
  }

  // Remove all non-digit characters except + at the beginning
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Check if it starts with + and has 10-15 digits
  const phoneRegex = /^\+?[\d]{10,15}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return {
      isValid: false,
      error: {
        en: 'Please enter a valid phone number (10-15 digits)',
        ar: 'يرجى إدخال رقم هاتف صحيح (10-15 رقم)'
      }
    };
  }

  return { isValid: true };
};

/**
 * Date validation
 */
export const validateDate = (date, options = {}) => {
  const {
    required = false,
    minAge = null,
    maxAge = null,
    futureAllowed = false
  } = options;

  if (!date) {
    if (required) {
      return {
        isValid: false,
        error: {
          en: 'Date is required',
          ar: 'التاريخ مطلوب'
        }
      };
    }
    return { isValid: true };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      error: {
        en: 'Please enter a valid date',
        ar: 'يرجى إدخال تاريخ صحيح'
      }
    };
  }

  const now = new Date();
  
  // Check if future dates are allowed
  if (!futureAllowed && dateObj > now) {
    return {
      isValid: false,
      error: {
        en: 'Date cannot be in the future',
        ar: 'لا يمكن أن يكون التاريخ في المستقبل'
      }
    };
  }

  // Check minimum age
  if (minAge !== null) {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - minAge);
    
    if (dateObj > minDate) {
      return {
        isValid: false,
        error: {
          en: `You must be at least ${minAge} years old`,
          ar: `يجب أن تكون ${minAge} سنة على الأقل`
        }
      };
    }
  }

  // Check maximum age
  if (maxAge !== null) {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - maxAge);
    
    if (dateObj < maxDate) {
      return {
        isValid: false,
        error: {
          en: `Age cannot exceed ${maxAge} years`,
          ar: `لا يمكن أن يتجاوز العمر ${maxAge} سنة`
        }
      };
    }
  }

  return { isValid: true };
};

/**
 * Required field validation
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return {
      isValid: false,
      error: {
        en: `${fieldName} is required`,
        ar: `${fieldName} مطلوب`
      }
    };
  }

  return { isValid: true };
};

/**
 * URL validation
 */
export const validateURL = (url, required = false) => {
  if (!url) {
    if (required) {
      return {
        isValid: false,
        error: {
          en: 'URL is required',
          ar: 'الرابط مطلوب'
        }
      };
    }
    return { isValid: true };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: {
        en: 'Please enter a valid URL',
        ar: 'يرجى إدخال رابط صحيح'
      }
    };
  }
};

/**
 * Number validation
 */
export const validateNumber = (value, options = {}) => {
  const {
    required = false,
    min = null,
    max = null,
    integer = false
  } = options;

  if (!value && value !== 0) {
    if (required) {
      return {
        isValid: false,
        error: {
          en: 'Number is required',
          ar: 'الرقم مطلوب'
        }
      };
    }
    return { isValid: true };
  }

  const num = Number(value);
  if (isNaN(num)) {
    return {
      isValid: false,
      error: {
        en: 'Please enter a valid number',
        ar: 'يرجى إدخال رقم صحيح'
      }
    };
  }

  if (integer && !Number.isInteger(num)) {
    return {
      isValid: false,
      error: {
        en: 'Please enter a whole number',
        ar: 'يرجى إدخال رقم صحيح'
      }
    };
  }

  if (min !== null && num < min) {
    return {
      isValid: false,
      error: {
        en: `Number must be at least ${min}`,
        ar: `يجب أن يكون الرقم ${min} على الأقل`
      }
    };
  }

  if (max !== null && num > max) {
    return {
      isValid: false,
      error: {
        en: `Number must be at most ${max}`,
        ar: `يجب أن يكون الرقم ${max} على الأكثر`
      }
    };
  }

  return { isValid: true };
};

/**
 * File validation
 */
export const validateFile = (file, options = {}) => {
  const {
    required = false,
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;

  if (!file) {
    if (required) {
      return {
        isValid: false,
        error: {
          en: 'File is required',
          ar: 'الملف مطلوب'
        }
      };
    }
    return { isValid: true };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: {
        en: `File size must be less than ${maxSizeMB}MB`,
        ar: `يجب أن يكون حجم الملف أقل من ${maxSizeMB} ميجابايت`
      }
    };
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: {
        en: 'File type not supported',
        ar: 'نوع الملف غير مدعوم'
      }
    };
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: {
          en: `Allowed file types: ${allowedExtensions.join(', ')}`,
          ar: `أنواع الملفات المسموحة: ${allowedExtensions.join(', ')}`
        }
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate multiple fields at once
 */
export const validateForm = (fields, language = 'en') => {
  const errors = {};
  let isValid = true;

  for (const [fieldName, validation] of Object.entries(fields)) {
    if (!validation.isValid) {
      errors[fieldName] = validation.error[language] || validation.error.en;
      isValid = false;
    }
  }

  return {
    isValid,
    errors
  };
};

/**
 * Get password strength
 */
export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: { en: 'No password', ar: 'لا توجد كلمة مرور' } };

  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    longLength: password.length >= 12
  };

  // Calculate score
  Object.values(checks).forEach(check => {
    if (check) score++;
  });

  // Determine strength level
  let strength, label;
  if (score <= 2) {
    strength = 1;
    label = { en: 'Weak', ar: 'ضعيف' };
  } else if (score <= 4) {
    strength = 2;
    label = { en: 'Medium', ar: 'متوسط' };
  } else {
    strength = 3;
    label = { en: 'Strong', ar: 'قوي' };
  }

  return {
    strength,
    label,
    score,
    checks
  };
};

/**
 * Sanitize input (remove potentially harmful characters)
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate Arabic text
 */
export const validateArabicText = (text, required = false) => {
  if (!text || !text.trim()) {
    if (required) {
      return {
        isValid: false,
        error: {
          en: 'Arabic text is required',
          ar: 'النص العربي مطلوب'
        }
      };
    }
    return { isValid: true };
  }

  // Check if text contains Arabic characters
  const arabicRegex = /[\u0600-\u06FF]/;
  if (!arabicRegex.test(text)) {
    return {
      isValid: false,
      error: {
        en: 'Text must contain Arabic characters',
        ar: 'يجب أن يحتوي النص على أحرف عربية'
      }
    };
  }

  return { isValid: true };
};

/**
 * Validate English text
 */
export const validateEnglishText = (text, required = false) => {
  if (!text || !text.trim()) {
    if (required) {
      return {
        isValid: false,
        error: {
          en: 'English text is required',
          ar: 'النص الإنجليزي مطلوب'
        }
      };
    }
    return { isValid: true };
  }

  // Check if text contains English characters
  const englishRegex = /[a-zA-Z]/;
  if (!englishRegex.test(text)) {
    return {
      isValid: false,
      error: {
        en: 'Text must contain English characters',
        ar: 'يجب أن يحتوي النص على أحرف إنجليزية'
      }
    };
  }

  return { isValid: true };
};

export default {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
  validatePhone,
  validateDate,
  validateRequired,
  validateURL,
  validateNumber,
  validateFile,
  validateForm,
  getPasswordStrength,
  sanitizeInput,
  validateArabicText,
  validateEnglishText
}; 