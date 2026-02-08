import type { Restaurant } from '../types';
import { supabase } from './supabase';

const getSupabaseUrl = () => process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export function getPlacePhotoUrl(placeId: string, photoId: string, maxWidthPx = 800): string {
  const base = getSupabaseUrl();
  return `${base}/functions/v1/place-photo?placeId=${encodeURIComponent(placeId)}&photoId=${encodeURIComponent(photoId)}&maxWidthPx=${maxWidthPx}`;
}

export function getPlacePhotoSource(placeId: string, photoId: string, maxWidthPx = 800) {
  const uri = getPlacePhotoUrl(placeId, photoId, maxWidthPx);
  // place-photo is deployed with verify_jwt=false so Image can load without headers
  return { uri };
}

export async function fetchRestaurants(
  lat: number,
  lng: number,
  radius = 3000
): Promise<Restaurant[]> {
  const url = `${getSupabaseUrl()}/functions/v1/get-restaurants`;
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
    },
    body: JSON.stringify({ lat, lng, radius }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to fetch restaurants');
  }

  const { restaurants } = await response.json();
  return restaurants ?? [];
}

export async function recordInteraction(
  placeId: string,
  action: 'like' | 'skip' | 'unlike',
  timeSpentMs: number
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  await supabase.from('restaurant_interactions').insert({
    user_id: session.user.id,
    place_id: placeId,
    action,
    time_spent_ms: timeSpentMs,
  });
}

export async function addBookmark(placeId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  await supabase.from('bookmarks').insert({
    user_id: session.user.id,
    place_id: placeId,
  });
}

export async function removeBookmark(placeId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', session.user.id)
    .eq('place_id', placeId);
}

export async function fetchPlaceDetails(placeId: string): Promise<{
  id: string;
  name: string;
  address: string;
  rating: number;
  userRatingCount: number;
  cuisine: string;
  photos: string[];
}> {
  const url = `${getSupabaseUrl()}/functions/v1/get-place-details?placeId=${encodeURIComponent(placeId)}`;
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...(session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch place details");
  }

  return response.json();
}

export async function getBookmarkedPlaceIds(): Promise<Set<string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return new Set();

  const { data } = await supabase
    .from('bookmarks')
    .select('place_id')
    .eq('user_id', session.user.id);

  return new Set((data ?? []).map((r) => r.place_id));
}

export type PlaceSummary = { id: string; name: string };

/** Returns place IDs the user has liked. Matches: SELECT place_id FROM restaurant_interactions WHERE user_id=? AND action='like' GROUP BY place_id */
export async function getLikedPlaceIds(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data } = await supabase
    .from('restaurant_interactions')
    .select('place_id')
    .eq('user_id', session.user.id)
    .eq('action', 'like');

  if (!data?.length) return [];

  return [...new Set(data.map((r) => r.place_id))];
}

/** Fetch place summaries for display in profile. */
export async function getLikedPlaces(): Promise<PlaceSummary[]> {
  const ids = await getLikedPlaceIds();
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const d = await fetchPlaceDetails(id);
        return { id: d.id, name: d.name };
      } catch {
        return { id, name: 'Unknown' };
      }
    })
  );
  return results;
}

/** Fetch bookmarked place summaries for display in profile. */
export async function getBookmarkedPlaces(): Promise<PlaceSummary[]> {
  const ids = [...(await getBookmarkedPlaceIds())];
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const d = await fetchPlaceDetails(id);
        return { id: d.id, name: d.name };
      } catch {
        return { id, name: 'Unknown' };
      }
    })
  );
  return results;
}
