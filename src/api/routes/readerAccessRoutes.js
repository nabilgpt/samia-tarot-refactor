import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ===================================
// READER ACCESS CONTROL ROUTES
// These routes ensure readers only see public items or items assigned to them
// ===================================

// GET /api/reader/available-spreads - Get spreads available to a specific reader
router.get('/available-spreads', authenticateToken, requireRole(['reader', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { reader_id } = req.query;
    const readerIdToUse = reader_id || req.user.profileId;

    console.log('🔍 [READER ACCESS] Fetching available spreads for reader:', readerIdToUse);

    // Use the database function to get available spreads
    const { data: spreads, error } = await supabaseAdmin
      .rpc('get_available_spreads_for_reader', { reader_profile_id: readerIdToUse });

    if (error) {
      console.error('❌ [READER ACCESS] Error fetching available spreads:', error);
      return res.status(500).json({ error: 'Failed to fetch available spreads' });
    }

    console.log(`✅ [READER ACCESS] Found ${spreads?.length || 0} available spreads for reader`);
    res.json({ spreads: spreads || [] });
  } catch (error) {
    console.error('❌ [READER ACCESS] Available spreads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reader/available-decks - Get decks available to a specific reader
router.get('/available-decks', authenticateToken, requireRole(['reader', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { reader_id } = req.query;
    const readerIdToUse = reader_id || req.user.profileId;

    console.log('🔍 [READER ACCESS] Fetching available decks for reader:', readerIdToUse);

    // Use the database function to get available decks
    const { data: decks, error } = await supabaseAdmin
      .rpc('get_available_decks_for_reader', { reader_profile_id: readerIdToUse });

    if (error) {
      console.error('❌ [READER ACCESS] Error fetching available decks:', error);
      return res.status(500).json({ error: 'Failed to fetch available decks' });
    }

    console.log(`✅ [READER ACCESS] Found ${decks?.length || 0} available decks for reader`);
    res.json({ decks: decks || [] });
  } catch (error) {
    console.error('❌ [READER ACCESS] Available decks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reader/spread-assignments - Get spreads specifically assigned to a reader
router.get('/spread-assignments', authenticateToken, requireRole(['reader', 'admin', 'super_admin']), async (req, res) => {
  try {
    const readerId = req.user.profileId;

    console.log('🔍 [READER ACCESS] Fetching spread assignments for reader:', readerId);

    const { data: assignments, error } = await supabaseAdmin
      .from('tarot_spread_reader_assignments')
      .select(`
        id,
        assigned_at,
        notes,
        spread:tarot_spreads!spread_id(
          id,
          name,
          name_ar,
          description,
          description_ar,
          card_count,
          difficulty_level,
          category,
          visibility_type
        ),
        assigned_by:profiles!assigned_by(name, email)
      `)
      .eq('reader_id', readerId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ [READER ACCESS] Error fetching assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }

    console.log(`✅ [READER ACCESS] Found ${assignments?.length || 0} spread assignments`);
    res.json({ assignments: assignments || [] });
  } catch (error) {
    console.error('❌ [READER ACCESS] Assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reader/deck-assignments - Get decks specifically assigned to a reader
router.get('/deck-assignments', authenticateToken, requireRole(['reader', 'admin', 'super_admin']), async (req, res) => {
  try {
    const readerId = req.user.profileId;

    console.log('🔍 [READER ACCESS] Fetching deck assignments for reader:', readerId);

    const { data: assignments, error } = await supabaseAdmin
      .from('tarot_deck_reader_assignments')
      .select(`
        id,
        assigned_at,
        notes,
        deck:tarot_decks!deck_id(
          id,
          name,
          name_ar,
          description,
          description_ar,
          total_cards,
          deck_type,
          visibility_type,
          upload_status
        ),
        assigned_by:profiles!assigned_by(name, email)
      `)
      .eq('reader_id', readerId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ [READER ACCESS] Error fetching deck assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch deck assignments' });
    }

    console.log(`✅ [READER ACCESS] Found ${assignments?.length || 0} deck assignments`);
    res.json({ assignments: assignments || [] });
  } catch (error) {
    console.error('❌ [READER ACCESS] Deck assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reader/profile - Get reader profile with access summary
router.get('/profile', authenticateToken, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.profileId;

    console.log('🔍 [READER ACCESS] Fetching reader profile with access summary:', readerId);

    // Get basic profile info
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, is_active, created_at')
      .eq('id', readerId)
      .single();

    if (profileError || !profile) {
      console.error('❌ [READER ACCESS] Profile not found:', profileError);
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get access counts
    const [spreadsResult, decksResult, spreadAssignmentsResult, deckAssignmentsResult] = await Promise.all([
      supabaseAdmin.rpc('get_available_spreads_for_reader', { reader_profile_id: readerId }),
      supabaseAdmin.rpc('get_available_decks_for_reader', { reader_profile_id: readerId }),
      supabaseAdmin
        .from('tarot_spread_reader_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('reader_id', readerId)
        .eq('is_active', true),
      supabaseAdmin
        .from('tarot_deck_reader_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('reader_id', readerId)
        .eq('is_active', true)
    ]);

    const accessSummary = {
      total_available_spreads: spreadsResult.data?.length || 0,
      total_available_decks: decksResult.data?.length || 0,
      assigned_spreads_count: spreadAssignmentsResult.count || 0,
      assigned_decks_count: deckAssignmentsResult.count || 0
    };

    console.log('✅ [READER ACCESS] Profile fetched with access summary');
    res.json({ 
      profile: {
        ...profile,
        access_summary: accessSummary
      }
    });
  } catch (error) {
    console.error('❌ [READER ACCESS] Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 