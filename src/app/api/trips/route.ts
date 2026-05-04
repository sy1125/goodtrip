import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Number(searchParams.get("limit")) || 50;
  const offset = Number(searchParams.get("offset")) || 0;
  const sort = searchParams.get("sort") || "start_date";
  const order = searchParams.get("order") || "DESC";
  const search = searchParams.get("search") || "";

  const safeSort = ["start_date", "created_at", "city", "country"].includes(sort) ? sort : "start_date";
  const safeOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  let where = "";
  const params: string[] = [];
  if (search) {
    where = "WHERE t.city LIKE ? OR t.country LIKE ? OR t.notes LIKE ?";
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM trips t ${where}`).get(...params) as { total: number };

  const trips = db.prepare(`
    SELECT t.* FROM trips t
    ${where}
    ORDER BY t.${safeSort} ${safeOrder}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;

  const stmtPhotos = db.prepare("SELECT id, file_path, caption FROM trip_photos WHERE trip_id = ?");

  const result = trips.map((trip) => ({
    ...trip,
    photos: stmtPhotos.all(trip.id as string),
  }));

  return NextResponse.json({ items: result, total: countRow.total });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { city, country, start_date, end_date, cover_image, notes, photo_paths } = body;

  if (!city || !country || !start_date || !end_date) {
    return NextResponse.json({ error: "city, country, start_date, end_date are required" }, { status: 400 });
  }

  const id = uuidv4();

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO trips (id, city, country, start_date, end_date, cover_image, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, city, country, start_date, end_date, cover_image || null, notes || null);

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

  return NextResponse.json({ ...trip, photos }, { status: 201 });
}
