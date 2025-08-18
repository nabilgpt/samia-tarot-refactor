// =================================================
// SAMIA TAROT BILINGUAL ADMIN ROUTES
// Super Admin controls for translation system management
// =================================================

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { bilingualTranslationService } from '../services/bilingualTranslationService.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// =====================================================
// TRANSLATION SERVICE MANAGEMENT
// =====================================================

/**
 * GET /api/bilingual-admin/translation-config
 * Get current translation service configuration (Super Admin only)
 */
router.get('/translation-config', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const status = await bilingualTranslationService.getServiceStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching translation config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/bilingual-admin/translation-config
 * Update translation service configuration (Super Admin only)
 */
router.put('/translation-config', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { provider, enabled, fallback_mode } = req.body;
    
    // Validation
    const validProviders = ['openai', 'google'];
    const validFallbackModes = ['auto_fill', 'copy'];
    
    if (provider && !validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `Invalid provider. Must be one of: ${validProviders.join(', ')}`
      });
    }
    
    if (fallback_mode && !validFallbackModes.includes(fallback_mode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid fallback mode. Must be one of: ${validFallbackModes.join(', ')}`
      });
    }

    const result = await bilingualTranslationService.updateConfig({
      provider,
      enabled,
      fallback_mode
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.config,
        message: 'Translation configuration updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error updating translation config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bilingual-admin/test-translation
 * Test translation service (Super Admin only)
 */
router.post('/test-translation', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const results = await bilingualTranslationService.testTranslation();
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error testing translation service:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bilingual-admin/translate-text
 * Manual text translation for testing (Super Admin only)
 */
router.post('/translate-text', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { text, target_language, source_language } = req.body;
    
    if (!text || !target_language) {
      return res.status(400).json({
        success: false,
        error: 'Text and target_language are required'
      });
    }
    
    if (!['ar', 'en'].includes(target_language)) {
      return res.status(400).json({
        success: false,
        error: 'Target language must be "ar" or "en"'
      });
    }

    const translation = await bilingualTranslationService.translateText(
      text, 
      target_language, 
      source_language
    );

    res.json({
      success: true,
      data: {
        original_text: text,
        translated_text: translation,
        target_language,
        source_language: source_language || 'auto-detected'
      }
    });
  } catch (error) {
    console.error('Error translating text:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// USER LANGUAGE PREFERENCES
// =====================================================

/**
 * GET /api/bilingual-admin/user-languages
 * Get user language preferences statistics (Super Admin only)
 */
router.get('/user-languages', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { data: languageStats } = await supabaseAdmin
      .from('profiles')
      .select('preferred_language')
      .not('preferred_language', 'is', null);

    const stats = languageStats.reduce((acc, profile) => {
      acc[profile.preferred_language] = (acc[profile.preferred_language] || 0) + 1;
      return acc;
    }, {});

    const total = languageStats.length;
    const percentages = {};
    
    Object.keys(stats).forEach(lang => {
      percentages[lang] = {
        count: stats[lang],
        percentage: total > 0 ? Math.round((stats[lang] / total) * 100) : 0
      };
    });

    res.json({
      success: true,
      data: {
        total_users: total,
        language_distribution: percentages,
        raw_counts: stats
      }
    });
  } catch (error) {
    console.error('Error fetching user language stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/bilingual-admin/user-language/:userId
 * Update user's language preference (Super Admin only)
 */
router.put('/user-language/:userId', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferred_language } = req.body;
    
    if (!['ar', 'en'].includes(preferred_language)) {
      return res.status(400).json({
        success: false,
        error: 'Preferred language must be "ar" or "en"'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ preferred_language })
      .eq('id', userId)
      .select('id, email, preferred_language')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      data,
      message: 'User language preference updated successfully'
    });
  } catch (error) {
    console.error('Error updating user language:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// BILINGUAL DATA MANAGEMENT
// =====================================================

/**
 * GET /api/bilingual-admin/data-audit
 * Audit bilingual data completeness (Super Admin only)
 */
router.get('/data-audit', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { table = 'spreads' } = req.query;
    
    const validTables = ['spreads', 'spread_categories', 'tarot_decks', 'tarot_cards'];
    if (!validTables.includes(table)) {
      return res.status(400).json({
        success: false,
        error: `Invalid table. Must be one of: ${validTables.join(', ')}`
      });
    }

    let auditQuery;
    
    switch (table) {
      case 'spreads':
        auditQuery = `
          SELECT 
            id, 
            name_ar IS NOT NULL AND name_ar != '' as has_name_ar,
            name_en IS NOT NULL AND name_en != '' as has_name_en,
            description_ar IS NOT NULL AND description_ar != '' as has_desc_ar,
            description_en IS NOT NULL AND description_en != '' as has_desc_en,
            question_ar IS NOT NULL AND question_ar != '' as has_question_ar,
            question_en IS NOT NULL AND question_en != '' as has_question_en
          FROM spreads
        `;
        break;
      case 'spread_categories':
        auditQuery = `
          SELECT 
            id,
            name_ar IS NOT NULL AND name_ar != '' as has_name_ar,
            name_en IS NOT NULL AND name_en != '' as has_name_en,
            description_ar IS NOT NULL AND description_ar != '' as has_desc_ar,
            description_en IS NOT NULL AND description_en != '' as has_desc_en
          FROM spread_categories
        `;
        break;
      case 'tarot_decks':
        auditQuery = `
          SELECT 
            id,
            name_ar IS NOT NULL AND name_ar != '' as has_name_ar,
            name_en IS NOT NULL AND name_en != '' as has_name_en,
            description_ar IS NOT NULL AND description_ar != '' as has_desc_ar,
            description_en IS NOT NULL AND description_en != '' as has_desc_en
          FROM tarot_decks
        `;
        break;
      case 'tarot_cards':
        auditQuery = `
          SELECT 
            id,
            name_ar IS NOT NULL AND name_ar != '' as has_name_ar,
            name_en IS NOT NULL AND name_en != '' as has_name_en,
            description_ar IS NOT NULL AND description_ar != '' as has_desc_ar,
            description_en IS NOT NULL AND description_en != '' as has_desc_en,
            meaning_upright_ar IS NOT NULL AND meaning_upright_ar != '' as has_meaning_up_ar,
            meaning_upright_en IS NOT NULL AND meaning_upright_en != '' as has_meaning_up_en,
            meaning_reversed_ar IS NOT NULL AND meaning_reversed_ar != '' as has_meaning_rev_ar,
            meaning_reversed_en IS NOT NULL AND meaning_reversed_en != '' as has_meaning_rev_en
          FROM tarot_cards
        `;
        break;
    }

    const { data: auditResults, error } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: auditQuery
    });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Calculate completeness statistics
    const total = auditResults.length;
    const incomplete = auditResults.filter(row => {
      return Object.values(row).some(value => value === false);
    });

    res.json({
      success: true,
      data: {
        table,
        total_records: total,
        incomplete_records: incomplete.length,
        completeness_percentage: total > 0 ? Math.round(((total - incomplete.length) / total) * 100) : 100,
        incomplete_items: incomplete,
        audit_timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error performing data audit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bilingual-admin/bulk-translate
 * Bulk translate missing fields (Super Admin only)
 */
router.post('/bulk-translate', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { table, field, target_language, force = false } = req.body;
    
    const validTables = ['spreads', 'spread_categories', 'tarot_decks', 'tarot_cards'];
    const validFields = ['name', 'description', 'question', 'meaning_upright', 'meaning_reversed'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({
        success: false,
        error: `Invalid table. Must be one of: ${validTables.join(', ')}`
      });
    }
    
    if (!validFields.includes(field)) {
      return res.status(400).json({
        success: false,
        error: `Invalid field. Must be one of: ${validFields.join(', ')}`
      });
    }
    
    if (!['ar', 'en'].includes(target_language)) {
      return res.status(400).json({
        success: false,
        error: 'Target language must be "ar" or "en"'
      });
    }

    // Get records that need translation
    const sourceField = `${field}_${target_language === 'ar' ? 'en' : 'ar'}`;
    const targetField = `${field}_${target_language}`;
    
    const condition = force 
      ? `${sourceField} IS NOT NULL AND ${sourceField} != ''`
      : `${sourceField} IS NOT NULL AND ${sourceField} != '' AND (${targetField} IS NULL OR ${targetField} = '')`;

    const { data: records, error: fetchError } = await supabaseAdmin
      .from(table)
      .select(`id, ${sourceField}, ${targetField}`)
      .filter(sourceField, 'not.is', null)
      .filter(sourceField, 'neq', '');

    if (fetchError) {
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    const recordsToTranslate = records.filter(record => {
      return force || !record[targetField] || record[targetField] === '';
    });

    if (recordsToTranslate.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No records need translation',
          processed: 0,
          total: records.length
        }
      });
    }

    // Translate in batches
    const batchSize = 10;
    let processed = 0;
    const results = [];

    for (let i = 0; i < recordsToTranslate.length; i += batchSize) {
      const batch = recordsToTranslate.slice(i, i + batchSize);
      
      const translations = await Promise.all(
        batch.map(async (record) => {
          const sourceText = record[sourceField];
          const translation = await bilingualTranslationService.translateText(
            sourceText, 
            target_language
          );
          
          return {
            id: record.id,
            translation: translation || sourceText, // Fallback to source text
            source_text: sourceText
          };
        })
      );

      // Update database
      for (const item of translations) {
        const { error: updateError } = await supabaseAdmin
          .from(table)
          .update({ [targetField]: item.translation })
          .eq('id', item.id);

        if (!updateError) {
          processed++;
          results.push({
            id: item.id,
            source_text: item.source_text,
            translation: item.translation,
            success: true
          });
        } else {
          results.push({
            id: item.id,
            source_text: item.source_text,
            success: false,
            error: updateError.message
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        table,
        field,
        target_language,
        total_candidates: recordsToTranslate.length,
        processed,
        results: results.slice(0, 50), // Limit response size
        summary: {
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }
    });
  } catch (error) {
    console.error('Error performing bulk translation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router; 