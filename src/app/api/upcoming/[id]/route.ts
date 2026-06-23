import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { destinations, start_date, end_date, notes } = body;

  if (!destinations || !Array.isArray(destinations) || destinations.length === 0 || !start_date || !end_date) {
    return NextResponse.json({ error: "destinations (array), start_date, end_date are required" }, { status: 400 });
  }

  const firstDest = destinations[0];

  const transaction = db.transaction(() => {
    db.prepare(
      "UPDATE upcoming_trips SET city = ?, country = ?, start_date = ?, end_date = ?, notes = ? WHERE id = ?"
    ).run(firstDest.city, firstDest.country, start_date, end_date, notes || null, id);

    db.prepare("DELETE FROM upcoming_trip_destinations WHERE trip_id = ?").run(id);
    const insertDest = db.prepare(
      "INSERT INTO upcoming_trip_destinations (trip_id, city, country, order_num, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)"
    );
    destinations.forEach((d: { city: string; country: string; start_date?: string; end_date?: string }, i: number) => {
      insertDest.run(id, d.city, d.country, i, d.start_date || null, d.end_date || null);
    });
  });

  transaction();

  const row = db.prepare("SELECT * FROM upcoming_trips WHERE id = ?").get(id) as Record<string, unknown>;
  const dests = db.prepare(
    "SELECT id, city, country, order_num, start_date, end_date FROM upcoming_trip_destinations WHERE trip_id = ? ORDER BY order_num"
  ).all(id);

  return NextResponse.json({ ...row, destinations: dests });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare("DELETE FROM upcoming_trips WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
