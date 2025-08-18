/**
 * Deck Repository — flat table schema
 * Keep functions short & maintainable.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { from } from '../db/pg';
import { TABLES } from '../db/tables';

export class DeckRepository {
  constructor(private db: SupabaseClient) {}

  async listDeckCards(deckId: string) {
    return from(this.db, TABLES.DECK_CARDS)
      .select('card_index,file_name,storage_path,is_back')
      .eq('deck_id', deckId)
      .order('is_back', { ascending: true })
      .order('card_index', { ascending: true });
  }

  async createUploadSession(deckId: string, createdBy: string) {
    return from(this.db, TABLES.DECK_UPLOADS)
      .insert({ deck_id: deckId, created_by: createdBy })
      .select('*')
      .single();
  }
}
