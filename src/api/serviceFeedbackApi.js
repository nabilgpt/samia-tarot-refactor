import { supabase } from './config/supabase';

export const serviceFeedbackAPI = {
  
  async submitFeedback(feedbackData) {
    try {
      const response = await fetch('/api/service-feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(feedbackData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      return { success: true, data: data.data, message: data.message };
    } catch (error) {
      console.error('Submit feedback error:', error);
      return { success: false, error: error.message };
    }
  },

  async getMyFeedback({ page = 1, limit = 20 } = {}) {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`/api/service-feedback/my-feedback?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch feedback');
      }

      return { success: true, data: data.data, pagination: data.pagination };
    } catch (error) {
      console.error('Get my feedback error:', error);
      return { success: false, error: error.message };
    }
  },

  async checkFeedbackRequired(bookingId) {
    try {
      const response = await fetch(`/api/service-feedback/check-required/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check feedback requirement');
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error('Check feedback required error:', error);
      return { success: false, error: error.message };
    }
  },

  async getFeedbackPrompt(serviceType) {
    try {
      const response = await fetch(`/api/service-feedback/prompts/${serviceType}`);

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch feedback prompt');
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error('Get feedback prompt error:', error);
      return { success: false, error: error.message };
    }
  },

  async getAuthToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || '';
    } catch (error) {
      console.error('Error getting auth token:', error);
      return '';
    }
  }
};

export default serviceFeedbackAPI;