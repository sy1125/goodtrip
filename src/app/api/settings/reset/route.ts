import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST() {
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM trip_photos").run();
    db.prepare("DELETE FROM favorites").run();
    db.prepare("DELETE FROM trip_destinations").run();
    db.prepare("DELETE FROM upcoming_trip_destinations").run();
    db.prepare("DELETE FROM trips").run();
    db.prepare("DELETE FROM upcoming_trips").run();
    db.prepare("DELETE FROM city_coords").run();
  });

  transaction();

  return NextResponse.json({ success: true });
}
