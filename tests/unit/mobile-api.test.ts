import { describe, expect, it } from "vitest";
import { parseBearer } from "@/lib/auth/session";
import { companionMessage, readJson, resultResponse } from "@/lib/http/api";
import { FeatureLockedError, QuotaExceededError } from "@/lib/billing/usage";
import { toActionError } from "@/lib/actions";
import { PLANS } from "@/lib/billing/plans";

describe("parseBearer", () => {
  it("accepts JWTs and local session tokens", () => {
    expect(parseBearer("Bearer abc.def.ghi-jkl_mno")).toBe("abc.def.ghi-jkl_mno");
    expect(parseBearer("bearer 00000000-0000-4000-8000-00000000d3e0.1790000000.c2lnbmF0dXJl")).toContain("d3e0");
  });
  it("rejects missing, malformed or too-short values", () => {
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer("Basic dXNlcjpwYXNz")).toBeNull();
    expect(parseBearer("Bearer short")).toBeNull();
    expect(parseBearer("Bearer has spaces in it")).toBeNull();
  });
});

describe("companion (iOS) messaging", () => {
  const asFailure = (error: unknown) => {
    const r = toActionError(error, "test");
    if (r.ok) throw new Error("expected failure");
    return r;
  };

  it("never tells the app user to upgrade or buy", () => {
    const quota = asFailure(new QuotaExceededError("campaign_generation", 1, PLANS.starter));
    expect(quota.error).toMatch(/upgrade/i); // the website keeps its upgrade prompt
    expect(companionMessage(quota)).toBe("You've reached your plan's limit for campaign generations this month (1).");

    const feature = asFailure(new FeatureLockedError("The content calendar", PLANS.starter));
    const msg = companionMessage(feature);
    expect(msg).not.toMatch(/upgrade|starter|growth|pro\b|plan and above/i);
    expect(msg).toContain("The content calendar");
  });

  it("omits upgradeTo and maps codes to HTTP statuses", async () => {
    const res = resultResponse(asFailure(new FeatureLockedError("Saved preferences", PLANS.growth)));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).not.toHaveProperty("upgradeTo");
    expect(body.code).toBe("feature");

    expect(resultResponse({ ok: false, error: "x", code: "validation" }).status).toBe(422);
    expect(resultResponse({ ok: false, error: "x", code: "not_found" }).status).toBe(404);
    expect(resultResponse({ ok: false, error: "x", code: "rule" }).status).toBe(409);
    const created = resultResponse({ ok: true, data: { id: "1" } }, 201);
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ data: { id: "1" } });
  });
});

describe("readJson", () => {
  it("returns undefined for invalid or oversized bodies", async () => {
    expect(await readJson(new Request("http://x", { method: "POST", body: "{not json" }))).toBeUndefined();
    expect(await readJson(new Request("http://x", { method: "POST", body: "x".repeat(300_000) }))).toBeUndefined();
    expect(await readJson(new Request("http://x", { method: "POST", body: '{"a":1}' }))).toEqual({ a: 1 });
  });
});
