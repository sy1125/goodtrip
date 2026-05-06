import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { city, country, start_date, end_date, notes } = body;

  if (!city || !country || !start_date || !end_date) {
    return NextResponse.json({ error: "city, country, start_date, end_date are required" }, { status: 400 });
  }

  db.prepare(
    "UPDATE upcoming_trips SET city = ?, country = ?, start_date = ?, end_date = ?, notes = ? WHERE id = ?"
  ).run(city, country, start_date, end_date, notes || null, id);

  const row = db.prepare("SELECT * FROM upcoming_trips WHERE id = ?").get(id);
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare("DELETE FROM upcoming_trips WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
