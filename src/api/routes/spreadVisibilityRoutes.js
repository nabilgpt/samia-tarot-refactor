/**
 * ==========================================
 * SPREAD VISIBILITY ROUTES
 * ==========================================
 * Manages Public/Targeted spread visibility with RLS enforcement
 */

const express = require('express');
const { supabaseAdmin } = require('../lib/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /spreads/:id/visibility
 * Get visibility settings for a specific spread
 */
router.get('/spreads/:id/visibility', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id: spreadId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('spreads_visibility')
      .select(`
        *,
        spread:tarot_spreads(id, name, created_by)
      `)
      .eq('spread_id', spreadId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data || {
        spread_id: spreadId,
        is_public: true,
        targeted_readers: []
      }
    });
  } catch (error) {
    console.error('Error fetching spread visibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spread visibility'
    });
  }
});

/**
 * POST /spreads/:id/visibility
 * Set visibility settings for a spread
 */
router.post('/spreads/:id/visibility', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id: spreadId } = req.params;
    const { is_public, targeted_readers = [] } = req.body;

    // Validate input
    if (typeof is_public !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_public must be a boolean'
      });
    }

    if (!Array.isArray(targeted_readers)) {
      return res.status(400).json({
        success: false,
        error: 'targeted_readers must be an array'
      });
    }

    // Validate that targeted readers exist and are readers
    if (targeted_readers.length > 0) {
      const { data: readers, error: readersError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'reader')
        .in('id', targeted_readers);

      if (readersError) throw readersError;

      const validReaderIds = readers.map(r => r.id);
      const invalidReaders = targeted_readers.filter(id => !validReaderIds.includes(id));

      if (invalidReaders.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid reader IDs: ${invalidReaders.join(', ')}`
        });
      }
    }

    // Verify spread exists
    const { data: spread, error: spreadError } = await supabaseAdmin
      .from('tarot_spreads')
      .select('id, name, created_by')
      .eq('id', spreadId)
      .single();

    if (spreadError || !spread) {
      return res.status(404).json({
        success: false,
        error: 'Spread not found'
      });
    }

    // Upsert visibility settings
    const { data, error } = await supabaseAdmin
      .from('spreads_visibility')
      .upsert({
        spread_id: spreadId,
        is_public,
        targeted_readers,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'spread_id'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Spread visibility updated successfully',
      data
    });
  } catch (error) {
    console.error('Error updating spread visibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update spread visibility'
    });
  }
});

/**
 * GET /spreads/accessible
 * Get spreads accessible to current reader (applies RLS)
 */
router.get('/spreads/accessible', authenticateToken, requireRole(['reader']), async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('tarot_spreads')
      .select(`
        id, name, name_ar, description, description_ar,
        card_count, difficulty_level, category,
        layout_type, is_active, approval_status,
        created_at, updated_at,
        spreads_visibility(is_public, targeted_readers)
      `)
      .eq('is_active', true)
      .eq('approval_status', 'approved');

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('name');

    const { data, error, count } = await query;

    if (error) throw error;

    // The RLS policies should automatically filter the results
    // but we can add client-side verification for extra security
    const accessibleSpreads = data.filter(spread => {
      const visibility = spread.spreads_visibility;
      if (!visibility) return true; // No visibility record = public

      return visibility.is_public || 
             (visibility.targeted_readers && visibility.targeted_readers.includes(req.user.id));
    });

    res.json({
      success: true,
      data: accessibleSpreads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching accessible spreads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accessible spreads'
    });
  }
});

/**
 * GET /spreads/:id/access-check
 * Check if current reader can access a specific spread
 */
router.get('/spreads/:id/access-check', authenticateToken, requireRole(['reader']), async (req, res) => {
  try {
    const { id: spreadId } = req.params;
    const readerId = req.user.id;

    // Use the database function to check access
    const { data, error } = await supabaseAdmin
      .rpc('can_reader_access_spread', {
        spread_uuid: spreadId,
        reader_uuid: readerId
      });

    if (error) throw error;

    res.json({
      success: true,
      can_access: data,
      spread_id: spreadId,
      reader_id: readerId
    });
  } catch (error) {
    console.error('Error checking spread access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check spread access'
    });
  }
});

/**
 * GET /admin/spreads/visibility-report
 * Get visibility report for all spreads (admin only)
 */
router.get('/admin/spreads/visibility-report', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tarot_spreads')
      .select(`
        id, name, created_by, is_active,
        spreads_visibility(
          is_public, 
          targeted_readers,
          created_at as visibility_created_at
        )
      `)
      .order('name');

    if (error) throw error;

    const report = {
      total_spreads: data.length,
      public_spreads: data.filter(s => !s.spreads_visibility || s.spreads_visibility.is_public).length,
      targeted_spreads: data.filter(s => s.spreads_visibility && !s.spreads_visibility.is_public).length,
      spreads_without_visibility: data.filter(s => !s.spreads_visibility).length,
      details: data.map(spread => ({
        id: spread.id,
        name: spread.name,
        is_active: spread.is_active,
        visibility_type: !spread.spreads_visibility 
          ? 'no_record' 
          : spread.spreads_visibility.is_public 
            ? 'public' 
            : 'targeted',
        targeted_readers_count: spread.spreads_visibility?.targeted_readers?.length || 0,
        targeted_readers: spread.spreads_visibility?.targeted_readers || []
      }))
    };

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error generating visibility report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate visibility report'
    });
  }
});

/**
 * GET /spreads/visibility/audit
 * Get audit log for spread visibility changes
 */
router.get('/spreads/visibility/audit', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { spread_id, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('spreads_visibility_audit')
      .select(`
        *,
        spread:tarot_spreads(id, name),
        changed_by_profile:profiles!changed_by(id, full_name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (spread_id) {
      query = query.eq('spread_id', spread_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log'
    });
  }
});

module.exports = router;