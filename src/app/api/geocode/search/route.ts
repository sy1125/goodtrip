import { NextRequest, NextResponse } from "next/server";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "city"; // "city" or "country"

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    let url: string;

    if (type === "country") {
      url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&featuretype=country&addressdetails=1&accept-language=ko`;
    } else {
      // city search
      url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&accept-language=ko`;
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "GoodTrip-LocalApp/1.0",
      },
    });

    if (!res.ok) return NextResponse.json([]);

    const data: NominatimResult[] = await res.json();

    const results = data.map((item) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      city: item.address?.city || item.address?.town || item.address?.village || "",
      country: item.address?.country || "",
    }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
