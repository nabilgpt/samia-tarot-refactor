/**
 * Payments Repository — transactions + wallet
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { from } from '../db/pg';
import { TABLES } from '../db/tables';

export class PaymentsRepository {
  constructor(private db: SupabaseClient) {}

  async createTransaction(userId: string, method: string, amountCents: number, currency: string, status = 'pending') {
    return from(this.db, TABLES.PAY_TRANSACTIONS)
      .insert({ user_id: userId, method, amount_cents: amountCents, currency, status, created_at: new Date().toISOString() })
      .select('*')
      .single();
  }

  async getWallet(userId: string) {
    return from(this.db, TABLES.USER_WALLETS)
      .select('user_id,balance_cents,updated_at')
      .eq('user_id', userId)
      .maybeSingle();
  }
}
