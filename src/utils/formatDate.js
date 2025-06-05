/**
 * Date formatting utilities for Arabic and English locales
 */

// Arabic month names
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// Arabic day names
const ARABIC_DAYS = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
];

// Arabic day names (short)
const ARABIC_DAYS_SHORT = [
  'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'
];

/**
 * Convert English numbers to Arabic numbers
 */
export const toArabicNumbers = (str) => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.toString().replace(/[0-9]/g, (digit) => arabicNumbers[parseInt(digit)]);
};

/**
 * Convert Arabic numbers to English numbers
 */
export const toEnglishNumbers = (str) => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.toString().replace(/[٠-٩]/g, (digit) => arabicNumbers.indexOf(digit).toString());
};

/**
 * Format date for display based on language
 */
export const formatDate = (date, language = 'en', options = {}) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const {
    includeTime = false,
    includeDay = false,
    format = 'long', // 'short', 'medium', 'long'
    timeFormat = '24h' // '12h', '24h'
  } = options;

  if (language === 'ar') {
    return formatArabicDate(dateObj, { includeTime, includeDay, format, timeFormat });
  } else {
    return formatEnglishDate(dateObj, { includeTime, includeDay, format, timeFormat });
  }
};

/**
 * Format date in Arabic
 */
export const formatArabicDate = (date, options = {}) => {
  const {
    includeTime = false,
    includeDay = false,
    format = 'long',
    timeFormat = '24h'
  } = options;

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const dayOfWeek = date.getDay();

  let result = '';

  // Add day name if requested
  if (includeDay) {
    result += format === 'short' ? ARABIC_DAYS_SHORT[dayOfWeek] : ARABIC_DAYS[dayOfWeek];
    result += '، ';
  }

  // Format date based on format type
  switch (format) {
    case 'short':
      result += `${toArabicNumbers(day)}/${toArabicNumbers(month + 1)}/${toArabicNumbers(year)}`;
      break;
    case 'medium':
      result += `${toArabicNumbers(day)} ${ARABIC_MONTHS[month]} ${toArabicNumbers(year)}`;
      break;
    case 'long':
    default:
      result += `${toArabicNumbers(day)} ${ARABIC_MONTHS[month]} ${toArabicNumbers(year)}`;
      break;
  }

  // Add time if requested
  if (includeTime) {
    result += ' - ';
    result += formatArabicTime(date, timeFormat);
  }

  return result;
};

/**
 * Format date in English
 */
export const formatEnglishDate = (date, options = {}) => {
  const {
    includeTime = false,
    includeDay = false,
    format = 'long',
    timeFormat = '24h'
  } = options;

  let formatOptions = {};

  if (includeDay) {
    formatOptions.weekday = format === 'short' ? 'short' : 'long';
  }

  switch (format) {
    case 'short':
      formatOptions.year = 'numeric';
      formatOptions.month = '2-digit';
      formatOptions.day = '2-digit';
      break;
    case 'medium':
      formatOptions.year = 'numeric';
      formatOptions.month = 'short';
      formatOptions.day = 'numeric';
      break;
    case 'long':
    default:
      formatOptions.year = 'numeric';
      formatOptions.month = 'long';
      formatOptions.day = 'numeric';
      break;
  }

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.hour12 = timeFormat === '12h';
  }

  return date.toLocaleDateString('en-US', formatOptions);
};

/**
 * Format time in Arabic
 */
export const formatArabicTime = (date, format = '24h') => {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  if (format === '12h') {
    const period = hours >= 12 ? 'مساءً' : 'صباحاً';
    const displayHours = hours % 12 || 12;
    return `${toArabicNumbers(displayHours)}:${toArabicNumbers(minutes.toString().padStart(2, '0'))} ${period}`;
  } else {
    return `${toArabicNumbers(hours.toString().padStart(2, '0'))}:${toArabicNumbers(minutes.toString().padStart(2, '0'))}`;
  }
};

/**
 * Format time in English
 */
export const formatEnglishTime = (date, format = '24h') => {
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: format === '12h'
  };

  return date.toLocaleTimeString('en-US', options);
};

/**
 * Get relative time (e.g., "2 hours ago", "منذ ساعتين")
 */
export const getRelativeTime = (date, language = 'en') => {
  if (!date) return '';
  
  const now = new Date();
  const dateObj = new Date(date);
  const diffInSeconds = Math.floor((now - dateObj) / 1000);

  if (language === 'ar') {
    return getArabicRelativeTime(diffInSeconds);
  } else {
    return getEnglishRelativeTime(diffInSeconds);
  }
};

/**
 * Get relative time in Arabic
 */
export const getArabicRelativeTime = (diffInSeconds) => {
  const intervals = [
    { label: 'سنة', labelPlural: 'سنوات', seconds: 31536000 },
    { label: 'شهر', labelPlural: 'أشهر', seconds: 2592000 },
    { label: 'أسبوع', labelPlural: 'أسابيع', seconds: 604800 },
    { label: 'يوم', labelPlural: 'أيام', seconds: 86400 },
    { label: 'ساعة', labelPlural: 'ساعات', seconds: 3600 },
    { label: 'دقيقة', labelPlural: 'دقائق', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      const label = count === 1 ? interval.label : 
                   count === 2 ? interval.label + 'ين' : 
                   count <= 10 ? interval.labelPlural : interval.label;
      return `منذ ${toArabicNumbers(count)} ${label}`;
    }
  }

  return 'الآن';
};

/**
 * Get relative time in English
 */
export const getEnglishRelativeTime = (diffInSeconds) => {
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      const label = count === 1 ? interval.label : interval.label + 's';
      return `${count} ${label} ago`;
    }
  }

  return 'just now';
};

/**
 * Format date range
 */
export const formatDateRange = (startDate, endDate, language = 'en', options = {}) => {
  if (!startDate || !endDate) return '';

  const start = formatDate(startDate, language, options);
  const end = formatDate(endDate, language, options);

  const separator = language === 'ar' ? ' إلى ' : ' to ';
  return `${start}${separator}${end}`;
};

/**
 * Check if date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  const today = new Date();
  const dateObj = new Date(date);
  
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date) => {
  if (!date) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateObj = new Date(date);
  
  return dateObj.getDate() === yesterday.getDate() &&
         dateObj.getMonth() === yesterday.getMonth() &&
         dateObj.getFullYear() === yesterday.getFullYear();
};

/**
 * Check if date is tomorrow
 */
export const isTomorrow = (date) => {
  if (!date) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateObj = new Date(date);
  
  return dateObj.getDate() === tomorrow.getDate() &&
         dateObj.getMonth() === tomorrow.getMonth() &&
         dateObj.getFullYear() === tomorrow.getFullYear();
};

/**
 * Get smart date format (Today, Yesterday, Tomorrow, or formatted date)
 */
export const getSmartDate = (date, language = 'en', options = {}) => {
  if (!date) return '';

  if (isToday(date)) {
    return language === 'ar' ? 'اليوم' : 'Today';
  }
  
  if (isYesterday(date)) {
    return language === 'ar' ? 'أمس' : 'Yesterday';
  }
  
  if (isTomorrow(date)) {
    return language === 'ar' ? 'غداً' : 'Tomorrow';
  }

  return formatDate(date, language, options);
};

/**
 * Parse date string and return Date object
 */
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // Handle Arabic numbers
  const normalizedString = toEnglishNumbers(dateString);
  const date = new Date(normalizedString);
  
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Get date in ISO format for API calls
 */
export const toISODate = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString();
};

/**
 * Get date in YYYY-MM-DD format
 */
export const toDateString = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export default {
  formatDate,
  formatArabicDate,
  formatEnglishDate,
  formatArabicTime,
  formatEnglishTime,
  getRelativeTime,
  formatDateRange,
  getSmartDate,
  toArabicNumbers,
  toEnglishNumbers,
  parseDate,
  toISODate,
  toDateString,
  isToday,
  isYesterday,
  isTomorrow
}; 