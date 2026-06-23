import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const totalTrips = (db.prepare("SELECT COUNT(*) as c FROM trips").get() as { c: number }).c;
  const totalCountries = (db.prepare("SELECT COUNT(DISTINCT country) as c FROM trip_destinations").get() as { c: number }).c;
  const totalCities = (db.prepare("SELECT COUNT(DISTINCT city || ',' || country) as c FROM trip_destinations").get() as { c: number }).c;
  const totalPhotos = (db.prepare("SELECT COUNT(*) as c FROM trip_photos").get() as { c: number }).c;

  const totalDays = (db.prepare(`
    SELECT COALESCE(SUM(CAST(julianday(end_date) - julianday(start_date) AS INTEGER) + 1), 0) as d FROM trips
  `).get() as { d: number }).d;

  // Countries with visit count (count trips that visited each country)
  const countries = db.prepare(`
    SELECT td.country, COUNT(DISTINCT td.trip_id) as visits,
      MAX(t.start_date) as last_visit
    FROM trip_destinations td
    JOIN trips t ON t.id = td.trip_id
    GROUP BY td.country
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

  // Recent timeline with destinations
  const timelineTrips = db.prepare(`
    SELECT id, start_date, end_date,
      CAST(julianday(end_date) - julianday(start_date) AS INTEGER) + 1 as days
    FROM trips
    ORDER BY start_date DESC
    LIMIT 10
  `).all() as { id: string; start_date: string; end_date: string; days: number }[];

  const stmtDests = db.prepare(
    "SELECT city, country, start_date, end_date FROM trip_destinations WHERE trip_id = ? ORDER BY order_num"
  );

  const timeline = timelineTrips.map((t) => {
    const dests = stmtDests.all(t.id) as { city: string; country: string; start_date: string | null; end_date: string | null }[];
    return {
      ...t,
      destinations: dests,
      city: dests.map(d => d.city).join(" → "),
      country: [...new Set(dests.map(d => d.country))].join(", "),
    };
  });

  // Upcoming trips with destinations
  const upcomingRows = db.prepare(`
    SELECT * FROM upcoming_trips
    WHERE start_date >= date('now')
    ORDER BY start_date ASC
    LIMIT 3
  `).all() as Array<Record<string, unknown>>;

  const stmtUpDests = db.prepare(
    "SELECT city, country, start_date, end_date FROM upcoming_trip_destinations WHERE trip_id = ? ORDER BY order_num"
  );

  const upcoming = upcomingRows.map((u) => {
    const dests = stmtUpDests.all(u.id as string) as { city: string; country: string }[];
    return {
      ...u,
      destinations: dests,
      city: dests.map(d => d.city).join(" → ") || u.city,
      country: [...new Set(dests.map(d => d.country))].join(", ") || u.country,
    };
  });

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
