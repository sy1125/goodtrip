import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const rows = db.prepare(
    "SELECT * FROM upcoming_trips ORDER BY start_date ASC"
  ).all() as Array<Record<string, unknown>>;

  const stmtDests = db.prepare(
    "SELECT id, city, country, order_num, start_date, end_date FROM upcoming_trip_destinations WHERE trip_id = ? ORDER BY order_num"
  );

  const result = rows.map((row) => ({
    ...row,
    destinations: stmtDests.all(row.id as string),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { destinations, start_date, end_date, notes } = body;

  if (!destinations || !Array.isArray(destinations) || destinations.length === 0 || !start_date || !end_date) {
    return NextResponse.json({ error: "destinations (array), start_date, end_date are required" }, { status: 400 });
  }

  const id = uuidv4();
  const firstDest = destinations[0];

  const transaction = db.transaction(() => {
    db.prepare(
      "INSERT INTO upcoming_trips (id, city, country, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, firstDest.city, firstDest.country, start_date, end_date, notes || null);

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

  return NextResponse.json({ ...row, destinations: dests }, { status: 201 });
}
