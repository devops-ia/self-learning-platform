import { NextRequest, NextResponse } from "next/server";
import { executeCommand } from "@/lib/terminal/simulator";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { exerciseId, command, code, lang } = body;

  if (!exerciseId || command === undefined || !code) {
    return NextResponse.json(
      { error: "exerciseId, command, and code are required" },
      { status: 400 }
    );
  }

  const result = executeCommand(exerciseId, command, code, lang || "es");

  return NextResponse.json(result);
}
