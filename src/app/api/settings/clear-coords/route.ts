import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST() {
  db.prepare("DELETE FROM city_coords").run();
  return NextResponse.json({ success: true });
}
