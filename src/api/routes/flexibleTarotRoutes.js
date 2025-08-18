// =====================================================
// SAMIA TAROT - FLEXIBLE MULTI-DECK TAROT SPREAD API ROUTES
// Comprehensive API for managing tarot decks, cards, spreads, and reading sessions
// =====================================================

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { aiContentFilter, readingAIFilter } from '../middleware/aiContentFilter.js';

const router = express.Router();

// Apply AI content filtering to all routes
router.use(readingAIFilter);

// =====================================================
// DECK MANAGEMENT ENDPOINTS
// =====================================================

/**
 * GET /api/flexible-tarot/decks
 * Get all available tarot decks with role-based access
 */
router.get('/decks', authenticateToken, async (req, res) => {
  try {
    const { data: decks, error } = await supabaseAdmin
      .from('tarot_decks')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
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

/**
 * GET /api/flexible-tarot/decks/:id
 * Get specific deck details with optional cards
 */
router.get('/decks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { include_cards = 'false' } = req.query;

    // Get deck details
    const { data: deck, error: deckError } = await supabaseAdmin
      .from('tarot_decks')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (deckError) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    let response = { deck };

    // Include cards if requested
    if (include_cards === 'true') {
      const { data: cards, error: cardsError } = await supabaseAdmin
        .from('tarot_cards')
        .select('*')
        .eq('deck_id', id)
        .order('arcana_type')
        .order('card_number');

      if (cardsError) {
        console.error('Error fetching cards:', cardsError);
        return res.status(500).json({ success: false, error: cardsError.message });
      }

      response.cards = cards;
      response.cards_count = cards.length;
    }

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Deck details fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/flexible-tarot/decks/:id/cards
 * Get all cards for a specific deck with filtering
 */
router.get('/decks/:id/cards', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { arcana_type, suit, search } = req.query;

    let query = supabaseAdmin
      .from('tarot_cards')
      .select('*')
      .eq('deck_id', id);

    // Apply filters
    if (arcana_type) query = query.eq('arcana_type', arcana_type);
    if (suit) query = query.eq('suit', suit);
    if (search) query = query.ilike('name', `%${search}%`);

    query = query.order('arcana_type').order('card_number');

    const { data: cards, error } = await query;

    if (error) {
      console.error('Error fetching cards:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ 
      success: true, 
      data: cards,
      count: cards.length 
    });
  } catch (error) {
    console.error('Cards fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// SPREAD MANAGEMENT ENDPOINTS
// =====================================================

/**
 * GET /api/flexible-tarot/spreads
 * Get all available spreads with advanced filtering
 */
router.get('/spreads', authenticateToken, async (req, res) => {
  try {
    const { category, difficulty, is_public = 'true', deck_type, created_by } = req.query;
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id

    let query = supabaseAdmin
      .from('tarot_spreads')
      .select(`
        *,
        creator:created_by(id, name, email),
        preferred_deck:preferred_deck_id(id, name, deck_type)
      `)
      .eq('is_active', true)
      .eq('approval_status', 'approved');

    // Apply filters
    if (category) query = query.eq('category', category);
    if (difficulty) query = query.eq('difficulty_level', difficulty);
    if (is_public === 'true') {
      query = query.or(`is_public.eq.true,created_by.eq.${userId}`);
    }
    if (deck_type) {
      query = query.contains('compatible_deck_types', [deck_type]);
    }
    if (created_by) query = query.eq('created_by', created_by);

    query = query.order('usage_count', { ascending: false });

    const { data: spreads, error } = await query;

    if (error) {
      console.error('Error fetching spreads:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ 
      success: true, 
      data: spreads,
      count: spreads.length 
    });
  } catch (error) {
    console.error('Spreads fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/flexible-tarot/spreads
 * Create custom spread (Reader, Admin, Super Admin only)
 */
router.post('/spreads', [authenticateToken, requireRole(['reader', 'admin', 'super_admin'])], async (req, res) => {
  try {
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id
    const userRole = req.profile.role;  // ✅ Fixed: role is in req.profile.role
    const {
      name,
      name_ar,
      description,
      description_ar,
      card_count,
      min_cards,
      max_cards,
      positions,
      layout_type = 'fixed',
      difficulty_level = 'beginner',
      category,
      reading_time_minutes = 30,
      compatible_deck_types = [],
      preferred_deck_id,
      background_theme = 'cosmic',
      position_shape = 'circle',
      is_public = true
    } = req.body;

    // Validation
    if (!name || !description || !positions || !Array.isArray(positions)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, description, and positions array are required' 
      });
    }

    if (positions.length !== card_count) {
      return res.status(400).json({ 
        success: false, 
        error: 'Number of positions must match card count' 
      });
    }

    const spreadData = {
      name,
      name_ar,
      description,
      description_ar,
      card_count,
      min_cards,
      max_cards,
      positions,
      layout_type,
      difficulty_level,
      category,
      reading_time_minutes,
      compatible_deck_types,
      preferred_deck_id,
      background_theme,
      position_shape,
      is_public,
      is_custom: true,
      created_by: userId,
      approval_status: ['admin', 'super_admin'].includes(userRole) ? 'approved' : 'pending'
    };

    const { data: spread, error } = await supabaseAdmin
      .from('tarot_spreads')
      .insert(spreadData)
      .select()
      .single();

    if (error) {
      console.error('Error creating spread:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.status(201).json({ 
      success: true, 
      data: spread,
      message: spread.approval_status === 'pending' ? 'Spread created and pending approval' : 'Spread created successfully'
    });
  } catch (error) {
    console.error('Spread creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/flexible-tarot/spreads/:id
 * Update custom spread (Creator or Admin only)
 */
router.put('/spreads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id
    const userRole = req.profile.role;  // ✅ Fixed: role is in req.profile.role

    // Check ownership or admin rights
    const { data: existingSpread, error: fetchError } = await supabaseAdmin
      .from('tarot_spreads')
      .select('created_by, is_custom')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({ success: false, error: 'Spread not found' });
    }

    if (existingSpread.created_by !== userId && !['admin', 'super_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this spread' });
    }

    const updateData = req.body;
    delete updateData.id;
    delete updateData.created_by;
    delete updateData.created_at;

    // If not admin, require re-approval for custom spreads
    if (!['admin', 'super_admin'].includes(userRole) && existingSpread.is_custom) {
      updateData.approval_status = 'pending';
    }

    const { data: updated, error } = await supabaseAdmin
      .from('tarot_spreads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating spread:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Spread update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// READING SESSION ENDPOINTS
// =====================================================

/**
 * POST /api/flexible-tarot/sessions
 * Create new reading session with automatic card assignment (Role-Safe, Client-First)
 * 🂠 Cards are automatically assigned and hidden from readers
 */
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.profile.role;
    const {
      client_id,
      deck_id,
      layout_type = 'grid',
      card_count = 3,
      question = '',
      question_category = 'general'
    } = req.body;

    // Validation
    if (!deck_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Deck ID is required' 
      });
    }

    if (!client_id && userRole !== 'client') {
      return res.status(400).json({ 
        success: false, 
        error: 'Client ID is required when reader creates session' 
      });
    }

    const finalClientId = client_id || userId;
    const finalReaderId = userRole === 'reader' ? userId : client_id;
    const finalCardCount = Math.min(Math.max(parseInt(card_count), 1), 78); // Validate range

    // 🃏 STEP 1: Get available cards from deck
    const { data: availableCards, error: cardsError } = await supabaseAdmin
      .from('tarot_cards')
      .select('id, name, name_ar, image_url, meaning, meaning_ar, suit, arcana_type')
      .eq('deck_id', deck_id)
      .order('id');

    if (cardsError || !availableCards?.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'No cards found in selected deck' 
      });
    }

    // 🔀 STEP 2: Shuffle and randomly select cards (automatic assignment)
    const shuffledCards = [...availableCards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffledCards.slice(0, finalCardCount);

    // 🏗️ STEP 3: Create session data with automatic card assignments
    const cardsDrawn = selectedCards.map((card, index) => ({
      position: index + 1,
      card_id: card.id,
      status: 'hidden', // All cards start hidden from reader
      assigned_at: new Date().toISOString(),
      // Include card details for internal storage
      card: {
        id: card.id,
        name: card.name,
        name_ar: card.name_ar,
        image_url: card.image_url,
        meaning: card.meaning,
        meaning_ar: card.meaning_ar,
        suit: card.suit,
        arcana_type: card.arcana_type
      }
    }));

    const sessionData = {
      client_id: finalClientId,
      reader_id: finalReaderId,
      deck_id: deck_id,
      question: question,
      session_type: 'flexible_spread',
      status: 'active', // Session ready with cards assigned
      layout_type: layout_type,
      card_count: finalCardCount,
      cards_drawn: cardsDrawn,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: session, error } = await supabaseAdmin
      .from('reading_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // 🔒 STEP 4: Role-based response filtering
    const responseData = {
      ...session,
      cards_drawn: session.cards_drawn.map((cardData, index) => {
        if (userRole === 'reader') {
          // 🚫 READER VIEW: Only placeholders, no card details
          return {
            position: cardData.position,
            status: 'hidden',
            card: null // No card information for readers
          };
        } else {
          // ✅ CLIENT/ADMIN VIEW: Full card details
          return cardData;
        }
      })
    };

    res.status(201).json({ 
      success: true, 
      data: responseData,
      message: `Session created with ${finalCardCount} automatically assigned cards`
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/flexible-tarot/sessions/:id
 * Get reading session details with role-based card filtering
 * 🔒 Readers see only placeholders, clients see full cards
 */
router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.profile.role;

    const { data: session, error } = await supabaseAdmin
      .from('reading_sessions')
      .select(`
        *,
        deck:deck_id(name, deck_type, total_cards, card_back_image_url),
        reader:reader_id(id, first_name, last_name, email, avatar_url),
        client:client_id(id, first_name, last_name, email, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Check permissions
    const canAccess = session.client_id === userId || 
                     session.reader_id === userId || 
                     ['monitor', 'admin', 'super_admin'].includes(userRole);

    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this session' });
    }

    // 🔒 ROLE-BASED CARD FILTERING
    const responseData = {
      ...session,
      cards_drawn: session.cards_drawn?.map((cardData, index) => {
        if (userRole === 'reader') {
          // 🚫 READER VIEW: Only position and status, no card details
          return {
            position: cardData.position,
            status: 'hidden',
            card: null, // No card information
            // Include minimal metadata for UI positioning
            card_count: session.card_count,
            layout_type: session.layout_type
          };
        } else {
          // ✅ CLIENT/ADMIN VIEW: Full card details
          return cardData;
        }
      }) || []
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/flexible-tarot/sessions
 * List reading sessions with role-based filtering
 * 🔒 Readers see their sessions but with hidden cards
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.profile.role;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('reading_sessions')
      .select(`
        *,
        deck:deck_id(name, deck_type, total_cards),
        reader:reader_id(id, first_name, last_name, email),
        client:client_id(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Role-based filtering
    if (userRole === 'reader') {
      query = query.eq('reader_id', userId);
    } else if (userRole === 'client') {
      query = query.eq('client_id', userId);
    }
    // Admin/super_admin see all sessions

    if (status) {
      query = query.eq('status', status);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Apply role-based card filtering to each session
    const filteredSessions = sessions.map(session => ({
      ...session,
      cards_drawn: session.cards_drawn?.map((cardData, index) => {
        if (userRole === 'reader') {
          // 🚫 READER VIEW: Only position count, no card details
          return {
            position: cardData.position,
            status: 'hidden',
            card: null
          };
        } else {
          // ✅ CLIENT/ADMIN VIEW: Full details or summary
          return cardData;
        }
      }) || []
    }));

    res.json({ 
      success: true, 
      data: filteredSessions,
      count: filteredSessions.length 
    });
  } catch (error) {
    console.error('Sessions list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/flexible-tarot/sessions/:id/draw-cards
 * DEPRECATED - Cards are now automatically assigned during session creation
 */
router.post('/sessions/:id/draw-cards', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id
    const userRole = req.profile.role;  // ✅ Fixed: role is in req.profile.role
    const { card_positions = [] } = req.body; // Array of {position, card_id}

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Check permissions
    const canDraw = session.reader_id === userId || 
                   ['admin', 'super_admin'].includes(userRole);

    if (!canDraw) {
      return res.status(403).json({ success: false, error: 'Not authorized to draw cards' });
    }

    // Validate card positions
    if (!Array.isArray(card_positions) || card_positions.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid card positions required' });
    }

    // Get spread positions
    const { data: spread, error: spreadError } = await supabaseAdmin
      .from('tarot_spreads')
      .select('positions')
      .eq('id', session.spread_id)
      .single();

    if (spreadError) {
      return res.status(404).json({ success: false, error: 'Spread not found' });
    }

    // Prepare cards to insert
    const cardsToInsert = card_positions.map(cp => {
      const position = spread.positions.find(p => p.position === cp.position);
      return {
        session_id: id,
        card_id: cp.card_id,
        position: cp.position,
        position_name: position?.name || `Position ${cp.position}`,
        position_meaning: position?.meaning || '',
        position_meaning_ar: position?.meaning_ar || '',
        is_reversed: cp.is_reversed || false,
        added_by_role: ['admin', 'super_admin'].includes(userRole) ? 'system' : 'reader',
        added_by_user_id: userId
      };
    });

    const { data: drawnCards, error: insertError } = await supabaseAdmin
      .from('tarot_spread_cards')
      .insert(cardsToInsert)
      .select(`
        *,
        card:card_id(*)
      `);

    if (insertError) {
      console.error('Error drawing cards:', insertError);
      return res.status(500).json({ success: false, error: insertError.message });
    }

    // Update session status
    await supabaseAdmin
      .from('reading_sessions')
      .update({ 
        status: 'card_selection',
        current_step: 'reveal'
      })
      .eq('id', id);

    res.json({ 
      success: true, 
      data: drawnCards,
      message: 'Cards drawn successfully'
    });
  } catch (error) {
    console.error('Card drawing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/flexible-tarot/sessions/:id/burn-card
 * Burn/discard a card from the spread (Reader only)
 */
router.post('/sessions/:id/burn-card', [authenticateToken, requireRole(['reader', 'admin', 'super_admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id
    const userRole = req.profile.role;  // ✅ Fixed: role is in req.profile.role
    const { card_position, burn_reason = 'Reader decision' } = req.body;

    // Check session and permissions
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('reader_id, status')
      .eq('id', id)
      .single();

    if (sessionError) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const canBurn = session.reader_id === userId || 
                   ['admin', 'super_admin'].includes(userRole);

    if (!canBurn) {
      return res.status(403).json({ success: false, error: 'Not authorized to burn cards' });
    }

    // Burn the card
    const { data: burnedCard, error: burnError } = await supabaseAdmin
      .from('tarot_spread_cards')
      .update({
        is_burned: true,
        burned_at: new Date().toISOString(),
        burned_by_user_id: userId,
        burn_reason
      })
      .eq('session_id', id)
      .eq('position', card_position)
      .select()
      .single();

    if (burnError) {
      console.error('Error burning card:', burnError);
      return res.status(500).json({ success: false, error: burnError.message });
    }

    res.json({ 
      success: true, 
      data: burnedCard,
      message: 'Card burned successfully'
    });
  } catch (error) {
    console.error('Card burning error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/flexible-tarot/sessions/:id/reveal-card
 * Reveal a card (Client after payment or Reader during live session)
 */
router.post('/sessions/:id/reveal-card', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id
    const { card_position } = req.body;

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Check permissions
    const isClient = session.client_id === userId;
    const isReader = session.reader_id === userId;
    const isLiveCall = session.is_live_call;

    if (!isClient && !isReader) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // For clients, check payment status (unless it's a live call)
    if (isClient && !isLiveCall && session.payment_status !== 'paid') {
      return res.status(402).json({ 
        success: false, 
        error: 'Payment required to reveal cards' 
      });
    }

    // Reveal the card
    const { data: revealedCard, error: revealError } = await supabaseAdmin
      .from('tarot_spread_cards')
      .update({
        is_revealed: true,
        revealed_at: new Date().toISOString()
      })
      .eq('session_id', id)
      .eq('position', card_position)
      .eq('is_burned', false)
      .select(`
        *,
        card:card_id(*)
      `)
      .single();

    if (revealError) {
      console.error('Error revealing card:', revealError);
      return res.status(500).json({ success: false, error: revealError.message });
    }

    res.json({ 
      success: true, 
      data: revealedCard,
      message: 'Card revealed successfully'
    });
  } catch (error) {
    console.error('Card reveal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/flexible-tarot/sessions
 * Get user's reading sessions with pagination and filtering
 * IMPORTANT: Card details are hidden from readers until client reveals
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id
    const userRole = req.profile.role;  // ✅ Fixed: role is in req.profile.role
    const { 
      status, 
      reader_id, 
      client_id, 
      limit = 20, 
      offset = 0,
      include_cards = 'false'
    } = req.query;

    let query = supabaseAdmin
      .from('reading_sessions')
      .select(`
        *,
        spread:spread_id(name, description),
        deck:deck_id(name, deck_type),
        reader:reader_id(id, name, email),
        client:client_id(id, name, email)
        ${include_cards === 'true' ? ',cards:tarot_spread_cards(*, card:card_id(*))' : ''}
      `);

    // Apply role-based filtering
    if (['monitor', 'admin', 'super_admin'].includes(userRole)) {
      // Admins can see all sessions
      if (reader_id) query = query.eq('reader_id', reader_id);
      if (client_id) query = query.eq('client_id', client_id);
    } else {
      // Others can only see their own sessions
      query = query.or(`reader_id.eq.${userId},client_id.eq.${userId}`);
    }

    // Apply filters
    if (status) query = query.eq('status', status);

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // 🔒 APPLY CARD HIDING LOGIC TO SESSIONS
    const processedSessions = sessions.map(session => {
      const isClient = session.client_id === userId;
      const isReader = session.reader_id === userId;
      const isAdmin = ['admin', 'super_admin'].includes(userRole);

      // Process cards_drawn array if it exists
      if (session.cards_drawn && Array.isArray(session.cards_drawn)) {
        session.cards_drawn = session.cards_drawn.map(card => {
          if (isClient || isAdmin || card.is_revealed) {
            // Show full card details to clients, admins, or revealed cards
            return card;
          } else if (isReader) {
            // Hide card details from readers
            return {
              ...card,
              card_details: {
                id: card.card_details?.id,
                deck_id: card.card_details?.deck_id,
                name: '🂠 Hidden Card',
                name_ar: '🂠 بطاقة مخفية',
                card_number: null,
                suit: null,
                arcana_type: null,
                image_url: null,
                meaning: 'Card details hidden until client reveal',
                meaning_ar: 'تفاصيل البطاقة مخفية حتى يكشفها العميل',
                keywords: [],
                is_hidden_from_reader: true
              }
            };
          }
          return card;
        });
      }

      return session;
    });

    res.json({ 
      success: true, 
      data: processedSessions,
      count: processedSessions.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/flexible-tarot/sessions/:id
 * Get specific session with role-based card hiding
 */
router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.profile.role;

    // Get session details
    const { data: session, error } = await supabaseAdmin
      .from('reading_sessions')
      .select(`
        *,
        spread:spread_id(name, description, positions),
        deck:deck_id(name, deck_type, card_count),
        reader:reader_id(id, name, email),
        client:client_id(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Check permissions
    const isClient = session.client_id === userId;
    const isReader = session.reader_id === userId;
    const isAdmin = ['admin', 'super_admin'].includes(userRole);

    if (!isClient && !isReader && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this session' });
    }

    // 🔒 APPLY CARD HIDING LOGIC
    if (session.cards_drawn && Array.isArray(session.cards_drawn)) {
      session.cards_drawn = session.cards_drawn.map(card => {
        if (isClient || isAdmin || card.is_revealed) {
          // Show full card details to clients, admins, or revealed cards
          return card;
        } else if (isReader) {
          // Hide card details from readers - show only layout info
          return {
            ...card,
            card_details: {
              id: card.card_details?.id,
              deck_id: card.card_details?.deck_id,
              name: '🂠 Hidden Card',
              name_ar: '🂠 بطاقة مخفية',
              card_number: null,
              suit: null,
              arcana_type: null,
              image_url: null,
              meaning: 'Card details hidden until client reveal',
              meaning_ar: 'تفاصيل البطاقة مخفية حتى يكشفها العميل',
              keywords: [],
              is_hidden_from_reader: true
            }
          };
        }
        return card;
      });
    }

    // Add card count summary for readers
    const cardsSummary = {
      total_cards: session.cards_drawn?.length || 0,
      max_cards: session.spread?.positions?.length || session.deck?.card_count || 78,
      revealed_cards: session.cards_drawn?.filter(card => card.is_revealed).length || 0,
      hidden_cards: session.cards_drawn?.filter(card => !card.is_revealed).length || 0
    };

    res.json({ 
      success: true, 
      data: {
        ...session,
        cards_summary: cardsSummary
      }
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// CARD MANAGEMENT ENDPOINTS (For Session Cards)
// =====================================================

/**
 * POST /api/flexible-tarot/sessions/cards
 * Add a card to an existing reading session
 * IMPORTANT: Cards are hidden from readers until client reveals them
 */
router.post('/sessions/cards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id
    const userRole = req.profile.role;  // ✅ Fixed: role is in req.profile.role
    const {
      session_id,
      card_id,
      position_index,
      custom_text = '',
      custom_number = '',
      is_burned = false
    } = req.body;

    // Validate required fields
    if (!session_id || !card_id || position_index === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: session_id, card_id, position_index' 
      });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Check permissions
    const canAddCard = session.reader_id === userId || 
                      session.client_id === userId ||
                      ['admin', 'super_admin'].includes(userRole);

    if (!canAddCard) {
      return res.status(403).json({ success: false, error: 'Not authorized to add cards to this session' });
    }

    // Get existing session to update cards_drawn array
    const { data: existingSession, error: fetchError } = await supabaseAdmin
      .from('reading_sessions')
      .select('cards_drawn')
      .eq('id', session_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ success: false, error: 'Session not found for card addition' });
    }

    // Get card details
    const { data: cardDetails, error: cardError } = await supabaseAdmin
      .from('tarot_cards')
      .select('*')
      .eq('id', card_id)
      .single();

    if (cardError) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    // 🔒 CARD HIDING LOGIC: Determine if user should see card details
    const isClient = session.client_id === userId;
    const isReader = session.reader_id === userId;
    const isAdmin = ['admin', 'super_admin'].includes(userRole);
    
    // Only clients and admins can see full card details
    // Readers only see placeholder data until client reveals
    let cardDataForResponse;
    
    if (isClient || isAdmin) {
      // Full card details for clients and admins
      cardDataForResponse = cardDetails;
    } else if (isReader) {
      // Hidden placeholder for readers
      cardDataForResponse = {
        id: cardDetails.id,
        deck_id: cardDetails.deck_id,
        name: '🂠 Hidden Card',
        name_ar: '🂠 بطاقة مخفية',
        card_number: null,
        suit: null,
        arcana_type: null,
        image_url: null,
        meaning: 'Card details hidden until client reveal',
        meaning_ar: 'تفاصيل البطاقة مخفية حتى يكشفها العميل',
        keywords: [],
        is_hidden_from_reader: true
      };
    }

    // Prepare new card data
    const newCard = {
      id: `card_${Date.now()}_${position_index}`,
      card_id,
      position: position_index,
      position_name: `Position ${position_index + 1}`,
      is_revealed: false,
      is_reversed: Math.random() < 0.3, // 30% chance of being reversed
      is_burned,
      custom_interpretation: custom_text,
      reader_notes: custom_number,
      added_by_role: ['admin', 'super_admin'].includes(userRole) ? 'system' : 'reader',
      added_by_user_id: userId,
      added_at: new Date().toISOString(),
      card_details: cardDetails // Store full details in database
    };

    // Update cards_drawn array in reading_sessions
    const currentCards = Array.isArray(existingSession.cards_drawn) ? existingSession.cards_drawn : [];
    const updatedCards = [...currentCards, newCard];

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('reading_sessions')
      .update({ 
        cards_drawn: updatedCards,
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error adding card to session:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // Prepare response card with appropriate data based on user role
    const responseCard = {
      ...newCard,
      card_details: cardDataForResponse // Use filtered card data
    };

    res.status(201).json({ 
      success: true, 
      data: {
        session: updatedSession,
        added_card: responseCard
      },
      message: 'Card added to session successfully'
    });
  } catch (error) {
    console.error('Card addition error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/flexible-tarot/sessions/cards/:cardId
 * Update a card in a session (burn, update text, etc.)
 */
router.patch('/sessions/cards/:cardId', authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id
    const userRole = req.profile.role;  // ✅ Fixed: role is in req.profile.role
    const updates = req.body;

    // Get card details with session info
    const { data: cardInfo, error: cardError } = await supabaseAdmin
      .from('tarot_spread_cards')
      .select(`
        *,
        session:session_id(reader_id, client_id)
      `)
      .eq('id', cardId)
      .single();

    if (cardError) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    // Check permissions
    const canUpdate = cardInfo.session.reader_id === userId || 
                     cardInfo.session.client_id === userId ||
                     ['admin', 'super_admin'].includes(userRole);

    if (!canUpdate) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this card' });
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // If burning the card, add burn metadata
    if (updates.is_burned) {
      updateData.burned_at = new Date().toISOString();
      updateData.burned_by_user_id = userId;
      updateData.burn_reason = updates.burned_reason || 'Reader decision';
    }

    const { data: updatedCard, error: updateError } = await supabaseAdmin
      .from('tarot_spread_cards')
      .update(updateData)
      .eq('id', cardId)
      .select(`
        *,
        card:card_id(*),
        session:session_id(reader_id, client_id)
      `)
      .single();

    if (updateError) {
      console.error('Error updating card:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // 🔒 APPLY CARD HIDING LOGIC TO RESPONSE
    const isClient = updatedCard.session.client_id === userId;
    const isReader = updatedCard.session.reader_id === userId;
    const isAdmin = ['admin', 'super_admin'].includes(userRole);

    let responseCard = updatedCard;
    if (isReader && !isClient && !isAdmin && !updatedCard.is_revealed) {
      // Hide card details from readers
      responseCard = {
        ...updatedCard,
        card: {
          id: updatedCard.card?.id,
          deck_id: updatedCard.card?.deck_id,
          name: '🂠 Hidden Card',
          name_ar: '🂠 بطاقة مخفية',
          card_number: null,
          suit: null,
          arcana_type: null,
          image_url: null,
          meaning: 'Card details hidden until client reveal',
          meaning_ar: 'تفاصيل البطاقة مخفية حتى يكشفها العميل',
          keywords: [],
          is_hidden_from_reader: true
        }
      };
    }

    res.json({ 
      success: true, 
      data: responseCard,
      message: 'Card updated successfully'
    });
  } catch (error) {
    console.error('Card update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/flexible-tarot/sessions/cards/:cardId
 * Remove a card from a session
 */
router.delete('/sessions/cards/:cardId', authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user.id;  // ✅ Fixed: user ID is in req.user.id
    const userRole = req.profile.role;  // ✅ Fixed: role is in req.profile.role

    // Get card details with session info
    const { data: cardInfo, error: cardError } = await supabaseAdmin
      .from('tarot_spread_cards')
      .select(`
        *,
        session:session_id(reader_id, client_id)
      `)
      .eq('id', cardId)
      .single();

    if (cardError) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    // Check permissions
    const canDelete = cardInfo.session.reader_id === userId || 
                     ['admin', 'super_admin'].includes(userRole);

    if (!canDelete) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this card' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('tarot_spread_cards')
      .delete()
      .eq('id', cardId);

    if (deleteError) {
      console.error('Error deleting card:', deleteError);
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    res.json({ 
      success: true, 
      message: 'Card removed from session successfully'
    });
  } catch (error) {
    console.error('Card deletion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// PERMISSION CHECK ENDPOINTS
// =====================================================

/**
 * GET /api/flexible-tarot/permissions/:role
 * Get permissions for a role (Admin/Super Admin only)
 */
router.get('/permissions/:role', [authenticateToken, requireRole(['admin', 'super_admin'])], async (req, res) => {
  try {
    const { role } = req.params;

    const { data: permissions, error } = await supabaseAdmin
      .from('tarot_role_permissions')
      .select('*')
      .eq('role', role)
      .order('permission_name');

    if (error) {
      console.error('Error fetching permissions:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Permissions fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/flexible-tarot/check-permission
 * Check if user has specific permission
 */
router.post('/check-permission', authenticateToken, async (req, res) => {
  try {
    const { permission_name } = req.body;
    const userRole = req.profile.role;  // ✅ Fixed: role is in req.profile.role

    if (!permission_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Permission name is required' 
      });
    }

    const { data: permission, error } = await supabaseAdmin
      .from('tarot_role_permissions')
      .select('can_perform')
      .eq('role', userRole)
      .eq('permission_name', permission_name)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking permission:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    const hasPermission = permission?.can_perform || false;

    res.json({ 
      success: true, 
      data: {
        permission_name,
        role: userRole,
        has_permission: hasPermission
      }
    });
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// MIGRATION ENDPOINTS
// =====================================================

/**
 * POST /api/flexible-tarot/fix-tarot-spreads-schema
 * Migration endpoint to add missing columns to tarot_spreads table
 */
router.post('/fix-tarot-spreads-schema', [authenticateToken, requireRole(['super_admin'])], async (req, res) => {
  try {
    console.log('🔄 [MIGRATION] Starting tarot_spreads schema fix...');

    // Check if columns already exist
    const { data: existingColumns, error: checkError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'tarot_spreads')
      .in('column_name', ['is_temporary', 'is_public', 'description', 'description_ar', 'layout_type', 'max_cards']);

    if (checkError) {
      console.error('❌ [MIGRATION] Error checking existing columns:', checkError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to check existing columns',
        details: checkError.message 
      });
    }

    const existingColumnNames = existingColumns?.map(col => col.column_name) || [];
    console.log('📊 [MIGRATION] Existing columns:', existingColumnNames);

    const requiredColumns = [
      { name: 'is_temporary', type: 'BOOLEAN DEFAULT false' },
      { name: 'is_public', type: 'BOOLEAN DEFAULT true' },
      { name: 'description', type: 'TEXT' },
      { name: 'description_ar', type: 'TEXT' },
      { name: 'layout_type', type: 'TEXT DEFAULT \'grid\'' },
      { name: 'max_cards', type: 'INTEGER DEFAULT 78' }
    ];

    const missingColumns = requiredColumns.filter(col => !existingColumnNames.includes(col.name));

    if (missingColumns.length === 0) {
      console.log('✅ [MIGRATION] All required columns already exist!');
      return res.json({ 
        success: true, 
        message: 'All required columns already exist in tarot_spreads table',
        existingColumns: existingColumnNames
      });
    }

    console.log('📝 [MIGRATION] Missing columns:', missingColumns.map(col => col.name));

    // Generate SQL statements for missing columns
    const sqlStatements = missingColumns.map(col => 
      `ALTER TABLE tarot_spreads ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`
    );

    res.json({ 
      success: true, 
      message: 'Schema fix needed - missing columns identified',
      missingColumns: missingColumns.map(col => col.name),
      existingColumns: existingColumnNames,
      sqlStatements: sqlStatements,
      instructions: 'Please execute the provided SQL statements in your Supabase SQL editor to add the missing columns, then test the flexible spread creation again.'
    });

  } catch (error) {
    console.error('❌ [MIGRATION] Schema fix failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check tarot spreads schema',
      details: error.message 
    });
  }
});

export default router; 