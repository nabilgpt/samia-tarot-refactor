const express = require('express');
const { supabase } = require('../lib/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// AI DRAFT ISOLATION UTILITIES
// =====================================================

// Middleware to log all access attempts for audit
const logAccessAttempt = async (req, res, next) => {
  const { readingId } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const action = req.route.path.includes('ai-draft') ? 'view_ai_draft' : 'view_reading';
  
  if (readingId && userId) {
    try {
      await supabase.rpc('log_ai_access_attempt', {
        p_reading_id: readingId,
        p_user_id: userId,
        p_action_type: action,
        p_access_granted: true, // Will be updated if access is denied
        p_content_type: 'full_reading',
        p_ip_address: req.ip,
        p_user_agent: req.get('User-Agent')
      });
    } catch (error) {
      console.error('Failed to log access attempt:', error);
    }
  }
  
  next();
};

// Middleware to check AI draft access permissions
const checkAIDraftAccess = async (req, res, next) => {
  const { readingId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  try {
    // Check if user can access AI draft content
    const { data: canAccess, error } = await supabase
      .rpc('can_access_ai_draft_content', {
        p_user_id: userId,
        p_reading_id: readingId
      });

    if (error) throw error;

    if (!canAccess) {
      // Log unauthorized access attempt
      await supabase.rpc('log_ai_access_attempt', {
        p_reading_id: readingId,
        p_user_id: userId,
        p_action_type: 'attempt_unauthorized_access',
        p_access_granted: false,
        p_access_denied_reason: `User role ${userRole} not authorized to view AI drafts`,
        p_ip_address: req.ip,
        p_user_agent: req.get('User-Agent')
      });

      return res.status(403).json({
        error: 'Access denied: You are not authorized to view AI draft content',
        code: 'AI_DRAFT_ACCESS_DENIED'
      });
    }

    next();
  } catch (error) {
    console.error('AI draft access check failed:', error);
    res.status(500).json({ error: 'Access verification failed' });
  }
};

// =====================================================
// CLIENT ENDPOINTS (RESTRICTED ACCESS)
// =====================================================

// Get client's readings (only revealed content)
router.get('/client/readings', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const clientId = req.user.id;
    const { status, limit = 10 } = req.query;

    let query = supabase
      .from('tarot_v2_readings')
      .select(`
        id,
        deck_id,
        spread_id,
        reading_type,
        status,
        total_cards,
        total_price_usd,
        payment_status,
        client_revealed_at,
        created_at,
        tarot_decks!deck_id(name, name_ar),
        tarot_spreads!spread_id(name, name_ar)
      `)
      .eq('client_id', clientId)
      .in('status', ['ready_for_reveal', 'revealed_to_client', 'completed'])
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: readings, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: readings
    });
  } catch (error) {
    console.error('Get client readings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific reading for client (only if revealed)
router.get('/client/readings/:readingId', 
  authMiddleware, 
  requireRole(['client']), 
  logAccessAttempt,
  async (req, res) => {
    try {
      const { readingId } = req.params;
      const clientId = req.user.id;

      // Get reading with strict client visibility
      const { data: reading, error: readingError } = await supabase
        .from('tarot_v2_readings')
        .select(`
          id,
          deck_id,
          spread_id,
          reading_type,
          status,
          total_cards,
          selected_cards,
          total_price_usd,
          payment_status,
          client_revealed_at,
          session_duration_minutes,
          created_at,
          tarot_decks!deck_id(name, name_ar),
          tarot_spreads!spread_id(name, name_ar, positions)
        `)
        .eq('id', readingId)
        .eq('client_id', clientId)
        .in('status', ['revealed_to_client', 'completed'])
        .single();

      if (readingError || !reading) {
        return res.status(404).json({ 
          error: 'Reading not found or not yet available for viewing' 
        });
      }

      // Get only client-visible interpretations
      const { data: interpretations, error: interpretError } = await supabase
        .from('tarot_v2_card_interpretations')
        .select(`
          id,
          card_id,
          position_in_spread,
          position_name,
          position_meaning,
          card_orientation,
          reader_interpretation_final,
          reader_keywords,
          tarot_cards!card_id(name, name_ar, image_url, meaning, reversed_meaning)
        `)
        .eq('reading_id', readingId)
        .eq('visible_to_client', true)
        .eq('reader_approved', true)
        .order('position_in_spread');

      if (interpretError) throw interpretError;

      res.json({
        success: true,
        data: {
          ...reading,
          interpretations: interpretations || []
        }
      });
    } catch (error) {
      console.error('Get client reading error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Request new reading (clients)
router.post('/client/request-reading', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const clientId = req.user.id;
    const {
      deck_id,
      spread_id,
      reading_type = 'ai_draft',
      session_id,
      selected_cards,
      questions = []
    } = req.body;

    // Validate required fields
    if (!deck_id || !spread_id) {
      return res.status(400).json({ 
        error: 'Deck ID and Spread ID are required' 
      });
    }

    // Check if user has adults-only access (business rule)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('date_of_birth, age_verified')
      .eq('id', clientId)
      .single();

    if (profileError) throw profileError;

    // Calculate age and enforce adults-only rule
    const today = new Date();
    const birthDate = new Date(profile.date_of_birth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18 && !profile.age_verified) {
      return res.status(403).json({
        error: 'Adults only: You must be 18 or older to access tarot readings',
        code: 'ADULTS_ONLY_RESTRICTION'
      });
    }

    // Get spread info for pricing
    const { data: spread, error: spreadError } = await supabase
      .from('tarot_spreads')
      .select('card_count, base_price_usd')
      .eq('id', spread_id)
      .single();

    if (spreadError) throw spreadError;

    // Create session if not provided
    let sessionId = session_id;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      
      const { error: sessionError } = await supabase
        .from('tarot_v2_reading_sessions')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          session_type: 'single_reading',
          session_base_price_usd: spread.base_price_usd,
          session_total_price_usd: spread.base_price_usd
        });

      if (sessionError) throw sessionError;
    }

    // Create reading with AI isolation enforced
    const { data: reading, error: readingError } = await supabase
      .from('tarot_v2_readings')
      .insert({
        client_id: clientId,
        deck_id,
        spread_id,
        session_id: sessionId,
        reading_type,
        status: 'initiated',
        total_cards: spread.card_count,
        selected_cards,
        base_price_usd: spread.base_price_usd,
        total_price_usd: spread.base_price_usd,
        payment_status: 'pending',
        ai_draft_visible_to_client: false, // CRITICAL: Always false
        client_ip: req.ip,
        user_agent: req.get('User-Agent')
      })
      .select()
      .single();

    if (readingError) throw readingError;

    res.json({
      success: true,
      data: reading,
      message: 'Reading request created successfully'
    });
  } catch (error) {
    console.error('Create reading request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// READER ENDPOINTS (FULL ACCESS TO AI DRAFTS)
// =====================================================

// Get reader's assigned readings
router.get('/reader/readings', authMiddleware, requireRole(['reader']), async (req, res) => {
  try {
    const readerId = req.user.id;
    const { status, limit = 20 } = req.query;

    let query = supabase
      .from('tarot_v2_readings')
      .select(`
        id,
        client_id,
        deck_id,
        spread_id,
        reading_type,
        status,
        total_cards,
        ai_draft_generated_at,
        ai_confidence_score,
        reader_modifications_count,
        total_price_usd,
        payment_status,
        created_at,
        profiles!client_id(first_name, last_name, display_name),
        tarot_decks!deck_id(name, name_ar),
        tarot_spreads!spread_id(name, name_ar)
      `)
      .eq('reader_id', readerId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: readings, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: readings
    });
  } catch (error) {
    console.error('Get reader readings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reading with AI draft (readers only)
router.get('/reader/readings/:readingId', 
  authMiddleware, 
  requireRole(['reader', 'admin', 'super_admin']),
  checkAIDraftAccess,
  logAccessAttempt,
  async (req, res) => {
    try {
      const { readingId } = req.params;
      const userId = req.user.id;

      // Get full reading with AI content
      const { data: reading, error: readingError } = await supabase
        .from('tarot_v2_readings')
        .select(`
          *,
          profiles!client_id(first_name, last_name, display_name, email),
          tarot_decks!deck_id(name, name_ar, description),
          tarot_spreads!spread_id(name, name_ar, description, positions)
        `)
        .eq('id', readingId)
        .single();

      if (readingError || !reading) {
        return res.status(404).json({ error: 'Reading not found' });
      }

      // Get all interpretations including AI drafts
      const { data: interpretations, error: interpretError } = await supabase
        .from('tarot_v2_card_interpretations')
        .select(`
          *,
          tarot_cards!card_id(name, name_ar, image_url, meaning, reversed_meaning, keywords)
        `)
        .eq('reading_id', readingId)
        .order('position_in_spread');

      if (interpretError) throw interpretError;

      res.json({
        success: true,
        data: {
          ...reading,
          interpretations: interpretations || []
        }
      });
    } catch (error) {
      console.error('Get reader reading error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update AI draft interpretation (readers only)
router.put('/reader/readings/:readingId/interpretations/:interpretationId',
  authMiddleware,
  requireRole(['reader']),
  checkAIDraftAccess,
  async (req, res) => {
    try {
      const { readingId, interpretationId } = req.params;
      const readerId = req.user.id;
      const {
        reader_interpretation_final,
        reader_keywords,
        reader_notes,
        reader_confidence,
        reader_approved = false
      } = req.body;

      // Verify reader is assigned to this reading
      const { data: reading, error: readingError } = await supabase
        .from('tarot_v2_readings')
        .select('reader_id')
        .eq('id', readingId)
        .eq('reader_id', readerId)
        .single();

      if (readingError || !reading) {
        return res.status(404).json({ error: 'Reading not found or not assigned to you' });
      }

      // Update interpretation
      const { data: interpretation, error: updateError } = await supabase
        .from('tarot_v2_card_interpretations')
        .update({
          reader_interpretation_final,
          reader_keywords,
          reader_notes,
          reader_confidence,
          reader_approved,
          reader_modified_at: new Date().toISOString()
        })
        .eq('id', interpretationId)
        .eq('reading_id', readingId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update reading modifications count
      const { error: countError } = await supabase
        .rpc('increment', { 
          table_name: 'tarot_v2_readings',
          id: readingId,
          column_name: 'reader_modifications_count'
        });

      if (countError) console.warn('Failed to update modifications count:', countError);

      res.json({
        success: true,
        data: interpretation
      });
    } catch (error) {
      console.error('Update interpretation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Approve reading for client reveal (readers only)
router.post('/reader/readings/:readingId/approve-for-reveal',
  authMiddleware,
  requireRole(['reader']),
  async (req, res) => {
    try {
      const { readingId } = req.params;
      const readerId = req.user.id;

      // Check if reader can reveal to client
      const { data: canReveal, error: revealCheckError } = await supabase
        .rpc('can_reveal_to_client', {
          p_reading_id: readingId,
          p_requesting_user_id: readerId
        });

      if (revealCheckError) throw revealCheckError;

      if (!canReveal) {
        return res.status(400).json({
          error: 'Cannot reveal to client: Not all interpretations are approved or reading is not in correct status'
        });
      }

      // Update reading status and make interpretations visible to client
      const { error: readingUpdateError } = await supabase
        .from('tarot_v2_readings')
        .update({
          status: 'ready_for_reveal',
          reader_approved_at: new Date().toISOString(),
          client_can_view_cards: true,
          client_can_view_interpretation: true
        })
        .eq('id', readingId)
        .eq('reader_id', readerId);

      if (readingUpdateError) throw readingUpdateError;

      // Make all approved interpretations visible to client
      const { error: interpretationUpdateError } = await supabase
        .from('tarot_v2_card_interpretations')
        .update({
          visible_to_client: true,
          client_revealed_at: new Date().toISOString()
        })
        .eq('reading_id', readingId)
        .eq('reader_approved', true);

      if (interpretationUpdateError) throw interpretationUpdateError;

      // Log the reveal action
      await supabase.rpc('log_ai_access_attempt', {
        p_reading_id: readingId,
        p_user_id: readerId,
        p_action_type: 'reveal_to_client',
        p_access_granted: true,
        p_content_type: 'full_reading',
        p_ip_address: req.ip,
        p_user_agent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Reading approved and revealed to client successfully'
      });
    } catch (error) {
      console.error('Approve reading error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

// Get all readings with AI content (admin only)
router.get('/admin/readings', authMiddleware, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { status, client_id, reader_id, limit = 50 } = req.query;

    let query = supabase
      .from('tarot_v2_readings')
      .select(`
        *,
        client:profiles!client_id(first_name, last_name, display_name, email),
        reader:profiles!reader_id(first_name, last_name, display_name, email),
        tarot_decks!deck_id(name, name_ar),
        tarot_spreads!spread_id(name, name_ar)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) query = query.eq('status', status);
    if (client_id) query = query.eq('client_id', client_id);
    if (reader_id) query = query.eq('reader_id', reader_id);

    const { data: readings, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: readings
    });
  } catch (error) {
    console.error('Get admin readings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get AI isolation audit logs (admin only)
router.get('/admin/ai-isolation-audit', authMiddleware, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { reading_id, user_id, action_type, security_violations_only, limit = 100 } = req.query;

    let query = supabase
      .from('tarot_v2_ai_isolation_audit')
      .select(`
        *,
        profiles!user_id(first_name, last_name, display_name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (reading_id) query = query.eq('reading_id', reading_id);
    if (user_id) query = query.eq('user_id', user_id);
    if (action_type) query = query.eq('action_type', action_type);
    if (security_violations_only === 'true') query = query.eq('security_violation', true);

    const { data: auditLogs, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: auditLogs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;