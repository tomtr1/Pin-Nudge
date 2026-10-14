import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/session";
import { assertFeature, getEntitlement } from "@/lib/billing/usage";
import { getAdminRepository } from "@/lib/data";
import { buildCampaignZip, campaignSlug, exportFilenames } from "@/lib/export/campaign";
import { pinsToCsv } from "@/lib/export/csv";
import { campaignSummaryMarkdown } from "@/lib/export/summary";
import { errorResponse, jsonError } from "@/lib/http/responses";

export const runtime = "nodejs";
export const maxDuration = 60;

const querySchema = z.object({
  format: z.enum(["zip", "csv", "summary"]),
  scope: z.enum(["approved", "all"]).default("approved"),
});

/** GET /api/campaigns/:id/export?format=zip|csv|summary&scope=approved|all */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return jsonError(404, "Not found.");
  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return jsonError(400, "Unknown export format.");
  const ctx = await getUserContext();
  if (!ctx) return jsonError(401, "Please sign in.");

  try {
    const campaign = await ctx.repo.getCampaign(id);
    if (!campaign) return jsonError(404, "Not found.");
    const active = campaign.pins.filter((p) => p.status !== "archived");
    const pins = query.data.scope === "approved" ? active.filter((p) => p.status === "approved" || p.status === "published") : active;
    if (pins.length === 0) {
      return jsonError(400, query.data.scope === "approved" ? "Approve at least one pin before exporting." : "This campaign has no pins to export.");
    }
    const slug = campaignSlug(campaign);
    const names = exportFilenames(pins);
    const admin = getAdminRepository();

    if (query.data.format === "csv") {
      await admin.recordUsage(ctx.user.id, "csv_export", 1, { campaignId: id }).catch(() => undefined);
      return new NextResponse(pinsToCsv(pins, campaign.angles, names, campaign.generationSource), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}_pins.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (query.data.format === "summary") {
      return new NextResponse(campaignSummaryMarkdown({ ...campaign, pins }, names), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}_summary.md"`,
          "Cache-Control": "no-store",
        },
      });
    }

    assertFeature(await getEntitlement(ctx.repo), "zipExport", "Batch ZIP export");
    const zip = await buildCampaignZip(ctx.repo, campaign, pins);
    await admin.recordUsage(ctx.user.id, "zip_export", 1, { campaignId: id, pins: pins.length }).catch(() => undefined);
    return new NextResponse(Buffer.from(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}_pins.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error, "campaign.export");
  }
}
