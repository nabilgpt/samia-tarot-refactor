import { analyticsAPI } from '../api/analytics';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }
}));

describe('Analytics API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserAnalytics', () => {
    test('fetches user analytics successfully', async () => {
      const mockData = [
        { id: 1, user_id: 'user-1', event_type: 'login', created_at: '2024-01-01' }
      ];

      // Mock the Supabase chain
      require('../lib/supabase').supabase.from().select().eq().gte().order.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await analyticsAPI.getUserAnalytics('user-1', '30d');
      expect(result).toEqual(mockData);
    });

    test('handles errors gracefully', async () => {
      const mockError = { message: 'Database error' };

      require('../lib/supabase').supabase.from().select().eq().gte().order.mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(analyticsAPI.getUserAnalytics('user-1', '30d')).rejects.toThrow();
    });
  });

  describe('trackUserEvent', () => {
    test('tracks user event successfully', async () => {
      const mockData = [
        { id: 1, user_id: 'user-1', event_type: 'click', event_data: { button: 'submit' } }
      ];

      require('../lib/supabase').supabase.from().insert.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await analyticsAPI.trackUserEvent('user-1', 'click', { button: 'submit' });
      expect(result).toEqual(mockData);
    });

    test('handles tracking errors', async () => {
      const mockError = { message: 'Insert failed' };

      require('../lib/supabase').supabase.from().insert.mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(
        analyticsAPI.trackUserEvent('user-1', 'click', { button: 'submit' })
      ).rejects.toThrow();
    });
  });

  describe('getAnalyticsSummary', () => {
    test('generates analytics summary', async () => {
      // Mock multiple API calls
      const mockUserStats = { totalEvents: 100, uniqueUsers: 50 };
      const mockBookingStats = { totalEvents: 75 };
      const mockPaymentStats = { totalEvents: 25, totalRevenue: 1000 };

      // Mock the individual methods
      jest.spyOn(analyticsAPI, 'getUserStats').mockResolvedValue(mockUserStats);
      jest.spyOn(analyticsAPI, 'getBookingStats').mockResolvedValue(mockBookingStats);
      jest.spyOn(analyticsAPI, 'getPaymentStats').mockResolvedValue(mockPaymentStats);

      const result = await analyticsAPI.getAnalyticsSummary('30d');
      
      expect(result).toHaveProperty('users', mockUserStats);
      expect(result).toHaveProperty('bookings', mockBookingStats);
      expect(result).toHaveProperty('payments', mockPaymentStats);
      expect(result).toHaveProperty('generatedAt');
    });
  });

  describe('Utility functions', () => {
    test('getTimeRangeDate calculates correct date', () => {
      const result = analyticsAPI.getTimeRangeDate('7d');
      const expected = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      expect(new Date(result).getDate()).toBe(expected.getDate());
    });

    test('groupBy groups array correctly', () => {
      const testData = [
        { type: 'A', value: 1 },
        { type: 'B', value: 2 },
        { type: 'A', value: 3 }
      ];

      const result = analyticsAPI.groupBy(testData, 'type');
      
      expect(result.A).toHaveLength(2);
      expect(result.B).toHaveLength(1);
    });
  });
});
