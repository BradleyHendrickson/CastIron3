-- Store user interactions with restaurants for ranking
create table if not exists public.restaurant_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  action text not null check (action in ('like', 'skip')),
  time_spent_ms integer not null default 0,
  created_at timestamptz not null default now()
);

-- Index for fast lookups by user
create index if not exists idx_restaurant_interactions_user_id
  on public.restaurant_interactions(user_id);

-- Index for ranking queries (user + place)
create index if not exists idx_restaurant_interactions_user_place
  on public.restaurant_interactions(user_id, place_id);

-- RLS: users can only access their own interactions
alter table public.restaurant_interactions enable row level security;

create policy "Users can insert own interactions"
  on public.restaurant_interactions for insert
  with check (auth.uid() = user_id);

create policy "Users can read own interactions"
  on public.restaurant_interactions for select
  using (auth.uid() = user_id);
