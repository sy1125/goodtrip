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
    where = "WHERE t.id IN (SELECT trip_id FROM trip_destinations WHERE country = ?)";
    params.push(country);
  }

  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM trip_photos p
    JOIN trips t ON t.id = p.trip_id
    ${where}
  `).get(...params) as { total: number };

  // Get photos with first destination info
  const photos = db.prepare(`
    SELECT p.id, p.file_path, p.caption, p.created_at,
           t.id as trip_id, t.start_date, t.cover_image,
           (SELECT td.city FROM trip_destinations td WHERE td.trip_id = t.id ORDER BY td.order_num LIMIT 1) as city,
           (SELECT td.country FROM trip_destinations td WHERE td.trip_id = t.id ORDER BY td.order_num LIMIT 1) as country
    FROM trip_photos p
    JOIN trips t ON t.id = p.trip_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;

  // Also include cover images from trips
  const coverPhotos = db.prepare(`
    SELECT t.id as trip_id, t.cover_image as file_path, t.start_date, t.cover_image,
           (SELECT td.city FROM trip_destinations td WHERE td.trip_id = t.id ORDER BY td.order_num LIMIT 1) as city,
           (SELECT td.country FROM trip_destinations td WHERE td.trip_id = t.id ORDER BY td.order_num LIMIT 1) as country
    FROM trips t
    WHERE t.cover_image IS NOT NULL
    ${country ? "AND t.id IN (SELECT trip_id FROM trip_destinations WHERE country = ?)" : ""}
    ORDER BY t.start_date DESC
  `).all(...(country ? [country] : [])) as Array<Record<string, unknown>>;

  // Get unique countries for filter
  const countries = db.prepare(`
    SELECT DISTINCT country FROM trip_destinations ORDER BY country
  `).all() as Array<{ country: string }>;

  return NextResponse.json({
    photos,
    coverPhotos,
    countries: countries.map(c => c.country),
    total: countRow.total,
  });
}
