import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { geocode } from "@/lib/geocode";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = db.prepare("SELECT id, file_path, caption, created_at FROM trip_photos WHERE trip_id = ? ORDER BY created_at DESC").all(id);
  const destinations = db.prepare("SELECT id, city, country, order_num, start_date, end_date FROM trip_destinations WHERE trip_id = ? ORDER BY order_num").all(id);

  return NextResponse.json({ ...trip, photos, destinations });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { destinations, start_date, end_date, cover_image, notes, photo_paths } = body;

  const existing = db.prepare("SELECT id FROM trips WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Geocode destinations if provided
  if (destinations && Array.isArray(destinations)) {
    await Promise.all(
      destinations.map((d: { city: string; country: string }) => geocode(d.city, d.country))
    );
  }

  const firstDest = destinations?.[0];

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE trips SET
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        cover_image = COALESCE(?, cover_image),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      firstDest?.city ?? null,
      firstDest?.country ?? null,
      start_date, end_date, cover_image, notes, id
    );

    if (destinations && Array.isArray(destinations)) {
      db.prepare("DELETE FROM trip_destinations WHERE trip_id = ?").run(id);
      const insertDest = db.prepare(
        "INSERT INTO trip_destinations (trip_id, city, country, order_num, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)"
      );
      destinations.forEach((d: { city: string; country: string; start_date?: string; end_date?: string }, i: number) => {
        insertDest.run(id, d.city, d.country, i, d.start_date || null, d.end_date || null);
      });
    }

    if (photo_paths && Array.isArray(photo_paths)) {
      db.prepare("DELETE FROM trip_photos WHERE trip_id = ?").run(id);
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

  return NextResponse.json({ ...trip, photos, destinations: dests });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = db.prepare("SELECT id FROM trips WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM trips WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
