-- 006_ai.sql (idempotent) - M10 Reader Assist: DeepConf & Semantic Galaxy (Internal Only)
-- Apply via: python migrate.py up

-- Optional vector search support (safe on Supabase)
create extension if not exists vector;

-- Drafts generated for an order (internal only)
create table if not exists assist_drafts (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  created_by uuid references profiles(id),
  provider text not null,              -- 'deepconf'
  model text,
  style text,                          -- 'tarot'|'coffee'|'astro'
  content jsonb not null,              -- structured draft (sections/bullets)
  created_at timestamptz default now()
);

-- Session log for assist interactions (internal audit)
create table if not exists assist_sessions (
  id bigserial primary key,
  order_id bigint references orders(id) on delete cascade,
  actor_id uuid references profiles(id),
  kind text not null,                  -- 'draft'|'search'
  prompt jsonb,
  response jsonb,
  created_at timestamptz default now()
);

-- Internal knowledge base (optional)
create table if not exists kb_docs (
  id bigserial primary key,
  title text not null,
  source_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists kb_chunks (
  id bigserial primary key,
  doc_id bigint not null references kb_docs(id) on delete cascade,
  content text not null,
  embedding vector(1536),              -- match EMBED_DIM
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_assist_drafts_order on assist_drafts(order_id);
create index if not exists idx_assist_sessions_order on assist_sessions(order_id);
create index if not exists idx_assist_sessions_actor on assist_sessions(actor_id);
create index if not exists idx_kb_chunks_doc on kb_chunks(doc_id);

-- For pgvector ANN (optional; requires analyze): adjust lists per data size
do $$
begin
  if exists (select 1 from pg_extension where extname='vector') then
    execute 'create index if not exists idx_kb_chunks_vec on kb_chunks using ivfflat (embedding vector_cosine_ops) with (lists=100);';
  end if;
end$$;