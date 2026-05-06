import { NextResponse } from "next/server";
import db from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET() {
  const totalTrips = (db.prepare("SELECT COUNT(*) as c FROM trips").get() as { c: number }).c;
  const totalPhotos = (db.prepare("SELECT COUNT(*) as c FROM trip_photos").get() as { c: number }).c;
  const totalFavorites = (db.prepare("SELECT COUNT(*) as c FROM favorites").get() as { c: number }).c;
  const totalUpcoming = (db.prepare("SELECT COUNT(*) as c FROM upcoming_trips").get() as { c: number }).c;

  // DB file size
  const dbPath = path.join(process.cwd(), "goodtrip.db");
  let dbSize = "0 KB";
  try {
    const stats = fs.statSync(dbPath);
    const bytes = stats.size;
    if (bytes < 1024) dbSize = `${bytes} B`;
    else if (bytes < 1024 * 1024) dbSize = `${(bytes / 1024).toFixed(1)} KB`;
    else dbSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } catch { /* ignore */ }

  return NextResponse.json({
    totalTrips,
    totalPhotos,
    totalFavorites,
    totalUpcoming,
    dbSize,
  });
}
