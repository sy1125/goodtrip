import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const totalTrips = (db.prepare("SELECT COUNT(*) as c FROM trips").get() as { c: number }).c;
  const totalCountries = (db.prepare("SELECT COUNT(DISTINCT country) as c FROM trips").get() as { c: number }).c;
  const totalCities = (db.prepare("SELECT COUNT(DISTINCT city || ',' || country) as c FROM trips").get() as { c: number }).c;
  const totalPhotos = (db.prepare("SELECT COUNT(*) as c FROM trip_photos").get() as { c: number }).c;

  const totalDays = (db.prepare(`
    SELECT COALESCE(SUM(CAST(julianday(end_date) - julianday(start_date) AS INTEGER) + 1), 0) as d FROM trips
  `).get() as { d: number }).d;

  // Countries with visit count
  const countries = db.prepare(`
    SELECT country, COUNT(*) as visits,
      MAX(start_date) as last_visit
    FROM trips
    GROUP BY country
    ORDER BY last_visit DESC
  `).all();

  // Monthly trips for current year
  const currentYear = new Date().getFullYear();
  const monthlyTrips = db.prepare(`
    SELECT
      CAST(strftime('%m', start_date) AS INTEGER) as month,
      COUNT(*) as trips
    FROM trips
    WHERE strftime('%Y', start_date) = ?
    GROUP BY month
  `).all(String(currentYear)) as { month: number; trips: number }[];

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyTrips.find((m) => m.month === i + 1);
    return { month: i + 1, trips: found ? found.trips : 0 };
  });

  // Recent timeline
  const timeline = db.prepare(`
    SELECT id, city, country, start_date, end_date,
      CAST(julianday(end_date) - julianday(start_date) AS INTEGER) + 1 as days
    FROM trips
    ORDER BY start_date DESC
    LIMIT 10
  `).all();

  // Upcoming trips
  const upcoming = db.prepare(`
    SELECT * FROM upcoming_trips
    WHERE start_date >= date('now')
    ORDER BY start_date ASC
    LIMIT 3
  `).all();

  return NextResponse.json({
    totalTrips,
    totalCountries,
    totalCities,
    totalPhotos,
    totalDays,
    avgDays: totalTrips > 0 ? +(totalDays / totalTrips).toFixed(1) : 0,
    countries,
    monthlyTrips: monthlyData,
    timeline,
    upcoming,
  });
}
