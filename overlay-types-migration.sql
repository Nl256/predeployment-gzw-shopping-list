alter table public.shopping_lists add column if not exists image_assets jsonb not null default '{}'::jsonb;
