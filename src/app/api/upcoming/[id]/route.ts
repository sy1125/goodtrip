import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare("DELETE FROM upcoming_trips WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
