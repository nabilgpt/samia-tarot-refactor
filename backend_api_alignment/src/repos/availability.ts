/**
 * Reader Availability Repository — windows + emergency opt-in
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { from } from '../db/pg';
import { TABLES } from '../db/tables';

export class AvailabilityRepository {
  constructor(private db: SupabaseClient) {}

  async proposeWindow(readerId: string, tz: string, startAt: string, endAt: string) {
    return from(this.db, TABLES.READER_AVAIL)
      .insert({ reader_id: readerId, tz, start_at: startAt, end_at: endAt, status: 'pending', created_at: new Date().toISOString() })
      .select('*')
      .single();
  }

  async approveWindow(windowId: string, adminId: string) {
    return from(this.db, TABLES.READER_AVAIL)
      .update({ status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq('id', windowId)
      .select('*')
      .single();
  }

  async setEmergencyOptIn(readerId: string, status: 'pending'|'approved'|'rejected') {
    // Upsert by reader_id
    return from(this.db, TABLES.READER_EMERGENCY_REQ)
      .upsert({ reader_id: readerId, status, created_at: new Date().toISOString() }, { onConflict: 'reader_id' })
      .select('*')
      .single();
  }
}
