-- Optimize RLS policies: use (select auth.uid()) instead of auth.uid()
-- to avoid re-evaluating for each row. See: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv

-- restaurant_interactions
drop policy if exists "Users can insert own interactions" on public.restaurant_interactions;
drop policy if exists "Users can read own interactions" on public.restaurant_interactions;

create policy "Users can insert own interactions"
  on public.restaurant_interactions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can read own interactions"
  on public.restaurant_interactions for select
  using ((select auth.uid()) = user_id);

-- bookmarks
drop policy if exists "Users can insert own bookmarks" on public.bookmarks;
drop policy if exists "Users can read own bookmarks" on public.bookmarks;
drop policy if exists "Users can delete own bookmarks" on public.bookmarks;

create policy "Users can insert own bookmarks"
  on public.bookmarks for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can read own bookmarks"
  on public.bookmarks for select
  using ((select auth.uid()) = user_id);

create policy "Users can delete own bookmarks"
  on public.bookmarks for delete
  using ((select auth.uid()) = user_id);
