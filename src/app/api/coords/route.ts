import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { city, country, lat, lng } = body;

  if (!city || !country || lat == null || lng == null) {
    return NextResponse.json({ error: "city, country, lat, lng are required" }, { status: 400 });
  }

  db.prepare(
    "INSERT OR REPLACE INTO city_coords (city, country, lat, lng) VALUES (?, ?, ?, ?)"
  ).run(city, country, lat, lng);

  return NextResponse.json({ success: true });
}
