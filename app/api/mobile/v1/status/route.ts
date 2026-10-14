import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai";
import { brand } from "@/lib/brand";
import { getDataMode } from "@/lib/env";

export const dynamic = "force-dynamic";

/** GET /api/mobile/v1/status — public server info the app needs before sign-in. */
export function GET() {
  const dataMode = getDataMode();
  return NextResponse.json(
    {
      data: {
        name: brand.name,
        apiVersion: 1,
        dataMode,
        auth: dataMode === "supabase" ? "password" : dataMode === "local" ? "local-demo" : "unavailable",
        aiMode: aiStatus().mode,
        disclaimer: brand.disclaimer,
        supportEmail: brand.supportEmail,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
