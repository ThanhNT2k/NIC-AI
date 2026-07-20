create extension if not exists vector with schema extensions;

create type public.request_status as enum ('draft', 'submitted', 'processing', 'completed', 'rejected', 'cancelled');

create table public.request_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('event', 'facility')),
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  confirmed_version integer,
  status public.request_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confirmed_version is null or confirmed_version <= version)
);

create table public.knowledge_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null,
  content text not null,
  search_vector tsvector generated always as (to_tsvector('simple', content)) stored,
  embedding extensions.vector(1536),
  language text not null default 'vi',
  access_scope text not null default 'authenticated',
  source_url text,
  effective_from date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index knowledge_chunks_fts_idx on public.knowledge_chunks using gin(search_vector);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.request_drafts enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.audit_logs enable row level security;

create policy "owners can read drafts" on public.request_drafts for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners can create drafts" on public.request_drafts for insert to authenticated with check ((select auth.uid()) = owner_id and status = 'draft');
create policy "owners can update unsubmitted drafts" on public.request_drafts for update to authenticated using ((select auth.uid()) = owner_id and status = 'draft') with check ((select auth.uid()) = owner_id);
create policy "authenticated users can read public knowledge" on public.knowledge_chunks for select to authenticated using (access_scope = 'authenticated');

revoke insert, update, delete on public.audit_logs from anon, authenticated;
