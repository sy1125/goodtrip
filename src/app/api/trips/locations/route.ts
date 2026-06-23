import { NextResponse } from "next/server";
import db from "@/lib/db";
import { geocode } from "@/lib/geocode";

interface DestRow {
  trip_id: string;
  city: string;
  country: string;
  order_num: number;
  start_date: string | null;
  end_date: string | null;
}

interface TripRow {
  id: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  notes: string | null;
}

export async function GET() {
  const trips = db.prepare(`
    SELECT id, start_date, end_date, cover_image, notes
    FROM trips ORDER BY start_date DESC
  `).all() as TripRow[];

  const allDests = db.prepare(`
    SELECT trip_id, city, country, order_num, start_date, end_date
    FROM trip_destinations ORDER BY order_num
  `).all() as DestRow[];

  const destsByTrip = new Map<string, DestRow[]>();
  for (const d of allDests) {
    if (!destsByTrip.has(d.trip_id)) destsByTrip.set(d.trip_id, []);
    destsByTrip.get(d.trip_id)!.push(d);
  }

  // Return one entry per trip, using the first destination's coordinates
  const result = await Promise.all(
    trips.map(async (trip) => {
      const dests = destsByTrip.get(trip.id) || [];
      const firstDest = dests[0];
      const coords = firstDest ? await geocode(firstDest.city, firstDest.country) : null;
      return {
        id: trip.id,
        city: firstDest?.city ?? "",
        country: firstDest?.country ?? "",
        start_date: trip.start_date,
        end_date: trip.end_date,
        cover_image: trip.cover_image,
        notes: trip.notes,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        destinations: dests.map(d => ({ city: d.city, country: d.country, start_date: d.start_date, end_date: d.end_date })),
      };
    })
  );

  return NextResponse.json(result);
}
