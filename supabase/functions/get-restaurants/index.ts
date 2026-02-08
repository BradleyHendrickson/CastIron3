import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  lat: number;
  lng: number;
  radius?: number;
  pageToken?: string;
}

interface GooglePhoto {
  name?: string;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  photos?: GooglePhoto[];
  location?: { latitude?: number; longitude?: number };
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean };
}

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Google Places API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as RequestBody;
    const { lat, lng, radius = 3000, pageToken } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({ error: "lat and lng are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );

    let userId: string | null = null;
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "").trim();
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id ?? null;
      } catch {
        // Continue without user for personalization
      }
    }

    const effectiveRadius = Math.min(Math.max(radius, 100), 50000);

    // Use Text Search for pagination (supports pageToken) - like getNearbyRestaurantsPage
    const requestBody: Record<string, unknown> = {
      textQuery: "restaurants",
      includedType: "restaurant",
      pageSize: 20,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: effectiveRadius,
        },
      },
    };
    if (pageToken && typeof pageToken === "string" && pageToken.trim()) {
      requestBody.pageToken = pageToken.trim();
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryType,places.types,places.photos,places.location,places.priceLevel,places.currentOpeningHours,nextPageToken",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Google Places API error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch restaurants" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const places: GooglePlace[] = data.places ?? [];
    const nextPageTokenValue = data.nextPageToken;
    const hasMore = nextPageTokenValue != null && String(nextPageTokenValue).trim() !== "";

    let userInteractions: { place_id: string; action: string; time_spent_ms: number }[] = [];
    if (userId) {
      const { data: interactions } = await supabase
        .from("restaurant_interactions")
        .select("place_id, action, time_spent_ms")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      userInteractions = interactions ?? [];
    }

    const interactionMap = new Map<string, { action: string; time_spent_ms: number }>();
    for (const i of userInteractions) {
      if (!interactionMap.has(i.place_id)) {
        interactionMap.set(i.place_id, { action: i.action, time_spent_ms: i.time_spent_ms });
      }
    }

    const restaurants = places
      .map((p) => {
        const placeId = p.id?.replace("places/", "") ?? p.id;
        const interaction = interactionMap.get(placeId);
        const name = p.displayName?.text ?? "Unknown";
        const rating = p.rating ?? 0;
        const cuisine =
          p.primaryType?.replace(/_/g, " ") ??
          p.types?.find((t: string) => t.includes("restaurant"))?.replace(/_/g, " ") ??
          "Restaurant";

        let score = rating * 20;
        if (interaction) {
          if (interaction.action === "like") score += 50;
          else if (interaction.action === "unlike") score -= 30;
          if (interaction.action !== "unlike") {
            score += Math.min(interaction.time_spent_ms / 1000, 10);
          }
        }

        const photos: string[] = [];
        for (const photo of p.photos ?? []) {
          const name = photo.name;
          if (name?.startsWith("places/") && name.includes("/photos/")) {
            const photoId = name.split("/photos/")[1];
            if (photoId) photos.push(photoId);
          }
        }

        const placeLat = p.location?.latitude;
        const placeLng = p.location?.longitude;
        const distanceMeters =
          typeof placeLat === "number" && typeof placeLng === "number"
            ? Math.round(haversineDistanceMeters(lat, lng, placeLat, placeLng))
            : undefined;

        const priceLevel = p.priceLevel;
        const openNow = p.currentOpeningHours?.openNow;

        return {
          id: placeId,
          name,
          cuisine,
          rating,
          address: p.formattedAddress ?? "",
          userRatingCount: p.userRatingCount ?? 0,
          photos,
          distanceMeters,
          priceLevel: priceLevel ?? undefined,
          openNow: openNow ?? undefined,
          _score: score,
        };
      })
      .filter((r) => r.name !== "Unknown")
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...r }) => r);

    return new Response(JSON.stringify({
      restaurants,
      nextPageToken: hasMore ? String(nextPageTokenValue) : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
