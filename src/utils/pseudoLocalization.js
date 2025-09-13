/**
 * M37 — Pseudo-localization for Testing
 * WCAG 2.2 AA compliant pseudo-localization to test text truncation and UI overlap
 */

// Character mapping for pseudo-localization
const PSEUDO_CHARS = {
  'a': 'à', 'A': 'À',
  'e': 'é', 'E': 'É', 
  'i': 'í', 'I': 'Í',
  'o': 'ó', 'O': 'Ó',
  'u': 'ú', 'U': 'Ú',
  'n': 'ñ', 'N': 'Ñ',
  'c': 'ç', 'C': 'Ç',
  's': 'š', 'S': 'Š',
  'z': 'ž', 'Z': 'Ž',
  'y': 'ÿ', 'Y': 'Ÿ',
  'l': 'ł', 'L': 'Ł'
};

// Expansion patterns for different text types
const EXPANSION_PATTERNS = {
  // Short text (buttons, labels) - 30% expansion
  short: 1.3,
  // Medium text (descriptions) - 40% expansion  
  medium: 1.4,
  // Long text (paragraphs) - 50% expansion
  long: 1.5,
  // Arabic-like expansion (can be 20-60% longer)
  arabic: 1.6
};

// Prefix and suffix markers to identify pseudo-localized text
const PSEUDO_MARKERS = {
  start: '[§',
  end: '§]'
};

/**
 * Convert text to pseudo-localized version for testing
 * @param {string} text - Original text to pseudo-localize
 * @param {string} type - Type of expansion (short|medium|long|arabic)
 * @param {Object} options - Additional options
 * @returns {string} Pseudo-localized text
 */
export const pseudoLocalize = (text, type = 'medium', options = {}) => {
  if (!text || typeof text !== 'string') return text;
  
  const {
    preserveVariables = true,
    preserveHtml = true,
    addMarkers = true,
    maxLength = null
  } = options;

  let result = text;

  // Step 1: Preserve variables and HTML tags if requested
  const preservedElements = [];
  let elementCounter = 0;

  if (preserveVariables) {
    // Preserve {{variable}} patterns
    result = result.replace(/\{\{[^}]+\}\}/g, (match) => {
      const placeholder = `__PRESERVED_VAR_${elementCounter}__`;
      preservedElements.push({ placeholder, original: match });
      elementCounter++;
      return placeholder;
    });
  }

  if (preserveHtml) {
    // Preserve HTML tags
    result = result.replace(/<[^>]+>/g, (match) => {
      const placeholder = `__PRESERVED_HTML_${elementCounter}__`;
      preservedElements.push({ placeholder, original: match });
      elementCounter++;
      return placeholder;
    });
  }

  // Step 2: Apply character substitution
  result = result.split('').map(char => PSEUDO_CHARS[char] || char).join('');

  // Step 3: Apply text expansion
  const expansionFactor = EXPANSION_PATTERNS[type] || EXPANSION_PATTERNS.medium;
  const wordsToAdd = Math.ceil(result.split(' ').length * (expansionFactor - 1));
  
  if (wordsToAdd > 0) {
    const expansionWords = generateExpansionWords(wordsToAdd);
    result = result + ' ' + expansionWords;
  }

  // Step 4: Add identification markers
  if (addMarkers) {
    result = `${PSEUDO_MARKERS.start}${result}${PSEUDO_MARKERS.end}`;
  }

  // Step 5: Apply max length if specified
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength - 3) + '...';
  }

  // Step 6: Restore preserved elements
  preservedElements.forEach(({ placeholder, original }) => {
    result = result.replace(placeholder, original);
  });

  return result;
};

/**
 * Generate expansion words to increase text length
 * @param {number} wordCount - Number of words to generate
 * @returns {string} Generated expansion text
 */
const generateExpansionWords = (wordCount) => {
  const expansionWords = [
    'éxtrà', 'tëxtø', 'fór', 'tëstíñg', 'løñgér', 'tëxt', 'lëñgths',
    'àñd', 'ÛI', 'łàÿøút', 'vàłídàtíøñ', 'wíth', 'pséúdø', 'łøçàłízàtíøñ'
  ];
  
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(expansionWords[i % expansionWords.length]);
  }
  
  return words.join(' ');
};

/**
 * Pseudo-localize an object of translations
 * @param {Object} translations - Object containing translation keys and values
 * @param {string} type - Expansion type
 * @param {Object} options - Additional options
 * @returns {Object} Pseudo-localized translations object
 */
export const pseudoLocalizeObject = (translations, type = 'medium', options = {}) => {
  if (!translations || typeof translations !== 'object') return translations;

  const result = {};
  
  Object.keys(translations).forEach(key => {
    const value = translations[key];
    
    if (typeof value === 'string') {
      result[key] = pseudoLocalize(value, type, options);
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested objects (like plural forms)
      result[key] = pseudoLocalizeObject(value, type, options);
    } else {
      result[key] = value;
    }
  });

  return result;
};

/**
 * Create pseudo-Arabic text that mimics RTL text expansion
 * @param {string} text - Original text
 * @param {Object} options - Options for pseudo-Arabic generation
 * @returns {string} Pseudo-Arabic text
 */
export const pseudoArabic = (text, options = {}) => {
  if (!text || typeof text !== 'string') return text;
  
  const {
    preserveVariables = true,
    addMarkers = true,
    expansion = 1.6
  } = options;

  // Arabic-like characters for testing RTL layout
  const arabicLikeChars = {
    'a': 'ا', 'e': 'ع', 'i': 'ي', 'o': 'و', 'u': 'ق',
    'b': 'ب', 'c': 'ج', 'd': 'د', 'f': 'ف', 'g': 'غ',
    'h': 'ه', 'j': 'ج', 'k': 'ك', 'l': 'ل', 'm': 'م',
    'n': 'ن', 'p': 'ب', 'q': 'ق', 'r': 'ر', 's': 'س',
    't': 'ت', 'v': 'ف', 'w': 'و', 'x': 'خ', 'y': 'ي', 'z': 'ز'
  };

  let result = text;

  // Preserve variables if requested
  const preservedElements = [];
  let elementCounter = 0;

  if (preserveVariables) {
    result = result.replace(/\{\{[^}]+\}\}/g, (match) => {
      const placeholder = `__PRESERVED_VAR_${elementCounter}__`;
      preservedElements.push({ placeholder, original: match });
      elementCounter++;
      return placeholder;
    });
  }

  // Apply character substitution
  result = result.split('').map(char => {
    const lower = char.toLowerCase();
    return arabicLikeChars[lower] || char;
  }).join('');

  // Add expansion text
  const words = result.split(' ');
  const wordsToAdd = Math.ceil(words.length * (expansion - 1));
  if (wordsToAdd > 0) {
    const arabicExpansion = Array(wordsToAdd).fill('نص').join(' ');
    result = result + ' ' + arabicExpansion;
  }

  // Add RTL marker
  if (addMarkers) {
    result = `\u202E${result}\u202C`; // RLE + text + PDF for RTL override
  }

  // Restore preserved elements
  preservedElements.forEach(({ placeholder, original }) => {
    result = result.replace(placeholder, original);
  });

  return result;
};

/**
 * Test text for potential truncation issues
 * @param {string} text - Text to analyze
 * @param {number} maxLength - Maximum expected length
 * @returns {Object} Analysis results
 */
export const analyzeTextLength = (text, maxLength) => {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'Invalid text input' };
  }

  const length = text.length;
  const wordCount = text.split(/\s+/).length;
  const hasVariables = /\{\{[^}]+\}\}/.test(text);
  
  return {
    valid: length <= maxLength,
    length,
    maxLength,
    wordCount,
    hasVariables,
    truncationRisk: length > maxLength * 0.8, // Warn at 80% of max length
    recommendations: generateLengthRecommendations(length, maxLength, wordCount)
  };
};

/**
 * Generate recommendations for text length issues
 * @param {number} length - Current text length
 * @param {number} maxLength - Maximum allowed length
 * @param {number} wordCount - Number of words
 * @returns {Array} Array of recommendations
 */
const generateLengthRecommendations = (length, maxLength, wordCount) => {
  const recommendations = [];
  
  if (length > maxLength) {
    recommendations.push('Text exceeds maximum length - consider shortening');
  } else if (length > maxLength * 0.8) {
    recommendations.push('Text is close to maximum length - test with pseudo-localization');
  }
  
  if (wordCount > 10) {
    recommendations.push('Consider breaking long text into multiple lines or sections');
  }
  
  if (length > 0 && wordCount === 1) {
    recommendations.push('Single long word may cause layout issues - ensure word-break CSS is applied');
  }
  
  return recommendations;
};

// Export test utilities
export const PSEUDO_TEST_CASES = {
  button: {
    original: 'Save',
    pseudo: pseudoLocalize('Save', 'short'),
    arabicLike: pseudoArabic('Save')
  },
  title: {
    original: 'Welcome to Samia Tarot',
    pseudo: pseudoLocalize('Welcome to Samia Tarot', 'medium'),
    arabicLike: pseudoArabic('Welcome to Samia Tarot')
  },
  description: {
    original: 'Discover your future with our expert tarot readers and comprehensive spiritual guidance.',
    pseudo: pseudoLocalize('Discover your future with our expert tarot readers and comprehensive spiritual guidance.', 'long'),
    arabicLike: pseudoArabic('Discover your future with our expert tarot readers and comprehensive spiritual guidance.')
  }
};

export default {
  pseudoLocalize,
  pseudoLocalizeObject,
  pseudoArabic,
  analyzeTextLength,
  PSEUDO_TEST_CASES
};