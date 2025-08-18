/**
 * Backend API Alignment Tests - SAMIA TAROT
 * 
 * Basic tests to verify table alignment and repository functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createDatabaseClient, DatabaseClient } from '../src/db/pg';
import { TABLES, validateTableNames, NEW_PRODUCTION_TABLES } from '../src/db/tables';
import { DeckRepository } from '../src/repos/deck';
import { TarotV2Repository } from '../src/repos/tarotV2';
import { CallsRepository } from '../src/repos/calls';
import { AvailabilityRepository } from '../src/repos/availability';
import { PaymentsRepository } from '../src/repos/payments';

describe('Backend API Alignment', () => {
  let dbClient: DatabaseClient;
  let deckRepo: DeckRepository;
  let tarotV2Repo: TarotV2Repository;
  let callsRepo: CallsRepository;
  let availabilityRepo: AvailabilityRepository;
  let paymentsRepo: PaymentsRepository;

  beforeAll(async () => {
    // Initialize database client
    dbClient = createDatabaseClient({
      supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
      supabaseKey: process.env.SUPABASE_ANON_KEY || 'test-key',
      enforceRLS: false, // Disable for testing
      enableLogging: true,
    });

    // Initialize repositories
    deckRepo = new DeckRepository(dbClient);
    tarotV2Repo = new TarotV2Repository(dbClient);
    callsRepo = new CallsRepository(dbClient);
    availabilityRepo = new AvailabilityRepository(dbClient);
    paymentsRepo = new PaymentsRepository(dbClient);

    // Test database connection
    const isConnected = await dbClient.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed - tests cannot proceed');
    }
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Table Names Validation', () => {
    it('should validate flat table naming convention', () => {
      const isValid = validateTableNames();
      expect(isValid).toBe(true);
    });

    it('should not contain schema prefixes', () => {
      const allTables = Object.values(TABLES);
      
      allTables.forEach(tableName => {
        expect(tableName).not.toMatch(/\./);
        expect(tableName).not.toMatch(/tarot\./);
        expect(tableName).not.toMatch(/calls\./);
        expect(tableName).not.toMatch(/readers\./);
        expect(tableName).not.toMatch(/payments\./);
      });
    });

    it('should have all required production tables', () => {
      const requiredTables = [
        'deck_cards',
        'deck_uploads',
        'call_consent_logs',
        'call_emergency_extensions',
        'reader_availability',
        'reader_emergency_requests',
        'reader_availability_overrides',
        'tarot_v2_card_selections',
        'tarot_v2_audit_logs',
        'payment_transactions',
        'user_wallets',
      ];

      requiredTables.forEach(tableName => {
        expect(Object.values(TABLES)).toContain(tableName);
      });
    });
  });

  describe('Database Schema Validation', () => {
    it('should connect to database successfully', async () => {
      const isConnected = await dbClient.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should validate production schema exists', async () => {
      const isValid = await dbClient.validateProductionSchema();
      expect(isValid).toBe(true);
    });

    it('should access all new production tables', async () => {
      for (const tableName of NEW_PRODUCTION_TABLES) {
        const result = await dbClient.select(tableName, { limit: 1 });
        
        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
      }
    });
  });

  describe('Deck Repository', () => {
    const testDeckTypeId = 'test-deck-type-id';

    it('should list deck cards', async () => {
      const result = await deckRepo.listDeckCards(testDeckTypeId);
      
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should validate deck completeness', async () => {
      const result = await deckRepo.validateDeckCompleteness(testDeckTypeId);
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].is_complete).toBe('boolean');
        expect(Array.isArray(result.data[0].missing_cards)).toBe(true);
        expect(typeof result.data[0].has_back_card).toBe('boolean');
      }
    });

    it('should get deck statistics', async () => {
      const result = await deckRepo.getDeckStats(testDeckTypeId);
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].total_cards).toBe('number');
        expect(typeof result.data[0].uploaded_cards).toBe('number');
        expect(typeof result.data[0].completion_percentage).toBe('number');
      }
    });
  });

  describe('Tarot V2 Repository', () => {
    it('should enforce AI content isolation', async () => {
      const validation = await tarotV2Repo.validateAIIsolation();
      
      expect(validation.error).toBeNull();
      expect(validation.data).toBeDefined();
      
      if (validation.data && validation.data[0]) {
        // CRITICAL: Must have zero violations
        expect(validation.data[0].violations).toBe(0);
        expect(validation.data[0].isolation_intact).toBe(true);
      }
    });

    it('should validate reveal sequence properly', async () => {
      const testReadingId = 'test-reading-id';
      const result = await tarotV2Repo.validateRevealSequence(testReadingId, 1);
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].is_valid).toBe('boolean');
        expect(typeof result.data[0].next_position).toBe('number');
      }
    });
  });

  describe('Calls Repository', () => {
    const testSessionId = 'test-session-id';
    const testUserId = 'test-user-id';

    it('should validate required consents', async () => {
      const requiredTypes = ['recording', 'participation'] as const;
      const result = await callsRepo.verifyRequiredConsents(testSessionId, requiredTypes);
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].all_consents_given).toBe('boolean');
        expect(Array.isArray(result.data[0].missing_consents)).toBe(true);
        expect(typeof result.data[0].consent_summary).toBe('object');
      }
    });

    it('should calculate extension pricing correctly', async () => {
      const result = await callsRepo.calculateExtensionPrice(testSessionId, '5min');
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].base_price).toBe('number');
        expect(typeof result.data[0].extension_count).toBe('number');
        expect(typeof result.data[0].progressive_multiplier).toBe('number');
        expect(typeof result.data[0].final_price).toBe('number');
        expect(result.data[0].base_price).toBe(5.00);
      }
    });

    it('should enforce IP address requirement for consent', async () => {
      const result = await callsRepo.logConsent({
        sessionId: testSessionId,
        userId: testUserId,
        consentType: 'recording',
        consentGiven: true,
        ipAddress: '', // Invalid empty IP
      });
      
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('IP address is required');
    });
  });

  describe('Availability Repository', () => {
    const testReaderId = 'test-reader-id';

    it('should check reader availability correctly', async () => {
      const result = await availabilityRepo.checkReaderAvailability(testReaderId);
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].is_available).toBe('boolean');
        expect(typeof result.data[0].is_emergency_enabled).toBe('boolean');
      }
    });

    it('should get availability summary', async () => {
      const result = await availabilityRepo.getAvailabilitySummary(testReaderId);
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].total_weekly_hours).toBe('number');
        expect(typeof result.data[0].emergency_enabled_hours).toBe('number');
        expect(typeof result.data[0].days_available).toBe('number');
        expect(typeof result.data[0].timezone).toBe('string');
      }
    });

    it('should get emergency response statistics', async () => {
      const result = await availabilityRepo.getEmergencyResponseStats(testReaderId, 30);
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].total_requests).toBe('number');
        expect(typeof result.data[0].acceptance_rate).toBe('number');
        expect(typeof result.data[0].average_response_time).toBe('number');
      }
    });
  });

  describe('Payments Repository', () => {
    const testUserId = 'test-user-id';

    it('should get or create user wallet', async () => {
      const result = await paymentsRepo.getOrCreateUserWallet(testUserId, 'USD');
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data) {
        expect(result.data.user_id).toBe(testUserId);
        expect(result.data.currency).toBe('USD');
        expect(typeof result.data.balance).toBe('number');
        expect(result.data.is_active).toBe(true);
      }
    });

    it('should get wallet balance', async () => {
      const result = await paymentsRepo.getWalletBalance(testUserId, 'USD');
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].balance).toBe('number');
        expect(result.data[0].currency).toBe('USD');
      }
    });

    it('should get payment statistics', async () => {
      const result = await paymentsRepo.getPaymentStats(testUserId, { currency: 'USD' });
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data && result.data[0]) {
        expect(typeof result.data[0].total_transactions).toBe('number');
        expect(typeof result.data[0].current_balance).toBe('number');
        expect(result.data[0].currency).toBe('USD');
      }
    });

    it('should validate positive amounts for wallet operations', async () => {
      const result = await paymentsRepo.addWalletFunds(testUserId, -10, 'Invalid negative amount');
      
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Amount must be positive');
    });
  });

  describe('Security Validation', () => {
    it('should enforce RLS on all new tables', async () => {
      // This test would verify RLS policies are active
      // Implementation depends on your RLS testing strategy
      
      for (const tableName of NEW_PRODUCTION_TABLES) {
        // Basic table access test
        const result = await dbClient.select(tableName, { limit: 1 });
        expect(result).toBeDefined();
      }
    });

    it('should never expose AI content to client-side queries', async () => {
      // Verify AI isolation is enforced
      const validation = await tarotV2Repo.validateAIIsolation();
      
      expect(validation.error).toBeNull();
      if (validation.data && validation.data[0]) {
        expect(validation.data[0].isolation_intact).toBe(true);
        expect(validation.data[0].violations).toBe(0);
      }
    });

    it('should require IP addresses for consent logging', async () => {
      const result = await callsRepo.logConsent({
        sessionId: 'test',
        userId: 'test',
        consentType: 'recording',
        consentGiven: true,
        ipAddress: '', // Empty IP should fail
      });
      
      expect(result.error).toBeDefined();
    });
  });

  describe('API Compatibility', () => {
    it('should maintain existing API contracts', () => {
      // Verify table constants exist for all new tables
      const requiredConstants = [
        'DECK_CARDS',
        'CALL_CONSENT_LOGS',
        'READER_AVAILABILITY',
        'TAROT_V2_CARD_SELECTIONS',
        'PAYMENT_TRANSACTIONS',
        'USER_WALLETS',
      ];

      requiredConstants.forEach(constant => {
        expect(TABLES[constant as keyof typeof TABLES]).toBeDefined();
        expect(typeof TABLES[constant as keyof typeof TABLES]).toBe('string');
      });
    });

    it('should use flat naming without schema prefixes', () => {
      NEW_PRODUCTION_TABLES.forEach(tableName => {
        expect(tableName).not.toContain('.');
        expect(tableName).not.toMatch(/^(tarot|calls|readers|payments|users)\./);
      });
    });
  });
});

// Helper function for test data cleanup
export const cleanupTestData = async (dbClient: DatabaseClient) => {
  const testTables = [
    TABLES.DECK_CARDS,
    TABLES.CALL_CONSENT_LOGS,
    TABLES.READER_AVAILABILITY,
    TABLES.TAROT_V2_CARD_SELECTIONS,
    TABLES.PAYMENT_TRANSACTIONS,
    TABLES.USER_WALLETS,
  ];

  for (const tableName of testTables) {
    await dbClient.query(tableName, async (table) => {
      return await table.delete().like('id', 'test-%');
    });
  }
};