import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = db.prepare("SELECT id, file_path, caption, created_at FROM trip_photos WHERE trip_id = ? ORDER BY created_at DESC").all(id);

  return NextResponse.json({ ...trip, photos });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { city, country, start_date, end_date, cover_image, notes, photo_paths } = body;

  const existing = db.prepare("SELECT id FROM trips WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    `).run(city, country, start_date, end_date, cover_image, notes, id);

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

  return NextResponse.json({ ...trip, photos });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const existing = db.prepare("SELECT id FROM trips WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM trips WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
