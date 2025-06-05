import { supabase } from '../lib/supabase.js';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export const AnalyticsAPI = {
  // =============================================
  // REVENUE ANALYTICS
  // =============================================
  
  async getRevenueStats(startDate = null, endDate = null, filters = {}) {
    try {
      const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('get_revenue_stats', {
        start_date: start,
        end_date: end,
        payment_method_filter: filters.paymentMethod || null,
        service_type_filter: filters.serviceType || null
      });

      if (error) throw error;
      return { success: true, data: data[0] || {} };
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      return { success: false, error: error.message };
    }
  },

  async getRevenueByMethod(startDate = null, endDate = null) {
    try {
      const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('revenue_analytics')
        .select('payment_method, total_amount, transaction_count')
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      // Aggregate by payment method
      const methodStats = data.reduce((acc, item) => {
        const method = item.payment_method || 'unknown';
        if (!acc[method]) {
          acc[method] = { method, total: 0, count: 0 };
        }
        acc[method].total += parseFloat(item.total_amount || 0);
        acc[method].count += parseInt(item.transaction_count || 0);
        return acc;
      }, {});

      return { 
        success: true, 
        data: Object.values(methodStats).sort((a, b) => b.total - a.total)
      };
    } catch (error) {
      console.error('Error fetching revenue by method:', error);
      return { success: false, error: error.message };
    }
  },

  async getRevenueByService(startDate = null, endDate = null) {
    try {
      const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('revenue_analytics')
        .select('service_type, total_amount, transaction_count')
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      // Aggregate by service type
      const serviceStats = data.reduce((acc, item) => {
        const service = item.service_type || 'unknown';
        if (!acc[service]) {
          acc[service] = { service, total: 0, count: 0 };
        }
        acc[service].total += parseFloat(item.total_amount || 0);
        acc[service].count += parseInt(item.transaction_count || 0);
        return acc;
      }, {});

      return { 
        success: true, 
        data: Object.values(serviceStats).sort((a, b) => b.total - a.total)
      };
    } catch (error) {
      console.error('Error fetching revenue by service:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // USER GROWTH ANALYTICS
  // =============================================

  async getUserGrowthStats(startDate = null, endDate = null, filters = {}) {
    try {
      const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase.rpc('get_user_growth_stats', {
        start_date: start,
        end_date: end,
        role_filter: filters.role || null
      });

      if (error) throw error;
      return { success: true, data: data[0] || {} };
    } catch (error) {
      console.error('Error fetching user growth stats:', error);
      return { success: false, error: error.message };
    }
  },

  async getUsersByRole() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('is_active', true);

      if (error) throw error;

      const roleStats = data.reduce((acc, user) => {
        const role = user.role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});

      return { 
        success: true, 
        data: Object.entries(roleStats).map(([role, count]) => ({ role, count }))
      };
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // BOOKING ANALYTICS
  // =============================================

  async getBookingStats(startDate = null, endDate = null, filters = {}) {
    try {
      const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');

      let query = supabase
        .from('booking_analytics')
        .select('*')
        .gte('date', start)
        .lte('date', end);

      if (filters.serviceType) {
        query = query.eq('service_type', filters.serviceType);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate statistics
      const stats = data.reduce((acc, item) => {
        acc.totalBookings += parseInt(item.booking_count || 0);
        acc.avgProcessingTime += parseFloat(item.avg_processing_hours || 0);
        
        // Count by status
        const status = item.status || 'unknown';
        acc.byStatus[status] = (acc.byStatus[status] || 0) + parseInt(item.booking_count || 0);
        
        // Count by service
        const service = item.service_type || 'unknown';
        acc.byService[service] = (acc.byService[service] || 0) + parseInt(item.booking_count || 0);
        
        return acc;
      }, {
        totalBookings: 0,
        avgProcessingTime: 0,
        byStatus: {},
        byService: {}
      });

      stats.avgProcessingTime = data.length > 0 ? stats.avgProcessingTime / data.length : 0;

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      return { success: false, error: error.message };
    }
  },

  async getBookingsByReader(startDate = null, endDate = null) {
    try {
      const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          reader_id,
          status,
          service_type,
          reader:reader_id(first_name, last_name)
        `)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      // Aggregate by reader
      const readerStats = data.reduce((acc, booking) => {
        const readerId = booking.reader_id;
        const readerName = booking.reader 
          ? `${booking.reader.first_name} ${booking.reader.last_name}`
          : 'Unknown Reader';

        if (!acc[readerId]) {
          acc[readerId] = {
            readerId,
            readerName,
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            services: {}
          };
        }

        acc[readerId].totalBookings++;
        
        if (booking.status === 'completed') {
          acc[readerId].completedBookings++;
        } else if (booking.status === 'cancelled') {
          acc[readerId].cancelledBookings++;
        }

        const service = booking.service_type || 'unknown';
        acc[readerId].services[service] = (acc[readerId].services[service] || 0) + 1;

        return acc;
      }, {});

      return { 
        success: true, 
        data: Object.values(readerStats).sort((a, b) => b.totalBookings - a.totalBookings)
      };
    } catch (error) {
      console.error('Error fetching bookings by reader:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // EMERGENCY CALL ANALYTICS
  // =============================================

  async getEmergencyStats(startDate = null, endDate = null) {
    try {
      const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('emergency_analytics')
        .select('*')
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      const stats = data.reduce((acc, item) => {
        acc.totalCalls += parseInt(item.call_count || 0);
        acc.totalEscalated += parseInt(item.escalated_count || 0);
        acc.avgResponseTime += parseFloat(item.avg_response_time || 0);
        
        const status = item.status || 'unknown';
        acc.byStatus[status] = (acc.byStatus[status] || 0) + parseInt(item.call_count || 0);
        
        return acc;
      }, {
        totalCalls: 0,
        totalEscalated: 0,
        avgResponseTime: 0,
        byStatus: {}
      });

      stats.avgResponseTime = data.length > 0 ? stats.avgResponseTime / data.length : 0;
      stats.escalationRate = stats.totalCalls > 0 ? (stats.totalEscalated / stats.totalCalls) * 100 : 0;

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching emergency stats:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // QUALITY & PERFORMANCE MONITORING
  // =============================================

  async getQualityMetrics(startDate = null, endDate = null) {
    try {
      const start = startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('survey_responses')
        .select('rating, survey_type, reader_id, created_at')
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const metrics = data.reduce((acc, response) => {
        acc.totalResponses++;
        acc.totalRating += parseInt(response.rating || 0);
        
        const type = response.survey_type || 'unknown';
        if (!acc.byType[type]) {
          acc.byType[type] = { count: 0, totalRating: 0, avgRating: 0 };
        }
        acc.byType[type].count++;
        acc.byType[type].totalRating += parseInt(response.rating || 0);
        
        return acc;
      }, {
        totalResponses: 0,
        totalRating: 0,
        avgRating: 0,
        byType: {}
      });

      metrics.avgRating = metrics.totalResponses > 0 ? metrics.totalRating / metrics.totalResponses : 0;
      
      // Calculate average ratings by type
      Object.keys(metrics.byType).forEach(type => {
        const typeData = metrics.byType[type];
        typeData.avgRating = typeData.count > 0 ? typeData.totalRating / typeData.count : 0;
      });

      return { success: true, data: metrics };
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      return { success: false, error: error.message };
    }
  },

  async getReaderPerformance(startDate = null, endDate = null) {
    try {
      const { data, error } = await supabase
        .from('reader_performance')
        .select('*');

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching reader performance:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // OVERVIEW DASHBOARD STATS
  // =============================================

  async getOverviewStats() {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

      // Get active users count
      const { data: activeUsers, error: activeUsersError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      if (activeUsersError) throw activeUsersError;

      // Get today's revenue
      const { data: todayRevenue, error: revenueError } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', today);

      if (revenueError) throw revenueError;

      // Get today's bookings
      const { data: todayBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .gte('created_at', today);

      if (bookingsError) throw bookingsError;

      // Get emergency calls today
      const { data: emergencyCalls, error: emergencyError } = await supabase
        .from('emergency_call_logs')
        .select('id', { count: 'exact' })
        .gte('timestamp', today);

      if (emergencyError) throw emergencyError;

      // Get pending approvals (bookings)
      const { data: pendingApprovals, error: pendingError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const totalRevenue = todayRevenue.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

      return {
        success: true,
        data: {
          activeUsers: activeUsers.length,
          totalRevenue: totalRevenue,
          bookingsToday: todayBookings.length,
          emergencyCalls: emergencyCalls.length,
          pendingApprovals: pendingApprovals.length
        }
      };
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // EXPORT FUNCTIONALITY
  // =============================================

  async exportToCSV(dataType, startDate = null, endDate = null, filters = {}) {
    try {
      let data = [];
      let filename = '';

      switch (dataType) {
        case 'revenue': {
          const revenueResult = await this.getRevenueStats(startDate, endDate, filters);
          if (!revenueResult.success) throw new Error(revenueResult.error);
          data = revenueResult.data.daily_data || [];
          filename = `revenue_report_${startDate}_${endDate}.csv`;
          break;
        }

        case 'users': {
          const usersResult = await this.getUserGrowthStats(startDate, endDate, filters);
          if (!usersResult.success) throw new Error(usersResult.error);
          data = usersResult.data.daily_signups || [];
          filename = `users_report_${startDate}_${endDate}.csv`;
          break;
        }

        case 'bookings': {
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              id, created_at, service_type, status, amount,
              user:user_id(first_name, last_name),
              reader:reader_id(first_name, last_name)
            `)
            .gte('created_at', startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd'))
            .lte('created_at', endDate || format(new Date(), 'yyyy-MM-dd'));

          if (bookingsError) throw bookingsError;
          data = bookingsData;
          filename = `bookings_report_${startDate}_${endDate}.csv`;
          break;
        }

        default:
          throw new Error('Invalid data type for export');
      }

      // Convert to CSV
      const csvContent = this.convertToCSV(data, dataType);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true, filename };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      return { success: false, error: error.message };
    }
  },

  convertToCSV(data, type) {
    if (!data || data.length === 0) {
      return 'No data available';
    }

    let headers = [];
    let rows = [];

    switch (type) {
      case 'revenue':
        headers = ['Date', 'Revenue', 'Transaction Count'];
        rows = data.map(item => [
          item.date,
          item.revenue || 0,
          item.count || 0
        ]);
        break;

      case 'users':
        headers = ['Date', 'New Signups'];
        rows = data.map(item => [
          item.date,
          item.signups || 0
        ]);
        break;

      case 'bookings':
        headers = ['ID', 'Date', 'Service', 'Status', 'Amount', 'Client', 'Reader'];
        rows = data.map(item => [
          item.id,
          item.created_at,
          item.service_type,
          item.status,
          item.amount || 0,
          item.user ? `${item.user.first_name} ${item.user.last_name}` : 'Unknown',
          item.reader ? `${item.reader.first_name} ${item.reader.last_name}` : 'Unknown'
        ]);
        break;

      default:
        headers = Object.keys(data[0] || {});
        rows = data.map(item => headers.map(header => item[header] || ''));
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  },

  // =============================================
  // ADMIN REPORTS
  // =============================================

  async generateReport(reportType, startDate, endDate) {
    try {
      const { data, error } = await supabase.rpc('generate_admin_report', {
        p_report_type: reportType,
        p_start_date: startDate,
        p_end_date: endDate,
        p_generated_by: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;
      return { success: true, reportId: data };
    } catch (error) {
      console.error('Error generating report:', error);
      return { success: false, error: error.message };
    }
  },

  async getReports(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('admin_reports')
        .select(`
          id, report_type, report_period_start, report_period_end,
          status, created_at, file_url,
          generated_by:generated_by(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching reports:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // EVENT LOGGING
  // =============================================

  async logEvent(eventType, eventCategory, eventData = null) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      const { data, error } = await supabase.rpc('log_event', {
        p_user_id: user?.id || null,
        p_event_type: eventType,
        p_event_category: eventCategory,
        p_event_data: eventData,
        p_ip_address: null, // Could be obtained from request
        p_user_agent: navigator.userAgent,
        p_session_id: null // Could be generated/maintained
      });

      if (error) throw error;
      return { success: true, eventId: data };
    } catch (error) {
      console.error('Error logging event:', error);
      return { success: false, error: error.message };
    }
  }
}; 