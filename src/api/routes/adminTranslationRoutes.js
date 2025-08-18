// =================================================
// SAMIA TAROT ADMIN TRANSLATION MANAGEMENT ROUTES
// Direct editing of translations with real-time sync
// =================================================

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { adminBilingualMiddleware } from '../middleware/bilingualAutoTranslation.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { bilingualRealTimeSync } from '../services/bilingualRealTimeSync.js';

const router = express.Router();

// Apply admin bilingual middleware to all routes
router.use(adminBilingualMiddleware);

// =================================================
// TAROT DECKS TRANSLATION MANAGEMENT
// =================================================

/**
 * GET /api/admin/translations/tarot-decks
 * Get all tarot decks with bilingual content (Admin/SuperAdmin only)
 */
router.get('/tarot-decks', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { data: decks, error } = await supabaseAdmin
      .from('tarot_decks')
      .select('id, name, name_ar, name_en, description, description_ar, description_en, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: decks,
      total: decks.length
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error fetching tarot decks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tarot decks',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/translations/tarot-decks/:id
 * Update tarot deck translations (Admin/SuperAdmin only)
 */
router.put('/tarot-decks/:id', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { name_ar, name_en, description_ar, description_en } = req.body;

    // Validate required fields - BILINGUAL AUTO-TRANSLATION COMPLIANT
    // Only require at least one language, middleware will handle auto-translation
    if (!name_ar && !name_en) {
      return res.status(400).json({
        success: false,
        error: 'Name is required (in Arabic or English)'
      });
    }

    const { data: deck, error } = await supabaseAdmin
      .from('tarot_decks')
      .update({
        name_ar,
        name_en,
        description_ar: description_ar || '',
        description_en: description_en || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'tarot_decks',
        action: 'translation_updated',
        record_id: id,
        new_data: { name_ar, name_en, description_ar, description_en },
        metadata: { updated_by_admin: true },
        user_id: req.user.id
      });

    // Trigger real-time sync
    bilingualRealTimeSync.queueTranslationUpdate({
      tableName: 'tarot_decks',
      recordId: id,
      action: 'translation_updated',
      data: deck
    });

    res.json({
      success: true,
      data: deck,
      message: 'Tarot deck translations updated successfully'
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error updating tarot deck:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tarot deck translations',
      details: error.message
    });
  }
});

// =================================================
// TAROT CARDS TRANSLATION MANAGEMENT
// =================================================

/**
 * GET /api/admin/translations/tarot-cards
 * Get all tarot cards with bilingual content (Admin/SuperAdmin only)
 */
router.get('/tarot-cards', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { deck_id, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('tarot_cards')
      .select(`
        id, name, name_ar, name_en, 
        description, description_ar, description_en,
        upright_meaning, upright_meaning_ar, upright_meaning_en,
        reversed_meaning, reversed_meaning_ar, reversed_meaning_en,
        deck_id, card_number, suit, is_active
      `)
      .order('deck_id')
      .order('card_number')
      .range(offset, offset + limit - 1);

    if (deck_id) {
      query = query.eq('deck_id', deck_id);
    }

    const { data: cards, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: cards,
      total: cards.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error fetching tarot cards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tarot cards',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/translations/tarot-cards/:id
 * Update tarot card translations (Admin/SuperAdmin only)
 */
router.put('/tarot-cards/:id', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name_ar, name_en,
      description_ar, description_en,
      upright_meaning_ar, upright_meaning_en,
      reversed_meaning_ar, reversed_meaning_en
    } = req.body;

    // Validate required fields - BILINGUAL AUTO-TRANSLATION COMPLIANT
    // Only require at least one language, middleware will handle auto-translation
    if (!name_ar && !name_en) {
      return res.status(400).json({
        success: false,
        error: 'Name is required (in Arabic or English)'
      });
    }

    const { data: card, error } = await supabaseAdmin
      .from('tarot_cards')
      .update({
        name_ar,
        name_en,
        description_ar: description_ar || '',
        description_en: description_en || '',
        upright_meaning_ar: upright_meaning_ar || '',
        upright_meaning_en: upright_meaning_en || '',
        reversed_meaning_ar: reversed_meaning_ar || '',
        reversed_meaning_en: reversed_meaning_en || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'tarot_cards',
        action: 'translation_updated',
        record_id: id,
        new_data: {
          name_ar, name_en, description_ar, description_en,
          upright_meaning_ar, upright_meaning_en,
          reversed_meaning_ar, reversed_meaning_en
        },
        metadata: { updated_by_admin: true },
        user_id: req.user.id
      });

    // Trigger real-time sync
    bilingualRealTimeSync.queueTranslationUpdate({
      tableName: 'tarot_cards',
      recordId: id,
      action: 'translation_updated',
      data: card
    });

    res.json({
      success: true,
      data: card,
      message: 'Tarot card translations updated successfully'
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error updating tarot card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tarot card translations',
      details: error.message
    });
  }
});

// =================================================
// SERVICES TRANSLATION MANAGEMENT
// =================================================

/**
 * GET /api/admin/translations/services
 * Get all services with bilingual content (Admin/SuperAdmin only)
 */
router.get('/services', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { data: services, error } = await supabaseAdmin
      .from('services')
      .select(`
        id, name, name_ar, name_en,
        description, description_ar, description_en,
        type, price, duration_minutes, is_vip, is_active,
        created_at, updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: services,
      total: services.length
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/translations/services/:id
 * Update service translations (Admin/SuperAdmin only)
 */
router.put('/services/:id', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { name_ar, name_en, description_ar, description_en } = req.body;

    // Validate required fields - BILINGUAL AUTO-TRANSLATION COMPLIANT
    // Only require at least one language, middleware will handle auto-translation
    if (!name_ar && !name_en) {
      return res.status(400).json({
        success: false,
        error: 'Name is required (in Arabic or English)'
      });
    }

    const { data: service, error } = await supabaseAdmin
      .from('services')
      .update({
        name_ar,
        name_en,
        description_ar: description_ar || '',
        description_en: description_en || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'services',
        action: 'translation_updated',
        record_id: id,
        new_data: { name_ar, name_en, description_ar, description_en },
        metadata: { updated_by_admin: true },
        user_id: req.user.id
      });

    // Trigger real-time sync
    bilingualRealTimeSync.queueTranslationUpdate({
      tableName: 'services',
      recordId: id,
      action: 'translation_updated',
      data: service
    });

    res.json({
      success: true,
      data: service,
      message: 'Service translations updated successfully'
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error updating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service translations',
      details: error.message
    });
  }
});

// =================================================
// SPREADS TRANSLATION MANAGEMENT
// =================================================

/**
 * GET /api/admin/translations/spreads
 * Get all spreads with bilingual content (Admin/SuperAdmin only)
 */
router.get('/spreads', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { data: spreads, error } = await supabaseAdmin
      .from('spreads')
      .select(`
        id, name, name_ar, name_en,
        description, description_ar, description_en,
        question, question_ar, question_en,
        category_id, creator_id, card_count, is_active,
        created_at, updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: spreads,
      total: spreads.length
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error fetching spreads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spreads',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/translations/spreads/:id
 * Update spread translations (Admin/SuperAdmin only)
 */
router.put('/spreads/:id', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name_ar, name_en,
      description_ar, description_en,
      question_ar, question_en
    } = req.body;

    // Validate required fields - BILINGUAL AUTO-TRANSLATION COMPLIANT
    // Only require at least one language, middleware will handle auto-translation
    if (!name_ar && !name_en) {
      return res.status(400).json({
        success: false,
        error: 'Name is required (in Arabic or English)'
      });
    }

    const { data: spread, error } = await supabaseAdmin
      .from('spreads')
      .update({
        name_ar,
        name_en,
        description_ar: description_ar || '',
        description_en: description_en || '',
        question_ar: question_ar || '',
        question_en: question_en || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'spreads',
        action: 'translation_updated',
        record_id: id,
        new_data: {
          name_ar, name_en, description_ar, description_en,
          question_ar, question_en
        },
        metadata: { updated_by_admin: true },
        user_id: req.user.id
      });

    // Trigger real-time sync
    bilingualRealTimeSync.queueTranslationUpdate({
      tableName: 'spreads',
      recordId: id,
      action: 'translation_updated',
      data: spread
    });

    res.json({
      success: true,
      data: spread,
      message: 'Spread translations updated successfully'
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error updating spread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update spread translations',
      details: error.message
    });
  }
});

// =================================================
// SPREAD CATEGORIES TRANSLATION MANAGEMENT
// =================================================

/**
 * GET /api/admin/translations/spread_categories
 * Get all spread categories with bilingual content (Admin/SuperAdmin only)
 */
router.get('/spread_categories', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('spread_categories')
      .select('id, name, name_ar, name_en, description, description_ar, description_en, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: categories,
      total: categories.length
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error fetching spread categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spread categories',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/translations/spread_categories/:id
 * Update spread category translations (Admin/SuperAdmin only)
 */
router.put('/spread_categories/:id', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { name_ar, name_en, description_ar, description_en } = req.body;

    // Validate required fields - BILINGUAL AUTO-TRANSLATION COMPLIANT
    // Only require at least one language, middleware will handle auto-translation
    if (!name_ar && !name_en) {
      return res.status(400).json({
        success: false,
        error: 'Name is required (in Arabic or English)'
      });
    }

    const { data: category, error } = await supabaseAdmin
      .from('spread_categories')
      .update({
        name_ar,
        name_en,
        description_ar: description_ar || '',
        description_en: description_en || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the update
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'spread_categories',
        action: 'translation_updated',
        record_id: id,
        new_data: { name_ar, name_en, description_ar, description_en },
        metadata: { updated_by_admin: true },
        user_id: req.user.id
      });

    // Trigger real-time sync
    bilingualRealTimeSync.queueTranslationUpdate({
      tableName: 'spread_categories',
      recordId: id,
      action: 'translation_updated',
      data: category
    });

    res.json({
      success: true,
      data: category,
      message: 'Spread category translations updated successfully'
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error updating spread category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update spread category translations',
      details: error.message
    });
  }
});

// =================================================
// TRANSLATION UPDATES ENDPOINT
// =================================================

/**
 * GET /api/admin/translations/updates
 * Check for translation updates since a specific timestamp (Admin/SuperAdmin only)
 */
router.get('/updates', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24 hours ago
    
    // Check for updates across all translation tables
    const tables = ['tarot_decks', 'tarot_cards', 'services', 'spreads', 'spread_categories'];
    let hasUpdates = false;
    const updates = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('id, updated_at')
          .gte('updated_at', sinceDate.toISOString())
          .order('updated_at', { ascending: false })
          .limit(10);

        if (error) {
          console.warn(`Warning: Could not check updates for ${table}:`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          hasUpdates = true;
          updates[table] = {
            count: data.length,
            latest_update: data[0].updated_at,
            recent_ids: data.map(item => item.id)
          };
        }
      } catch (tableError) {
        console.warn(`Warning: Error checking ${table}:`, tableError.message);
      }
    }

    res.json({
      success: true,
      hasUpdates,
      since: sinceDate.toISOString(),
      updates,
      checked_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error checking for updates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check for translation updates',
      details: error.message
    });
  }
});

// =================================================
// BULK TRANSLATION OPERATIONS
// =================================================

/**
 * POST /api/admin/translations/bulk-translate
 * Bulk translate missing translations for a specific table (SuperAdmin only)
 */
router.post('/bulk-translate', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { table_name, source_language, target_language, field_mapping } = req.body;

    // Validate inputs
    const validTables = ['tarot_decks', 'tarot_cards', 'services', 'spreads'];
    if (!validTables.includes(table_name)) {
      return res.status(400).json({
        success: false,
        error: `Invalid table name. Must be one of: ${validTables.join(', ')}`
      });
    }

    if (!['ar', 'en'].includes(source_language) || !['ar', 'en'].includes(target_language)) {
      return res.status(400).json({
        success: false,
        error: 'Source and target languages must be "ar" or "en"'
      });
    }

    if (source_language === target_language) {
      return res.status(400).json({
        success: false,
        error: 'Source and target languages must be different'
      });
    }

    // Process bulk translation
    const result = await processBulkTranslation(table_name, source_language, target_language, field_mapping);

    // Log the bulk operation
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name,
        action: 'bulk_translation',
        new_data: result,
        metadata: {
          source_language,
          target_language,
          field_mapping,
          updated_by_admin: true
        },
        user_id: req.user.id
      });

    res.json({
      success: true,
      data: result,
      message: 'Bulk translation completed successfully'
    });
  } catch (error) {
    console.error('❌ [ADMIN-TRANSLATIONS] Error in bulk translation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk translation',
      details: error.message
    });
  }
});

/**
 * Process bulk translation for a table
 * @param {string} tableName - Table to process
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 * @param {Object} fieldMapping - Field mapping configuration
 * @returns {Object} - Translation results
 */
async function processBulkTranslation(tableName, sourceLang, targetLang, fieldMapping) {
  // This would be implemented based on specific table requirements
  // For now, return a placeholder result
  return {
    table: tableName,
    processed_records: 0,
    successful_translations: 0,
    failed_translations: 0,
    source_language: sourceLang,
    target_language: targetLang
  };
}

export default router; 