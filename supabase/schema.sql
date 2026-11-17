-- Run in Supabase SQL Editor. Enable Anonymous Sign-Ins in Authentication settings.
create table if not exists public.petit_saves (
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null default 'default',
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Upgrade the earlier one-save-per-auth-user schema to one save per profile ID.
alter table public.petit_saves add column if not exists profile_id text;
update public.petit_saves set profile_id = 'default' where profile_id is null;
alter table public.petit_saves alter column profile_id set default 'default';
alter table public.petit_saves alter column profile_id set not null;
do $$
declare pk_name text;
begin
  select conname into pk_name from pg_constraint
  where conrelid = 'public.petit_saves'::regclass and contype = 'p';
  if pk_name is not null then
    execute format('alter table public.petit_saves drop constraint %I', pk_name);
  end if;
  alter table public.petit_saves add constraint petit_saves_pkey primary key (owner_id, profile_id);
end $$;

create table if not exists public.petit_endings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  ending jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.petit_saves enable row level security;
alter table public.petit_endings enable row level security;

drop policy if exists "players can read their own save" on public.petit_saves;
drop policy if exists "players can create their own save" on public.petit_saves;
drop policy if exists "players can update their own save" on public.petit_saves;
drop policy if exists "players can delete their own save" on public.petit_saves;
drop policy if exists "players can read their own endings" on public.petit_endings;
drop policy if exists "players can create their own endings" on public.petit_endings;
drop policy if exists "players can update their own endings" on public.petit_endings;

create policy "players can read their own save" on public.petit_saves
  for select to authenticated using (auth.uid() = owner_id);
create policy "players can create their own save" on public.petit_saves
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "players can update their own save" on public.petit_saves
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "players can delete their own save" on public.petit_saves
  for delete to authenticated using (auth.uid() = owner_id);

create policy "players can read their own endings" on public.petit_endings
  for select to authenticated using (auth.uid() = owner_id);
create policy "players can create their own endings" on public.petit_endings
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "players can update their own endings" on public.petit_endings
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

grant select, insert, update, delete on public.petit_saves to authenticated;
grant select, insert, update on public.petit_endings to authenticated;
