import { apiRoute } from "@/lib/http/api";
import * as pins from "@/lib/operations/pins";

export const runtime = "nodejs";

export const POST = apiRoute<{ id: string }>("pins.duplicate", (ctx, _request, { id }) => pins.duplicatePin(ctx, id), 201);
