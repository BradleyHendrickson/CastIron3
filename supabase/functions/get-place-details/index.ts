import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GooglePhoto {
  name?: string;
}

interface GooglePlace {
  id?: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  photos?: GooglePhoto[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
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

    const url = new URL(req.url);
    const placeId = url.searchParams.get("placeId");
    if (!placeId) {
      return new Response(
        JSON.stringify({ error: "placeId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPlaceId = placeId.replace(/^places\//, "");
    const detailsUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanPlaceId)}`;

    const response = await fetch(detailsUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,rating,userRatingCount,primaryType,types,photos,nationalPhoneNumber,websiteUri,priceLevel,currentOpeningHours,regularOpeningHours",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Google Place Details API error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch place details" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const place = (await response.json()) as GooglePlace;
    const photos: string[] = [];
    for (const photo of place.photos ?? []) {
      const name = photo.name;
      if (name?.startsWith("places/") && name.includes("/photos/")) {
        const photoId = name.split("/photos/")[1];
        if (photoId) photos.push(photoId);
      }
    }

    const hours = place.regularOpeningHours?.weekdayDescriptions ?? place.currentOpeningHours?.weekdayDescriptions ?? [];

    return new Response(
      JSON.stringify({
        id: place.id ?? cleanPlaceId,
        name: place.displayName?.text ?? "",
        address: place.formattedAddress ?? "",
        rating: place.rating ?? 0,
        userRatingCount: place.userRatingCount ?? 0,
        cuisine:
          place.primaryType?.replace(/_/g, " ") ??
          place.types?.find((t: string) => t.includes("restaurant"))?.replace(/_/g, " ") ??
          "Restaurant",
        photos,
        nationalPhoneNumber: place.nationalPhoneNumber ?? undefined,
        websiteUri: place.websiteUri ?? undefined,
        priceLevel: place.priceLevel ?? undefined,
        openNow: place.currentOpeningHours?.openNow ?? undefined,
        hours,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
