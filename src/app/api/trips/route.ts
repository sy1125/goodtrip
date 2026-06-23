import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { geocode } from "@/lib/geocode";

interface DestinationRow {
  id: number;
  city: string;
  country: string;
  order_num: number;
  start_date: string | null;
  end_date: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Number(searchParams.get("limit")) || 50;
  const offset = Number(searchParams.get("offset")) || 0;
  const sort = searchParams.get("sort") || "start_date";
  const order = searchParams.get("order") || "DESC";
  const search = searchParams.get("search") || "";

  const safeSort = ["start_date", "created_at"].includes(sort) ? `t.${sort}` : "t.start_date";
  const safeOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  let where = "";
  const params: string[] = [];
  if (search) {
    where = `WHERE EXISTS (
      SELECT 1 FROM trip_destinations td2
      WHERE td2.trip_id = t.id AND (td2.city LIKE ? OR td2.country LIKE ?)
    ) OR t.notes LIKE ?`;
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM trips t ${where}`).get(...params) as { total: number };

  const trips = db.prepare(`
    SELECT t.* FROM trips t
    ${where}
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;

  const stmtPhotos = db.prepare("SELECT id, file_path, caption FROM trip_photos WHERE trip_id = ?");
  const stmtDests = db.prepare("SELECT id, city, country, order_num, start_date, end_date FROM trip_destinations WHERE trip_id = ? ORDER BY order_num");

  const result = trips.map((trip) => ({
    ...trip,
    photos: stmtPhotos.all(trip.id as string),
    destinations: stmtDests.all(trip.id as string) as DestinationRow[],
  }));

  return NextResponse.json({ items: result, total: countRow.total });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { destinations, start_date, end_date, cover_image, notes, photo_paths } = body;

  if (!destinations || !Array.isArray(destinations) || destinations.length === 0 || !start_date || !end_date) {
    return NextResponse.json({ error: "destinations (array), start_date, end_date are required" }, { status: 400 });
  }

  for (const d of destinations) {
    if (!d.city || !d.country) {
      return NextResponse.json({ error: "Each destination must have city and country" }, { status: 400 });
    }
  }

  // Geocode all destinations
  await Promise.all(
    destinations.map((d: { city: string; country: string }) => geocode(d.city, d.country))
  );

  const id = uuidv4();
  const firstDest = destinations[0];

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO trips (id, city, country, start_date, end_date, cover_image, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, firstDest.city, firstDest.country, start_date, end_date, cover_image || null, notes || null);

    const insertDest = db.prepare(
      "INSERT INTO trip_destinations (trip_id, city, country, order_num, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)"
    );
    destinations.forEach((d: { city: string; country: string; start_date?: string; end_date?: string }, i: number) => {
      insertDest.run(id, d.city, d.country, i, d.start_date || null, d.end_date || null);
    });

    if (photo_paths && Array.isArray(photo_paths)) {
      const insertPhoto = db.prepare("INSERT INTO trip_photos (trip_id, file_path) VALUES (?, ?)");
      for (const p of photo_paths) {
        insertPhoto.run(id, p);
      }
    }
  });

  transaction();

  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(id) as Record<string, unknown>;
  const photos = db.prepare("SELECT id, file_path, caption FROM trip_photos WHERE trip_id = ?").all(id);
  const dests = db.prepare("SELECT id, city, country, order_num, start_date, end_date FROM trip_destinations WHERE trip_id = ? ORDER BY order_num").all(id);

  return NextResponse.json({ ...trip, photos, destinations: dests }, { status: 201 });
}
