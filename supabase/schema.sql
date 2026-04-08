create table if not exists public.handouts (
  id text primary key,
  slug text unique not null,
  is_shared boolean not null default false,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.share_links (
  slug text primary key,
  handout_id text not null references public.handouts (id) on delete cascade,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists handouts_set_updated_at on public.handouts;
create trigger handouts_set_updated_at
before update on public.handouts
for each row execute function public.set_updated_at();

drop trigger if exists share_links_set_updated_at on public.share_links;
create trigger share_links_set_updated_at
before update on public.share_links
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('handout-assets', 'handout-assets', true)
on conflict (id) do nothing;
