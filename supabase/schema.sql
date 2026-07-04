-- Hydro MVP1 — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Identity model: Supabase Anonymous Auth gives every install a real auth.uid();
-- the connected wallet address is stored on the profile and used for on-chain rewards.

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  wallet_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id text primary key,
  name text not null,
  category text not null,
  duration_sec int not null,
  reward int not null,
  prompt text not null,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- contributions ----------
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null references public.tasks (id),
  wallet_address text,
  video_path text,
  duration_sec int not null default 0,
  reward int not null default 0,
  status text not null default 'pending_review', -- pending_review | rewarded | rejected
  tx_hash text,
  created_at timestamptz not null default now()
);

create index if not exists contributions_user_idx on public.contributions (user_id, created_at desc);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.contributions enable row level security;

-- tasks: readable by anyone signed in (incl. anonymous)
drop policy if exists "tasks_read" on public.tasks;
create policy "tasks_read" on public.tasks
  for select using (active = true);

-- profiles: a user manages only their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- contributions: a user reads/creates only their own; reward + status are set
-- server-side by the reward Edge Function (service role bypasses RLS).
drop policy if exists "contrib_select_own" on public.contributions;
create policy "contrib_select_own" on public.contributions
  for select using (auth.uid() = user_id);

drop policy if exists "contrib_insert_own" on public.contributions;
create policy "contrib_insert_own" on public.contributions
  for insert with check (auth.uid() = user_id);

-- ---------- Storage bucket for recordings ----------
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- users can upload/read only inside their own uid folder: recordings/<uid>/<file>
drop policy if exists "recordings_insert_own" on storage.objects;
create policy "recordings_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "recordings_read_own" on storage.objects;
create policy "recordings_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- Seed tasks ----------
insert into public.tasks (id, name, category, duration_sec, reward, prompt, sort) values
  ('pour-water',  'Pour water into a cup',        'Kitchen',  30, 10, 'Pick up the cup, pour water in, and put it back down. Keep both hands and the cup fully in frame the whole time.', 1),
  ('open-drawer', 'Open drawer & take an item',   'Home',     25, 12, 'Open the drawer, take one object out, then close the drawer. Move at a natural, steady pace.', 2),
  ('fold-shirt',  'Fold a shirt',                 'Laundry',  45, 15, 'Lay the shirt flat, fold the sleeves in, fold in half, and place it neatly. Full sequence, start to finish.', 3),
  ('stack-blocks','Stack the blocks',             'Tabletop', 30, 10, 'Stack at least 3 blocks one by one into a tower. Keep your hands and the blocks clearly visible.', 4),
  ('wipe-table',  'Wipe the table',               'Cleaning', 20,  8, 'Wipe the surface with a cloth in smooth strokes from one side to the other. Good even lighting.', 5),
  ('plug-cable',  'Plug in a cable',              'Workshop', 20, 14, 'Pick up the cable and plug it into the port, then unplug it. Show the fine finger movement up close.', 6)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  duration_sec = excluded.duration_sec,
  reward = excluded.reward,
  prompt = excluded.prompt,
  sort = excluded.sort,
  active = true;
