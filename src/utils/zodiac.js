/**
 * Zodiac sign calculation utilities
 */

// Zodiac signs data with dates and names in both languages
const ZODIAC_SIGNS = [
  {
    sign: 'aries',
    name: {
      en: 'Aries',
      ar: 'الحمل'
    },
    symbol: '♈',
    emoji: '🐏',
    element: {
      en: 'Fire',
      ar: 'النار'
    },
    dates: {
      start: { month: 3, day: 21 }, // March 21
      end: { month: 4, day: 19 }   // April 19
    },
    traits: {
      en: ['Energetic', 'Confident', 'Pioneering', 'Independent'],
      ar: ['نشيط', 'واثق', 'رائد', 'مستقل']
    }
  },
  {
    sign: 'taurus',
    name: {
      en: 'Taurus',
      ar: 'الثور'
    },
    symbol: '♉',
    emoji: '🐂',
    element: {
      en: 'Earth',
      ar: 'الأرض'
    },
    dates: {
      start: { month: 4, day: 20 }, // April 20
      end: { month: 5, day: 20 }   // May 20
    },
    traits: {
      en: ['Reliable', 'Patient', 'Practical', 'Devoted'],
      ar: ['موثوق', 'صبور', 'عملي', 'مخلص']
    }
  },
  {
    sign: 'gemini',
    name: {
      en: 'Gemini',
      ar: 'الجوزاء'
    },
    symbol: '♊',
    emoji: '👯',
    element: {
      en: 'Air',
      ar: 'الهواء'
    },
    dates: {
      start: { month: 5, day: 21 }, // May 21
      end: { month: 6, day: 20 }   // June 20
    },
    traits: {
      en: ['Adaptable', 'Curious', 'Communicative', 'Witty'],
      ar: ['متكيف', 'فضولي', 'تواصلي', 'ذكي']
    }
  },
  {
    sign: 'cancer',
    name: {
      en: 'Cancer',
      ar: 'السرطان'
    },
    symbol: '♋',
    emoji: '🦀',
    element: {
      en: 'Water',
      ar: 'الماء'
    },
    dates: {
      start: { month: 6, day: 21 }, // June 21
      end: { month: 7, day: 22 }   // July 22
    },
    traits: {
      en: ['Intuitive', 'Emotional', 'Protective', 'Sympathetic'],
      ar: ['حدسي', 'عاطفي', 'حامي', 'متعاطف']
    }
  },
  {
    sign: 'leo',
    name: {
      en: 'Leo',
      ar: 'الأسد'
    },
    symbol: '♌',
    emoji: '🦁',
    element: {
      en: 'Fire',
      ar: 'النار'
    },
    dates: {
      start: { month: 7, day: 23 }, // July 23
      end: { month: 8, day: 22 }   // August 22
    },
    traits: {
      en: ['Generous', 'Warm-hearted', 'Creative', 'Enthusiastic'],
      ar: ['كريم', 'دافئ القلب', 'مبدع', 'متحمس']
    }
  },
  {
    sign: 'virgo',
    name: {
      en: 'Virgo',
      ar: 'العذراء'
    },
    symbol: '♍',
    emoji: '👩',
    element: {
      en: 'Earth',
      ar: 'الأرض'
    },
    dates: {
      start: { month: 8, day: 23 }, // August 23
      end: { month: 9, day: 22 }   // September 22
    },
    traits: {
      en: ['Analytical', 'Practical', 'Reliable', 'Modest'],
      ar: ['تحليلي', 'عملي', 'موثوق', 'متواضع']
    }
  },
  {
    sign: 'libra',
    name: {
      en: 'Libra',
      ar: 'الميزان'
    },
    symbol: '♎',
    emoji: '⚖️',
    element: {
      en: 'Air',
      ar: 'الهواء'
    },
    dates: {
      start: { month: 9, day: 23 }, // September 23
      end: { month: 10, day: 22 }  // October 22
    },
    traits: {
      en: ['Diplomatic', 'Gracious', 'Fair-minded', 'Social'],
      ar: ['دبلوماسي', 'لطيف', 'عادل', 'اجتماعي']
    }
  },
  {
    sign: 'scorpio',
    name: {
      en: 'Scorpio',
      ar: 'العقرب'
    },
    symbol: '♏',
    emoji: '🦂',
    element: {
      en: 'Water',
      ar: 'الماء'
    },
    dates: {
      start: { month: 10, day: 23 }, // October 23
      end: { month: 11, day: 21 }   // November 21
    },
    traits: {
      en: ['Resourceful', 'Brave', 'Passionate', 'Stubborn'],
      ar: ['ماهر', 'شجاع', 'شغوف', 'عنيد']
    }
  },
  {
    sign: 'sagittarius',
    name: {
      en: 'Sagittarius',
      ar: 'القوس'
    },
    symbol: '♐',
    emoji: '🏹',
    element: {
      en: 'Fire',
      ar: 'النار'
    },
    dates: {
      start: { month: 11, day: 22 }, // November 22
      end: { month: 12, day: 21 }   // December 21
    },
    traits: {
      en: ['Generous', 'Idealistic', 'Great sense of humor'],
      ar: ['كريم', 'مثالي', 'حس فكاهة عالي']
    }
  },
  {
    sign: 'capricorn',
    name: {
      en: 'Capricorn',
      ar: 'الجدي'
    },
    symbol: '♑',
    emoji: '🐐',
    element: {
      en: 'Earth',
      ar: 'الأرض'
    },
    dates: {
      start: { month: 12, day: 22 }, // December 22
      end: { month: 1, day: 19 }    // January 19
    },
    traits: {
      en: ['Responsible', 'Disciplined', 'Self-control', 'Good managers'],
      ar: ['مسؤول', 'منضبط', 'ضبط النفس', 'مدير جيد']
    }
  },
  {
    sign: 'aquarius',
    name: {
      en: 'Aquarius',
      ar: 'الدلو'
    },
    symbol: '♒',
    emoji: '🏺',
    element: {
      en: 'Air',
      ar: 'الهواء'
    },
    dates: {
      start: { month: 1, day: 20 }, // January 20
      end: { month: 2, day: 18 }   // February 18
    },
    traits: {
      en: ['Progressive', 'Original', 'Independent', 'Humanitarian'],
      ar: ['تقدمي', 'أصيل', 'مستقل', 'إنساني']
    }
  },
  {
    sign: 'pisces',
    name: {
      en: 'Pisces',
      ar: 'الحوت'
    },
    symbol: '♓',
    emoji: '🐟',
    element: {
      en: 'Water',
      ar: 'الماء'
    },
    dates: {
      start: { month: 2, day: 19 }, // February 19
      end: { month: 3, day: 20 }   // March 20
    },
    traits: {
      en: ['Compassionate', 'Artistic', 'Intuitive', 'Gentle'],
      ar: ['رحيم', 'فني', 'حدسي', 'لطيف']
    }
  }
];

/**
 * Get zodiac sign from birth date
 */
export const getZodiacSign = (birthDate, language = 'en') => {
  if (!birthDate) return null;

  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return null;

  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();

  for (const zodiac of ZODIAC_SIGNS) {
    const { start, end } = zodiac.dates;
    
    // Handle year-end transition (Capricorn)
    if (start.month > end.month) {
      if ((month === start.month && day >= start.day) || 
          (month === end.month && day <= end.day)) {
        return zodiac.name[language] || zodiac.name.en;
      }
    } else {
      if ((month === start.month && day >= start.day) || 
          (month === end.month && day <= end.day) ||
          (month > start.month && month < end.month)) {
        return zodiac.name[language] || zodiac.name.en;
      }
    }
  }

  return null;
};

/**
 * Get full zodiac information
 */
export const getZodiacInfo = (birthDate, language = 'en') => {
  if (!birthDate) return null;

  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return null;

  const month = date.getMonth() + 1;
  const day = date.getDate();

  for (const zodiac of ZODIAC_SIGNS) {
    const { start, end } = zodiac.dates;
    
    // Handle year-end transition (Capricorn)
    if (start.month > end.month) {
      if ((month === start.month && day >= start.day) || 
          (month === end.month && day <= end.day)) {
        return {
          sign: zodiac.sign,
          name: zodiac.name[language] || zodiac.name.en,
          symbol: zodiac.symbol,
          emoji: zodiac.emoji,
          element: zodiac.element[language] || zodiac.element.en,
          traits: zodiac.traits[language] || zodiac.traits.en,
          dates: zodiac.dates
        };
      }
    } else {
      if ((month === start.month && day >= start.day) || 
          (month === end.month && day <= end.day) ||
          (month > start.month && month < end.month)) {
        return {
          sign: zodiac.sign,
          name: zodiac.name[language] || zodiac.name.en,
          symbol: zodiac.symbol,
          emoji: zodiac.emoji,
          element: zodiac.element[language] || zodiac.element.en,
          traits: zodiac.traits[language] || zodiac.traits.en,
          dates: zodiac.dates
        };
      }
    }
  }

  return null;
};

/**
 * Get zodiac sign by name
 */
export const getZodiacByName = (signName, language = 'en') => {
  if (!signName) return null;

  const normalizedName = signName.toLowerCase().trim();
  
  for (const zodiac of ZODIAC_SIGNS) {
    if (zodiac.sign === normalizedName || 
        zodiac.name.en.toLowerCase() === normalizedName ||
        zodiac.name.ar === signName) {
      return {
        sign: zodiac.sign,
        name: zodiac.name[language] || zodiac.name.en,
        symbol: zodiac.symbol,
        emoji: zodiac.emoji,
        element: zodiac.element[language] || zodiac.element.en,
        traits: zodiac.traits[language] || zodiac.traits.en,
        dates: zodiac.dates
      };
    }
  }

  return null;
};

/**
 * Get all zodiac signs
 */
export const getAllZodiacSigns = (language = 'en') => {
  return ZODIAC_SIGNS.map(zodiac => ({
    sign: zodiac.sign,
    name: zodiac.name[language] || zodiac.name.en,
    symbol: zodiac.symbol,
    emoji: zodiac.emoji,
    element: zodiac.element[language] || zodiac.element.en,
    traits: zodiac.traits[language] || zodiac.traits.en,
    dates: zodiac.dates
  }));
};

/**
 * Get zodiac compatibility
 */
export const getZodiacCompatibility = (sign1, sign2, language = 'en') => {
  // Compatibility matrix based on elements and traditional astrology
  const compatibility = {
    fire: { fire: 'high', earth: 'medium', air: 'high', water: 'low' },
    earth: { fire: 'medium', earth: 'high', air: 'low', water: 'high' },
    air: { fire: 'high', earth: 'low', air: 'high', water: 'medium' },
    water: { fire: 'low', earth: 'high', air: 'medium', water: 'high' }
  };

  const zodiac1 = getZodiacByName(sign1, 'en');
  const zodiac2 = getZodiacByName(sign2, 'en');

  if (!zodiac1 || !zodiac2) return null;

  const element1 = getElementKey(zodiac1.element);
  const element2 = getElementKey(zodiac2.element);

  const compatibilityLevel = compatibility[element1]?.[element2] || 'medium';

  const descriptions = {
    high: {
      en: 'Excellent compatibility! You share similar energies and understand each other well.',
      ar: 'توافق ممتاز! تتشاركان طاقات متشابهة وتفهمان بعضكما البعض جيداً.'
    },
    medium: {
      en: 'Good compatibility with some challenges. Balance and understanding are key.',
      ar: 'توافق جيد مع بعض التحديات. التوازن والتفهم هما المفتاح.'
    },
    low: {
      en: 'Challenging compatibility. Requires effort and compromise from both sides.',
      ar: 'توافق صعب. يتطلب جهداً وتنازلات من الطرفين.'
    }
  };

  return {
    level: compatibilityLevel,
    description: descriptions[compatibilityLevel][language] || descriptions[compatibilityLevel].en,
    sign1: zodiac1.name,
    sign2: zodiac2.name
  };
};

/**
 * Helper function to get element key
 */
const getElementKey = (element) => {
  const elementMap = {
    'Fire': 'fire',
    'النار': 'fire',
    'Earth': 'earth',
    'الأرض': 'earth',
    'Air': 'air',
    'الهواء': 'air',
    'Water': 'water',
    'الماء': 'water'
  };
  
  return elementMap[element] || 'earth';
};

/**
 * Get zodiac horoscope (placeholder for future implementation)
 */
export const getZodiacHoroscope = (sign, period = 'daily', language = 'en') => {
  // This would typically fetch from an API or database
  // For now, return a placeholder
  const placeholders = {
    daily: {
      en: 'Today brings new opportunities for growth and self-discovery.',
      ar: 'اليوم يجلب فرصاً جديدة للنمو واكتشاف الذات.'
    },
    weekly: {
      en: 'This week focuses on relationships and personal connections.',
      ar: 'هذا الأسبوع يركز على العلاقات والروابط الشخصية.'
    },
    monthly: {
      en: 'This month emphasizes career advancement and financial stability.',
      ar: 'هذا الشهر يؤكد على التقدم المهني والاستقرار المالي.'
    }
  };

  return placeholders[period]?.[language] || placeholders.daily.en;
};

/**
 * Validate birth date format
 */
export const isValidBirthDate = (dateString) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 150, 0, 1); // 150 years ago
  const maxDate = new Date(); // Today
  
  return date >= minDate && date <= maxDate;
};

/**
 * Format zodiac date range
 */
export const formatZodiacDateRange = (zodiacInfo, language = 'en') => {
  if (!zodiacInfo || !zodiacInfo.dates) return '';

  const { start, end } = zodiacInfo.dates;
  
  const months = {
    en: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    ar: [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]
  };

  const startMonth = months[language][start.month - 1];
  const endMonth = months[language][end.month - 1];

  if (language === 'ar') {
    return `${start.day} ${startMonth} - ${end.day} ${endMonth}`;
  } else {
    return `${startMonth} ${start.day} - ${endMonth} ${end.day}`;
  }
};

export default {
  getZodiacSign,
  getZodiacInfo,
  getZodiacByName,
  getAllZodiacSigns,
  getZodiacCompatibility,
  getZodiacHoroscope,
  isValidBirthDate,
  formatZodiacDateRange,
  ZODIAC_SIGNS
}; 