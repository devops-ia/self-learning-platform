import { NextResponse } from "next/server";
import { getExerciseMetadata } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const metadata = getExerciseMetadata(id);
  if (!metadata) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }
  return NextResponse.json(metadata);
}
