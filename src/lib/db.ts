import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "goodtrip.db");
const db = new Database(dbPath);

// WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    cover_image TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trip_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    caption TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS city_coords (
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    PRIMARY KEY (city, country)
  );

  CREATE TABLE IF NOT EXISTS upcoming_trips (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    trip_id TEXT PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trip_destinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    order_num INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    end_date TEXT
  );

  CREATE TABLE IF NOT EXISTS upcoming_trip_destinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL REFERENCES upcoming_trips(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    order_num INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    end_date TEXT
  );
`);

// Migration: add start_date/end_date columns to destination tables if missing
try {
  const cols = db.prepare("PRAGMA table_info(trip_destinations)").all() as { name: string }[];
  if (!cols.find(c => c.name === "start_date")) {
    db.exec("ALTER TABLE trip_destinations ADD COLUMN start_date TEXT");
    db.exec("ALTER TABLE trip_destinations ADD COLUMN end_date TEXT");
    // Set existing destinations' dates from parent trip
    db.exec(`
      UPDATE trip_destinations SET
        start_date = (SELECT start_date FROM trips WHERE trips.id = trip_destinations.trip_id),
        end_date = (SELECT end_date FROM trips WHERE trips.id = trip_destinations.trip_id)
      WHERE start_date IS NULL
    `);
  }
} catch { /* columns already exist */ }

try {
  const cols = db.prepare("PRAGMA table_info(upcoming_trip_destinations)").all() as { name: string }[];
  if (!cols.find(c => c.name === "start_date")) {
    db.exec("ALTER TABLE upcoming_trip_destinations ADD COLUMN start_date TEXT");
    db.exec("ALTER TABLE upcoming_trip_destinations ADD COLUMN end_date TEXT");
    db.exec(`
      UPDATE upcoming_trip_destinations SET
        start_date = (SELECT start_date FROM upcoming_trips WHERE upcoming_trips.id = upcoming_trip_destinations.trip_id),
        end_date = (SELECT end_date FROM upcoming_trips WHERE upcoming_trips.id = upcoming_trip_destinations.trip_id)
      WHERE start_date IS NULL
    `);
  }
} catch { /* columns already exist */ }

// Migration: move existing city/country data into destination tables
const migrateTrips = db.prepare(`
  SELECT id, city, country FROM trips
  WHERE city != '' AND country != ''
  AND id NOT IN (SELECT DISTINCT trip_id FROM trip_destinations)
`).all() as { id: string; city: string; country: string }[];

if (migrateTrips.length > 0) {
  const insertDest = db.prepare(
    "INSERT INTO trip_destinations (trip_id, city, country, order_num) VALUES (?, ?, ?, 0)"
  );
  const tx = db.transaction(() => {
    for (const t of migrateTrips) {
      insertDest.run(t.id, t.city, t.country);
    }
  });
  tx();
}

const migrateUpcoming = db.prepare(`
  SELECT id, city, country FROM upcoming_trips
  WHERE city != '' AND country != ''
  AND id NOT IN (SELECT DISTINCT trip_id FROM upcoming_trip_destinations)
`).all() as { id: string; city: string; country: string }[];

if (migrateUpcoming.length > 0) {
  const insertDest = db.prepare(
    "INSERT INTO upcoming_trip_destinations (trip_id, city, country, order_num) VALUES (?, ?, ?, 0)"
  );
  const tx = db.transaction(() => {
    for (const t of migrateUpcoming) {
      insertDest.run(t.id, t.city, t.country);
    }
  });
  tx();
}

export default db;
