-- Dedicated namespace: this does not modify Supabase's public tables.
create schema if not exists solsets;
create table if not exists solsets.workspaces (
  id uuid primary key,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists solsets.integration_secrets (
  workspace_id uuid not null references solsets.workspaces(id),
  provider text not null,
  encrypted text not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, provider)
);
revoke all on schema solsets from public;
revoke all on all tables in schema solsets from public;
