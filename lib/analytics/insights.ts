import { computeRates, formatCount, formatRate, sumMetrics } from "./metrics";
import type { PinMetric } from "@/types/domain";

/**
 * Evidence-based suggestions derived only from recorded metrics. Every
 * insight states the numbers it is based on. When the data is too thin, we
 * say so instead of guessing. No claims about Etsy sales are ever made —
 * PinNudge has no attribution data.
 */
export interface PinPerformance {
  pinId: string;
  title: string;
  angleName: string | null;
  campaignName: string;
  metrics: PinMetric[];
}

export interface Insight {
  kind: "top_outbound" | "angle_comparison" | "low_engagement" | "insufficient";
  title: string;
  evidence: string;
  suggestion: string;
}

/** Minimum impressions before a pin's rates are considered comparable. */
export const MIN_IMPRESSIONS = 200;

export function buildInsights(pins: PinPerformance[]): Insight[] {
  const scored = pins
    .map((p) => {
      const totals = sumMetrics(p.metrics);
      return { ...p, totals, rates: computeRates(totals) };
    })
    .filter((p) => p.totals.impressions !== null && p.totals.impressions >= MIN_IMPRESSIONS && p.rates.outboundClickRate !== null);

  if (scored.length < 2) {
    return [
      {
        kind: "insufficient",
        title: "Not enough data for a reliable comparison yet",
        evidence: `${scored.length} pin${scored.length === 1 ? " has" : "s have"} at least ${MIN_IMPRESSIONS} recorded impressions with outbound clicks.`,
        suggestion: `Record results for at least two pins with ${MIN_IMPRESSIONS}+ impressions each, ideally for the same reporting period, before drawing conclusions.`,
      },
    ];
  }

  const insights: Insight[] = [];
  const byOutbound = [...scored].sort((a, b) => (b.rates.outboundClickRate ?? 0) - (a.rates.outboundClickRate ?? 0));
  const best = byOutbound[0];
  const worst = byOutbound[byOutbound.length - 1];
  if ((best.rates.outboundClickRate ?? 0) > 0 && best.pinId !== worst.pinId && (best.rates.outboundClickRate ?? 0) >= (worst.rates.outboundClickRate ?? 0) * 1.5) {
    insights.push({
      kind: "top_outbound",
      title: `“${best.title}” is sending the most visitors per impression`,
      evidence: `${formatRate(best.rates.outboundClickRate)} outbound click rate (${formatCount(best.totals.outboundClicks)} clicks from ${formatCount(best.totals.impressions)} impressions) vs ${formatRate(worst.rates.outboundClickRate)} for “${worst.title}”.`,
      suggestion: `Consider testing a similar message${best.angleName ? ` (the “${best.angleName}” angle)` : ""} on another product. Check that both pins were measured over comparable periods.`,
    });
  }

  const angles = new Map<string, { outbound: number; impressions: number; pins: number }>();
  for (const p of scored) {
    if (!p.angleName) continue;
    const a = angles.get(p.angleName) ?? { outbound: 0, impressions: 0, pins: 0 };
    a.outbound += p.totals.outboundClicks ?? 0;
    a.impressions += p.totals.impressions ?? 0;
    a.pins += 1;
    angles.set(p.angleName, a);
  }
  const angleList = [...angles.entries()].filter(([, v]) => v.impressions >= MIN_IMPRESSIONS);
  if (angleList.length >= 2) {
    angleList.sort((a, b) => b[1].outbound / b[1].impressions - a[1].outbound / a[1].impressions);
    const [topName, top] = angleList[0];
    const [lowName, low] = angleList[angleList.length - 1];
    insights.push({
      kind: "angle_comparison",
      title: `The “${topName}” angle is outperforming “${lowName}” on outbound clicks`,
      evidence: `${formatRate(top.outbound / top.impressions)} across ${top.pins} pin(s) vs ${formatRate(low.outbound / low.impressions)} across ${low.pins} pin(s).`,
      suggestion: `Create your next pins with the “${topName}” angle and keep one variation of “${lowName}” running as a control.`,
    });
  }

  const zeroOutbound = scored.filter((p) => (p.totals.impressions ?? 0) >= MIN_IMPRESSIONS * 5 && (p.totals.outboundClicks ?? 0) === 0);
  for (const p of zeroOutbound.slice(0, 2)) {
    insights.push({
      kind: "low_engagement",
      title: `“${p.title}” hasn't produced outbound clicks yet`,
      evidence: `${formatCount(p.totals.impressions)} impressions and 0 recorded outbound clicks.`,
      suggestion: "Try regenerating the headline or creative concept, or check that the destination link is correct.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      kind: "insufficient",
      title: "No clear differences yet",
      evidence: `${scored.length} pins have comparable data, but their outbound click rates are close together.`,
      suggestion: "Keep collecting results; small differences are often noise.",
    });
  }
  return insights;
}
