import { NextResponse } from "next/server";
import { getModuleExerciseList, getModuleFromDB } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const { module } = await params;
  const moduleData = getModuleFromDB(module);
  if (!moduleData) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const exercises = getModuleExerciseList(module);
  return NextResponse.json({ module: moduleData, exercises });
}
