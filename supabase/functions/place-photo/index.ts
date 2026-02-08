import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return new Response("Photo service not configured", { status: 500 });
    }

    const url = new URL(req.url);
    const placeId = url.searchParams.get("placeId");
    const photoId = url.searchParams.get("photoId");
    const maxWidth = url.searchParams.get("maxWidthPx") ?? "800";

    if (!placeId || !photoId) {
      return new Response("placeId and photoId required", { status: 400 });
    }

    const mediaUrl = `https://places.googleapis.com/v1/places/${placeId}/photos/${photoId}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
    const res = await fetch(mediaUrl, { redirect: "follow" });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Google photo fetch failed:", res.status, errText);
      return new Response("Failed to fetch photo", { status: res.status });
    }

    const blob = await res.blob();
    const contentType = res.headers.get("Content-Type") ?? "image/jpeg";
    return new Response(blob, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error(err);
    return new Response("Internal server error", { status: 500 });
  }
});
