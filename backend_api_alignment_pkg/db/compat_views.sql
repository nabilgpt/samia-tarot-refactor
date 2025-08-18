-- COMPATIBILITY VIEWS (optional rollback safety)
create schema if not exists tarot;
create schema if not exists ai;
create schema if not exists calls;
create schema if not exists ops;
create schema if not exists payments;

create or replace view tarot.deck_cards as select * from public.deck_cards;
create or replace view deck_uploads as select * from public.deck_uploads;
create or replace view tarot.client_card_reveals as select * from public.tarot_v2_card_selections;

create or replace view ai.reader_ai_drafts_audit as select * from public.tarot_v2_audit_logs;

create or replace view call_consent_logs as select * from public.call_consent_logs;
create or replace view calls.emergency_extensions as select * from public.call_emergency_extensions;

create or replace view ops.reader_availability_windows as select * from public.reader_availability;
create or replace view reader_emergency_requests as select * from public.reader_emergency_requests;
create or replace view reader_availability_overrides as select * from public.reader_availability_overrides;

create or replace view payment_transactions as select * from public.payment_transactions;
create or replace view payments.wallets as select * from public.user_wallets;
