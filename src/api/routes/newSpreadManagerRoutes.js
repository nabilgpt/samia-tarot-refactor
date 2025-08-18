// =====================================================
// SAMIA TAROT - NEW SPREAD MANAGER API ROUTES
// Complete rebuild with approval workflow
// =====================================================

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { aiContentFilter } from '../middleware/aiContentFilter.js';
import { bilingualTranslationService } from '../services/bilingualTranslationService.js';

const router = express.Router();

// Apply AI content filtering to all routes
router.use(aiContentFilter);

// =====================================================
// TRANSLATION SETTINGS ENDPOINTS (Super Admin Only)
// =====================================================

/**
 * GET /api/spread-manager/translation-settings
 * Get current translation settings (Super Admin only)
 */
router.get('/translation-settings', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    console.log('🔧 [TRANSLATION SETTINGS] Getting translation settings');
    
    // Get current translation mode from app_settings table
    const { data: setting, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'spread_name_translation_mode')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ [TRANSLATION SETTINGS] Error fetching settings:', error);
      throw error;
    }

    const translationMode = setting?.value || 'auto-fill';
    
    console.log('✅ [TRANSLATION SETTINGS] Retrieved mode:', translationMode);

    res.json({
      success: true,
      data: {
        translation_mode: translationMode,
        available_modes: ['auto-fill', 'auto-translate']
      }
    });
  } catch (error) {
    console.error('❌ [TRANSLATION SETTINGS] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get translation settings',
      details: error.message
    });
  }
});

/**
 * PUT /api/spread-manager/translation-settings
 * Update translation settings (Super Admin only)
 */
router.put('/translation-settings', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    const { translation_mode } = req.body;
    
    console.log('🔧 [TRANSLATION SETTINGS] Updating translation mode to:', translation_mode);

    // Validation
    const validModes = ['auto-fill', 'auto-translate'];
    if (!validModes.includes(translation_mode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid translation mode. Must be one of: ${validModes.join(', ')}`
      });
    }

    // Update or insert setting
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .upsert({
        key: 'spread_name_translation_mode',
        value: translation_mode
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [TRANSLATION SETTINGS] Error updating settings:', error);
      throw error;
    }

    console.log('✅ [TRANSLATION SETTINGS] Successfully updated mode to:', translation_mode);

    res.json({
      success: true,
      data: {
        translation_mode: translation_mode,
        available_modes: validModes
      },
      message: 'Translation settings updated successfully'
    });
  } catch (error) {
    console.error('❌ [TRANSLATION SETTINGS] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update translation settings',
      details: error.message
    });
  }
});

// =====================================================
// SPREAD CATEGORIES ENDPOINTS
// =====================================================

/**
 * GET /api/spread-manager/categories
 * Get all active spread categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('spread_categories')
      .select('*')
      .eq('is_active', true)
      .order('name_en');

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/spread-manager/categories
 * Create new category (Admin/SA only)
 */
router.post('/categories', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const userId = req.user.id;
    const { name_ar, name_en, description_ar, description_en, icon } = req.body;

    // Validation - BILINGUAL AUTO-TRANSLATION COMPLIANT
    // Only check that at least one language is provided
    // The bilingualAutoTranslationMiddleware will handle the other language
    if (!name_ar && !name_en) {
      return res.status(400).json({
        success: false,
        error: 'Name is required (in Arabic or English)'
      });
    }

    const categoryData = {
      name_ar,
      name_en,
      description_ar,
      description_en,
      icon
    };

    const { data: category, error } = await supabaseAdmin
      .from('spread_categories')
      .insert(categoryData)
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// DECK ENDPOINTS
// =====================================================

/**
 * GET /api/spread-manager/decks
 * Get all active tarot decks
 */
router.get('/decks', authenticateToken, async (req, res) => {
  try {
    const { data: decks, error } = await supabaseAdmin
      .from('tarot_decks')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching decks:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      data: decks,
      count: decks.length
    });
  } catch (error) {
    console.error('Decks fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// SPREAD ENDPOINTS
// =====================================================

/**
 * GET /api/spread-manager/spreads
 * Get spreads with filtering
 */
router.get('/spreads', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.profile.role;
    const {
      status = 'approved',
      category_id,
      creator_id,
      deck_id,
      limit = 50,
      offset = 0
    } = req.query;

    let query = supabaseAdmin
      .from('spreads')
      .select(`
        *,
        category:category_id(id, name_ar, name_en, icon),
        deck:deck_id(id, name, deck_type, total_cards),
        creator:creator_id(id, email),
        approver:approved_by(id, email),
        cards:spread_cards(
          id, position, position_name_en, position_name_ar,
          position_x, position_y, width, height, rotation, z_index,
          is_visible, position_description, layout_metadata,
          card_id, assigned_by, assigned_at, assignment_mode
        )
      `);

    // Role-based filtering
    if (['admin', 'super_admin', 'monitor'].includes(userRole)) {
      // Admins can see all spreads with status filter
      if (status) query = query.eq('status', status);
    } else {
      // Regular users see only approved spreads or their own
      query = query.or(`status.eq.approved,creator_id.eq.${userId}`);
    }

    // Additional filters
    if (category_id) query = query.eq('category_id', category_id);
    if (creator_id) query = query.eq('creator_id', creator_id);
    if (deck_id) query = query.eq('deck_id', deck_id);

    // Pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: spreads, error, count } = await query;

    if (error) {
      console.error('Error fetching spreads:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      data: spreads,
      count: spreads.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count
      }
    });
  } catch (error) {
    console.error('Spreads fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/spread-manager/spreads/:id
 * Get specific spread details
 */
router.get('/spreads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.profile.role;

    const { data: spread, error } = await supabaseAdmin
      .from('spreads')
      .select(`
        *,
        category:category_id(id, name_ar, name_en, icon),
        deck:deck_id(id, name, deck_type, total_cards),
        creator:creator_id(id, email),
        approver:approved_by(id, email),
        cards:spread_cards(
          id, position, position_name_en, position_name_ar,
          position_x, position_y, width, height, rotation, z_index,
          is_visible, position_description, layout_metadata,
          card_id, assigned_by, assigned_at, assignment_mode,
          card:card_id(id, name, name_ar, image_url, upright_meaning, upright_meaning_ar)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Spread not found' });
    }

    // Check access permissions
    const canAccess = spread.status === 'approved' ||
                     spread.creator_id === userId ||
                     ['admin', 'super_admin', 'monitor'].includes(userRole);

    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      data: spread
    });
  } catch (error) {
    console.error('Spread fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// BILINGUAL SPREAD CREATION WITH AUTO-TRANSLATION
// =====================================================

/**
 * POST /api/spread-manager/spreads
 * Create new spread (Reader/Admin/SA only)
 */
router.post('/spreads', [authenticateToken, requireRole(['reader', 'admin', 'super_admin'])], async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, // This is the English name from frontend
      name_ar,
      description, // This is the English description from frontend
      description_ar,
      category_id,
      deck_id,
      layout_type = 'grid',
      card_count = 3,
      mode = 'auto',
      question,
      question_ar,
      position_names = [] // Array of position names for custom layouts
    } = req.body;

    // Handle bilingual fields with auto-translation
    const processedFields = await bilingualTranslationService.processBilingualData({
      name_en: name,
      name_ar,
      description_en: description,
      description_ar,
      question_en: question,
      question_ar
    });
    
    // Validation - BILINGUAL AUTO-TRANSLATION COMPLIANT
    // After auto-translation processing, at least one language should be present
    if (!processedFields.name_en && !processedFields.name_ar) {
      return res.status(400).json({
        success: false,
        error: 'Name is required (in Arabic or English)'
      });
    }

    if (!category_id || !deck_id) {
      return res.status(400).json({
        success: false,
        error: 'Category and deck are required'
      });
    }

    if (card_count < 1 || card_count > 78) {
      return res.status(400).json({
        success: false,
        error: 'Card count must be between 1 and 78'
      });
    }

    // Validate deck exists and has enough cards
    const { data: deck, error: deckError } = await supabaseAdmin
      .from('tarot_decks')
      .select('id, total_cards')
      .eq('id', deck_id)
      .eq('is_active', true)
      .single();

    if (deckError || !deck) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deck selected'
      });
    }

    if (card_count > deck.total_cards) {
      return res.status(400).json({
        success: false,
        error: `Deck only has ${deck.total_cards} cards`
      });
    }

    // Create spread with correct field mapping
    const spreadData = {
      ...processedFields,
      category_id,
      deck_id,
      layout_type,
      card_count: parseInt(card_count),
      mode,
      creator_id: userId,
      status: 'pending' // Always starts as pending
    };

    const { data: spread, error: spreadError } = await supabaseAdmin
      .from('spreads')
      .insert(spreadData)
      .select()
      .single();

    if (spreadError) {
      console.error('Error creating spread:', spreadError);
      return res.status(500).json({ success: false, error: spreadError.message });
    }

    // Create spread positions
    const positions = [];
    for (let i = 1; i <= card_count; i++) {
      positions.push({
        spread_id: spread.id,
        position: i,
        position_name_en: position_names[i - 1]?.en || `Position ${i}`,
        position_name_ar: position_names[i - 1]?.ar || `الموضع ${i}`,
        assignment_mode: mode
      });
    }

    const { error: positionsError } = await supabaseAdmin
      .from('spread_cards')
      .insert(positions);

    if (positionsError) {
      console.error('Error creating positions:', positionsError);
      return res.status(500).json({ success: false, error: positionsError.message });
    }

    // Auto-assign cards if mode is 'auto'
    if (mode === 'auto') {
      await autoAssignCards(spread.id, deck_id, card_count, userId);
    }

    res.status(201).json({
      success: true,
      data: spread,
      message: 'Spread created successfully and submitted for approval'
    });
  } catch (error) {
    console.error('Spread creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/spread-manager/spreads/:id
 * Update spread (including freeform positions)
 */
router.put('/spreads/:id', [authenticateToken, requireRole(['reader', 'admin', 'super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      name,
      name_ar,
      description,
      description_ar,
      category_id,
      deck_id,
      layout_type,
      card_count,
      mode,
      question,
      question_ar,
      positions = [] // Freeform positions data
    } = req.body;

    // Validate spread exists and user can modify it
    const { data: spread, error: spreadError } = await supabaseAdmin
      .from('spreads')
      .select('*')
      .eq('id', id)
      .single();

    if (spreadError || !spread) {
      return res.status(404).json({ success: false, error: 'Spread not found' });
    }

    // Check permissions
    const canModify = spread.creator_id === userId || 
      req.user.role === 'admin' || 
      req.user.role === 'super_admin';
    
    if (!canModify) {
      return res.status(403).json({
        success: false,
        error: 'You can only modify your own spreads or need admin privileges'
      });
    }

    // Handle bilingual fields if provided
    let processedFields = {};
    if (name || name_ar || description || description_ar) {
      processedFields = await bilingualTranslationService.processBilingualData({
        name_en: name,
        name_ar,
        description_en: description,
        description_ar,
        question_en: question,
        question_ar
      });
    }

    // Update spread basic data
    const spreadUpdateData = {
      ...(processedFields.name_en && { name_en: processedFields.name_en }),
      ...(processedFields.name_ar && { name_ar: processedFields.name_ar }),
      ...(processedFields.description_en && { description_en: processedFields.description_en }),
      ...(processedFields.description_ar && { description_ar: processedFields.description_ar }),
      ...(processedFields.question_en && { question_en: processedFields.question_en }),
      ...(processedFields.question_ar && { question_ar: processedFields.question_ar }),
      ...(category_id && { category_id }),
      ...(deck_id && { deck_id }),
      ...(layout_type && { layout_type }),
      ...(card_count && { card_count: parseInt(card_count) }),
      ...(mode && { mode }),
      updated_at: new Date().toISOString()
    };

    // Update spread if there are changes
    if (Object.keys(spreadUpdateData).length > 1) { // > 1 because updated_at is always included
      const { error: updateError } = await supabaseAdmin
        .from('spreads')
        .update(spreadUpdateData)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating spread:', updateError);
        return res.status(500).json({ success: false, error: updateError.message });
      }
    }

    // Update positions if provided (for freeform editor)
    if (positions && Array.isArray(positions) && positions.length > 0) {
      // Delete existing positions
      await supabaseAdmin
        .from('spread_cards')
        .delete()
        .eq('spread_id', id);

      // Insert new positions with freeform data
      const positionInserts = positions.map((pos, index) => ({
        spread_id: id,
        position: pos.position || index + 1,
        position_name: pos.position_name_en || pos.name || `Position ${index + 1}`,
        position_name_ar: pos.position_name_ar || pos.name_ar || `الموضع ${index + 1}`,
        // Freeform positioning data
        position_x: pos.x || (100 + (index % 5) * 120),
        position_y: pos.y || (100 + Math.floor(index / 5) * 150),
        width: pos.width || 80,
        height: pos.height || 120,
        rotation: pos.rotation || 0,
        z_index: pos.zIndex || index,
        is_visible: pos.visible !== false,
        position_description: pos.description || '',
        layout_metadata: pos.metadata || {},
        assignment_mode: mode || 'manual'
      }));

      const { error: positionsError } = await supabaseAdmin
        .from('spread_cards')
        .insert(positionInserts);

      if (positionsError) {
        console.error('Error updating positions:', positionsError);
        return res.status(500).json({ success: false, error: positionsError.message });
      }
    }

    // Get updated spread with positions
    const { data: updatedSpread, error: fetchError } = await supabaseAdmin
      .from('spreads')
      .select(`
        *,
        category:spread_categories(id, name, name_ar),
        deck:tarot_decks(id, name, theme),
        positions:spread_cards(
          id, position, position_name, position_name_ar,
          position_x, position_y, width, height, rotation, z_index,
          is_visible, position_description, layout_metadata,
          card_id, assigned_by, assigned_at, assignment_mode
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated spread:', fetchError);
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    // Log update
    await supabaseAdmin.rpc('log_spread_action', {
      p_spread_id: id,
      p_action: 'updated',
      p_notes: 'Spread updated via editor',
      p_metadata: { 
        updated_fields: Object.keys(spreadUpdateData),
        positions_updated: positions && positions.length > 0,
        position_count: positions?.length || 0
      }
    });

    res.json({
      success: true,
      data: updatedSpread,
      message: 'Spread updated successfully'
    });
  } catch (error) {
    console.error('Spread update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/spread-manager/spreads/:id
 * Delete (soft delete) a spread - Admin/Super_Admin can delete any spread
 */
router.delete('/spreads/:id', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.profile.role;

    console.log('🗑️ [SpreadManager] DELETE request:', {
      spreadId: id,
      userId: userId,
      userRole: userRole
    });

    // Check if spread exists
    const { data: spread, error: spreadError } = await supabaseAdmin
      .from('tarot_spreads')
      .select('id, name, is_active, created_by')
      .eq('id', id)
      .single();

    if (spreadError || !spread) {
      console.error('❌ [SpreadManager] Spread not found:', spreadError);
      return res.status(404).json({ 
        success: false, 
        error: 'Spread not found' 
      });
    }

    console.log('📋 [SpreadManager] Spread found:', {
      id: spread.id,
      name: spread.name,
      isActive: spread.is_active,
      createdBy: spread.created_by
    });

    // Admin/Super_Admin can delete any spread
    const canDelete = ['admin', 'super_admin'].includes(userRole);
    if (!canDelete) {
      console.error('❌ [SpreadManager] Insufficient permissions');
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete spread'
      });
    }

    // Perform soft delete using admin client (bypasses RLS)
    const { error: deleteError } = await supabaseAdmin
      .from('tarot_spreads')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [SpreadManager] Delete error:', deleteError);
      return res.status(500).json({
        success: false,
        error: deleteError.message
      });
    }

    console.log('✅ [SpreadManager] Spread deleted successfully:', id);

    res.json({
      success: true,
      message: 'Spread deleted successfully',
      data: { id: id, is_active: false }
    });

  } catch (error) {
    console.error('💥 [SpreadManager] Delete endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/spread-manager/spreads/:id/cards
 * Assign cards manually (for manual mode spreads)
 */
router.post('/spreads/:id/cards', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { cards } = req.body; // Array of { position, card_id }

    // Validate spread exists and user can modify it
    const { data: spread, error: spreadError } = await supabaseAdmin
      .from('spreads')
      .select('*')
      .eq('id', id)
      .single();

    if (spreadError || !spread) {
      return res.status(404).json({ success: false, error: 'Spread not found' });
    }

    // Check permissions
    const canModify = spread.creator_id === userId && spread.status === 'pending';
    if (!canModify) {
      return res.status(403).json({
        success: false,
        error: 'Can only modify your own pending spreads'
      });
    }

    if (spread.mode !== 'manual') {
      return res.status(400).json({
        success: false,
        error: 'Can only assign cards to manual mode spreads'
      });
    }

    // Validate cards array
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cards array is required'
      });
    }

    // Update each position with assigned card
    const updates = [];
    for (const cardAssignment of cards) {
      const { position, card_id } = cardAssignment;

      if (!position || !card_id) {
        return res.status(400).json({
          success: false,
          error: 'Position and card_id are required for each card'
        });
      }

      updates.push(
        supabaseAdmin
          .from('spread_cards')
          .update({
            card_id,
            assigned_by: userId,
            assigned_at: new Date().toISOString(),
            assignment_mode: 'manual'
          })
          .eq('spread_id', id)
          .eq('position', position)
      );
    }

    // Execute all updates
    const results = await Promise.all(updates);
    const errors = results.filter(result => result.error);

    if (errors.length > 0) {
      console.error('Error assigning cards:', errors);
      return res.status(500).json({
        success: false,
        error: 'Error assigning some cards'
      });
    }

    // Log card assignment
    await supabaseAdmin.rpc('log_spread_action', {
      p_spread_id: id,
      p_action: 'cards_assigned',
      p_notes: 'Manual card assignment completed',
      p_metadata: { assigned_cards: cards.length }
    });

    res.json({
      success: true,
      message: `Successfully assigned ${cards.length} cards`
    });
  } catch (error) {
    console.error('Card assignment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/spread-manager/spreads/:id/approve
 * Approve or reject spread (Admin/SA only)
 */
router.post('/spreads/:id/approve', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { approve, rejection_reason, rejection_reason_ar } = req.body;

    // Get spread
    const { data: spread, error: spreadError } = await supabaseAdmin
      .from('spreads')
      .select('*')
      .eq('id', id)
      .single();

    if (spreadError || !spread) {
      return res.status(404).json({ success: false, error: 'Spread not found' });
    }

    if (spread.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Can only approve/reject pending spreads'
      });
    }

    // Update spread status
    const updateData = {
      status: approve ? 'approved' : 'rejected',
      approved_by: userId,
      approved_at: new Date().toISOString()
    };

    if (!approve) {
      updateData.rejection_reason = rejection_reason;
      updateData.rejection_reason_ar = rejection_reason_ar;
    }

    const { data: updatedSpread, error: updateError } = await supabaseAdmin
      .from('spreads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating spread:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // Auto-assign cards for approved auto-mode spreads
    if (approve && spread.mode === 'auto') {
      await autoAssignCards(id, spread.deck_id, spread.card_count, userId);
    }

    res.json({
      success: true,
      data: updatedSpread,
      message: approve ? 'Spread approved successfully' : 'Spread rejected'
    });
  } catch (error) {
    console.error('Spread approval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/spread-manager/stats
 * Get spread statistics (Admin/SA only)
 */
router.get('/stats', [authenticateToken, requireRole(['admin', 'super_admin', 'monitor'])], async (req, res) => {
  try {
    const { data: stats, error } = await supabaseAdmin.rpc('get_spread_stats');

    if (error) {
      console.error('Error fetching stats:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/spread-manager/audit/:spread_id
 * Get audit log for specific spread (Admin/SA only)
 */
router.get('/audit/:spread_id', [authenticateToken, requireRole(['admin', 'super_admin', 'monitor'])], async (req, res) => {
  try {
    const { spread_id } = req.params;

    const { data: auditLog, error } = await supabaseAdmin
      .from('spread_audit_log')
      .select(`
        *,
        performer:performed_by(id, email)
      `)
      .eq('spread_id', spread_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit log:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      data: auditLog,
      count: auditLog.length
    });
  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Auto-assign cards for approved auto-mode spreads
 */
async function autoAssignCards(spreadId, deckId, cardCount, assignedBy) {
  try {
    // Get available cards from deck
    const { data: availableCards, error: cardsError } = await supabaseAdmin
      .from('tarot_cards')
      .select('id')
      .eq('deck_id', deckId)
      .eq('is_active', true);

    if (cardsError || !availableCards.length) {
      console.error('Error getting cards for auto-assignment:', cardsError);
      return;
    }

    // Shuffle and select cards
    const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffled.slice(0, cardCount);

    // Get spread positions
    const { data: positions, error: positionsError } = await supabaseAdmin
      .from('spread_cards')
      .select('id, position')
      .eq('spread_id', spreadId)
      .order('position');

    if (positionsError) {
      console.error('Error getting positions for auto-assignment:', positionsError);
      return;
    }

    // Assign cards to positions
    const updates = positions.map((position, index) => ({
      id: position.id,
      card_id: selectedCards[index]?.id,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
      assignment_mode: 'auto'
    }));

    const { error: updateError } = await supabaseAdmin
      .from('spread_cards')
      .upsert(updates);

    if (updateError) {
      console.error('Error auto-assigning cards:', updateError);
    } else {
      // Log auto-assignment
      await supabaseAdmin.rpc('log_spread_action', {
        p_spread_id: spreadId,
        p_action: 'auto_assigned',
        p_notes: 'Cards automatically assigned on approval',
        p_metadata: { assigned_cards: selectedCards.length }
      });
    }
  } catch (error) {
    console.error('Auto-assignment error:', error);
  }
}

// ===================
// ADMIN APPROVAL ROUTES
// ===================

// PUT /api/spread-manager/spreads/:id/approval - Process spread approval/rejection
router.put('/spreads/:id/approval', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason = '' } = req.body;
    
    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approved" or "rejected"'
      });
    }

    const status = action;
    const updateData = {
      status,
      admin_notes: reason,
      processed_by: req.user.id,
      updated_at: new Date().toISOString()
    };

    if (action === 'approved') {
      updateData.approved_at = new Date().toISOString();
    } else {
      updateData.rejected_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('spreads')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:profiles!spreads_creator_id_fkey(first_name, last_name, email, phone, country)
      `)
      .single();

    if (error) {
      console.error('Spread approval update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update spread approval status'
      });
    }

    res.json({
      success: true,
      data,
      message: `Spread ${action} successfully`
    });

  } catch (error) {
    console.error('Spread approval processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/spread-manager/spreads/bulk-approval - Bulk approve/reject spreads
router.put('/spreads/bulk-approval', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { spreadIds, action, reason = '' } = req.body;
    
    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approved" or "rejected"'
      });
    }

    if (!Array.isArray(spreadIds) || spreadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'spreadIds must be a non-empty array'
      });
    }

    const status = action;
    const updateData = {
      status,
      admin_notes: reason,
      processed_by: req.user.id,
      updated_at: new Date().toISOString()
    };

    if (action === 'approved') {
      updateData.approved_at = new Date().toISOString();
    } else {
      updateData.rejected_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('spreads')
      .update(updateData)
      .in('id', spreadIds)
      .select(`
        *,
        creator:profiles!spreads_creator_id_fkey(first_name, last_name, email, phone, country)
      `);

    if (error) {
      console.error('Bulk spread approval error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to bulk update spread approval status'
      });
    }

    res.json({
      success: true,
      data,
      message: `${data.length} spreads ${action} successfully`
    });

  } catch (error) {
    console.error('Bulk spread approval processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 