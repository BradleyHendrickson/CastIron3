export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

export async function geocodeCity(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'CastIron/1.0',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.[0];
    if (!first?.lat || !first?.lon) return null;
    return {
      latitude: parseFloat(first.lat),
      longitude: parseFloat(first.lon),
      displayName: first.display_name ?? query,
    };
  } catch {
    return null;
  }
}
