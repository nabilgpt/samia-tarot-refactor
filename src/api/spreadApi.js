import { supabase } from '../lib/supabase.js';

export const SpreadAPI = {
  // =====================================================
  // TAROT DECKS MANAGEMENT
  // =====================================================

  async getAllDecks(includeInactive = false) {
    try {
      let query = supabase
        .from('tarot_decks')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getDeckById(deckId) {
    try {
      const { data, error } = await supabase
        .from('tarot_decks')
        .select('*')
        .eq('id', deckId)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getDefaultDeck() {
    try {
      const { data, error } = await supabase
        .from('tarot_decks')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // SPREAD MANAGEMENT (READERS)
  // =====================================================

  async getReaderSpreads(readerId, includeSystemSpreads = true) {
    try {
      let query = supabase
        .from('tarot_spreads')
        .select(`
          *,
          deck:tarot_decks(*),
          service_assignments:spread_service_assignments(
            service_id,
            is_gift,
            assignment_order,
            service:services(id, name, type)
          )
        `)
        .order('created_at', { ascending: false });

      if (includeSystemSpreads) {
        query = query.or(`created_by.eq.${readerId},is_custom.eq.false`);
      } else {
        query = query.eq('created_by', readerId);
      }

      const { data, error } = await query;
      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async createCustomSpread(spreadData) {
    try {
      const { data, error } = await supabase
        .from('tarot_spreads')
        .insert({
          ...spreadData,
          is_custom: true,
          approval_status: 'pending'
        })
        .select(`
          *,
          deck:tarot_decks(*)
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async updateSpread(spreadId, updates, userId) {
    try {
      // Check if user can update this spread
      const { data: spread } = await supabase
        .from('tarot_spreads')
        .select('created_by, approval_status')
        .eq('id', spreadId)
        .single();

      if (!spread || spread.created_by !== userId) {
        return { success: false, error: 'Unauthorized to update this spread' };
      }

      // If spread was approved, reset to pending for re-approval
      if (spread.approval_status === 'approved') {
        updates.approval_status = 'pending';
        updates.approved_by = null;
        updates.approved_at = null;
      }

      const { data, error } = await supabase
        .from('tarot_spreads')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', spreadId)
        .select(`
          *,
          deck:tarot_decks(*)
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async deleteSpread(spreadId, userId) {
    try {
      // Check if user can delete this spread
      const { data: spread } = await supabase
        .from('tarot_spreads')
        .select('created_by, is_custom')
        .eq('id', spreadId)
        .single();

      if (!spread || spread.created_by !== userId || !spread.is_custom) {
        return { success: false, error: 'Unauthorized to delete this spread' };
      }

      const { error } = await supabase
        .from('tarot_spreads')
        .delete()
        .eq('id', spreadId);

      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // SPREAD SERVICE ASSIGNMENTS
  // =====================================================

  async assignSpreadToService(spreadId, serviceId, readerId, isGift = false, order = 1) {
    try {
      const { data, error } = await supabase
        .from('spread_service_assignments')
        .upsert({
          spread_id: spreadId,
          service_id: serviceId,
          reader_id: readerId,
          is_gift: isGift,
          assignment_order: order,
          is_active: true
        })
        .select(`
          *,
          spread:tarot_spreads(name, name_ar),
          service:services(name, type)
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async removeSpreadFromService(spreadId, serviceId, readerId) {
    try {
      const { error } = await supabase
        .from('spread_service_assignments')
        .delete()
        .match({
          spread_id: spreadId,
          service_id: serviceId,
          reader_id: readerId
        });

      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getSpreadAssignments(readerId) {
    try {
      const { data, error } = await supabase
        .from('spread_service_assignments')
        .select(`
          *,
          spread:tarot_spreads(
            id, name, name_ar, description, card_count, 
            difficulty_level, category, approval_status
          ),
          service:services(id, name, type, price)
        `)
        .eq('reader_id', readerId)
        .eq('is_active', true)
        .order('assignment_order');

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // CLIENT SPREAD SELECTION
  // =====================================================

  async getAvailableSpreadsForBooking(serviceId, readerId = null) {
    try {
      const { data, error } = await supabase.rpc('get_available_spreads_for_service', {
        p_service_id: serviceId,
        p_reader_id: readerId
      });

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async selectSpreadForBooking(bookingId, clientId, spreadId) {
    try {
      const { data, error } = await supabase
        .from('client_spread_selections')
        .upsert({
          booking_id: bookingId,
          client_id: clientId,
          spread_id: spreadId,
          selected_at: new Date().toISOString()
        })
        .select(`
          *,
          spread:tarot_spreads(
            id, name, name_ar, description, description_ar,
            card_count, positions, difficulty_level, category,
            deck:tarot_decks(name, name_ar, deck_type)
          )
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async updateSpreadSelection(selectionId, updates) {
    try {
      const { data, error } = await supabase
        .from('client_spread_selections')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectionId)
        .select(`
          *,
          spread:tarot_spreads(
            id, name, name_ar, description, description_ar,
            card_count, positions, difficulty_level, category
          )
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getClientSpreadSelection(bookingId) {
    try {
      const { data, error } = await supabase
        .from('client_spread_selections')
        .select(`
          *,
          spread:tarot_spreads(
            id, name, name_ar, description, description_ar,
            card_count, positions, difficulty_level, category,
            deck:tarot_decks(name, name_ar, deck_type)
          )
        `)
        .eq('booking_id', bookingId)
        .order('selected_at', { ascending: false })
        .limit(1)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // ADMIN APPROVAL WORKFLOW
  // =====================================================

  async getPendingSpreads() {
    try {
      const { data, error } = await supabase
        .from('tarot_spreads')
        .select(`
          *,
          deck:tarot_decks(name, name_ar),
          creator:profiles!tarot_spreads_created_by_fkey(first_name, last_name, email)
        `)
        .eq('approval_status', 'pending')
        .eq('is_custom', true)
        .order('created_at', { ascending: true });

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async approveSpread(spreadId, adminId, approvalNotes = '') {
    try {
      const { data, error } = await supabase
        .from('tarot_spreads')
        .update({
          approval_status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', spreadId)
        .select(`
          *,
          deck:tarot_decks(name, name_ar),
          creator:profiles!tarot_spreads_created_by_fkey(first_name, last_name, email)
        `)
        .single();

      // Log the approval action
      if (!error && approvalNotes) {
        await supabase
          .from('spread_approval_logs')
          .insert({
            spread_id: spreadId,
            action: 'approved',
            performed_by: adminId,
            new_status: 'approved',
            notes: approvalNotes
          });
      }

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async rejectSpread(spreadId, adminId, rejectionReason) {
    try {
      const { data, error } = await supabase
        .from('tarot_spreads')
        .update({
          approval_status: 'rejected',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', spreadId)
        .select(`
          *,
          deck:tarot_decks(name, name_ar),
          creator:profiles!tarot_spreads_created_by_fkey(first_name, last_name, email)
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getSpreadApprovalLogs(spreadId = null, adminId = null) {
    try {
      let query = supabase
        .from('spread_approval_logs')
        .select(`
          *,
          spread:tarot_spreads(name, name_ar),
          performer:profiles!spread_approval_logs_performed_by_fkey(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (spreadId) {
        query = query.eq('spread_id', spreadId);
      }

      if (adminId) {
        query = query.eq('performed_by', adminId);
      }

      const { data, error } = await query;
      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  async getSpreadNotifications(userId, isAdmin = false) {
    try {
      let query = supabase
        .from('reader_spread_notifications')
        .select(`
          *,
          spread:tarot_spreads(name, name_ar)
        `)
        .order('created_at', { ascending: false });

      if (isAdmin) {
        query = query.eq('admin_id', userId);
      } else {
        query = query.eq('reader_id', userId);
      }

      const { data, error } = await query;
      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async markNotificationAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from('reader_spread_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getUnreadNotificationCount(userId, isAdmin = false) {
    try {
      let query = supabase
        .from('reader_spread_notifications')
        .select('id', { count: 'exact' })
        .eq('is_read', false);

      if (isAdmin) {
        query = query.eq('admin_id', userId);
      } else {
        query = query.eq('reader_id', userId);
      }

      const { count, error } = await query;
      return { success: !error, data: count || 0, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // VALIDATION HELPERS
  // =====================================================

  async canReaderUseSpread(readerId, spreadId, serviceId = null) {
    try {
      const { data, error } = await supabase.rpc('can_reader_use_spread', {
        p_reader_id: readerId,
        p_spread_id: spreadId,
        p_service_id: serviceId
      });

      return { success: !error, data: data || false, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  validateSpreadData(spreadData) {
    const errors = [];

    if (!spreadData.name?.trim()) {
      errors.push('Spread name is required');
    }

    if (!spreadData.description?.trim()) {
      errors.push('Spread description is required');
    }

    if (!spreadData.card_count || spreadData.card_count < 1 || spreadData.card_count > 20) {
      errors.push('Card count must be between 1 and 20');
    }

    if (!spreadData.positions || !Array.isArray(spreadData.positions)) {
      errors.push('Spread positions are required');
    } else {
      if (spreadData.positions.length !== spreadData.card_count) {
        errors.push('Number of positions must match card count');
      }

      spreadData.positions.forEach((position, index) => {
        const positionNum = index + 1;

        if (!position.name || !position.name.trim()) {
          errors.push(`Position ${positionNum}: English name is required`);
        }

        if (!position.name_ar || !position.name_ar.trim()) {
          errors.push(`Position ${positionNum}: Arabic name is required`);
        }

        if (!position.meaning || !position.meaning.trim()) {
          errors.push(`Position ${positionNum}: English meaning is required`);
        }

        if (!position.meaning_ar || !position.meaning_ar.trim()) {
          errors.push(`Position ${positionNum}: Arabic meaning is required`);
        }

        if (typeof position.x !== 'number' || position.x < 0 || position.x > 100) {
          errors.push(`Position ${positionNum}: Invalid X coordinate (must be 0-100)`);
        }

        if (typeof position.y !== 'number' || position.y < 0 || position.y > 100) {
          errors.push(`Position ${positionNum}: Invalid Y coordinate (must be 0-100)`);
        }
      });
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(spreadData.difficulty_level)) {
      errors.push('Invalid difficulty level');
    }

    if (!['love', 'career', 'general', 'spiritual', 'health', 'finance'].includes(spreadData.category)) {
      errors.push('Invalid category');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  async clearBookingSession(bookingId) {
    try {
      const { error } = await supabase
        .from('client_spread_selections')
        .delete()
        .eq('booking_id', bookingId);

      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getBookingSession(bookingId) {
    try {
      const { data, error } = await supabase
        .from('client_spread_selections')
        .select(`
          *,
          spread:tarot_spreads(
            id,
            name,
            name_ar,
            description,
            description_ar,
            card_count,
            positions,
            category,
            difficulty_level,
            deck:tarot_decks(*)
          )
        `)
        .eq('booking_id', bookingId)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // SPREAD TEMPLATES AND PRESETS
  // =====================================================

  async getSystemSpreads(category = null, difficulty = null) {
    try {
      let query = supabase
        .from('tarot_spreads')
        .select(`
          *,
          deck:tarot_decks(*)
        `)
        .eq('is_custom', false)
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      if (difficulty) {
        query = query.eq('difficulty_level', difficulty);
      }

      const { data, error } = await query;
      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async createSpreadFromTemplate(templateId, readerData) {
    try {
      // First get the template
      const { data: template, error: fetchError } = await supabase
        .from('tarot_spreads')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      // Create new spread based on template
      const { data, error } = await supabase
        .from('tarot_spreads')
        .insert({
          ...template,
          id: undefined, // Let it generate new ID
          name: readerData.name || template.name,
          name_ar: readerData.name_ar || template.name_ar,
          description: readerData.description || template.description,
          description_ar: readerData.description_ar || template.description_ar,
          is_custom: true,
          created_by: readerData.readerId,
          approval_status: 'pending',
          approved_by: null,
          approved_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          deck:tarot_decks(*)
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // UTILITIES AND HELPERS
  // =====================================================

  generateSpreadPositions(cardCount, layout = 'grid') {
    const positions = [];

              switch (layout) {
       case 'grid': {
         const cols = Math.ceil(Math.sqrt(cardCount));
         const rows = Math.ceil(cardCount / cols);
         
         for (let i = 0; i < cardCount; i++) {
           const row = Math.floor(i / cols);
           const col = i % cols;
           positions.push({
             position: i + 1,
             name: `Position ${i + 1}`,
             name_ar: `الموضع ${i + 1}`,
             meaning: `Meaning for position ${i + 1}`,
             meaning_ar: `معنى الموضع ${i + 1}`,
             x: (col / Math.max(cols - 1, 1)) * 80 + 10,
             y: (row / Math.max(rows - 1, 1)) * 80 + 10
           });
         }
         break;
       }

       case 'line': {
         for (let i = 0; i < cardCount; i++) {
           positions.push({
             position: i + 1,
             name: `Position ${i + 1}`,
             name_ar: `الموضع ${i + 1}`,
             meaning: `Meaning for position ${i + 1}`,
             meaning_ar: `معنى الموضع ${i + 1}`,
             x: (i / Math.max(cardCount - 1, 1)) * 80 + 10,
             y: 50
           });
         }
         break;
       }

       case 'circle': {
         const radius = 35;
         const centerX = 50;
         const centerY = 50;
         
         for (let i = 0; i < cardCount; i++) {
           const angle = (i / cardCount) * 2 * Math.PI - Math.PI / 2; // Start from top
           const x = centerX + radius * Math.cos(angle);
           const y = centerY + radius * Math.sin(angle);
           
           positions.push({
             position: i + 1,
             name: `Position ${i + 1}`,
             name_ar: `الموضع ${i + 1}`,
             meaning: `Meaning for position ${i + 1}`,
             meaning_ar: `معنى الموضع ${i + 1}`,
             x: Math.max(5, Math.min(95, x)),
             y: Math.max(5, Math.min(95, y))
           });
         }
         break;
       }

       case 'cross': {
         if (cardCount === 5) {
           positions.push(
             { position: 1, name: 'Past', name_ar: 'الماضي', meaning: 'Past influences', meaning_ar: 'تأثيرات الماضي', x: 20, y: 50 },
             { position: 2, name: 'Present', name_ar: 'الحاضر', meaning: 'Current situation', meaning_ar: 'الوضع الحالي', x: 50, y: 50 },
             { position: 3, name: 'Future', name_ar: 'المستقبل', meaning: 'Future outcome', meaning_ar: 'النتيجة المستقبلية', x: 80, y: 50 },
             { position: 4, name: 'Above', name_ar: 'الأعلى', meaning: 'Higher influences', meaning_ar: 'التأثيرات العليا', x: 50, y: 20 },
             { position: 5, name: 'Below', name_ar: 'الأسفل', meaning: 'Foundation', meaning_ar: 'الأساس', x: 50, y: 80 }
           );
         } else {
           // Fallback to grid for other counts
           return this.generateSpreadPositions(cardCount, 'grid');
         }
         break;
       }

       default:
         return this.generateSpreadPositions(cardCount, 'grid');
     }

    return positions;
  },

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  subscribeToSpreadApprovals(userId, callback) {
    return supabase
      .channel('spread_approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reader_spread_notifications',
          filter: `admin_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  subscribeToReaderNotifications(readerId, callback) {
    return supabase
      .channel('reader_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reader_spread_notifications',
          filter: `reader_id=eq.${readerId}`
        },
        callback
      )
      .subscribe();
  },

  subscribeToSpreadChanges(readerId, callback) {
    return supabase
      .channel('spread_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarot_spreads',
          filter: `created_by=eq.${readerId}`
        },
        callback
      )
      .subscribe();
  }
}; 