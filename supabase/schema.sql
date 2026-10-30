-- OOPS INU database schema
-- Run this in the Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.memes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points integer not null default 0,
  active boolean not null default true
);

create table if not exists public.user_missions (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.profiles enable row level security;
alter table public.memes enable row level security;
alter table public.missions enable row level security;
alter table public.user_missions enable row level security;

create policy "Profiles are publicly readable"
on public.profiles for select using (true);

create policy "Users can update their own profile"
on public.profiles for update using (auth.uid() = id);

create policy "Memes are publicly readable"
on public.memes for select using (true);

create policy "Users can add their own memes"
on public.memes for insert with check (auth.uid() = user_id);

create policy "Missions are publicly readable"
on public.missions for select using (active = true);

create policy "Users can view their own mission completions"
on public.user_missions for select using (auth.uid() = user_id);
