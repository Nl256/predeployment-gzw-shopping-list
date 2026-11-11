alter table public.shopping_lists add column if not exists created_at timestamptz not null default now();
alter table public.shopping_lists add column if not exists creator_hash text;
create index if not exists shopping_lists_creation_rate on public.shopping_lists(creator_hash,created_at);
create or replace function public.create_shopping_overlay(p_read_hash text,p_edit_hash text,p_creator_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(18747,3);
  if exists(select 1 from public.shopping_lists where edit_hash=p_edit_hash and read_hash=p_read_hash) then
    return '{"ok":true}'::jsonb;
  end if;
  if p_read_hash !~ '^[a-f0-9]{64}$' or p_edit_hash !~ '^[a-f0-9]{64}$' or p_read_hash=p_edit_hash then
    return '{"error":"Invalid overlay keys."}'::jsonb;
  end if;
  if (select count(*) from public.shopping_lists where creator_hash=p_creator_hash and created_at>now()-interval '1 hour')>=10 then
    return '{"error":"Too many new overlays. Try again in an hour."}'::jsonb;
  end if;
  if (select count(*) from public.shopping_lists)>=2000 then
    return '{"error":"Overlay capacity reached. Your local save still works."}'::jsonb;
  end if;
  insert into public.shopping_lists(read_hash,edit_hash,creator_hash,state)
    values(p_read_hash,p_edit_hash,p_creator_hash,'{"title":"SHOPPING LIST","items":[]}'::jsonb);
  return '{"ok":true}'::jsonb;
end;
$$;
revoke all on function public.create_shopping_overlay(text,text,text) from public,anon,authenticated;
grant execute on function public.create_shopping_overlay(text,text,text) to service_role;
