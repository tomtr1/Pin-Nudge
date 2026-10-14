import { describe, expect, it } from "vitest";
import { buildInsights, MIN_IMPRESSIONS } from "@/lib/analytics/insights";
import { computeRates, formatRate, safeRate, sumMetrics } from "@/lib/analytics/metrics";
import { canTransitionPin, deriveCampaignStatus } from "@/lib/campaigns/status";
import { csvCell, toCsv } from "@/lib/export/csv";
import { sniffImage } from "@/lib/storage/uploads";
import type { PinMetric } from "@/types/domain";

const metric = (pinId: string, p: Partial<PinMetric>): PinMetric => ({
  id: Math.random().toString(),
  pinId,
  userId: "u",
  source: "manual",
  periodStart: "2026-10-01",
  periodEnd: "2026-10-07",
  impressions: null,
  saves: null,
  pinClicks: null,
  outboundClicks: null,
  notes: null,
  createdAt: "",
  ...p,
});

describe("metric calculations", () => {
  it("never divides by zero or treats missing values as zero", () => {
    expect(safeRate(5, 0)).toBeNull();
    expect(safeRate(5, null)).toBeNull();
    expect(safeRate(null, 100)).toBeNull();
    expect(safeRate(5, 100)).toBe(0.05);
    const t = sumMetrics([metric("a", { impressions: 100 }), metric("a", { outboundClicks: 4 })]);
    expect(t).toMatchObject({ impressions: 100, outboundClicks: 4, saves: null, pinClicks: null, periods: 2 });
    const r = computeRates(t);
    expect(r.outboundClickRate).toBe(0.04);
    expect(r.saveRate).toBeNull();
    expect(r.engagementRate).toBe(0.04);
    expect(computeRates(sumMetrics([]))).toEqual({ engagementRate: null, outboundClickRate: null, saveRate: null });
    expect(formatRate(null)).toBe("—");
  });
});

describe("insights", () => {
  it("says there's not enough data instead of guessing", () => {
    const out = buildInsights([{ pinId: "a", title: "A", angleName: null, campaignName: "C", metrics: [metric("a", { impressions: 50, outboundClicks: 5 })] }]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("insufficient");
  });
  it("cites the evidence behind a comparison", () => {
    const out = buildInsights([
      { pinId: "a", title: "Pin A", angleName: "Beginners", campaignName: "C", metrics: [metric("a", { impressions: 1000, outboundClicks: 40 })] },
      { pinId: "b", title: "Pin B", angleName: "Students", campaignName: "C", metrics: [metric("b", { impressions: 1000, outboundClicks: 10 })] },
    ]);
    const top = out.find((i) => i.kind === "top_outbound");
    expect(top?.title).toContain("Pin A");
    expect(top?.evidence).toContain("4.0%");
    expect(top?.evidence).toContain("1.0%");
    expect(out.some((i) => i.kind === "angle_comparison")).toBe(true);
    expect(out.every((i) => !/sale/i.test(i.suggestion))).toBe(true);
  });
  it("ignores pins below the impressions threshold", () => {
    const out = buildInsights([
      { pinId: "a", title: "A", angleName: null, campaignName: "C", metrics: [metric("a", { impressions: MIN_IMPRESSIONS - 1, outboundClicks: 50 })] },
      { pinId: "b", title: "B", angleName: null, campaignName: "C", metrics: [metric("b", { impressions: 5000, outboundClicks: 1 })] },
    ]);
    expect(out[0].kind).toBe("insufficient");
  });
});

describe("campaign status transitions", () => {
  it("only allows real workflow transitions for pins", () => {
    expect(canTransitionPin("draft", "approved")).toBe(true);
    expect(canTransitionPin("draft", "published")).toBe(false);
    expect(canTransitionPin("approved", "published")).toBe(true);
    expect(canTransitionPin("published", "draft")).toBe(false);
    expect(canTransitionPin("published", "approved")).toBe(true);
  });
  it("derives campaign status from its pins", () => {
    expect(deriveCampaignStatus([], "draft")).toBe("draft");
    expect(deriveCampaignStatus([{ status: "draft", plannedFor: null }], "ready")).toBe("draft");
    expect(deriveCampaignStatus([{ status: "approved", plannedFor: null }], "draft")).toBe("ready");
    expect(deriveCampaignStatus([{ status: "approved", plannedFor: "2026-10-20" }, { status: "published", plannedFor: null }], "draft")).toBe("planned");
    expect(deriveCampaignStatus([{ status: "published", plannedFor: null }], "planned")).toBe("published");
    expect(deriveCampaignStatus([{ status: "approved", plannedFor: null }], "archived")).toBe("archived");
  });
});

describe("csv export", () => {
  it("quotes and neutralises spreadsheet formulas", () => {
    expect(csvCell('He said "hi", then left')).toBe('"He said ""hi"", then left"');
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell(["a", "b"])).toBe('"a, b"');
    expect(csvCell(null)).toBe("");
    expect(toCsv([["a", "b"]]).startsWith("﻿a,b\r\n")).toBe(true);
  });
});

describe("upload sniffing", () => {
  it("accepts PNG/JPEG by magic bytes and rejects everything else", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toMatchObject({ ok: true, extension: "png" });
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toMatchObject({ ok: true, extension: "jpg" });
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")).ok).toBe(false);
    expect(sniffImage(new Uint8Array(0)).ok).toBe(false);
    expect(sniffImage(new Uint8Array(5 * 1024 * 1024 + 1)).ok).toBe(false);
  });
});
