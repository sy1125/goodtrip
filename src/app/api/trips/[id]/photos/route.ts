import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photos = db.prepare(
    "SELECT id, file_path, caption, created_at FROM trip_photos WHERE trip_id = ? ORDER BY created_at DESC"
  ).all(id);
  return NextResponse.json(photos);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const photoId = searchParams.get("photoId");

  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  db.prepare("DELETE FROM trip_photos WHERE id = ? AND trip_id = ?").run(Number(photoId), id);

  return NextResponse.json({ success: true });
}
