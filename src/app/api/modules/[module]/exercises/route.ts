import { NextResponse } from "next/server";
import { getModuleExerciseList, getModuleFromDB } from "@/lib/exercises";
import { getCurrentUserId } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const { module } = await params;

  // Require auth when anonymous access is off
  const sessionUserId = await getCurrentUserId();
  if (!sessionUserId && !isDemoMode()) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const moduleData = getModuleFromDB(module);
  if (!moduleData) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const exercises = getModuleExerciseList(module);
  return NextResponse.json({ module: moduleData, exercises });
}
