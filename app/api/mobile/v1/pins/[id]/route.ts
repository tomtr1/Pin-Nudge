import { fail, ok } from "@/lib/actions";
import { apiRoute, readJson } from "@/lib/http/api";
import * as pins from "@/lib/operations/pins";

export const runtime = "nodejs";

type P = { id: string };

export const GET = apiRoute<P>("pins.get", async ({ repo }, _request, { id }) => {
  const pin = /^[0-9a-f-]{36}$/i.test(id) ? await repo.getPin(id) : null;
  return pin ? ok(pin) : fail("Pin not found.", { code: "not_found" });
});

/** PUT /api/mobile/v1/pins/:id — saves edited copy and design. */
export const PUT = apiRoute<P>("pins.save", async (ctx, request, { id }) => pins.savePin(ctx, id, await readJson(request)));

export const DELETE = apiRoute<P>("pins.delete", (ctx, _request, { id }) => pins.deletePin(ctx, id));
