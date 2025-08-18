const express = require('express');
const { supabase } = require('../lib/supabase.js');
const { authenticateToken, requireRole } = require('../middleware/auth.js');

const router = express.Router();

// =====================================================
// MOROCCAN TAROT DECK ROUTES
// =====================================================

/**
 * @route GET /api/moroccan-tarot/deck
 * @desc Get all Moroccan tarot cards (48 cards)
 */
router.get('/deck', async (req, res) => {
  try {
    // Get Moroccan deck ID
    const { data: deck, error: deckError } = await supabase
      .from('tarot_decks')
      .select('id')
      .eq('deck_type', 'moroccan')
      .eq('is_default', true)
      .single();

    if (deckError || !deck) {
      return res.status(404).json({
        success: false,
        error: 'Moroccan deck not found'
      });
    }

    // Get all Moroccan cards
    const { data: cards, error: cardsError } = await supabase
      .from('moroccan_tarot_cards')
      .select('*')
      .eq('deck_id', deck.id)
      .order('card_number');

    if (cardsError) {
      return res.status(500).json({
        success: false,
        error: cardsError.message
      });
    }

    res.json({
      success: true,
      data: {
        deck,
        cards,
        total_cards: cards.length
      }
    });

  } catch (error) {
    console.error('Error fetching Moroccan deck:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/moroccan-tarot/deck/shuffle
 * @desc Get shuffled Moroccan deck for readings
 */
router.get('/deck/shuffle', async (req, res) => {
  try {
    const { count = 48 } = req.query;
    const cardCount = Math.min(parseInt(count), 48);

    // Get Moroccan deck
    const { data: deck, error: deckError } = await supabase
      .from('tarot_decks')
      .select('id')
      .eq('deck_type', 'moroccan')
      .eq('is_default', true)
      .single();

    if (deckError || !deck) {
      return res.status(404).json({
        success: false,
        error: 'Moroccan deck not found'
      });
    }

    // Get all cards and shuffle
    const { data: cards, error: cardsError } = await supabase
      .from('moroccan_tarot_cards')
      .select('*')
      .eq('deck_id', deck.id)
      .order('card_number');

    if (cardsError) {
      return res.status(500).json({
        success: false,
        error: cardsError.message
      });
    }

    // Shuffle cards using Fisher-Yates algorithm
    const shuffledCards = [...cards];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }

    // Add reversed status (30% chance for each card)
    const finalCards = shuffledCards.slice(0, cardCount).map(card => ({
      ...card,
      is_reversed: Math.random() < 0.3
    }));

    res.json({
      success: true,
      data: {
        cards: finalCards,
        total_available: cards.length,
        drawn: cardCount
      }
    });

  } catch (error) {
    console.error('Error shuffling Moroccan deck:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/moroccan-tarot/card/:id
 * @desc Get specific Moroccan card details
 */
router.get('/card/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: card, error } = await supabase
      .from('moroccan_tarot_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    res.json({
      success: true,
      data: card
    });

  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// =====================================================
// MOROCCAN SPREADS ROUTES
// =====================================================

/**
 * @route GET /api/moroccan-tarot/spreads
 * @desc Get all traditional Moroccan spreads
 */
router.get('/spreads', async (req, res) => {
  try {
    const { category, difficulty } = req.query;

    let query = supabase
      .from('tarot_spreads')
      .select(`
        *,
        deck:tarot_decks(*)
      `)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .order('difficulty_level')
      .order('card_count');

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Filter by difficulty if provided
    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty_level', difficulty);
    }

    const { data: spreads, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    // Separate system and custom spreads
    const systemSpreads = spreads.filter(s => !s.is_custom);
    const customSpreads = spreads.filter(s => s.is_custom);

    res.json({
      success: true,
      data: {
        system_spreads: systemSpreads,
        custom_spreads: customSpreads,
        total: spreads.length
      }
    });

  } catch (error) {
    console.error('Error fetching spreads:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/moroccan-tarot/spreads/traditional
 * @desc Get only traditional Moroccan spreads (system spreads)
 */
router.get('/spreads/traditional', async (req, res) => {
  try {
    const { data: spreads, error } = await supabase
      .from('tarot_spreads')
      .select(`
        *,
        deck:tarot_decks(*)
      `)
      .eq('is_custom', false)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .order('card_count');

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      data: spreads
    });

  } catch (error) {
    console.error('Error fetching traditional spreads:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/moroccan-tarot/spreads/:id
 * @desc Get specific spread details
 */
router.get('/spreads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: spread, error } = await supabase
      .from('tarot_spreads')
      .select(`
        *,
        deck:tarot_decks(*),
        creator:profiles!created_by(id, first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (error || !spread) {
      return res.status(404).json({
        success: false,
        error: 'Spread not found'
      });
    }

    res.json({
      success: true,
      data: spread
    });

  } catch (error) {
    console.error('Error fetching spread:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/moroccan-tarot/spreads
 * @desc Create custom Moroccan spread (requires authentication)
 */
router.post('/spreads', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      name_ar,
      description,
      description_ar,
      card_count,
      positions,
      difficulty_level,
      category
    } = req.body;

    // Validation
    if (!name || !description || !card_count || !positions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (card_count < 1 || card_count > 12) {
      return res.status(400).json({
        success: false,
        error: 'Card count must be between 1 and 12'
      });
    }

    if (positions.length !== card_count) {
      return res.status(400).json({
        success: false,
        error: 'Number of positions must match card count'
      });
    }

    // Get Moroccan deck ID
    const { data: deck, error: deckError } = await supabase
      .from('tarot_decks')
      .select('id')
      .eq('deck_type', 'moroccan')
      .eq('is_default', true)
      .single();

    if (deckError || !deck) {
      return res.status(404).json({
        success: false,
        error: 'Moroccan deck not found'
      });
    }

    // Create spread
    const { data: spread, error: spreadError } = await supabase
      .from('tarot_spreads')
      .insert({
        name,
        name_ar,
        description,
        description_ar,
        card_count,
        positions,
        difficulty_level: difficulty_level || 'beginner',
        category: category || 'general',
        deck_id: deck.id,
        is_custom: true,
        created_by: req.user.id,
        approval_status: 'pending'
      })
      .select()
      .single();

    if (spreadError) {
      return res.status(500).json({
        success: false,
        error: spreadError.message
      });
    }

    res.status(201).json({
      success: true,
      data: spread,
      message: 'Custom spread created successfully and is pending approval'
    });

  } catch (error) {
    console.error('Error creating spread:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route PUT /api/moroccan-tarot/spreads/:id
 * @desc Update custom spread (requires authentication and ownership)
 */
router.put('/spreads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      name_ar,
      description,
      description_ar,
      card_count,
      positions,
      difficulty_level,
      category
    } = req.body;

    // Check if spread exists and user owns it
    const { data: existingSpread, error: fetchError } = await supabase
      .from('tarot_spreads')
      .select('*')
      .eq('id', id)
      .eq('created_by', req.user.id)
      .eq('is_custom', true)
      .single();

    if (fetchError || !existingSpread) {
      return res.status(404).json({
        success: false,
        error: 'Spread not found or you do not have permission to edit it'
      });
    }

    // Validation
    if (card_count && (card_count < 1 || card_count > 12)) {
      return res.status(400).json({
        success: false,
        error: 'Card count must be between 1 and 12'
      });
    }

    if (positions && card_count && positions.length !== card_count) {
      return res.status(400).json({
        success: false,
        error: 'Number of positions must match card count'
      });
    }

    // Update spread
    const updateData = {};
    if (name) updateData.name = name;
    if (name_ar) updateData.name_ar = name_ar;
    if (description) updateData.description = description;
    if (description_ar) updateData.description_ar = description_ar;
    if (card_count) updateData.card_count = card_count;
    if (positions) updateData.positions = positions;
    if (difficulty_level) updateData.difficulty_level = difficulty_level;
    if (category) updateData.category = category;
    
    // Reset approval status if content changed
    updateData.approval_status = 'pending';
    updateData.updated_at = new Date().toISOString();

    const { data: spread, error: updateError } = await supabase
      .from('tarot_spreads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message
      });
    }

    res.json({
      success: true,
      data: spread,
      message: 'Spread updated successfully and is pending re-approval'
    });

  } catch (error) {
    console.error('Error updating spread:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route DELETE /api/moroccan-tarot/spreads/:id
 * @desc Delete custom spread (requires authentication and ownership)
 */
router.delete('/spreads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if spread exists and user owns it
    const { data: existingSpread, error: fetchError } = await supabase
      .from('tarot_spreads')
      .select('*')
      .eq('id', id)
      .eq('created_by', req.user.id)
      .eq('is_custom', true)
      .single();

    if (fetchError || !existingSpread) {
      return res.status(404).json({
        success: false,
        error: 'Spread not found or you do not have permission to delete it'
      });
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from('tarot_spreads')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        error: deleteError.message
      });
    }

    res.json({
      success: true,
      message: 'Spread deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting spread:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/moroccan-tarot/reading
 * @desc Perform a reading with Moroccan cards and selected spread
 */
router.post('/reading', authenticateToken, async (req, res) => {
  try {
    const {
      spread_id,
      question,
      question_category = 'general',
      client_id,
      booking_id
    } = req.body;

    if (!spread_id || !question) {
      return res.status(400).json({
        success: false,
        error: 'Spread ID and question are required'
      });
    }

    // Get spread details
    const { data: spread, error: spreadError } = await supabase
      .from('tarot_spreads')
      .select('*')
      .eq('id', spread_id)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .single();

    if (spreadError || !spread) {
      return res.status(404).json({
        success: false,
        error: 'Spread not found or not approved'
      });
    }

    // Get shuffled Moroccan cards
    const { data: deck, error: deckError } = await supabase
      .from('tarot_decks')
      .select('id')
      .eq('deck_type', 'moroccan')
      .eq('is_default', true)
      .single();

    if (deckError || !deck) {
      return res.status(404).json({
        success: false,
        error: 'Moroccan deck not found'
      });
    }

    const { data: allCards, error: cardsError } = await supabase
      .from('moroccan_tarot_cards')
      .select('*')
      .eq('deck_id', deck.id);

    if (cardsError) {
      return res.status(500).json({
        success: false,
        error: cardsError.message
      });
    }

    // Shuffle and draw cards
    const shuffledCards = [...allCards];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }

    const drawnCards = shuffledCards.slice(0, spread.card_count).map((card, index) => ({
      position: spread.positions[index].position,
      position_name: spread.positions[index].name,
      position_name_ar: spread.positions[index].name_ar,
      position_meaning: spread.positions[index].meaning,
      position_meaning_ar: spread.positions[index].meaning_ar,
      card,
      is_reversed: Math.random() < 0.3
    }));

    // Create reading record
    const readingData = {
      spread_id,
      question,
      question_category,
      cards_drawn: drawnCards,
      reader_id: req.user.id,
      client_id: client_id || req.user.id,
      booking_id,
      reading_type: 'human',
      status: 'completed',
      created_at: new Date().toISOString()
    };

    // If booking_id provided, save to readings table
    if (booking_id) {
      const { data: reading, error: readingError } = await supabase
        .from('tarot_readings')
        .insert(readingData)
        .select()
        .single();

      if (readingError) {
        console.warn('Could not save reading to database:', readingError);
      }
    }

    res.json({
      success: true,
      data: {
        spread,
        cards: drawnCards,
        question,
        question_category,
        reading_id: booking_id ? readingData.id : null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error performing reading:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// =====================================================
// STATISTICS AND ANALYTICS
// =====================================================

/**
 * @route GET /api/moroccan-tarot/stats
 * @desc Get Moroccan tarot system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Get deck info
    const { data: deck, error: deckError } = await supabase
      .from('tarot_decks')
      .select('*')
      .eq('deck_type', 'moroccan')
      .eq('is_default', true)
      .single();

    // Count cards
    const { count: cardCount, error: cardCountError } = await supabase
      .from('moroccan_tarot_cards')
      .select('*', { count: 'exact', head: true })
      .eq('deck_id', deck?.id);

    // Count system spreads
    const { count: systemSpreadsCount, error: systemError } = await supabase
      .from('tarot_spreads')
      .select('*', { count: 'exact', head: true })
      .eq('is_custom', false)
      .eq('approval_status', 'approved');

    // Count custom spreads
    const { count: customSpreadsCount, error: customError } = await supabase
      .from('tarot_spreads')
      .select('*', { count: 'exact', head: true })
      .eq('is_custom', true)
      .eq('approval_status', 'approved');

    // Count pending spreads
    const { count: pendingSpreadsCount, error: pendingError } = await supabase
      .from('tarot_spreads')
      .select('*', { count: 'exact', head: true })
      .eq('is_custom', true)
      .eq('approval_status', 'pending');

    res.json({
      success: true,
      data: {
        deck: deck || null,
        total_cards: cardCount || 0,
        system_spreads: systemSpreadsCount || 0,
        custom_spreads: customSpreadsCount || 0,
        pending_spreads: pendingSpreadsCount || 0,
        total_spreads: (systemSpreadsCount || 0) + (customSpreadsCount || 0)
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 
