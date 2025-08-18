/**
 * Database Table Name Constants - SAMIA TAROT
 * 
 * Centralized table names for production flat schema.
 * Use these constants instead of hardcoding table names in queries.
 * 
 * @example
 * // Instead of:
 * const { data } = await supabase.from('deck_cards').select('*');
 * 
 * // Use:
 * import { TABLES } from './tables';
 * const { data } = await supabase.from(TABLES.DECK_CARDS).select('*');
 */

export const TABLES = {
  // === EXISTING TABLES (No changes needed) ===
  USERS: 'users',
  PROFILES: 'profiles',
  READERS: 'readers',
  CLIENTS: 'clients',
  ADMINS: 'admins',
  TAROT_SPREADS: 'tarot_spreads',
  TAROT_CARDS: 'tarot_cards',
  TAROT_READINGS: 'tarot_readings',
  CALL_SESSIONS: 'call_sessions',
  CALL_RECORDINGS: 'call_recordings',
  BOOKINGS: 'bookings',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  SYSTEM_SETTINGS: 'system_settings',
  SYSTEM_SECRETS: 'system_secrets',
  
  // === NEW PRODUCTION TABLES (Flat naming) ===
  
  // Deck Management
  DECK_CARDS: 'deck_cards',
  DECK_UPLOADS: 'deck_uploads',
  
  // Call System Enhanced
  CALL_CONSENT_LOGS: 'call_consent_logs',
  CALL_EMERGENCY_EXTENSIONS: 'call_emergency_extensions',
  
  // Reader Availability
  READER_AVAILABILITY: 'reader_availability',
  READER_AVAILABILITY_OVERRIDES: 'reader_availability_overrides',
  READER_EMERGENCY_REQUESTS: 'reader_emergency_requests',
  
  // Tarot V2 System
  TAROT_V2_READINGS: 'tarot_v2_readings',
  TAROT_V2_CARD_SELECTIONS: 'tarot_v2_card_selections',
  TAROT_V2_AUDIT_LOGS: 'tarot_v2_audit_logs',
  
  // Payment & Wallet System
  PAYMENT_TRANSACTIONS: 'payment_transactions',
  USER_WALLETS: 'user_wallets',
  
  // Daily Zodiac (if needed)
  DAILY_ZODIAC_CONTENT: 'daily_zodiac_content',
  ZODIAC_GENERATION_LOGS: 'zodiac_generation_logs',
} as const;

/**
 * Type-safe table name type
 */
export type TableName = typeof TABLES[keyof typeof TABLES];

/**
 * Schema validation - ensures all table names follow flat naming convention
 */
export const validateTableNames = (): boolean => {
  const allTables = Object.values(TABLES);
  
  // Check no schema prefixes exist
  const hasSchemaPrefix = allTables.some(table => 
    table.includes('.') || 
    table.includes('tarot.') || 
    table.includes('calls.') || 
    table.includes('readers.') || 
    table.includes('payments.') || 
    table.includes('users.')
  );
  
  if (hasSchemaPrefix) {
    console.error('❌ Schema prefixes detected in table names');
    return false;
  }
  
  console.log('✅ All table names follow flat naming convention');
  return true;
};

/**
 * Get table name with type safety
 */
export const getTableName = (tableKey: keyof typeof TABLES): string => {
  return TABLES[tableKey];
};

/**
 * Development helper - shows all new production tables
 */
export const NEW_PRODUCTION_TABLES = [
  TABLES.DECK_CARDS,
  TABLES.DECK_UPLOADS,
  TABLES.CALL_CONSENT_LOGS,
  TABLES.CALL_EMERGENCY_EXTENSIONS,
  TABLES.READER_AVAILABILITY,
  TABLES.READER_AVAILABILITY_OVERRIDES,
  TABLES.READER_EMERGENCY_REQUESTS,
  TABLES.TAROT_V2_READINGS,
  TABLES.TAROT_V2_CARD_SELECTIONS,
  TABLES.TAROT_V2_AUDIT_LOGS,
  TABLES.PAYMENT_TRANSACTIONS,
  TABLES.USER_WALLETS,
] as const;

/**
 * Table relationships mapping (for joins)
 */
export const TABLE_RELATIONSHIPS = {
  // Deck relationships
  [TABLES.DECK_CARDS]: {
    belongsTo: ['deck_types'],
    hasMany: ['tarot_v2_card_selections']
  },
  
  // Call relationships
  [TABLES.CALL_CONSENT_LOGS]: {
    belongsTo: [TABLES.CALL_SESSIONS, TABLES.USERS]
  },
  
  [TABLES.CALL_EMERGENCY_EXTENSIONS]: {
    belongsTo: [TABLES.CALL_SESSIONS, TABLES.CLIENTS]
  },
  
  // Reader relationships
  [TABLES.READER_AVAILABILITY]: {
    belongsTo: [TABLES.READERS]
  },
  
  [TABLES.READER_EMERGENCY_REQUESTS]: {
    belongsTo: [TABLES.READERS, TABLES.CLIENTS]
  },
  
  // Tarot V2 relationships
  [TABLES.TAROT_V2_CARD_SELECTIONS]: {
    belongsTo: [TABLES.TAROT_V2_READINGS, TABLES.TAROT_CARDS]
  },
  
  [TABLES.TAROT_V2_AUDIT_LOGS]: {
    belongsTo: [TABLES.TAROT_V2_READINGS, TABLES.USERS]
  },
  
  // Payment relationships
  [TABLES.PAYMENT_TRANSACTIONS]: {
    belongsTo: [TABLES.USERS]
  },
  
  [TABLES.USER_WALLETS]: {
    belongsTo: [TABLES.USERS]
  }
} as const;

/**
 * Security-sensitive tables (require special handling)
 */
export const SECURITY_CRITICAL_TABLES = [
  TABLES.CALL_CONSENT_LOGS,        // Legal compliance
  TABLES.TAROT_V2_AUDIT_LOGS,      // AI content security
  TABLES.PAYMENT_TRANSACTIONS,      // Financial data
  TABLES.USER_WALLETS,              // Financial balances
  TABLES.SYSTEM_SECRETS,            // Encryption keys
] as const;

/**
 * Tables with RLS policies (Row Level Security)
 */
export const RLS_PROTECTED_TABLES = [
  ...NEW_PRODUCTION_TABLES,
  TABLES.TAROT_SPREADS,
  TABLES.TAROT_READINGS,
  TABLES.CALL_SESSIONS,
  TABLES.BOOKINGS,
  TABLES.PAYMENTS,
  TABLES.NOTIFICATIONS,
] as const;

// Export type for TypeScript integration
export type SecurityCriticalTable = typeof SECURITY_CRITICAL_TABLES[number];
export type RLSProtectedTable = typeof RLS_PROTECTED_TABLES[number];
export type NewProductionTable = typeof NEW_PRODUCTION_TABLES[number];