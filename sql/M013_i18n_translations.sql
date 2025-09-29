create table if not exists content_translations (
  id bigserial primary key,
  entity_table text not null,
  entity_id text not null,
  field text not null,
  locale text not null,
  value text not null,
  is_machine boolean not null default true,
  source text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint uq_content_trans unique(entity_table, entity_id, field, locale)
);

alter table content_translations enable row level security;
create policy "ct_select_any" on content_translations for select using (true);
create policy "ct_admin_ins"  on content_translations for insert with check (is_admin());
create policy "ct_admin_upd"  on content_translations for update using (is_admin()) with check (is_admin());