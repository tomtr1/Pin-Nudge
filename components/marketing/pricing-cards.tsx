import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice, PLAN_ORDER, PLANS } from "@/lib/billing/plans";
import type { PlanId } from "@/types/domain";

/**
 * Plan cards rendered from the central plan config. In the app, `action`
 * renders the upgrade control for each plan; on public pages the cards link to
 * sign-up.
 */
export function PricingCards({
  currentPlan,
  action,
}: {
  currentPlan?: PlanId;
  action?: (plan: PlanId) => React.ReactNode;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        const isCurrent = currentPlan === id;
        return (
          <div
            key={id}
            className={cn(
              "flex flex-col rounded-[4px] border bg-surface p-6",
              plan.highlight ? "border-foreground shadow-[6px_6px_0_0_var(--foreground)]" : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-3xl">{plan.name}</h3>
              {plan.highlight ? <Badge tone="solid">Most popular</Badge> : null}
              {isCurrent ? <Badge tone="solid">Current plan</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            <p className="mt-5">
              <span className="font-display text-5xl">{formatPrice(plan.priceMonthlyEur)}</span>
              <span className="text-sm text-muted-foreground"> / month</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {plan.marketingFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {action ? (
                action(id)
              ) : (
                <Button asChild className="w-full" variant={plan.highlight ? "primary" : "secondary"}>
                  <Link href={id === "free" ? "/signup" : `/signup?plan=${id}`}>{id === "free" ? "Start free" : `Choose ${plan.name}`}</Link>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
