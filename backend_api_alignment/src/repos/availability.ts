/**
 * Reader Availability Repository - SAMIA TAROT
 * 
 * Repository for reader availability management with timezone support
 * and emergency opt-in functionality.
 */

import { DatabaseClient, QueryResult } from '../db/pg';
import { TABLES } from '../db/tables';

/**
 * Reader availability interface
 */
export interface ReaderAvailability {
  id: string;
  reader_id: string;
  day_of_week: number; // 0-6, Sunday=0
  start_time: string;   // HH:MM format
  end_time: string;     // HH:MM format
  is_active: boolean;
  emergency_opt_in: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

/**
 * Availability override interface
 */
export interface ReaderAvailabilityOverride {
  id: string;
  reader_id: string;
  date: string;         // YYYY-MM-DD format
  start_time?: string;  // HH:MM format (null if unavailable)
  end_time?: string;    // HH:MM format (null if unavailable)
  is_available: boolean;
  reason: string;
  created_at: string;
}

/**
 * Emergency request interface
 */
export interface ReaderEmergencyRequest {
  id: string;
  reader_id: string;
  client_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  emergency_reason?: string;
  requested_at: string;
  responded_at?: string;
  response_time_seconds?: number;
}

/**
 * Reader availability repository
 */
export class AvailabilityRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Set reader availability schedule
   */
  async setReaderAvailability(
    readerId: string,
    schedule: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      emergencyOptIn?: boolean;
      timezone?: string;
    }>
  ): Promise<QueryResult<ReaderAvailability[]>> {
    // Remove existing schedule
    await this.db.delete(TABLES.READER_AVAILABILITY, { reader_id: readerId });

    // Insert new schedule
    const availabilityRecords = schedule.map(day => ({
      reader_id: readerId,
      day_of_week: day.dayOfWeek,
      start_time: day.startTime,
      end_time: day.endTime,
      emergency_opt_in: day.emergencyOptIn || false,
      timezone: day.timezone || 'UTC',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    return this.db.insertMany<ReaderAvailability>(TABLES.READER_AVAILABILITY, availabilityRecords);
  }

  /**
   * Get reader availability schedule
   */
  async getReaderAvailability(readerId: string): Promise<QueryResult<ReaderAvailability[]>> {
    return this.db.select<ReaderAvailability>(TABLES.READER_AVAILABILITY, {
      conditions: { 
        reader_id: readerId,
        is_active: true 
      },
      orderBy: { column: 'day_of_week', ascending: true },
    });
  }

  /**
   * Toggle emergency opt-in for specific day
   */
  async toggleEmergencyOptIn(
    readerId: string,
    dayOfWeek: number,
    emergencyOptIn: boolean
  ): Promise<QueryResult<ReaderAvailability[]>> {
    return this.db.update<ReaderAvailability>(
      TABLES.READER_AVAILABILITY,
      { 
        emergency_opt_in: emergencyOptIn,
        updated_at: new Date().toISOString(),
      },
      { 
        reader_id: readerId,
        day_of_week: dayOfWeek 
      }
    );
  }

  /**
   * Get all emergency-enabled readers for current time
   */
  async getAvailableEmergencyReaders(currentTime?: Date): Promise<QueryResult<ReaderAvailability[]>> {
    const now = currentTime || new Date();
    const dayOfWeek = now.getDay();
    const currentTimeStr = now.toTimeString().substring(0, 5); // HH:MM

    return this.db.query<ReaderAvailability[]>(TABLES.READER_AVAILABILITY, async (table) => {
      return await table
        .select(`
          *,
          readers:reader_id(id, name, status)
        `)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .eq('emergency_opt_in', true)
        .lte('start_time', currentTimeStr)
        .gte('end_time', currentTimeStr);
    });
  }

  /**
   * Check if reader is currently available
   */
  async checkReaderAvailability(
    readerId: string,
    checkTime?: Date
  ): Promise<QueryResult<{
    is_available: boolean;
    is_emergency_enabled: boolean;
    reason?: string;
    available_until?: string;
  }[]>> {
    const now = checkTime || new Date();
    const dayOfWeek = now.getDay();
    const currentTimeStr = now.toTimeString().substring(0, 5);

    // Get availability for current day
    const availabilityResult = await this.db.select<ReaderAvailability>(
      TABLES.READER_AVAILABILITY, 
      {
        conditions: {
          reader_id: readerId,
          day_of_week: dayOfWeek,
          is_active: true
        }
      }
    );

    if (availabilityResult.error) {
      return { data: null, error: availabilityResult.error };
    }

    const availability = availabilityResult.data?.[0];

    if (!availability) {
      return { 
        data: [{
          is_available: false,
          is_emergency_enabled: false,
          reason: 'No availability set for this day'
        }], 
        error: null 
      };
    }

    // Check time window
    const isInTimeWindow = currentTimeStr >= availability.start_time && 
                          currentTimeStr <= availability.end_time;

    if (!isInTimeWindow) {
      return { 
        data: [{
          is_available: false,
          is_emergency_enabled: availability.emergency_opt_in,
          reason: `Outside availability window (${availability.start_time}-${availability.end_time})`
        }], 
        error: null 
      };
    }

    // Check for overrides
    const overrideResult = await this.getAvailabilityOverride(
      readerId, 
      now.toISOString().split('T')[0]
    );

    if (overrideResult.data && overrideResult.data.length > 0) {
      const override = overrideResult.data[0];
      
      if (!override.is_available) {
        return { 
          data: [{
            is_available: false,
            is_emergency_enabled: false,
            reason: `Override: ${override.reason}`
          }], 
          error: null 
        };
      }
    }

    return { 
      data: [{
        is_available: true,
        is_emergency_enabled: availability.emergency_opt_in,
        available_until: availability.end_time
      }], 
      error: null 
    };
  }

  /**
   * Add availability override (holiday, exception)
   */
  async addAvailabilityOverride(overrideData: {
    readerId: string;
    date: string;
    startTime?: string;
    endTime?: string;
    isAvailable: boolean;
    reason: string;
  }): Promise<QueryResult<ReaderAvailabilityOverride>> {
    const override = {
      reader_id: overrideData.readerId,
      date: overrideData.date,
      start_time: overrideData.startTime,
      end_time: overrideData.endTime,
      is_available: overrideData.isAvailable,
      reason: overrideData.reason,
      created_at: new Date().toISOString(),
    };

    return this.db.insert<ReaderAvailabilityOverride>(TABLES.READER_AVAILABILITY_OVERRIDES, override);
  }

  /**
   * Get availability override for specific date
   */
  async getAvailabilityOverride(
    readerId: string,
    date: string
  ): Promise<QueryResult<ReaderAvailabilityOverride[]>> {
    return this.db.select<ReaderAvailabilityOverride>(TABLES.READER_AVAILABILITY_OVERRIDES, {
      conditions: {
        reader_id: readerId,
        date: date
      }
    });
  }

  /**
   * Remove availability override
   */
  async removeAvailabilityOverride(overrideId: string): Promise<QueryResult<void>> {
    return this.db.delete(TABLES.READER_AVAILABILITY_OVERRIDES, { id: overrideId });
  }

  /**
   * Create emergency request
   */
  async createEmergencyRequest(requestData: {
    readerId: string;
    clientId: string;
    emergencyReason?: string;
  }): Promise<QueryResult<ReaderEmergencyRequest>> {
    const request = {
      reader_id: requestData.readerId,
      client_id: requestData.clientId,
      status: 'pending' as const,
      emergency_reason: requestData.emergencyReason,
      requested_at: new Date().toISOString(),
    };

    return this.db.insert<ReaderEmergencyRequest>(TABLES.READER_EMERGENCY_REQUESTS, request);
  }

  /**
   * Respond to emergency request
   */
  async respondToEmergencyRequest(
    requestId: string,
    response: 'accepted' | 'declined'
  ): Promise<QueryResult<ReaderEmergencyRequest[]>> {
    const respondedAt = new Date();
    
    // Get original request to calculate response time
    const requestResult = await this.db.select<ReaderEmergencyRequest>(
      TABLES.READER_EMERGENCY_REQUESTS,
      { conditions: { id: requestId } }
    );

    let responseTimeSeconds = 0;
    if (requestResult.data && requestResult.data[0]) {
      const requestedAt = new Date(requestResult.data[0].requested_at);
      responseTimeSeconds = Math.floor((respondedAt.getTime() - requestedAt.getTime()) / 1000);
    }

    return this.db.update<ReaderEmergencyRequest>(
      TABLES.READER_EMERGENCY_REQUESTS,
      {
        status: response,
        responded_at: respondedAt.toISOString(),
        response_time_seconds: responseTimeSeconds,
      },
      { id: requestId }
    );
  }

  /**
   * Get pending emergency requests for reader
   */
  async getPendingEmergencyRequests(readerId: string): Promise<QueryResult<ReaderEmergencyRequest[]>> {
    return this.db.select<ReaderEmergencyRequest>(TABLES.READER_EMERGENCY_REQUESTS, {
      conditions: {
        reader_id: readerId,
        status: 'pending'
      },
      orderBy: { column: 'requested_at', ascending: true },
    });
  }

  /**
   * Expire old emergency requests (15 second timeout)
   */
  async expireOldEmergencyRequests(): Promise<QueryResult<ReaderEmergencyRequest[]>> {
    const cutoffTime = new Date();
    cutoffTime.setSeconds(cutoffTime.getSeconds() - 15); // 15 seconds ago

    return this.db.query<ReaderEmergencyRequest[]>(TABLES.READER_EMERGENCY_REQUESTS, async (table) => {
      return await table
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('requested_at', cutoffTime.toISOString())
        .select();
    });
  }

  /**
   * Get reader emergency response statistics
   */
  async getEmergencyResponseStats(
    readerId: string,
    days?: number
  ): Promise<QueryResult<{
    total_requests: number;
    accepted_requests: number;
    declined_requests: number;
    expired_requests: number;
    average_response_time: number;
    acceptance_rate: number;
  }[]>> {
    let dateFilter = {};
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      dateFilter = { conditions: { reader_id: readerId } };
    }

    const requestsResult = await this.db.query<ReaderEmergencyRequest[]>(
      TABLES.READER_EMERGENCY_REQUESTS, 
      async (table) => {
        let query = table.select('*').eq('reader_id', readerId);
        
        if (days) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          query = query.gte('requested_at', cutoffDate.toISOString());
        }
        
        return await query;
      }
    );

    if (requestsResult.error) {
      return { data: null, error: requestsResult.error };
    }

    const requests = requestsResult.data || [];
    const accepted = requests.filter(r => r.status === 'accepted');
    const declined = requests.filter(r => r.status === 'declined');
    const expired = requests.filter(r => r.status === 'expired');

    // Calculate average response time for responded requests
    const responded = requests.filter(r => r.response_time_seconds !== null);
    const avgResponseTime = responded.length > 0 
      ? responded.reduce((sum, r) => sum + (r.response_time_seconds || 0), 0) / responded.length
      : 0;

    const stats = {
      total_requests: requests.length,
      accepted_requests: accepted.length,
      declined_requests: declined.length,
      expired_requests: expired.length,
      average_response_time: Math.round(avgResponseTime),
      acceptance_rate: requests.length > 0 ? 
        Math.round((accepted.length / requests.length) * 100) : 0,
    };

    return { data: [stats], error: null };
  }

  /**
   * Get availability summary for reader
   */
  async getAvailabilitySummary(readerId: string): Promise<QueryResult<{
    total_weekly_hours: number;
    emergency_enabled_hours: number;
    days_available: number;
    emergency_days: number;
    timezone: string;
  }[]>> {
    const availabilityResult = await this.getReaderAvailability(readerId);
    
    if (availabilityResult.error) {
      return { data: null, error: availabilityResult.error };
    }

    const schedule = availabilityResult.data || [];
    
    let totalWeeklyHours = 0;
    let emergencyEnabledHours = 0;
    let emergencyDays = 0;
    const timezone = schedule[0]?.timezone || 'UTC';

    schedule.forEach(day => {
      const startHour = parseInt(day.start_time.split(':')[0]);
      const startMinute = parseInt(day.start_time.split(':')[1]);
      const endHour = parseInt(day.end_time.split(':')[0]);
      const endMinute = parseInt(day.end_time.split(':')[1]);

      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      const dayHours = (endTotalMinutes - startTotalMinutes) / 60;

      totalWeeklyHours += dayHours;

      if (day.emergency_opt_in) {
        emergencyEnabledHours += dayHours;
        emergencyDays++;
      }
    });

    const summary = {
      total_weekly_hours: Math.round(totalWeeklyHours * 100) / 100,
      emergency_enabled_hours: Math.round(emergencyEnabledHours * 100) / 100,
      days_available: schedule.length,
      emergency_days: emergencyDays,
      timezone: timezone,
    };

    return { data: [summary], error: null };
  }
}