-- Overturn durable case and append-only audit storage.
-- Run this in Supabase Dashboard > SQL Editor. There are deliberately no
-- browser policies: writes must come only from server routes using the secret key.

create extension if not exists pgcrypto;

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft',
  rejection_ground text,
  source_data jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  sequence bigint generated always as identity,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  unique (case_id, sequence)
);

alter table public.cases enable row level security;
alter table public.audit_events enable row level security;
