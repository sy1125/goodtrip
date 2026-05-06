import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";

interface TripRow {
  id?: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  cover_image?: string;
  notes?: string;
  created_at?: string;
}

function parseJsonImport(data: Record<string, unknown>) {
  if (!data.trips || !Array.isArray(data.trips)) {
    throw new Error("Invalid JSON format");
  }
  return data as {
    trips: TripRow[];
    photos?: { id?: number; trip_id: string; file_path: string; caption?: string; created_at?: string }[];
    favorites?: { trip_id: string; created_at?: string }[];
    upcoming?: { id?: string; city: string; country: string; start_date: string; end_date: string; notes?: string; created_at?: string }[];
    coords?: { city: string; country: string; lat: number; lng: number }[];
  };
}

function parseExcelImport(buffer: ArrayBuffer) {
  const wb = XLSX.read(buffer, { type: "array" });

  const trips: TripRow[] = [];
  // Try to find trips sheet by various names
  const tripsSheet = wb.Sheets["여행기록"] || wb.Sheets["trips"] || wb.Sheets[wb.SheetNames[0]];
  if (tripsSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(tripsSheet);
    for (const row of rows) {
      if (row.city && row.country && row.start_date && row.end_date) {
        trips.push({
          id: row.id || uuidv4(),
          city: row.city,
          country: row.country,
          start_date: row.start_date,
          end_date: row.end_date,
          cover_image: row.cover_image || undefined,
          notes: row.notes || undefined,
          created_at: row.created_at || new Date().toISOString(),
        });
      }
    }
  }

  return { trips };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let trips: TripRow[] = [];
    let photos: { id?: number; trip_id: string; file_path: string; caption?: string; created_at?: string }[] = [];
    let favorites: { trip_id: string; created_at?: string }[] = [];
    let upcoming: { id?: string; city: string; country: string; start_date: string; end_date: string; notes?: string; created_at?: string }[] = [];
    let coords: { city: string; country: string; lat: number; lng: number }[] = [];

    if (contentType.includes("multipart/form-data")) {
      // Excel file upload
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

      const buffer = await file.arrayBuffer();
      const parsed = parseExcelImport(buffer);
      trips = parsed.trips;
    } else {
      // JSON
      const data = await req.json();
      const parsed = parseJsonImport(data);
      trips = parsed.trips;
      photos = parsed.photos || [];
      favorites = parsed.favorites || [];
      upcoming = parsed.upcoming || [];
      coords = parsed.coords || [];
    }

    if (trips.length === 0) {
      return NextResponse.json({ error: "No trip data found" }, { status: 400 });
    }

    const transaction = db.transaction(() => {
      const insertTrip = db.prepare(`
        INSERT OR REPLACE INTO trips (id, city, country, start_date, end_date, cover_image, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const t of trips) {
        insertTrip.run(t.id || uuidv4(), t.city, t.country, t.start_date, t.end_date, t.cover_image || null, t.notes || null, t.created_at || new Date().toISOString());
      }

      if (photos.length > 0) {
        const insertPhoto = db.prepare(`
          INSERT OR REPLACE INTO trip_photos (id, trip_id, file_path, caption, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const p of photos) {
          insertPhoto.run(p.id, p.trip_id, p.file_path, p.caption || null, p.created_at);
        }
      }

      if (favorites.length > 0) {
        const insertFav = db.prepare("INSERT OR IGNORE INTO favorites (trip_id, created_at) VALUES (?, ?)");
        for (const f of favorites) {
          insertFav.run(f.trip_id, f.created_at);
        }
      }

      if (upcoming.length > 0) {
        const insertUp = db.prepare(`
          INSERT OR REPLACE INTO upcoming_trips (id, city, country, start_date, end_date, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const u of upcoming) {
          insertUp.run(u.id || uuidv4(), u.city, u.country, u.start_date, u.end_date, u.notes || null, u.created_at);
        }
      }

      if (coords.length > 0) {
        const insertCoord = db.prepare("INSERT OR REPLACE INTO city_coords (city, country, lat, lng) VALUES (?, ?, ?, ?)");
        for (const c of coords) {
          insertCoord.run(c.city, c.country, c.lat, c.lng);
        }
      }
    });

    transaction();

    return NextResponse.json({ success: true, imported: trips.length });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
