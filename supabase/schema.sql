-- Run in Supabase SQL Editor. Enable Anonymous Sign-Ins in Authentication settings.
create table if not exists public.petit_saves (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.petit_endings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  ending jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.petit_saves enable row level security;
alter table public.petit_endings enable row level security;

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
