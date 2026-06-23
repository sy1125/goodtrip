import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const favorites = db.prepare(`
    SELECT t.*, f.created_at as favorited_at
    FROM favorites f
    JOIN trips t ON t.id = f.trip_id
    ORDER BY f.created_at DESC
  `).all() as Array<Record<string, unknown>>;

  const stmtPhotos = db.prepare("SELECT id, file_path, caption FROM trip_photos WHERE trip_id = ?");
  const stmtDests = db.prepare("SELECT id, city, country, order_num, start_date, end_date FROM trip_destinations WHERE trip_id = ? ORDER BY order_num");

  const result = favorites.map((trip) => ({
    ...trip,
    photos: stmtPhotos.all(trip.id as string),
    destinations: stmtDests.all(trip.id as string),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { trip_id } = await req.json();
  if (!trip_id) return NextResponse.json({ error: "trip_id required" }, { status: 400 });

  db.prepare("INSERT OR IGNORE INTO favorites (trip_id) VALUES (?)").run(trip_id);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { trip_id } = await req.json();
  if (!trip_id) return NextResponse.json({ error: "trip_id required" }, { status: 400 });

  db.prepare("DELETE FROM favorites WHERE trip_id = ?").run(trip_id);
  return NextResponse.json({ success: true });
}
