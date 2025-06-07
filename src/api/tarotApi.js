const { supabase } = require('./lib/supabase.js');

const TarotAPI = {
  // =====================================================
  // TAROT CARDS
  // =====================================================

  async getAllCards() {
    try {
      const { data, error } = await supabase
        .from('tarot_cards')
        .select('*')
        .order('arcana_type', { ascending: true })
        .order('number', { ascending: true });

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getCardById(cardId) {
    try {
      const { data, error } = await supabase
        .from('tarot_cards')
        .select('*')
        .eq('id', cardId)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getCardsBySuit(suit) {
    try {
      const { data, error } = await supabase
        .from('tarot_cards')
        .select('*')
        .eq('suit', suit)
        .order('number', { ascending: true });

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async drawRandomCards(count = 1, excludeIds = []) {
    try {
      let query = supabase
        .from('tarot_cards')
        .select('*');

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data: allCards, error } = await query;
      
      if (error) throw error;

      // Shuffle and pick random cards
      const shuffled = allCards.sort(() => 0.5 - Math.random());
      const drawnCards = shuffled.slice(0, count).map(card => ({
        ...card,
        is_reversed: Math.random() < 0.3 // 30% chance of being reversed
      }));

      return { success: true, data: drawnCards };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // TAROT SPREADS
  // =====================================================

  async getAllSpreads() {
    try {
      const { data, error } = await supabase
        .from('tarot_spreads')
        .select('*')
        .eq('is_active', true)
        .order('difficulty_level', { ascending: true })
        .order('card_count', { ascending: true });

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getSpreadById(spreadId) {
    try {
      const { data, error } = await supabase
        .from('tarot_spreads')
        .select('*')
        .eq('id', spreadId)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getSpreadsByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('tarot_spreads')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('difficulty_level', { ascending: true });

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async createSpread(spreadData) {
    try {
      const { data, error } = await supabase
        .from('tarot_spreads')
        .insert(spreadData)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // TAROT READINGS
  // =====================================================

  async createReading(readingData) {
    try {
      const { data, error } = await supabase
        .from('tarot_readings')
        .insert(readingData)
        .select(`
          *,
          spread:tarot_spreads(*),
          client:profiles!tarot_readings_client_id_fkey(first_name, last_name, avatar_url),
          reader:profiles!tarot_readings_reader_id_fkey(first_name, last_name, avatar_url)
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getReading(readingId) {
    try {
      const { data, error } = await supabase
        .from('tarot_readings')
        .select(`
          *,
          spread:tarot_spreads(*),
          client:profiles!tarot_readings_client_id_fkey(first_name, last_name, avatar_url),
          reader:profiles!tarot_readings_reader_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('id', readingId)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getUserReadings(userId, role = 'client') {
    try {
      const column = role === 'client' ? 'client_id' : 'reader_id';
      
      const { data, error } = await supabase
        .from('tarot_readings')
        .select(`
          *,
          spread:tarot_spreads(name, name_ar, category),
          client:profiles!tarot_readings_client_id_fkey(first_name, last_name, avatar_url),
          reader:profiles!tarot_readings_reader_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq(column, userId)
        .order('created_at', { ascending: false });

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async updateReading(readingId, updates) {
    try {
      const { data, error } = await supabase
        .from('tarot_readings')
        .update(updates)
        .eq('id', readingId)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async performReading(bookingId, clientId, readerId, spreadId, question, questionCategory) {
    try {
      // Get the spread
      const spreadResult = await this.getSpreadById(spreadId);
      if (!spreadResult.success) {
        throw new Error('Spread not found');
      }

      const spread = spreadResult.data;
      
      // Draw cards for the spread
      const cardsResult = await this.drawRandomCards(spread.card_count);
      if (!cardsResult.success) {
        throw new Error('Failed to draw cards');
      }

      const drawnCards = cardsResult.data;

      // Create cards_drawn array with positions
      const cardsDrawn = spread.positions.map((position, index) => ({
        position: position.position,
        position_name: position.name,
        position_meaning: position.meaning,
        card_id: drawnCards[index].id,
        card: drawnCards[index],
        is_reversed: drawnCards[index].is_reversed,
        interpretation: '' // To be filled by reader or AI
      }));

      // Create the reading
      const readingData = {
        booking_id: bookingId,
        client_id: clientId,
        reader_id: readerId,
        spread_id: spreadId,
        question,
        question_category: questionCategory,
        cards_drawn: cardsDrawn,
        status: 'in_progress',
        reading_type: readerId ? 'human' : 'ai'
      };

      const result = await this.createReading(readingData);
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // CARD INTERPRETATIONS
  // =====================================================

  async getCardInterpretations(cardId, context = null, isReversed = false) {
    try {
      let query = supabase
        .from('card_interpretations')
        .select(`
          *,
          reader:profiles!card_interpretations_reader_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('card_id', cardId)
        .eq('is_reversed', isReversed)
        .eq('is_approved', true);

      if (context) {
        query = query.eq('context', context);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async createCardInterpretation(interpretationData) {
    try {
      const { data, error } = await supabase
        .from('card_interpretations')
        .insert(interpretationData)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async approveCardInterpretation(interpretationId, approvedBy) {
    try {
      const { data, error } = await supabase
        .from('card_interpretations')
        .update({
          is_approved: true,
          approved_by: approvedBy
        })
        .eq('id', interpretationId)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // READING SESSIONS
  // =====================================================

  async getReadingSession(bookingId) {
    try {
      const { data, error } = await supabase
        .from('reading_sessions')
        .select(`
          *,
          client:profiles!reading_sessions_client_id_fkey(first_name, last_name, avatar_url),
          reader:profiles!reading_sessions_reader_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('booking_id', bookingId)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async startReadingSession(bookingId) {
    try {
      const { data, error } = await supabase
        .from('reading_sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async endReadingSession(bookingId, notes = '', followUpRecommendations = '') {
    try {
      const { data, error } = await supabase
        .from('reading_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          notes,
          follow_up_recommendations: followUpRecommendations
        })
        .eq('booking_id', bookingId)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async submitSessionFeedback(bookingId, feedback, rating) {
    try {
      const { data, error } = await supabase
        .from('reading_sessions')
        .update({
          client_feedback: feedback,
          client_rating: rating
        })
        .eq('booking_id', bookingId)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // AI READINGS
  // =====================================================

  async queueAIReading(bookingId, clientId, readingType, inputData, priority = 1) {
    try {
      const { data, error } = await supabase.rpc('queue_ai_reading', {
        p_booking_id: bookingId,
        p_client_id: clientId,
        p_reading_type: readingType,
        p_input_data: inputData,
        p_priority: priority
      });

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getAIReadingStatus(queueId) {
    try {
      const { data, error } = await supabase
        .from('ai_reading_queue')
        .select('*')
        .eq('id', queueId)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getNextAIReading() {
    try {
      const { data, error } = await supabase.rpc('get_next_ai_reading');

      return { success: !error, data: data?.[0] || null, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async completeAIReading(queueId, result, confidenceScore = null) {
    try {
      const { data, error } = await supabase
        .from('ai_reading_queue')
        .update({
          status: 'completed',
          result,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', queueId)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async failAIReading(queueId, errorMessage) {
    try {
      const { data, error } = await supabase
        .from('ai_reading_queue')
        .update({
          status: 'failed',
          error_message: errorMessage,
          retry_count: supabase.raw('retry_count + 1')
        })
        .eq('id', queueId)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getAITemplates(category = null) {
    try {
      let query = supabase
        .from('ai_reading_templates')
        .select('*')
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('name');

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  subscribeToReading(readingId, callback) {
    return supabase
      .channel(`reading:${readingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tarot_readings',
          filter: `id=eq.${readingId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  },

  subscribeToReadingSession(bookingId, callback) {
    return supabase
      .channel(`session:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reading_sessions',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  },

  subscribeToAIQueue(callback) {
    return supabase
      .channel('ai_queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_reading_queue'
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  },

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  async getReadingStatistics(userId, role = 'client') {
    try {
      const column = role === 'client' ? 'client_id' : 'reader_id';
      
      const { data, error } = await supabase
        .from('tarot_readings')
        .select('status, reading_type, question_category, created_at')
        .eq(column, userId);

      if (error) throw error;

      const stats = {
        total: data.length,
        completed: data.filter(r => r.status === 'completed').length,
        pending: data.filter(r => r.status === 'pending').length,
        in_progress: data.filter(r => r.status === 'in_progress').length,
        by_type: {
          human: data.filter(r => r.reading_type === 'human').length,
          ai: data.filter(r => r.reading_type === 'ai').length,
          hybrid: data.filter(r => r.reading_type === 'hybrid').length
        },
        by_category: data.reduce((acc, reading) => {
          const category = reading.question_category || 'general';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {}),
        recent_activity: data
          .filter(r => new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .length
      };

      return { success: true, data: stats };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  formatCardForReading(card, position, isReversed = false) {
    return {
      id: card.id,
      name: card.name,
      name_ar: card.name_ar,
      suit: card.suit,
      arcana_type: card.arcana_type,
      number: card.number,
      position,
      is_reversed: isReversed,
      keywords: isReversed ? card.keywords_reversed : card.keywords,
      meaning: isReversed ? card.reversed_meaning : card.upright_meaning,
      meaning_ar: isReversed ? card.reversed_meaning_ar : card.upright_meaning_ar,
      image_url: isReversed ? card.image_reversed_url || card.image_url : card.image_url,
      element: card.element,
      astrological_sign: card.astrological_sign,
      numerology_value: card.numerology_value
    };
  },

  generateReadingInsights(cardsDrawn, spread) {
    // Basic pattern analysis
    const insights = {
      dominant_suit: null,
      dominant_element: null,
      major_arcana_count: 0,
      reversed_count: 0,
      numerology_sum: 0,
      energy_level: 'balanced',
      themes: []
    };

    const suits = {};
    const elements = {};
    
    cardsDrawn.forEach(cardData => {
      const card = cardData.card;
      
      // Count suits
      if (card.suit) {
        suits[card.suit] = (suits[card.suit] || 0) + 1;
      }
      
      // Count elements
      if (card.element) {
        elements[card.element] = (elements[card.element] || 0) + 1;
      }
      
      // Count major arcana
      if (card.arcana_type === 'major') {
        insights.major_arcana_count++;
      }
      
      // Count reversed cards
      if (cardData.is_reversed) {
        insights.reversed_count++;
      }
      
      // Sum numerology values
      if (card.numerology_value !== null) {
        insights.numerology_sum += card.numerology_value;
      }
    });

    // Find dominant suit
    const maxSuit = Object.keys(suits).reduce((a, b) => suits[a] > suits[b] ? a : b, null);
    if (maxSuit && suits[maxSuit] > 1) {
      insights.dominant_suit = maxSuit;
    }

    // Find dominant element
    const maxElement = Object.keys(elements).reduce((a, b) => elements[a] > elements[b] ? a : b, null);
    if (maxElement && elements[maxElement] > 1) {
      insights.dominant_element = maxElement;
    }

    // Determine energy level
    if (insights.major_arcana_count > cardsDrawn.length / 2) {
      insights.energy_level = 'high';
    } else if (insights.reversed_count > cardsDrawn.length / 2) {
      insights.energy_level = 'blocked';
    }

    // Generate themes based on patterns
    if (insights.dominant_suit === 'cups') {
      insights.themes.push('emotions', 'relationships', 'intuition');
    } else if (insights.dominant_suit === 'wands') {
      insights.themes.push('passion', 'creativity', 'action');
    } else if (insights.dominant_suit === 'swords') {
      insights.themes.push('thoughts', 'communication', 'challenges');
    } else if (insights.dominant_suit === 'pentacles') {
      insights.themes.push('material', 'practical', 'earthly');
    }

    if (insights.major_arcana_count > 2) {
      insights.themes.push('spiritual_journey', 'life_lessons', 'destiny');
    }

    return insights;
  }
};

module.exports = { TarotAPI }; 