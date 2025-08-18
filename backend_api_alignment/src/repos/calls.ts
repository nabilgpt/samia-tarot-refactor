/**
 * Calls Repository — consent + emergency extension
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { from } from '../db/pg';
import { TABLES } from '../db/tables';

export class CallsRepository {
  constructor(private db: SupabaseClient) {}

  async logConsent(sessionId: string, clientId: string, readerId: string, clientIp: string, consentGiven = true) {
    return from(this.db, TABLES.CALL_CONSENT)
      .insert({ session_id: sessionId, client_id: clientId, reader_id: readerId, client_ip: clientIp, consent_given: consentGiven, created_at: new Date().toISOString() });
  }

  async createEmergencyExtension(sessionId: string, bookingId: string, costCents: number, currency: string) {
    return from(this.db, TABLES.CALL_EMERGENCY_EXT)
      .insert({ session_id: sessionId, booking_id: bookingId, cost_cents: costCents, currency, created_at: new Date().toISOString() })
      .select('*')
      .single();
  }
}
