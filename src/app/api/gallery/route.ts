import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Number(searchParams.get("limit")) || 40;
  const offset = Number(searchParams.get("offset")) || 0;
  const country = searchParams.get("country") || "";

  let where = "";
  const params: (string | number)[] = [];

  if (country) {
    where = "WHERE t.country = ?";
    params.push(country);
  }

  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM trip_photos p
    JOIN trips t ON t.id = p.trip_id
    ${where}
  `).get(...params) as { total: number };

  const photos = db.prepare(`
    SELECT p.id, p.file_path, p.caption, p.created_at,
           t.id as trip_id, t.city, t.country, t.start_date, t.cover_image
    FROM trip_photos p
    JOIN trips t ON t.id = p.trip_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;

  // Also include cover images from trips
  const coverPhotos = db.prepare(`
    SELECT t.id as trip_id, t.cover_image as file_path, t.city, t.country, t.start_date, t.cover_image
    FROM trips t
    WHERE t.cover_image IS NOT NULL
    ${country ? "AND t.country = ?" : ""}
    ORDER BY t.start_date DESC
  `).all(...(country ? [country] : [])) as Array<Record<string, unknown>>;

  // Get unique countries for filter
  const countries = db.prepare(`
    SELECT DISTINCT country FROM trips ORDER BY country
  `).all() as Array<{ country: string }>;

  return NextResponse.json({
    photos,
    coverPhotos,
    countries: countries.map(c => c.country),
    total: countRow.total,
  });
}
