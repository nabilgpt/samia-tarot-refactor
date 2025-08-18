// =====================================================
// SAMIA TAROT - WORKING HOURS API
// API Layer for Reader Schedule Management with Approval Workflow
// =====================================================

import { supabase } from './lib/supabase.js';

export const WorkingHoursAPI = {
  // =====================================================
  // READER SCHEDULE MANAGEMENT
  // =====================================================

  /**
   * Get reader's current schedule
   */
  async getMySchedule(filters = {}) {
    try {
      let query = supabase
        .from('my_schedule')
        .select('*');

      // Apply filters
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      if (filters.period) {
        // period can be 'past', 'today', 'future'
        const today = new Date().toISOString().split('T')[0];
        
        switch (filters.period) {
          case 'past':
            query = query.lt('date', today);
            break;
          case 'today':
            query = query.eq('date', today);
            break;
          case 'future':
            query = query.gt('date', today);
            break;
        }
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('date', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching schedule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get available booking slots for clients
   */
  async getAvailableSlots(readerId = null, startDate = null, endDate = null) {
    try {
      const { data, error } = await supabase.rpc('get_available_booking_slots', {
        p_reader_id: readerId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // =====================================================
  // WORKING HOURS REQUESTS MANAGEMENT
  // =====================================================

  /**
   * Submit a working hours change request
   */
  async submitRequest(requestData) {
    try {
      const {
        action_type,
        target_schedule_id = null,
        requested_changes,
        old_values = null,
        request_notes = null
      } = requestData;

      // Validate required fields
      if (!action_type || !requested_changes) {
        throw new Error('Action type and requested changes are required');
      }

      const { data, error } = await supabase.rpc('submit_working_hours_request', {
        p_action_type: action_type,
        p_target_schedule_id: target_schedule_id,
        p_requested_changes: requested_changes,
        p_old_values: old_values,
        p_request_notes: request_notes
      });

      if (error) throw error;

      return {
        success: true,
        data: data, // Returns the request ID
        message: 'Working hours request submitted successfully'
      };
    } catch (error) {
      console.error('Error submitting working hours request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Submit multiple working hours (bulk add)
   */
  async submitBulkRequest(slots, requestNotes = null) {
    try {
      // Validate slots
      if (!Array.isArray(slots) || slots.length === 0) {
        throw new Error('At least one slot is required for bulk request');
      }

      // Validate each slot
      slots.forEach((slot, index) => {
        if (!slot.date || !slot.start_time || !slot.end_time) {
          throw new Error(`Slot ${index + 1}: Date, start time, and end time are required`);
        }
      });

      const requestData = {
        action_type: 'bulk_add',
        requested_changes: { slots },
        request_notes: requestNotes
      };

      return await this.submitRequest(requestData);
    } catch (error) {
      console.error('Error submitting bulk working hours request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get reader's own working hours requests
   */
  async getMyRequests(filters = {}) {
    try {
      let query = supabase
        .from('my_working_hours_requests')
        .select('*');

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching my requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Cancel a pending request
   */
  async cancelRequest(requestId) {
    try {
      const { data, error } = await supabase.rpc('cancel_working_hours_request', {
        p_request_id: requestId
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Request cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // =====================================================
  // ADMIN APPROVAL FUNCTIONS
  // =====================================================

  /**
   * Get pending working hours requests (admin only)
   */
  async getPendingRequests(filters = {}) {
    try {
      let query = supabase
        .from('pending_working_hours_requests')
        .select('*');

      // Apply filters
      if (filters.reader_id) {
        query = query.eq('reader_id', filters.reader_id);
      }

      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get all working hours requests with pagination (admin only)
   */
  async getAllRequests(page = 1, limit = 20, filters = {}) {
    try {
      let query = supabase
        .from('working_hours_requests')
        .select(`
          *,
          reader:profiles!working_hours_requests_reader_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          ),
          admin:profiles!working_hours_requests_admin_id_fkey(
            first_name,
            last_name,
            email
          )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }

      if (filters.reader_id) {
        query = query.eq('reader_id', filters.reader_id);
      }

      // Count total for pagination
      const { count } = await supabase
        .from('working_hours_requests')
        .select('*', { count: 'exact', head: true });

      // Get paginated data
      const offset = (page - 1) * limit;
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching all requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Review a working hours request (approve/reject) - admin only
   */
  async reviewRequest(requestId, action, reason = null) {
    try {
      if (!['approved', 'rejected'].includes(action)) {
        throw new Error('Action must be either "approved" or "rejected"');
      }

      const { data, error } = await supabase.rpc('review_working_hours_request', {
        p_request_id: requestId,
        p_action: action,
        p_reason: reason
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: `Request ${action} successfully`
      };
    } catch (error) {
      console.error('Error reviewing request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get request details with audit trail
   */
  async getRequestDetails(requestId) {
    try {
      // Get request details
      const { data: request, error: requestError } = await supabase
        .from('working_hours_requests')
        .select(`
          *,
          reader:profiles!working_hours_requests_reader_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          ),
          admin:profiles!working_hours_requests_admin_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Get audit trail
      const { data: auditTrail, error: auditError } = await supabase
        .from('working_hours_audit')
        .select(`
          *,
          performer:profiles!working_hours_audit_performed_by_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (auditError) throw auditError;

      return {
        success: true,
        data: {
          request,
          auditTrail: auditTrail || []
        }
      };
    } catch (error) {
      console.error('Error fetching request details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  /**
   * Get booking window settings
   */
  async getBookingSettings() {
    try {
      const { data, error } = await supabase
        .from('booking_window_settings')
        .select('*')
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error fetching booking settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Update booking window settings (admin only)
   */
  async updateBookingSettings(settings) {
    try {
      const { data, error } = await supabase
        .from('booking_window_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Booking settings updated successfully'
      };
    } catch (error) {
      console.error('Error updating booking settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Validate working hours data before submission
   */
  validateWorkingHours(data) {
    const errors = [];

    // Validate required fields
    if (!data.date) errors.push('Date is required');
    if (!data.start_time) errors.push('Start time is required');
    if (!data.end_time) errors.push('End time is required');

    // Validate date format and range
    if (data.date) {
      const date = new Date(data.date);
      const today = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(today.getFullYear() + 1);

      if (isNaN(date.getTime())) {
        errors.push('Invalid date format');
      } else if (date < today.setHours(0, 0, 0, 0)) {
        errors.push('Cannot schedule working hours in the past');
      } else if (date > oneYearFromNow) {
        errors.push('Cannot schedule working hours more than 1 year in advance');
      }
    }

    // Validate time format and range
    if (data.start_time && data.end_time) {
      const [startHour, startMin] = data.start_time.split(':').map(Number);
      const [endHour, endMin] = data.end_time.split(':').map(Number);

      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        errors.push('Invalid time format');
      } else {
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (startMinutes >= endMinutes) {
          errors.push('Start time must be before end time');
        }

        if (endMinutes - startMinutes < 30) {
          errors.push('Minimum slot duration is 30 minutes');
        }
      }
    }

    // Validate max bookings
    if (data.max_bookings && (data.max_bookings < 1 || data.max_bookings > 10)) {
      errors.push('Max bookings must be between 1 and 10');
    }

    // Validate buffer minutes
    if (data.buffer_minutes && (data.buffer_minutes < 0 || data.buffer_minutes > 120)) {
      errors.push('Buffer minutes must be between 0 and 120');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Format schedule data for display
   */
  formatScheduleData(scheduleItem) {
    const date = new Date(scheduleItem.date);
    const startTime = scheduleItem.start_time;
    const endTime = scheduleItem.end_time;

    return {
      ...scheduleItem,
      formattedDate: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      formattedTime: `${startTime} - ${endTime}`,
      duration: this.calculateDuration(startTime, endTime),
      isPast: date < new Date().setHours(0, 0, 0, 0),
      isToday: date.toDateString() === new Date().toDateString(),
      daysFromNow: Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))
    };
  },

  /**
   * Calculate duration between two times
   */
  calculateDuration(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  },

  /**
   * Generate recurring slots (helper for bulk operations)
   */
  generateRecurringSlots(baseSlot, pattern) {
    const slots = [];
    const startDate = new Date(baseSlot.date);
    const endDate = new Date(pattern.until || '2025-12-31');

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (pattern.type === 'weekly') {
        const dayOfWeek = currentDate.getDay();
        if (pattern.days.includes(dayOfWeek)) {
          slots.push({
            ...baseSlot,
            date: currentDate.toISOString().split('T')[0]
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (pattern.type === 'daily') {
        slots.push({
          ...baseSlot,
          date: currentDate.toISOString().split('T')[0]
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Safety limit
      if (slots.length > 365) break;
    }

    return slots;
  },

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  /**
   * Subscribe to working hours request changes
   */
  subscribeToRequestChanges(callback, readerId = null) {
    let channel;

    if (readerId) {
      // Subscribe to specific reader's requests
      channel = supabase
        .channel('working_hours_requests_reader')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'working_hours_requests',
            filter: `reader_id=eq.${readerId}`
          },
          callback
        );
    } else {
      // Subscribe to all requests (for admins)
      channel = supabase
        .channel('working_hours_requests_all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'working_hours_requests'
          },
          callback
        );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Subscribe to schedule changes
   */
  subscribeToScheduleChanges(callback, readerId = null) {
    let channel;

    if (readerId) {
      // Subscribe to specific reader's schedule
      channel = supabase
        .channel('reader_schedule_reader')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reader_schedule',
            filter: `reader_id=eq.${readerId}`
          },
          callback
        );
    } else {
      // Subscribe to all schedule changes (for admins)
      channel = supabase
        .channel('reader_schedule_all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reader_schedule'
          },
          callback
        );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};

export default WorkingHoursAPI; 