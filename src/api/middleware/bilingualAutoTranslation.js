// =================================================
// SAMIA TAROT BILINGUAL AUTO-TRANSLATION MIDDLEWARE
// Automatically translates content when only one language is provided
// =================================================

import { bilingualTranslationService } from '../services/bilingualTranslationService.js';

/**
 * Middleware for automatic bilingual data processing
 * Detects fields with _ar/_en suffixes and auto-translates missing translations
 * 
 * Usage: app.use('/api/admin', bilingualAutoTranslationMiddleware);
 */
export const bilingualAutoTranslationMiddleware = async (req, res, next) => {
  try {
    // Only process POST, PUT, PATCH requests with body data
    if (!['POST', 'PUT', 'PATCH'].includes(req.method) || !req.body) {
      return next();
    }

    // Skip if user explicitly disabled auto-translation
    if (req.body._skip_auto_translation === true) {
      delete req.body._skip_auto_translation;
      return next();
    }

    console.log('🔄 [AUTO-TRANSLATE] Processing bilingual data...');
    
    const processedData = await processBilingualFields(req.body);
    req.body = processedData;
    
    console.log('✅ [AUTO-TRANSLATE] Bilingual processing complete');
    next();
  } catch (error) {
    console.error('❌ [AUTO-TRANSLATE] Error in bilingual middleware:', error);
    // Don't block the request on translation failures
    next();
  }
};

/**
 * Process bilingual fields in the request data
 * @param {Object} data - Request body data
 * @returns {Object} - Processed data with translations
 */
async function processBilingualFields(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const bilingualFields = findBilingualFields(data);
  
  if (bilingualFields.length === 0) {
    return data;
  }

  console.log(`🔍 [AUTO-TRANSLATE] Found ${bilingualFields.length} bilingual field groups`);

  // Process each bilingual field group
  for (const field of bilingualFields) {
    await processFieldGroup(data, field);
  }

  return data;
}

/**
 * Find bilingual field pairs (fields ending with _ar/_en)
 * @param {Object} data - Data object
 * @returns {Array} - Array of field base names
 */
function findBilingualFields(data) {
  const fields = Object.keys(data);
  const bilingualFields = new Set();

  // Find fields ending with _ar or _en
  fields.forEach(field => {
    if (field.endsWith('_ar') || field.endsWith('_en')) {
      const baseName = field.substring(0, field.lastIndexOf('_'));
      bilingualFields.add(baseName);
    }
  });

  return Array.from(bilingualFields);
}

/**
 * Process a single field group (e.g., 'name' -> 'name_ar', 'name_en')
 * @param {Object} data - Data object
 * @param {string} baseName - Base field name
 */
async function processFieldGroup(data, baseName) {
  const arField = `${baseName}_ar`;
  const enField = `${baseName}_en`;
  
  const arValue = data[arField];
  const enValue = data[enField];

  // Skip if both fields are already populated
  if (arValue && enValue) {
    console.log(`✅ [AUTO-TRANSLATE] ${baseName}: Both languages already provided`);
    return;
  }

  // Skip if neither field has a value
  if (!arValue && !enValue) {
    console.log(`⚠️ [AUTO-TRANSLATE] ${baseName}: No values provided for translation`);
    return;
  }

  try {
    // Translate missing Arabic version
    if (enValue && !arValue) {
      console.log(`🔄 [AUTO-TRANSLATE] ${baseName}: Translating EN -> AR`);
      const translation = await bilingualTranslationService.translateText(enValue, 'ar', 'en');
      if (translation) {
        data[arField] = translation;
        console.log(`✅ [AUTO-TRANSLATE] ${baseName}: AR translation added`);
      } else {
        console.warn(`⚠️ [AUTO-TRANSLATE] ${baseName}: AR translation failed, using fallback`);
        data[arField] = enValue; // Fallback: copy English text
      }
    }

    // Translate missing English version
    if (arValue && !enValue) {
      console.log(`🔄 [AUTO-TRANSLATE] ${baseName}: Translating AR -> EN`);
      const translation = await bilingualTranslationService.translateText(arValue, 'en', 'ar');
      if (translation) {
        data[enField] = translation;
        console.log(`✅ [AUTO-TRANSLATE] ${baseName}: EN translation added`);
      } else {
        console.warn(`⚠️ [AUTO-TRANSLATE] ${baseName}: EN translation failed, using fallback`);
        data[enField] = arValue; // Fallback: copy Arabic text
      }
    }
  } catch (error) {
    console.error(`❌ [AUTO-TRANSLATE] ${baseName}: Translation error:`, error);
    
    // Apply fallback strategy
    if (enValue && !arValue) {
      data[arField] = enValue;
    }
    if (arValue && !enValue) {
      data[enField] = arValue;
    }
  }
}

/**
 * Middleware specifically for admin/superadmin operations
 * Includes additional logging and audit trail
 */
export const adminBilingualMiddleware = async (req, res, next) => {
  try {
    // Add admin context
    req._isAdminOperation = true;
    req._originalBody = JSON.parse(JSON.stringify(req.body));
    
    // Apply auto-translation
    await bilingualAutoTranslationMiddleware(req, res, () => {
      // Log admin bilingual operations
      if (req.user && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        logAdminBilingualOperation(req);
      }
      next();
    });
  } catch (error) {
    console.error('❌ [ADMIN-BILINGUAL] Error in admin bilingual middleware:', error);
    next();
  }
};

/**
 * Log admin bilingual operations for audit purposes
 * @param {Object} req - Express request object
 */
function logAdminBilingualOperation(req) {
  try {
    const changedFields = findChangedBilingualFields(req._originalBody, req.body);
    
    if (changedFields.length > 0) {
      console.log(`📝 [AUDIT] Admin bilingual operation by ${req.user.email}:`);
      console.log(`   Route: ${req.method} ${req.originalUrl}`);
      console.log(`   Modified fields: ${changedFields.join(', ')}`);
      
      // Could also save to audit_logs table here if needed
    }
  } catch (error) {
    console.error('❌ [AUDIT] Error logging bilingual operation:', error);
  }
}

/**
 * Find fields that were changed/added during translation
 * @param {Object} original - Original request body
 * @param {Object} processed - Processed request body
 * @returns {Array} - Array of changed field names
 */
function findChangedBilingualFields(original, processed) {
  const changes = [];
  
  for (const key in processed) {
    if (key.endsWith('_ar') || key.endsWith('_en')) {
      if (!original[key] && processed[key]) {
        changes.push(key);
      }
    }
  }
  
  return changes;
}

/**
 * Utility function to manually process bilingual data outside middleware
 * @param {Object} data - Data to process
 * @returns {Object} - Processed data
 */
export const processBilingualData = async (data) => {
  return await processBilingualFields(data);
};

export default {
  bilingualAutoTranslationMiddleware,
  adminBilingualMiddleware,
  processBilingualData
}; 