// =================================================
// SAMIA TAROT BILINGUAL TRANSLATION API ROUTES
// Handles real-time translation for smart bilingual inputs
// =================================================

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { bilingualTranslationService } from '../services/bilingualTranslationService.js';
import { detectLanguage, analyzeBilingualForm } from '../../utils/languageDetection.js';

const router = Router();

// =================================================
// REAL-TIME TRANSLATION ENDPOINT
// =================================================

/**
 * POST /api/admin/translate-bilingual
 * Real-time translation for smart bilingual inputs
 * 
 * Body: {
 *   data: { name_en: "Hello", name_ar: "" },
 *   fields: ["name"],
 *   source_language: "en"
 * }
 */
router.post('/translate-bilingual', authenticateToken, async (req, res) => {
  try {
    const { data, fields, source_language } = req.body;

    if (!data || !fields || !Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: data and fields are required'
      });
    }

    console.log('🔄 [TRANSLATE-API] Processing real-time translation request');
    console.log('   Fields:', fields);
    console.log('   Source language:', source_language);

    // Process translation for each field
    const translatedData = { ...data };
    const translationResults = [];

    for (const field of fields) {
      const arField = `${field}_ar`;
      const enField = `${field}_en`;
      
      const arValue = translatedData[arField];
      const enValue = translatedData[enField];

      // Skip if both fields are populated
      if (arValue && enValue) {
        console.log(`✅ [TRANSLATE-API] ${field}: Both languages already provided`);
        continue;
      }

      // Translate missing field
      if (enValue && !arValue) {
        console.log(`🔄 [TRANSLATE-API] ${field}: Translating EN -> AR`);
        const translation = await bilingualTranslationService.translateText(enValue, 'ar', 'en');
        if (translation) {
          translatedData[arField] = translation;
          translationResults.push({
            field: arField,
            original: enValue,
            translated: translation,
            direction: 'en->ar'
          });
        }
      } else if (arValue && !enValue) {
        console.log(`🔄 [TRANSLATE-API] ${field}: Translating AR -> EN`);
        const translation = await bilingualTranslationService.translateText(arValue, 'en', 'ar');
        if (translation) {
          translatedData[enField] = translation;
          translationResults.push({
            field: enField,
            original: arValue,
            translated: translation,
            direction: 'ar->en'
          });
        }
      }
    }

    console.log(`✅ [TRANSLATE-API] Translation complete. ${translationResults.length} fields translated`);

    res.json({
      success: true,
      data: translatedData,
      translations: translationResults,
      message: `Successfully translated ${translationResults.length} fields`
    });

  } catch (error) {
    console.error('❌ [TRANSLATE-API] Translation error:', error);
    res.status(500).json({
      success: false,
      message: 'Translation failed',
      error: error.message
    });
  }
});

// =================================================
// LANGUAGE DETECTION ENDPOINT
// =================================================

/**
 * POST /api/admin/detect-language
 * Detect language of input text
 * 
 * Body: {
 *   text: "Hello world",
 *   expected_language: "ar"
 * }
 */
router.post('/detect-language', authenticateToken, async (req, res) => {
  try {
    const { text, expected_language } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    const detected = detectLanguage(text);
    const isMismatch = expected_language && detected !== expected_language;

    res.json({
      success: true,
      detected_language: detected,
      expected_language: expected_language,
      is_mismatch: isMismatch,
      confidence: text.length > 5 ? 0.9 : 0.6, // Simple confidence based on text length
      suggestion: isMismatch ? {
        action: 'switch_field',
        message: expected_language === 'ar' 
          ? 'النص المدخل باللغة الإنجليزية، هل تريد التبديل؟'
          : 'Input detected in Arabic, switch to Arabic field?'
      } : null
    });

  } catch (error) {
    console.error('❌ [DETECT-API] Language detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Language detection failed',
      error: error.message
    });
  }
});

// =================================================
// BILINGUAL FORM ANALYSIS ENDPOINT
// =================================================

/**
 * POST /api/admin/analyze-bilingual-form
 * Analyze entire form for language consistency
 * 
 * Body: {
 *   form_data: { name_en: "Hello", description_ar: "مرحبا" },
 *   current_language: "en",
 *   fields: ["name", "description"]
 * }
 */
router.post('/analyze-bilingual-form', authenticateToken, async (req, res) => {
  try {
    const { form_data, current_language, fields } = req.body;

    if (!form_data || !current_language || !fields) {
      return res.status(400).json({
        success: false,
        message: 'form_data, current_language, and fields are required'
      });
    }

    const analysis = analyzeBilingualForm(form_data, current_language, fields);

    res.json({
      success: true,
      analysis: analysis,
      recommendations: analysis.mismatches.map(mismatch => ({
        field: mismatch.field,
        suggestion: `Switch ${mismatch.field} to ${mismatch.detected} field`,
        confidence: mismatch.confidence
      }))
    });

  } catch (error) {
    console.error('❌ [ANALYZE-API] Form analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Form analysis failed',
      error: error.message
    });
  }
});

// =================================================
// BATCH TRANSLATION ENDPOINT
// =================================================

/**
 * POST /api/admin/batch-translate
 * Batch translate multiple items
 * 
 * Body: {
 *   items: [
 *     { name_en: "Hello", description_en: "World" },
 *     { name_ar: "مرحبا", description_ar: "عالم" }
 *   ],
 *   fields: ["name", "description"],
 *   target_language: "ar"
 * }
 */
router.post('/batch-translate', authenticateToken, async (req, res) => {
  try {
    const { items, fields, target_language } = req.body;

    if (!items || !Array.isArray(items) || !fields || !target_language) {
      return res.status(400).json({
        success: false,
        message: 'items, fields, and target_language are required'
      });
    }

    console.log(`🔄 [BATCH-TRANSLATE] Processing ${items.length} items`);

    const translatedItems = [];
    const translationStats = {
      total_items: items.length,
      translated_fields: 0,
      failed_translations: 0,
      processing_time: Date.now()
    };

    for (const item of items) {
      const translatedItem = await bilingualTranslationService.processBilingualData(item, {
        fields: fields,
        forceTranslation: false,
        sourceLanguage: target_language === 'ar' ? 'en' : 'ar'
      });

      translatedItems.push(translatedItem);
      translationStats.translated_fields += fields.length;
    }

    translationStats.processing_time = Date.now() - translationStats.processing_time;

    console.log(`✅ [BATCH-TRANSLATE] Completed in ${translationStats.processing_time}ms`);

    res.json({
      success: true,
      translated_items: translatedItems,
      stats: translationStats,
      message: `Successfully processed ${items.length} items`
    });

  } catch (error) {
    console.error('❌ [BATCH-TRANSLATE] Batch translation error:', error);
    res.status(500).json({
      success: false,
      message: 'Batch translation failed',
      error: error.message
    });
  }
});

// =================================================
// TRANSLATION SERVICE STATUS
// =================================================

/**
 * GET /api/admin/translation-status
 * Get translation service status and configuration
 */
router.get('/translation-status', authenticateToken, async (req, res) => {
  try {
    const status = await bilingualTranslationService.getServiceStatus();
    
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [STATUS-API] Translation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get translation status',
      error: error.message
    });
  }
});

export default router; 