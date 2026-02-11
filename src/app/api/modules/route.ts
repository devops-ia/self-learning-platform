import { NextResponse } from "next/server";
import { getModulesFromDB } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET() {
  const modules = getModulesFromDB();
  return NextResponse.json({ modules });
}
