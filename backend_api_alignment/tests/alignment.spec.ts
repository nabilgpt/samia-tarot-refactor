/**
 * Alignment Tests — constants & simple shape checks
 */
import { TABLES, NEW_PRODUCTION_TABLES } from '../src/db/tables';

test('TABLES includes all required flat names', () => {
  const names = Object.values(TABLES);
  const required = [
    'tarot_v2_card_selections',
    'tarot_v2_audit_logs',
    'deck_cards',
    'deck_uploads',
    'call_consent_logs',
    'call_emergency_extensions',
    'reader_availability',
    'reader_emergency_requests',
    'reader_availability_overrides',
    'payment_transactions',
    'user_wallets',
  ];
  required.forEach(r => expect(names).toContain(r));
});

test('NEW_PRODUCTION_TABLES mirrors TABLES values', () => {
  expect(NEW_PRODUCTION_TABLES).toEqual(Object.values(TABLES));
});
