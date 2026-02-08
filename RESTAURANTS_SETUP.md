# Restaurant Feed Setup

## 1. Run the database migration

In Supabase Dashboard → SQL Editor, run the migration:

```sql
-- From supabase/migrations/20240206000001_create_restaurant_interactions.sql
create table if not exists public.restaurant_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  action text not null check (action in ('like', 'skip', 'unlike')),
  time_spent_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_restaurant_interactions_user_id
  on public.restaurant_interactions(user_id);

create index if not exists idx_restaurant_interactions_user_place
  on public.restaurant_interactions(user_id, place_id);

alter table public.restaurant_interactions enable row level security;

create policy "Users can insert own interactions"
  on public.restaurant_interactions for insert
  with check (auth.uid() = user_id);

create policy "Users can read own interactions"
  on public.restaurant_interactions for select
  using (auth.uid() = user_id);
```

**Bookmarks table** (for save-for-later):

```sql
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  created_at timestamptz not null default now(),
  UNIQUE (user_id, place_id)
);

create index idx_bookmarks_user_id on public.bookmarks(user_id);
alter table public.bookmarks enable row level security;

create policy "Users can insert own bookmarks" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can read own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);
create policy "Users can delete own bookmarks" on public.bookmarks for delete using (auth.uid() = user_id);
```

If you already ran an earlier migration without `unlike`, run this to add it:

```sql
ALTER TABLE public.restaurant_interactions DROP CONSTRAINT IF EXISTS restaurant_interactions_action_check;
ALTER TABLE public.restaurant_interactions ADD CONSTRAINT restaurant_interactions_action_check CHECK (action IN ('like', 'skip', 'unlike'));
```

## 2. Google Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Places API (New)**
3. Create an API key (Credentials → Create credentials → API key)
4. Restrict the key to Places API if desired

## 3. Deploy the Edge Function

From the project root (where the `supabase` folder is):

```bash
# Use npx (no install needed) or: npm i supabase --save-dev
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF   # from Supabase URL: xxx.supabase.co
npx supabase secrets set GOOGLE_PLACES_API_KEY=your-api-key
npx supabase functions deploy get-restaurants
npx supabase functions deploy place-photo
npx supabase functions deploy get-place-details
```

The `place-photo` and `get-place-details` functions use `verify_jwt = false` in `supabase/config.toml` so the Image component can load photos without auth headers.

## 4. Test

1. Run the app: `cd CastIron && npm start`
2. Grant location permission when prompted
3. Log in and open the feed – restaurants should load from your location
4. Swipe through and tap "♥ Like" (tap again to unlike) – interactions are stored for ranking
