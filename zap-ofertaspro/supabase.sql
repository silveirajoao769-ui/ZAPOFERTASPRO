-- Execute no SQL Editor do Supabase, uma única vez.
create table if not exists public.user_backups (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.user_backups enable row level security;
create policy "Owner can read own backup" on public.user_backups for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can insert own backup" on public.user_backups for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update own backup" on public.user_backups for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
