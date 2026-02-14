import { NextResponse } from "next/server";
import { isRegistrationEnabled, isDemoMode, getPlatformTitle } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    registrationEnabled: isRegistrationEnabled(),
    demoMode: isDemoMode(),
    platformTitle: getPlatformTitle(),
  });
}
