-- Ejecutar primero en Supabase SQL Editor. No contiene datos ni credenciales reales.
begin;
create extension if not exists vector with schema extensions;

-- Una sola cuenta ficticia en esta hackatón. Estado transaccional del panel.
create table if not exists public.demo_workspaces (
  id uuid primary key,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.demo_workspaces is 'Single-tenant synthetic demo; server-only access. Settings, tasks, audit and inbox queue are persisted atomically.';

-- Tokens cifrados con AES-256-GCM desde el backend, nunca en el navegador.
create table if not exists public.integration_secrets (
  workspace_id uuid not null references public.demo_workspaces(id) on delete cascade,
  provider text not null check (provider in ('google')),
  encrypted text not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, provider)
);

-- Preparado para incorporar documentación y embeddings; no se afirma RAG activo.
create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.demo_workspaces(id) on delete cascade,
  source text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);
create index if not exists knowledge_chunks_workspace_idx on public.knowledge_chunks(workspace_id);

-- Sin políticas para clientes: todos los accesos van por el servidor autenticado.
alter table public.demo_workspaces enable row level security;
alter table public.integration_secrets enable row level security;
alter table public.knowledge_chunks enable row level security;
revoke all on public.demo_workspaces, public.integration_secrets, public.knowledge_chunks from anon, authenticated;
grant all on public.demo_workspaces, public.integration_secrets, public.knowledge_chunks to service_role;
commit;
