import { supabase } from './lib/supabase.js';

export const ChatAPI = {
  // =====================================================
  // CHAT SESSIONS
  // =====================================================
  
  async getChatSession(bookingId) {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          booking:bookings(
            id,
            service:services(name, type),
            client:profiles!bookings_user_id_fkey(first_name, last_name, avatar_url),
            reader:profiles!bookings_reader_id_fkey(first_name, last_name, avatar_url)
          )
        `)
        .eq('booking_id', bookingId)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async lockChatSession(bookingId, lockedBy) {
    try {
      const { data, error } = await supabase.rpc('lock_chat_session', {
        p_booking_id: bookingId,
        p_locked_by: lockedBy
      });

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // MESSAGES
  // =====================================================

  async getMessages(bookingId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(
            id, first_name, last_name, avatar_url, role
          )
        `)
        .eq('session_id', bookingId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async sendMessage(sessionId, senderId, content, type = 'text') {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          sender_id: senderId,
          type: type,
          content: content
        })
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(
            id, first_name, last_name, avatar_url, role
          )
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async sendImageMessage(sessionId, senderId, imageFile, caption = '') {
    try {
      // Upload image to Supabase storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${sessionId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      // Create message record
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          sender_id: senderId,
          type: 'image',
          content: caption,
          file_url: publicUrl,
          file_name: imageFile.name,
          file_size: imageFile.size
        })
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(
            id, first_name, last_name, avatar_url, role
          )
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async sendVoiceMessage(sessionId, senderId, audioBlob, durationSeconds) {
    try {
      // Convert blob to file
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      // Upload audio to Supabase storage
      const fileName = `${sessionId}/voice/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, audioFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      // Create message record
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          sender_id: senderId,
          type: 'audio',
          file_url: publicUrl,
          file_name: audioFile.name,
          file_size: audioFile.size,
          duration_seconds: Math.round(durationSeconds)
        })
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(
            id, first_name, last_name, avatar_url, role
          )
        `)
        .single();

      return { success: !error, data, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async markAsRead(sessionId, userId) {
    try {
      // Update all unread messages in the session
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          read_by: supabase.raw(`array_append(read_by, '${userId}')`)
        })
        .eq('session_id', sessionId)
        .not('read_by', 'cs', `{${userId}}`);

      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // VOICE NOTE APPROVALS (Admin)
  // =====================================================

  async getPendingVoiceApprovals() {
    try {
      const { data, error } = await supabase
        .from('voice_note_approvals')
        .select(`
          *,
          message:messages(
            id, content, file_url, duration_seconds, created_at
          ),
          reader:profiles!voice_note_approvals_reader_id_fkey(
            first_name, last_name, avatar_url
          ),
          booking:bookings(
            id,
            service:services(name, type),
            client:profiles!bookings_user_id_fkey(first_name, last_name)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async approveVoiceNote(approvalId, reviewedBy, approved = true, notes = '') {
    try {
      // Update approval status
      const { data: approvalData, error: approvalError } = await supabase
        .from('voice_note_approvals')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: reviewedBy,
          review_notes: notes
        })
        .eq('id', approvalId)
        .select('message_id')
        .single();

      if (approvalError) throw approvalError;

      // Update message approval status
      const { error: messageError } = await supabase
        .from('messages')
        .update({
          is_approved: approved,
          approved_by: reviewedBy,
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalData.message_id);

      if (messageError) throw messageError;

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  subscribeToMessages(bookingId, callback) {
    return supabase
      .channel(`messages:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  },

  subscribeToChatNotifications(userId, callback) {
    return supabase
      .channel(`chat_notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  },

  subscribeToVoiceApprovals(callback) {
    return supabase
      .channel('voice_approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_note_approvals'
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  },

  // =====================================================
  // CHAT NOTIFICATIONS
  // =====================================================

  async getChatNotifications(userId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('chat_notifications')
        .select(`
          *,
          booking:bookings(
            id,
            service:services(name),
            client:profiles!bookings_user_id_fkey(first_name, last_name),
            reader:profiles!bookings_reader_id_fkey(first_name, last_name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { success: !error, data: data || [], error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async markNotificationAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async markAllNotificationsAsRead(userId) {
    try {
      const { error } = await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // TYPING INDICATORS
  // =====================================================

  async sendTypingIndicator(bookingId, userId) {
    try {
      // Insert a temporary typing notification
      const { error } = await supabase
        .from('chat_notifications')
        .insert({
          booking_id: bookingId,
          user_id: userId, // This will be the recipient
          type: 'typing',
          data: { sender_id: userId, timestamp: new Date().toISOString() }
        });

      // Auto-delete typing indicator after 3 seconds
      setTimeout(async () => {
        await supabase
          .from('chat_notifications')
          .delete()
          .eq('booking_id', bookingId)
          .eq('type', 'typing')
          .eq('user_id', userId);
      }, 3000);

      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .not('read_by', 'cs', `{${userId}}`)
        .neq('sender_id', userId);

      return { success: !error, data: count || 0, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async deleteMessage(messageId, userId) {
    try {
      // Only allow sender to delete their own messages within 5 minutes
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('sender_id, created_at, file_url')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      if (message.sender_id !== userId) {
        throw new Error('You can only delete your own messages');
      }

      const messageAge = Date.now() - new Date(message.created_at).getTime();
      if (messageAge > 5 * 60 * 1000) { // 5 minutes
        throw new Error('Messages can only be deleted within 5 minutes');
      }

      // Delete file from storage if exists
      if (message.file_url) {
        const fileName = message.file_url.split('/').pop();
        await supabase.storage
          .from('chat-files')
          .remove([fileName]);
      }

      // Delete message
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}; 