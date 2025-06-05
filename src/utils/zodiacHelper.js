/**
 * Zodiac Helper Functions
 * Calculates zodiac sign from date of birth
 */

// Arabic zodiac names
const ZODIAC_SIGNS_AR = {
  aquarius: "الدلو",
  pisces: "الحوت", 
  aries: "الحمل",
  taurus: "الثور",
  gemini: "الجوزاء",
  cancer: "السرطان",
  leo: "الأسد",
  virgo: "العذراء",
  libra: "الميزان",
  scorpio: "العقرب",
  sagittarius: "القوس",
  capricorn: "الجدي"
};

// English zodiac names
const ZODIAC_SIGNS_EN = {
  aquarius: "Aquarius",
  pisces: "Pisces",
  aries: "Aries", 
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn"
};

/**
 * Calculate zodiac sign from date of birth
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} language - 'ar' for Arabic, 'en' for English
 * @returns {string} Zodiac sign name
 */
export function getZodiacSign(dateString, language = 'ar') {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    let zodiacKey = '';
    
    // Determine zodiac sign based on date ranges
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
      zodiacKey = 'aquarius';
    } else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
      zodiacKey = 'pisces';
    } else if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
      zodiacKey = 'aries';
    } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
      zodiacKey = 'taurus';
    } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
      zodiacKey = 'gemini';
    } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
      zodiacKey = 'cancer';
    } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
      zodiacKey = 'leo';
    } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
      zodiacKey = 'virgo';
    } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
      zodiacKey = 'libra';
    } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
      zodiacKey = 'scorpio';
    } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
      zodiacKey = 'sagittarius';
    } else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
      zodiacKey = 'capricorn';
    }
    
    // Return localized zodiac name
    const zodiacNames = language === 'ar' ? ZODIAC_SIGNS_AR : ZODIAC_SIGNS_EN;
    return zodiacNames[zodiacKey] || '';
    
  } catch (error) {
    console.error('Error calculating zodiac sign:', error);
    return '';
  }
}

/**
 * Get all zodiac signs for a given language
 * @param {string} language - 'ar' for Arabic, 'en' for English
 * @returns {Object} Object with zodiac keys and localized names
 */
export function getAllZodiacSigns(language = 'ar') {
  return language === 'ar' ? ZODIAC_SIGNS_AR : ZODIAC_SIGNS_EN;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid format
 */
export function isValidDateFormat(dateString) {
  if (!dateString) return false;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format date for API (ensures YYYY-MM-DD format)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateForAPI(date) {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
} 