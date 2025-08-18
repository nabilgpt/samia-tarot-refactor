/**
 * Supabase Client Helper — SAMIA TAROT
 * Per-request client using user's JWT to preserve RLS.
 * Use Service Role only for admin-level server tasks.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TABLES, TableName, assertTable } from './tables';

type CreateOptions = {
  jwt?: string; // user access token (preferred)
  serviceRoleKey?: string; // use ONLY on trusted server
};

export function createDatabaseClient(opts: CreateOptions = {}): SupabaseClient {
  const url = process.env.SUPABASE_URL as string;
  const anon = process.env.SUPABASE_ANON_KEY as string;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  const key = opts.jwt ? anon : (opts.serviceRoleKey || service || anon);

  // Supabase JS v2 client
  const client = createClient(url, key, {
    global: {
      headers: opts.jwt ? { Authorization: `Bearer ${opts.jwt}` } : {},
    },
    auth: { persistSession: false },
  });

  return client;
}

// Narrowed helper to ensure table names are valid at call sites
export function from<T = any>(db: SupabaseClient, table: TableName) {
  assertTable(table);
  return db.from<T>(table);
}
