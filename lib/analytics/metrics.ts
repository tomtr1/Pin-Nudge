import type { MetricSource, PinMetric } from "@/types/domain";

/**
 * Metric calculations. Rates are only computed when their denominator is a
 * known, positive number; otherwise they are null ("not enough data"), never 0.
 *
 *   engagement rate     = (saves + pin clicks + outbound clicks) / impressions
 *   outbound click rate = outbound clicks / impressions
 *   save rate           = saves / impressions
 */
export interface MetricTotals {
  impressions: number | null;
  saves: number | null;
  pinClicks: number | null;
  outboundClicks: number | null;
  periods: number;
  sources: MetricSource[];
}

export interface MetricRates {
  engagementRate: number | null;
  outboundClickRate: number | null;
  saveRate: number | null;
}

function addNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return a + b;
}

export function sumMetrics(metrics: Pick<PinMetric, "impressions" | "saves" | "pinClicks" | "outboundClicks" | "source">[]): MetricTotals {
  const totals: MetricTotals = { impressions: null, saves: null, pinClicks: null, outboundClicks: null, periods: metrics.length, sources: [] };
  for (const m of metrics) {
    totals.impressions = addNullable(totals.impressions, m.impressions);
    totals.saves = addNullable(totals.saves, m.saves);
    totals.pinClicks = addNullable(totals.pinClicks, m.pinClicks);
    totals.outboundClicks = addNullable(totals.outboundClicks, m.outboundClicks);
    if (!totals.sources.includes(m.source)) totals.sources.push(m.source);
  }
  return totals;
}

export function safeRate(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

export function computeRates(t: MetricTotals): MetricRates {
  const interactions =
    t.saves === null && t.pinClicks === null && t.outboundClicks === null ? null : (t.saves ?? 0) + (t.pinClicks ?? 0) + (t.outboundClicks ?? 0);
  return {
    engagementRate: safeRate(interactions, t.impressions),
    outboundClickRate: safeRate(t.outboundClicks, t.impressions),
    saveRate: safeRate(t.saves, t.impressions),
  };
}

export function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(rate < 0.01 ? 2 : 1)}%`;
}

export function formatCount(n: number | null): string {
  return n === null ? "—" : new Intl.NumberFormat("en-GB").format(n);
}
