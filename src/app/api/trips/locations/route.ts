import { NextResponse } from "next/server";
import db from "@/lib/db";
import { geocode } from "@/lib/geocode";

interface TripRow {
  id: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  notes: string | null;
}

export async function GET() {
  const trips = db.prepare(`
    SELECT id, city, country, start_date, end_date, cover_image, notes
    FROM trips ORDER BY start_date DESC
  `).all() as TripRow[];

  const result = await Promise.all(
    trips.map(async (trip) => {
      const coords = await geocode(trip.city, trip.country);
      return {
        ...trip,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      };
    })
  );

  return NextResponse.json(result);
}
