"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartRow {
  label: string;
  rate: number; // fraction
  outbound: number;
  impressions: number;
}

const pct = (v: number) => `${(v * 100).toFixed(v < 0.01 ? 2 : 1)}%`;

function TooltipBody({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="max-w-64 font-medium text-foreground">{r.label}</p>
      <p className="mt-1 text-muted-foreground">
        <span className="font-medium text-foreground">{pct(r.rate)}</span> outbound click rate
      </p>
      <p className="text-muted-foreground">
        {r.outbound.toLocaleString("en-GB")} outbound clicks · {r.impressions.toLocaleString("en-GB")} impressions
      </p>
    </div>
  );
}

/** Single-series horizontal bars: outbound click rate per pin (manually reported data). */
export function OutboundChart({ rows }: { rows: ChartRow[] }) {
  const height = Math.max(120, rows.length * 36 + 40);
  return (
    <div style={{ height }} role="img" aria-label="Bar chart of outbound click rate per pin. The same data is listed in the table below.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis type="number" tickFormatter={pct} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={170}
            tick={{ fontSize: 12, fill: "var(--foreground)" }}
            tickFormatter={(v: string) => (v.length > 26 ? `${v.slice(0, 25)}…` : v)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<TooltipBody />} cursor={{ fill: "var(--surface-muted)" }} />
          <Bar dataKey="rate" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            <LabelList dataKey="rate" position="right" formatter={(v: unknown) => pct(Number(v))} style={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
