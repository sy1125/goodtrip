import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tripId = formData.get("trip_id") as string | null;
  const caption = formData.get("caption") as string | null;
  const type = formData.get("type") as string | null; // "cover" or "photo"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".jpg";
  const fileName = `${uuidv4()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const publicPath = `/uploads/${fileName}`;

  // If it's a cover image, update the trip
  if (type === "cover" && tripId) {
    db.prepare("UPDATE trips SET cover_image = ? WHERE id = ?").run(publicPath, tripId);
    return NextResponse.json({ path: publicPath });
  }

  // If it's a trip photo, insert into trip_photos
  if (tripId) {
    const result = db.prepare(
      "INSERT INTO trip_photos (trip_id, file_path, caption) VALUES (?, ?, ?)"
    ).run(tripId, publicPath, caption || null);
    return NextResponse.json({ id: result.lastInsertRowid, path: publicPath, caption }, { status: 201 });
  }

  return NextResponse.json({ path: publicPath });
}
