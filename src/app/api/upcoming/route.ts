import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const rows = db.prepare(
    "SELECT * FROM upcoming_trips ORDER BY start_date ASC"
  ).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { city, country, start_date, end_date, notes } = body;

  if (!city || !country || !start_date || !end_date) {
    return NextResponse.json({ error: "city, country, start_date, end_date are required" }, { status: 400 });
  }

  const id = uuidv4();
  db.prepare(
    "INSERT INTO upcoming_trips (id, city, country, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, city, country, start_date, end_date, notes || null);

  const row = db.prepare("SELECT * FROM upcoming_trips WHERE id = ?").get(id);
  return NextResponse.json(row, { status: 201 });
}
