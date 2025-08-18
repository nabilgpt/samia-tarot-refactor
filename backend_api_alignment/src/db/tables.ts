/**
 * Database Table Name Constants — SAMIA TAROT
 * Keep code maintainable & short. No hardcoded table strings in queries.
 */
export const TABLES = {
  TAROT_V2_REVEALS: 'tarot_v2_card_selections',
  TAROT_V2_AUDIT: 'tarot_v2_audit_logs',
  DECK_CARDS: 'deck_cards',
  DECK_UPLOADS: 'deck_uploads',
  CALL_CONSENT: 'call_consent_logs',
  CALL_EMERGENCY_EXT: 'call_emergency_extensions',
  READER_AVAIL: 'reader_availability',
  READER_EMERGENCY_REQ: 'reader_emergency_requests',
  READER_AVAIL_OVERRIDES: 'reader_availability_overrides',
  PAY_TRANSACTIONS: 'payment_transactions',
  USER_WALLETS: 'user_wallets',
} as const;

export type TableName = typeof TABLES[keyof typeof TABLES];
export const NEW_PRODUCTION_TABLES: TableName[] = Object.values(TABLES);

export function assertTable(name: string): asserts name is TableName {
  if (!Object.values(TABLES).includes(name as TableName)) {
    throw new Error(`Unknown table name: ${name}`);
  }
}
