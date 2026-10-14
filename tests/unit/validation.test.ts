import { describe, expect, it } from "vitest";
import { dedupeFilenames, pinExportFilename, sanitizeFilename, slugify } from "@/lib/validations/filenames";
import { campaignCreateSchema, metricInputSchema, parseList, pinEditSchema, productInputSchema } from "@/lib/validations/schemas";
import { displayUrl, isEtsyListingUrl, isEtsyUrl, normalizeUrl } from "@/lib/validations/url";
import { DEFAULT_DESIGN } from "@/lib/pins/design";

describe("normalizeUrl", () => {
  it("accepts https and adds a scheme when missing", () => {
    expect(normalizeUrl("https://www.etsy.com/listing/123/x")).toEqual({ ok: true, url: "https://www.etsy.com/listing/123/x" });
    expect(normalizeUrl("www.etsy.com/shop/Foo")).toEqual({ ok: true, url: "https://www.etsy.com/shop/Foo" });
  });
  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://example.com/x", "file:///etc/passwd"])("rejects %s", (u) => {
    expect(normalizeUrl(u).ok).toBe(false);
  });
  it("rejects credentials, spaces, bare hosts and overlong URLs", () => {
    expect(normalizeUrl("https://user:pass@example.com").ok).toBe(false);
    expect(normalizeUrl("https://exa mple.com").ok).toBe(false);
    expect(normalizeUrl("http://localhost:3000").ok).toBe(false);
    expect(normalizeUrl(`https://example.com/${"a".repeat(2100)}`).ok).toBe(false);
    expect(normalizeUrl("").ok).toBe(false);
  });
  it("recognises Etsy listing links without fetching them", () => {
    expect(isEtsyUrl("https://www.etsy.com/shop/x")).toBe(true);
    expect(isEtsyUrl("https://etsy.com.evil.example/listing/1")).toBe(false);
    expect(isEtsyListingUrl("https://www.etsy.com/listing/123456/budget")).toBe(true);
    expect(isEtsyListingUrl("https://www.etsy.com/shop/x")).toBe(false);
  });
  it("shortens URLs for display", () => {
    expect(displayUrl("https://www.etsy.com/listing/1")).toBe("etsy.com/listing/1");
  });
});

describe("filenames", () => {
  it("slugifies accents, symbols and length", () => {
    expect(slugify("Crème Brûlée & Café!")).toBe("creme-brulee-and-cafe");
    expect(slugify("Größe Übung")).toBe("grosse-ubung");
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(40);
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
  });
  it("builds the product_angle_NN convention", () => {
    expect(pinExportFilename("Minimal Budget Planner", "Saving for a trip", 3)).toBe("minimal-budget-planner_saving-for-a-trip_03.png");
    expect(pinExportFilename("", "", 1)).toBe("product_pin_01.png");
  });
  it("sanitizes user-entered filenames and drops path tricks", () => {
    expect(sanitizeFilename("../My Pin.PNG")).toBe("my-pin");
    expect(sanitizeFilename("plan_ahead_01")).toBe("plan_ahead_01");
    expect(sanitizeFilename("///", "fallback name")).toBe("fallback-name");
  });
  it("de-duplicates names inside an archive", () => {
    expect(dedupeFilenames(["a.png", "a.png", "b.png", "A.png"])).toEqual(["a.png", "a-2.png", "b.png", "A-3.png"]);
  });
});

describe("schemas", () => {
  it("parses comma lists, trims and de-duplicates case-insensitively", () => {
    expect(parseList(" budget planner, Budget Planner ,, savings ")).toEqual(["budget planner", "savings"]);
  });

  it("validates product input", () => {
    const ok = productInputSchema.safeParse({ name: "Planner", keywords: "a, b", destinationUrl: "etsy.com/listing/1", price: "4,99", currency: "eur", tags: "" });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.price).toBe(4.99);
      expect(ok.data.currency).toBe("EUR");
      expect(ok.data.destinationUrl).toBe("https://etsy.com/listing/1");
    }
    expect(productInputSchema.safeParse({ name: "x", keywords: "", tags: "", price: "", currency: null }).success).toBe(false);
    expect(productInputSchema.safeParse({ name: "Planner", keywords: "", tags: "", price: "-1", currency: null }).success).toBe(false);
    expect(productInputSchema.safeParse({ name: "Planner", keywords: "", tags: "", price: "", currency: null, destinationUrl: "javascript:alert(1)" }).success).toBe(false);
    const tooMany = Array.from({ length: 21 }, (_, i) => `k${i}`).join(",");
    expect(productInputSchema.safeParse({ name: "Planner", keywords: tooMany, tags: "", price: "", currency: null }).success).toBe(false);
  });

  it("rejects campaign configurations with more angles than pins", () => {
    const base = { productId: "6f1c2b8e-4d1a-4c33-9a57-2f1d6c0e9b11", name: "", targetAudience: "" };
    const cfg = { pinCount: 3, angleCount: 3 };
    expect(campaignCreateSchema.safeParse({ ...base, config: cfg }).success).toBe(true);
    expect(campaignCreateSchema.safeParse({ ...base, config: { pinCount: 2, angleCount: 3 } }).success).toBe(false);
    expect(campaignCreateSchema.safeParse({ ...base, config: { pinCount: 25, angleCount: 3 } }).success).toBe(false);
    expect(campaignCreateSchema.safeParse({ ...base, productId: "nope", config: cfg }).success).toBe(false);
  });

  it("enforces Pinterest field limits on pin edits", () => {
    const pin = {
      title: "t",
      description: "d",
      primaryKeyword: "",
      keywords: "a,b",
      creativeConcept: "",
      headline: "h",
      subheadline: "",
      bullets: "one\n\ntwo",
      cta: "",
      destinationUrl: "",
      altText: "",
      filename: "",
      design: DEFAULT_DESIGN,
    };
    const ok = pinEditSchema.safeParse(pin);
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.bullets).toEqual(["one", "two"]);
      expect(ok.data.destinationUrl).toBeNull();
    }
    expect(pinEditSchema.safeParse({ ...pin, title: "x".repeat(101) }).success).toBe(false);
    expect(pinEditSchema.safeParse({ ...pin, description: "x".repeat(501) }).success).toBe(false);
    expect(pinEditSchema.safeParse({ ...pin, design: { ...DEFAULT_DESIGN, background: "red" } }).success).toBe(false);
    expect(pinEditSchema.safeParse({ ...pin, design: { ...DEFAULT_DESIGN, template: "nope" } }).success).toBe(false);
  });

  it("validates manually reported metrics", () => {
    const base = { pinId: "6f1c2b8e-4d1a-4c33-9a57-2f1d6c0e9b11", periodStart: "2026-10-01", periodEnd: "2026-10-07" };
    expect(metricInputSchema.safeParse({ ...base, impressions: "120", outboundClicks: "" }).success).toBe(true);
    expect(metricInputSchema.safeParse({ ...base }).success).toBe(false); // no metric at all
    expect(metricInputSchema.safeParse({ ...base, impressions: "-3" }).success).toBe(false);
    expect(metricInputSchema.safeParse({ ...base, impressions: "1.5" }).success).toBe(false);
    expect(metricInputSchema.safeParse({ ...base, periodEnd: "2026-09-01", impressions: 1 }).success).toBe(false);
  });
});
