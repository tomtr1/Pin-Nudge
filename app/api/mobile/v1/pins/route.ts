import { z } from "zod";
import { fail, ok } from "@/lib/actions";
import { apiRoute } from "@/lib/http/api";

export const runtime = "nodejs";

const query = z.object({
  campaignId: z.uuid().optional(),
  status: z.enum(["draft", "approved", "published", "archived"]).optional(),
  plannedFrom: z.iso.date().optional(),
  plannedTo: z.iso.date().optional(),
});

/** GET /api/mobile/v1/pins?campaignId=&status=&plannedFrom=&plannedTo= (used by the calendar). */
export const GET = apiRoute("pins.list", async ({ repo }, request) => {
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return fail("Invalid filter.", { code: "validation" });
  const ranged = parsed.data.plannedFrom || parsed.data.plannedTo;
  return ok(await repo.listPins({ ...parsed.data, ...(ranged ? { hasPlannedDate: true } : {}) }));
});
