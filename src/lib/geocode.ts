import db from "@/lib/db";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface CoordRow {
  lat: number;
  lng: number;
}

/**
 * Geocode a city+country pair.
 * 1. Check DB cache first
 * 2. If not cached, call Nominatim API
 * 3. Cache the result in DB
 */
export async function geocode(
  city: string,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  // 1. DB cache
  const cached = db
    .prepare("SELECT lat, lng FROM city_coords WHERE city = ? AND country = ?")
    .get(city, country) as CoordRow | undefined;

  if (cached) {
    return { lat: cached.lat, lng: cached.lng };
  }

  // 2. Nominatim API
  try {
    const query = encodeURIComponent(`${city}, ${country}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "GoodTrip-LocalApp/1.0",
        "Accept-Language": "ko,en",
      },
    });

    if (!res.ok) return null;

    const data: NominatimResult[] = await res.json();
    if (data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    // 3. Cache in DB
    db.prepare(
      "INSERT OR REPLACE INTO city_coords (city, country, lat, lng) VALUES (?, ?, ?, ?)"
    ).run(city, country, lat, lng);

    return { lat, lng };
  } catch (err) {
    console.error("Geocoding failed:", err);
    return null;
  }
}
