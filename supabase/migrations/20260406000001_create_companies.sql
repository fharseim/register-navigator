create extension if not exists pg_trgm;

create table if not exists public.companies (
  id              text primary key,
  name            text not null,
  city            text,
  court           text,
  register_number text,
  legal_form      text,
  status          text default 'aktiv',
  registered_at   timestamptz,
  updated_at      timestamptz default now(),
  raw             jsonb
);

create index if not exists companies_name_trgm_idx
  on public.companies using gin (name gin_trgm_ops);
create index if not exists companies_city_idx   on public.companies (city);
create index if not exists companies_status_idx on public.companies (status);
create index if not exists companies_court_idx  on public.companies (court);

create table if not exists public.document_cache (
  id              uuid primary key default gen_random_uuid(),
  company_id      text not null,
  court           text not null,
  register_number text not null,
  documents       jsonb not null,
  fetched_at      timestamptz default now(),
  constraint unique_company_doc_cache unique (company_id)
);

alter table public.companies enable row level security;
create policy "public can read companies"
  on public.companies for select using (true);

alter table public.document_cache enable row level security;
create policy "public can read document cache"
  on public.document_cache for select using (true);
