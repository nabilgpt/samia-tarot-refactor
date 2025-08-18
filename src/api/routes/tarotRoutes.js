// =====================================================
// SAMIA TAROT - TAROT READING ROUTES
// MANUAL CARD OPENING, AI CONTENT SEPARATION, AUDIT LOGGING
// =====================================================

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { aiContentFilter, readingAIFilter } from '../middleware/aiContentFilter.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Apply AI content filtering to all tarot routes
router.use(readingAIFilter);

// =====================================================
// READING SESSION MANAGEMENT
// =====================================================

/**
 * POST /api/tarot/sessions/start
 * Start a new tarot reading session
 */
router.post('/sessions/start', authenticateToken, async (req, res) => {
  try {
    const {
      question,
      question_category,
      spread_type,
      spread_positions,
      client_id,
      reader_id,
      language = 'en'
    } = req.body;

    const user = req.user;
    
    // Validate required fields
    if (!question || !question_category || !spread_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: question, question_category, spread_type'
      });
    }

    // Create reading session
    const sessionId = uuidv4();
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .insert({
        id: sessionId,
        user_id: client_id || user.id,
        reader_id: reader_id,
        question,
        question_category,
        spread_type,
        spread_positions: JSON.stringify(spread_positions),
        language,
        status: 'active',
        cards_opened_count: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create reading session:', sessionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create reading session'
      });
    }

    // Log session creation
    await logReadingAudit(sessionId, user.id, 'session_created', {
      question_category,
      spread_type,
      language
    });

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        ...session
      }
    });

  } catch (error) {
    console.error('Error starting reading session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/tarot/sessions/:sessionId
 * Get reading session details
 */
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user;

    // Get session with access control
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('*')
      .eq('id', sessionId)
      .or(`user_id.eq.${user.id},reader_id.eq.${user.id}`)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or access denied'
      });
    }

    // Get opened cards
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('reading_session_cards')
      .select('*')
      .eq('session_id', sessionId)
      .order('card_index');

    if (cardsError) {
      console.error('Failed to get session cards:', cardsError);
    }

    // Parse spread positions
    let spreadPositions = [];
    try {
      spreadPositions = JSON.parse(session.spread_positions || '[]');
    } catch (e) {
      console.error('Failed to parse spread positions:', e);
    }

    res.json({
      success: true,
      data: {
        ...session,
        spread_positions: spreadPositions,
        cards_drawn: cards || []
      }
    });

  } catch (error) {
    console.error('Error getting reading session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/tarot/sessions/:sessionId
 * Update reading session
 */
router.put('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user;
    const updateData = req.body;

    // Verify session access (must be reader or session owner)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('user_id, reader_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const hasAccess = session.user_id === user.id || session.reader_id === user.id;
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('reading_sessions')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update session:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update session'
      });
    }

    // Log session update
    await logReadingAudit(sessionId, user.id, 'session_updated', {
      updated_fields: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: updatedSession
    });

  } catch (error) {
    console.error('Error updating reading session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// =====================================================
// MANUAL CARD OPENING
// =====================================================

/**
 * POST /api/tarot/sessions/:sessionId/open-card
 * Open a specific card in sequence
 */
router.post('/sessions/:sessionId/open-card', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { card_index, position, timestamp, force_sequential = true } = req.body;
    const user = req.user;

    // Verify session access
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id) // Only session owner can open cards
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or access denied'
      });
    }

    // Check if session is still active
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Session is not active'
      });
    }

    // Validate sequential opening if enforced
    if (force_sequential) {
      const expectedIndex = session.cards_opened_count || 0;
      if (card_index !== expectedIndex) {
        return res.status(400).json({
          success: false,
          error: `Cards must be opened in sequence. Expected card ${expectedIndex}, got ${card_index}`
        });
      }
    }

    // Check if card already opened
    const { data: existingCard } = await supabaseAdmin
      .from('reading_session_cards')
      .select('id')
      .eq('session_id', sessionId)
      .eq('card_index', card_index)
      .single();

    if (existingCard) {
      return res.status(400).json({
        success: false,
        error: 'Card already opened'
      });
    }

    // Get random card from deck
    const { data: randomCard, error: cardError } = await supabaseAdmin
      .rpc('get_random_tarot_card');

    if (cardError || !randomCard) {
      console.error('Failed to get random card:', cardError);
      return res.status(500).json({
        success: false,
        error: 'Failed to draw card'
      });
    }

    // Determine if card is reversed (30% chance)
    const isReversed = Math.random() < 0.3;

    // Save opened card
    const { data: sessionCard, error: saveError } = await supabaseAdmin
      .from('reading_session_cards')
      .insert({
        id: uuidv4(),
        session_id: sessionId,
        card_id: randomCard.id,
        card_index,
        position_name: position?.name || `Card ${card_index + 1}`,
        is_reversed: isReversed,
        opened_at: timestamp || new Date().toISOString()
      })
      .select(`
        *,
        tarot_cards (
          id,
          name,
          suit,
          number,
          arcana_type,
          image_url,
          image_reversed_url,
          upright_meaning,
          reversed_meaning,
          keywords,
          element,
          zodiac_sign,
          planet
        )
      `)
      .single();

    if (saveError) {
      console.error('Failed to save opened card:', saveError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save opened card'
      });
    }

    // Update session cards count
    await supabaseAdmin
      .from('reading_sessions')
      .update({
        cards_opened_count: card_index + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Prepare card data for response
    const cardData = {
      ...sessionCard.tarot_cards,
      is_reversed: isReversed,
      position_name: sessionCard.position_name,
      card_index: card_index,
      opened_at: sessionCard.opened_at
    };

    // Log card opening
    await logReadingAudit(sessionId, user.id, 'card_opened', {
      card_index,
      card_id: randomCard.id,
      card_name: randomCard.name,
      is_reversed: isReversed,
      position_name: sessionCard.position_name
    });

    res.json({
      success: true,
      data: {
        card: cardData,
        nextCardIndex: card_index + 1,
        totalCards: JSON.parse(session.spread_positions || '[]').length
      }
    });

  } catch (error) {
    console.error('Error opening card:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/tarot/sessions/:sessionId/validate-sequence
 * Validate card opening sequence
 */
router.post('/sessions/:sessionId/validate-sequence', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { card_index } = req.body;
    const user = req.user;

    // Get session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('cards_opened_count, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const expectedIndex = session.cards_opened_count || 0;
    const isValid = card_index === expectedIndex;

    res.json({
      success: true,
      data: {
        is_valid: isValid,
        expected_index: expectedIndex,
        provided_index: card_index,
        can_open: isValid
      }
    });

  } catch (error) {
    console.error('Error validating sequence:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// =====================================================
// AI CONTENT GENERATION (READER ONLY)
// =====================================================

/**
 * POST /api/tarot/ai-drafts/card-interpretation
 * Generate AI interpretation for a specific card (READER ONLY)
 */
router.post('/ai-drafts/card-interpretation', [authenticateToken, requireRole(['reader', 'admin', 'super_admin'])], async (req, res) => {
  try {
    const {
      session_id,
      card,
      position,
      question,
      context
    } = req.body;

    const user = req.user;

    // Verify reader has access to this session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('reader_id, question, question_category')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.reader_id !== user.id && !['admin', 'super_admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Not assigned reader'
      });
    }

    // Generate AI interpretation (mock implementation)
    const aiInterpretation = await generateCardAIInterpretation({
      card,
      position,
      question: question || session.question,
      context: context || session.question_category
    });

    // Log AI content generation
    await logReadingAudit(session_id, user.id, 'ai_interpretation_generated', {
      card_id: card.id,
      position,
      confidence_score: aiInterpretation.confidence_score
    });

    res.json({
      success: true,
      data: {
        interpretation: aiInterpretation.interpretation,
        confidence_score: aiInterpretation.confidence_score,
        model_version: 'gpt-4-turbo',
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating card interpretation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/tarot/ai-drafts/full-reading
 * Generate comprehensive AI reading analysis (READER ONLY)
 */
router.post('/ai-drafts/full-reading', [authenticateToken, requireRole(['reader', 'admin', 'super_admin'])], async (req, res) => {
  try {
    const {
      session_id,
      cards,
      spread,
      question,
      category
    } = req.body;

    const user = req.user;

    // Verify reader access
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('reader_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.reader_id !== user.id && !['admin', 'super_admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Generate comprehensive AI analysis
    const aiAnalysis = await generateFullReadingAI({
      cards,
      spread,
      question,
      category
    });

    // Log comprehensive analysis generation
    await logReadingAudit(session_id, user.id, 'comprehensive_ai_analysis_generated', {
      cards_count: cards.length,
      confidence_score: aiAnalysis.confidence_score
    });

    res.json({
      success: true,
      data: aiAnalysis
    });

  } catch (error) {
    console.error('Error generating full reading:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/tarot/ai-drafts/:sessionId
 * Get AI drafts for session (READER ONLY)
 */
router.get('/ai-drafts/:sessionId', [authenticateToken, requireRole(['reader', 'admin', 'super_admin'])], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user;

    // Verify reader access
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('reading_sessions')
      .select('reader_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.reader_id !== user.id && !['admin', 'super_admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get AI interpretations
    const { data: aiInterpretations, error: aiError } = await supabaseAdmin
      .from('ai_reading_interpretations')
      .select('*')
      .eq('session_id', sessionId)
      .order('generated_at');

    if (aiError) {
      console.error('Failed to get AI interpretations:', aiError);
      return res.status(500).json({
        success: false,
        error: 'Failed to get AI interpretations'
      });
    }

    // Log AI content access
    await logReadingAudit(sessionId, user.id, 'ai_drafts_accessed', {
      drafts_count: aiInterpretations.length
    });

    res.json({
      success: true,
      data: aiInterpretations,
      warnings: [
        'AI content is for reader reference only',
        'Do not share with clients'
      ]
    });

  } catch (error) {
    console.error('Error getting AI drafts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Log reading audit event
 */
async function logReadingAudit(sessionId, userId, action, metadata = {}) {
  try {
    await supabaseAdmin
      .from('ai_reading_audit_log')
      .insert({
        id: uuidv4(),
        session_id: sessionId,
        user_id: userId,
        action,
        timestamp: new Date().toISOString(),
        metadata: JSON.stringify(metadata)
      });
  } catch (error) {
    console.error('Failed to log reading audit:', error);
  }
}

/**
 * Mock AI interpretation generation
 */
async function generateCardAIInterpretation({ card, position, question, context }) {
  const interpretations = [
    `The ${card.name} in the ${position} position suggests a time of ${card.keywords?.[0] || 'transformation'}. This card often represents ${card.upright_meaning || 'new beginnings'} and indicates that ${question ? 'your question about ' + question.toLowerCase() : 'the situation'} may require ${card.keywords?.[1] || 'patience'}.`,
    `In this ${position} position, the ${card.name} reveals ${card.upright_meaning || 'important insights'}. The energy of this card suggests ${card.keywords?.[0] || 'growth'} and ${card.keywords?.[1] || 'change'} are coming into your life.`,
    `The appearance of ${card.name} here indicates ${card.upright_meaning || 'significant developments'}. This card's presence in the ${position} position often means ${card.keywords?.[0] || 'opportunity'} is approaching.`
  ];

  const randomInterpretation = interpretations[Math.floor(Math.random() * interpretations.length)];

  return {
    interpretation: randomInterpretation,
    confidence_score: 0.75 + Math.random() * 0.2
  };
}

/**
 * Mock comprehensive reading generation
 */
async function generateFullReadingAI({ cards, spread, question, category }) {
  const themes = ['transformation', 'growth', 'challenges', 'opportunities', 'relationships', 'success'];
  const guidance = [
    'Trust your intuition as you move forward',
    'Be open to new opportunities that present themselves',
    'Focus on personal growth and self-reflection',
    'Maintain balance between action and patience',
    'Embrace change as a catalyst for positive transformation'
  ];

  return {
    overall_interpretation: `This ${spread?.name || 'reading'} reveals a powerful message about ${category || 'your current situation'}. The cards suggest a journey of ${themes[Math.floor(Math.random() * themes.length)]} that will require both ${themes[Math.floor(Math.random() * themes.length)]} and ${themes[Math.floor(Math.random() * themes.length)]}.`,
    key_themes: themes.slice(0, 3),
    card_relationships: `The ${cards[0]?.name || 'first card'} and ${cards[cards.length - 1]?.name || 'final card'} create a powerful narrative arc that speaks to your question.`,
    guidance: guidance[Math.floor(Math.random() * guidance.length)],
    confidence_score: 0.8 + Math.random() * 0.15
  };
}

export default router; 