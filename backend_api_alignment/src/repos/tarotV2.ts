/**
 * Tarot V2 Repository — progressive reveal (reader-only AI)
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { from } from '../db/pg';
import { TABLES } from '../db/tables';

export class TarotV2Repository {
  constructor(private db: SupabaseClient) {}

  async insertReveal(readingId: string, cardPosition: number) {
    return from(this.db, TABLES.TAROT_V2_REVEALS)
      .insert({ reading_id: readingId, card_position: cardPosition, revealed_at: new Date().toISOString() })
      .select('*')
      .single();
  }

  async listReveals(readingId: string) {
    return from(this.db, TABLES.TAROT_V2_REVEALS)
      .select('card_position,revealed_at')
      .eq('reading_id', readingId)
      .order('card_position', { ascending: true });
  }

  async auditDraftView(readerId: string, entityId: string, action = 'view') {
    return from(this.db, TABLES.TAROT_V2_AUDIT)
      .insert({ reader_id: readerId, entity_id: entityId, viewed_at: new Date().toISOString(), action });
  }
}
