import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Lightbulb } from "lucide-react";
import { DeleteMetricButton } from "@/components/analytics/delete-metric";
import { MetricForm, type PinOption } from "@/components/analytics/metric-form";
import { OutboundChart, type ChartRow } from "@/components/analytics/outbound-chart";
import { FeatureLocked } from "@/components/billing/feature-locked";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Notice, PageHeader, Stat } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { buildInsights, MIN_IMPRESSIONS } from "@/lib/analytics/insights";
import { computeRates, formatCount, formatRate, sumMetrics } from "@/lib/analytics/metrics";
import { requireUserContext } from "@/lib/auth/session";
import { minimumPlanFor } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/usage";
import { formatDate } from "@/lib/utils";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Analytics" };

/** Default reporting period for the entry form: the last 7 days. */
function defaultPeriod() {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 86_400_000);
  return { today: end.toISOString().slice(0, 10), weekAgo: start.toISOString().slice(0, 10) };
}

export default async function AnalyticsPage() {
  const { repo } = await requireUserContext();
  const entitlement = await getEntitlement(repo);
  if (!entitlement.plan.features.analytics) {
    return (
      <>
        <PageHeader title="Analytics" description="Learn which pins and angles earn outbound clicks." />
        <FeatureLocked
          plan={minimumPlanFor("analytics")}
          title="Performance tracking is part of Growth and Pro"
          description="Record your pins' results, compare campaigns and angles, and get suggestions that always show the numbers behind them."
        />
      </>
    );
  }

  const [campaigns, pins, metrics] = await Promise.all([repo.listCampaigns(), repo.listPins(), repo.listMetrics()]);
  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));
  const angleNames = new Map<string, string>();
  const detailed = entitlement.plan.features.campaignComparison === "detailed";
  if (metrics.length) {
    const withMetrics = new Set(pins.filter((p) => metrics.some((m) => m.pinId === p.id)).map((p) => p.campaignId));
    const details = await Promise.all([...withMetrics].map((id) => repo.getCampaign(id)));
    for (const c of details) for (const a of c?.angles ?? []) angleNames.set(a.id, a.name);
  }

  const pinOptions: PinOption[] = pins
    .filter((p) => p.status !== "archived")
    .map((p) => ({ id: p.id, title: p.title, campaignName: campaignName.get(p.campaignId) ?? "Campaign" }));
  const pinById = new Map(pins.map((p) => [p.id, p]));

  const totals = sumMetrics(metrics);
  const rates = computeRates(totals);

  const perPin = pins
    .map((p) => ({ pin: p, metrics: metrics.filter((m) => m.pinId === p.id) }))
    .filter((x) => x.metrics.length > 0)
    .map((x) => ({ ...x, totals: sumMetrics(x.metrics) }))
    .map((x) => ({ ...x, rates: computeRates(x.totals) }));

  const chartRows: ChartRow[] = perPin
    .filter((x) => x.rates.outboundClickRate !== null)
    .sort((a, b) => (b.rates.outboundClickRate ?? 0) - (a.rates.outboundClickRate ?? 0))
    .slice(0, 12)
    .map((x) => ({ label: x.pin.title, rate: x.rates.outboundClickRate ?? 0, outbound: x.totals.outboundClicks ?? 0, impressions: x.totals.impressions ?? 0 }));

  const insights = buildInsights(
    perPin.map((x) => ({
      pinId: x.pin.id,
      title: x.pin.title,
      angleName: x.pin.angleId ? (angleNames.get(x.pin.angleId) ?? null) : null,
      campaignName: campaignName.get(x.pin.campaignId) ?? "",
      metrics: x.metrics,
    })),
  );

  const byCampaign = campaigns
    .map((c) => {
      const ms = metrics.filter((m) => pinById.get(m.pinId)?.campaignId === c.id);
      const t = sumMetrics(ms);
      return { c, t, r: computeRates(t), pins: new Set(ms.map((m) => m.pinId)).size };
    })
    .filter((x) => x.t.periods > 0);

  const byAngle = detailed
    ? [...angleNames.entries()]
        .map(([id, name]) => {
          const ms = metrics.filter((m) => pinById.get(m.pinId)?.angleId === id);
          const t = sumMetrics(ms);
          return { id, name, t, r: computeRates(t) };
        })
        .filter((x) => x.t.periods > 0)
    : [];

  return (
    <>
      <PageHeader title="Analytics" description="Results you record for your pins, and what they suggest." />
      <Notice tone="info" className="mb-6" icon={<BarChart3 />}>
        {brand.name} isn't connected to Pinterest, so all figures here are <strong>manually reported</strong> by you. Clicks are not linked to Etsy sales —
        {brand.name} has no data that could attribute a sale to a pin.
      </Notice>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {metrics.length === 0 ? (
            <EmptyState
              icon={<BarChart3 />}
              title="No results recorded yet"
              description="After your pins have been live for a while, copy their impressions and clicks from Pinterest analytics into the form. Comparisons appear once there's enough data."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Impressions" value={formatCount(totals.impressions)} hint="Manually reported" />
                <Stat label="Outbound clicks" value={formatCount(totals.outboundClicks)} hint={`Rate ${formatRate(rates.outboundClickRate)}`} />
                <Stat label="Saves" value={formatCount(totals.saves)} hint={`Rate ${formatRate(rates.saveRate)}`} />
                <Stat label="Engagement rate" value={formatRate(rates.engagementRate)} hint="(saves + clicks) ÷ impressions" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Lightbulb className="size-4 text-accent" /> What the data suggests</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {insights.map((i, n) => (
                      <li key={n} className="rounded-md border border-border p-3">
                        <p className="font-medium">{i.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">Evidence:</span> {i.evidence}</p>
                        <p className="mt-1 text-sm"><span className="font-medium">Suggestion:</span> {i.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">Pins need at least {MIN_IMPRESSIONS} impressions to be compared.</p>
                </CardContent>
              </Card>

              {chartRows.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Outbound click rate by pin</CardTitle>
                    <p className="text-sm text-muted-foreground">Outbound clicks ÷ impressions, for pins with recorded impressions. Manually reported.</p>
                  </CardHeader>
                  <CardContent>
                    <OutboundChart rows={chartRows} />
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader><CardTitle>Campaign comparison</CardTitle></CardHeader>
                <CardContent className="px-2">
                  <Table>
                    <THead>
                      <tr><TH>Campaign</TH><TH>Pins with data</TH><TH>Impressions</TH><TH>Outbound</TH><TH>Outbound rate</TH><TH>Engagement</TH></tr>
                    </THead>
                    <TBody>
                      {byCampaign.map(({ c, t, r, pins: n }) => (
                        <TR key={c.id}>
                          <TD><Link href={`/campaigns/${c.id}`} className="hover:underline">{c.name}</Link></TD>
                          <TD className="tabular-nums">{n}</TD>
                          <TD className="tabular-nums">{formatCount(t.impressions)}</TD>
                          <TD className="tabular-nums">{formatCount(t.outboundClicks)}</TD>
                          <TD className="tabular-nums">{formatRate(r.outboundClickRate)}</TD>
                          <TD className="tabular-nums">{formatRate(r.engagementRate)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </CardContent>
              </Card>

              {detailed && byAngle.length ? (
                <Card>
                  <CardHeader><CardTitle>Angle comparison</CardTitle></CardHeader>
                  <CardContent className="px-2">
                    <Table>
                      <THead>
                        <tr><TH>Angle</TH><TH>Impressions</TH><TH>Saves</TH><TH>Outbound</TH><TH>Outbound rate</TH><TH>Save rate</TH></tr>
                      </THead>
                      <TBody>
                        {byAngle.map((a) => (
                          <TR key={a.id}>
                            <TD>{a.name}</TD>
                            <TD className="tabular-nums">{formatCount(a.t.impressions)}</TD>
                            <TD className="tabular-nums">{formatCount(a.t.saves)}</TD>
                            <TD className="tabular-nums">{formatCount(a.t.outboundClicks)}</TD>
                            <TD className="tabular-nums">{formatRate(a.r.outboundClickRate)}</TD>
                            <TD className="tabular-nums">{formatRate(a.r.saveRate)}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader><CardTitle>Recorded entries</CardTitle></CardHeader>
                <CardContent className="px-2">
                  <Table>
                    <THead>
                      <tr><TH>Pin</TH><TH>Period</TH><TH>Impr.</TH><TH>Saves</TH><TH>Pin clicks</TH><TH>Outbound</TH><TH>Source</TH><TH><span className="sr-only">Actions</span></TH></tr>
                    </THead>
                    <TBody>
                      {metrics.map((m) => (
                        <TR key={m.id}>
                          <TD className="max-w-56">
                            <span className="line-clamp-2">{pinById.get(m.pinId)?.title ?? "Deleted pin"}</span>
                            {m.notes ? <span className="mt-0.5 block text-xs text-muted-foreground">{m.notes}</span> : null}
                          </TD>
                          <TD className="whitespace-nowrap text-xs">{formatDate(m.periodStart)} – {formatDate(m.periodEnd)}</TD>
                          <TD className="tabular-nums">{formatCount(m.impressions)}</TD>
                          <TD className="tabular-nums">{formatCount(m.saves)}</TD>
                          <TD className="tabular-nums">{formatCount(m.pinClicks)}</TD>
                          <TD className="tabular-nums">{formatCount(m.outboundClicks)}</TD>
                          <TD><Badge tone={m.source === "manual" ? "neutral" : "info"}>{m.source === "manual" ? "Manual" : "Imported"}</Badge></TD>
                          <TD><DeleteMetricButton id={m.id} /></TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Add results</CardTitle>
            <p className="text-sm text-muted-foreground">One entry per pin per reporting period. Earlier periods are kept, not overwritten.</p>
          </CardHeader>
          <CardContent>
            {pinOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Create a campaign first — you'll record results for its pins here.</p>
            ) : (
              <MetricForm pins={pinOptions} {...defaultPeriod()} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
