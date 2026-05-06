import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const format = searchParams.get("format") || "json";

  const trips = db.prepare("SELECT * FROM trips").all() as Array<Record<string, unknown>>;
  const photos = db.prepare("SELECT * FROM trip_photos").all() as Array<Record<string, unknown>>;
  const favorites = db.prepare("SELECT * FROM favorites").all() as Array<Record<string, unknown>>;
  const upcoming = db.prepare("SELECT * FROM upcoming_trips").all() as Array<Record<string, unknown>>;
  const coords = db.prepare("SELECT * FROM city_coords").all() as Array<Record<string, unknown>>;

  if (format === "excel") {
    const wb = XLSX.utils.book_new();

    if (trips.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trips), "여행기록");
    if (photos.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(photos), "사진");
    if (favorites.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(favorites), "즐겨찾기");
    if (upcoming.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(upcoming), "예정된여행");
    if (coords.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(coords), "좌표캐시");

    // If no data at all, add empty sheet
    if (wb.SheetNames.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), "데이터없음");
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="goodtrip-backup-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  }

  // Default: JSON
  return NextResponse.json({
    version: "1.0",
    exported_at: new Date().toISOString(),
    trips,
    photos,
    favorites,
    upcoming,
    coords,
  });
}
