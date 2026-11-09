create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  read_hash text not null unique,
  edit_hash text not null unique,
  state jsonb not null default '{}'::jsonb,
  font_data text,
  font_type text,
  font_version text,
  updated_at timestamptz not null default now()
);
alter table public.shopping_lists enable row level security;
revoke all on public.shopping_lists from anon, authenticated;
grant all on public.shopping_lists to service_role;
