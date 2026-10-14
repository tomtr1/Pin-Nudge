import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import type { AccountUsage } from "@/lib/billing/usage";
import { formatDate } from "@/lib/utils";

export function UsageCard({ usage }: { usage: AccountUsage }) {
  const rows = [
    { label: "Campaign generations", q: usage.campaigns },
    { label: "Pin regenerations", q: usage.regenerations },
    { label: "Products", q: usage.products },
  ];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Plan &amp; usage</CardTitle>
        <Badge tone="accent">{usage.entitlement.plan.name}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="tabular-nums">
                {r.q.used} / {r.q.limit}
              </span>
            </div>
            <Progress value={r.q.used} max={r.q.limit} label={`${r.label}: ${r.q.used} of ${r.q.limit} used`} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Monthly limits reset on {formatDate(usage.periodEnd)}.</p>
        {usage.entitlement.planId !== "pro" ? (
          <Button asChild variant="secondary" size="sm" className="w-full">
            <Link href="/settings#billing">{usage.entitlement.isPaid ? "Change plan" : "Upgrade"}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
