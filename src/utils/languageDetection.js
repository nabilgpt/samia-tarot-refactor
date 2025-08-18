// =================================================
// SAMIA TAROT LANGUAGE DETECTION UTILITY
// Detects Arabic vs English input and routes to correct fields
// =================================================

/**
 * Detect if text is Arabic or English
 * @param {string} text - Text to analyze
 * @returns {string} - 'ar' for Arabic, 'en' for English, 'mixed' for mixed content
 */
export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') {
    return 'en'; // Default to English for empty/invalid input
  }

  const cleanText = text.trim();
  if (cleanText.length === 0) {
    return 'en';
  }

  // Arabic Unicode ranges
  const arabicRanges = [
    /[\u0600-\u06FF]/g,  // Arabic
    /[\u0750-\u077F]/g,  // Arabic Supplement
    /[\u08A0-\u08FF]/g,  // Arabic Extended-A
    /[\uFB50-\uFDFF]/g,  // Arabic Presentation Forms-A
    /[\uFE70-\uFEFF]/g   // Arabic Presentation Forms-B
  ];

  // English/Latin Unicode ranges
  const englishRanges = [
    /[a-zA-Z]/g,         // Basic Latin
    /[\u0020-\u007F]/g   // ASCII printable characters
  ];

  // Count Arabic characters
  let arabicCount = 0;
  arabicRanges.forEach(regex => {
    const matches = cleanText.match(regex);
    if (matches) {
      arabicCount += matches.length;
    }
  });

  // Count English characters
  let englishCount = 0;
  englishRanges.forEach(regex => {
    const matches = cleanText.match(regex);
    if (matches) {
      englishCount += matches.length;
    }
  });

  // Calculate percentages
  const totalChars = cleanText.length;
  const arabicPercentage = (arabicCount / totalChars) * 100;
  const englishPercentage = (englishCount / totalChars) * 100;

  // Decision logic
  if (arabicPercentage > 30) {
    return 'ar';
  } else if (englishPercentage > 30) {
    return 'en';
  } else {
    // Mixed content or unclear - return based on majority
    return arabicCount > englishCount ? 'ar' : 'en';
  }
};

/**
 * Check if input language matches expected language
 * @param {string} text - Input text
 * @param {string} expectedLang - Expected language ('ar' or 'en')
 * @returns {boolean} - True if matches, false if mismatch
 */
export const isLanguageMatch = (text, expectedLang) => {
  const detectedLang = detectLanguage(text);
  return detectedLang === expectedLang;
};

/**
 * Get language mismatch details
 * @param {string} text - Input text
 * @param {string} expectedLang - Expected language
 * @returns {object} - Mismatch analysis
 */
export const getLanguageMismatch = (text, expectedLang) => {
  const detectedLang = detectLanguage(text);
  
  return {
    detected: detectedLang,
    expected: expectedLang,
    isMismatch: detectedLang !== expectedLang,
    shouldSwitch: detectedLang !== expectedLang && detectedLang !== 'mixed',
    confidence: getDetectionConfidence(text, detectedLang)
  };
};

/**
 * Get confidence score for language detection
 * @param {string} text - Input text
 * @param {string} detectedLang - Detected language
 * @returns {number} - Confidence score (0-1)
 */
export const getDetectionConfidence = (text, detectedLang) => {
  if (!text || text.length < 3) {
    return 0.5; // Low confidence for short text
  }

  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const totalChars = text.length;

  if (detectedLang === 'ar') {
    return Math.min(0.95, (arabicChars / totalChars) * 2);
  } else {
    return Math.min(0.95, (englishChars / totalChars) * 2);
  }
};

/**
 * Smart field routing based on language detection
 * Routes input to correct field based on detected language
 * @param {string} text - Input text
 * @param {string} currentLang - Current UI language
 * @param {string} baseField - Base field name (e.g., 'name')
 * @param {object} formData - Current form data
 * @returns {object} - Updated form data with correct field routing
 */
export const routeToCorrectField = (text, currentLang, baseField, formData) => {
  const detectedLang = detectLanguage(text);
  const mismatch = getLanguageMismatch(text, currentLang);
  
  const result = {
    ...formData,
    routing: {
      detectedLanguage: detectedLang,
      expectedLanguage: currentLang,
      wasMismatch: mismatch.isMismatch,
      confidence: mismatch.confidence
    }
  };

  if (mismatch.shouldSwitch && mismatch.confidence > 0.7) {
    // Route to correct field based on detection
    const correctField = `${baseField}_${detectedLang}`;
    result[correctField] = text;
    
    console.log(`🔄 [LANG-DETECT] Routing "${text}" to ${correctField} (detected: ${detectedLang}, expected: ${currentLang})`);
    return result;
  } else {
    // Keep in current field
    const currentField = `${baseField}_${currentLang}`;
    result[currentField] = text;
    
    return result;
  }
};

/**
 * Batch language detection for multiple fields
 * @param {object} formData - Form data with bilingual fields
 * @param {string} currentLang - Current UI language
 * @param {array} fields - Array of field names to check
 * @returns {object} - Analysis results
 */
export const analyzeBilingualForm = (formData, currentLang, fields) => {
  const analysis = {
    totalFields: fields.length,
    correctFields: 0,
    mismatchedFields: 0,
    mismatches: []
  };

  fields.forEach(field => {
    const currentField = `${field}_${currentLang}`;
    const text = formData[currentField];
    
    if (text && text.trim()) {
      const mismatch = getLanguageMismatch(text, currentLang);
      
      if (mismatch.isMismatch) {
        analysis.mismatchedFields++;
        analysis.mismatches.push({
          field,
          text,
          detected: mismatch.detected,
          expected: mismatch.expected,
          confidence: mismatch.confidence
        });
      } else {
        analysis.correctFields++;
      }
    }
  });

  return analysis;
};

/**
 * Language detection with translation suggestion
 * @param {string} text - Input text
 * @param {string} currentLang - Current UI language
 * @returns {object} - Detection result with translation suggestion
 */
export const detectWithTranslationSuggestion = (text, currentLang) => {
  const mismatch = getLanguageMismatch(text, currentLang);
  
  return {
    ...mismatch,
    suggestion: mismatch.shouldSwitch ? {
      action: 'switch_field',
      message: currentLang === 'ar' 
        ? 'النص المدخل باللغة الإنجليزية، هل تريد التبديل؟'
        : 'Input detected in Arabic, switch to Arabic field?',
      targetField: `${mismatch.detected}`
    } : null
  };
};

/**
 * Real-time language detection for input fields
 * @param {string} text - Input text
 * @param {string} currentLang - Current UI language
 * @param {function} onMismatch - Callback for language mismatch
 * @returns {object} - Detection result
 */
export const realtimeDetection = (text, currentLang, onMismatch) => {
  const detection = detectWithTranslationSuggestion(text, currentLang);
  
  if (detection.isMismatch && detection.confidence > 0.8 && onMismatch) {
    onMismatch(detection);
  }
  
  return detection;
};

export default {
  detectLanguage,
  isLanguageMatch,
  getLanguageMismatch,
  routeToCorrectField,
  analyzeBilingualForm,
  detectWithTranslationSuggestion,
  realtimeDetection
}; 