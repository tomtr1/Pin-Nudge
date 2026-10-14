import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { errorResponse, jsonError } from "@/lib/http/responses";

export const runtime = "nodejs";

/** GET /api/account/export — downloads all of the signed-in user's records as JSON. */
export async function GET() {
  const ctx = await getUserContext();
  if (!ctx) return jsonError(401, "Please sign in.");
  try {
    const data = await ctx.repo.exportAll();
    const body = JSON.stringify(
      { exportedAt: new Date().toISOString(), product: brand.name, account: { id: ctx.user.id, email: ctx.user.email }, data },
      null,
      2,
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${brand.slug}-account-export.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error, "account.export");
  }
}
