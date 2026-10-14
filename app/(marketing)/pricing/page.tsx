import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PLAN_ORDER, PLANS } from "@/lib/billing/plans";
import { TEMPLATE_META } from "@/lib/pins/design";

export const metadata: Metadata = { title: "Pricing", description: "PinNudge plans and pricing." };

const yes = <Check className="size-4 text-accent" aria-label="Included" />;
const no = <Minus className="size-4 text-muted-foreground" aria-label="Not included" />;

export default function PricingPage() {
  const rows: { label: string; value: (id: (typeof PLAN_ORDER)[number]) => React.ReactNode }[] = [
    { label: "Products", value: (id) => PLANS[id].limits.products },
    { label: "Campaign generations / month", value: (id) => PLANS[id].limits.campaignGenerationsPerMonth },
    { label: "Pins per campaign", value: (id) => PLANS[id].limits.pinsPerCampaign },
    { label: "Marketing angles per campaign", value: (id) => PLANS[id].limits.anglesPerCampaign },
    { label: "Single-pin regenerations / month", value: (id) => PLANS[id].limits.regenerationsPerMonth },
    { label: "Templates", value: (id) => PLANS[id].features.templates.map((t) => TEMPLATE_META[t].name).length },
    { label: "Custom colours", value: (id) => (PLANS[id].features.customColors ? yes : no) },
    { label: "All typography presets", value: (id) => (PLANS[id].features.allFontPresets ? yes : no) },
    { label: "Individual PNG & CSV export", value: () => yes },
    { label: "Batch ZIP export", value: (id) => (PLANS[id].features.zipExport ? yes : no) },
    { label: "Content calendar", value: (id) => (PLANS[id].features.calendar ? yes : no) },
    { label: "Saved campaign preferences", value: (id) => (PLANS[id].features.savedPreferences ? yes : no) },
    { label: "Performance tracking (manual entry)", value: (id) => (PLANS[id].features.analytics ? yes : no) },
    {
      label: "Campaign comparisons",
      value: (id) => ({ none: no, basic: "Basic", detailed: "Detailed" })[PLANS[id].features.campaignComparison],
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Monthly subscriptions billed in euros through Stripe. Cancel any time from the billing portal; you keep access until the end of the paid period.
        Usage limits reset on the first day of each calendar month (UTC).
      </p>
      <div className="mt-10">
        <PricingCards />
      </div>

      <h2 className="mt-16 text-xl font-semibold">Compare plans</h2>
      <div className="mt-4 rounded-lg border border-border bg-surface">
        <Table>
          <THead>
            <tr>
              <TH className="w-1/3">Feature</TH>
              {PLAN_ORDER.map((id) => (
                <TH key={id}>{PLANS[id].name}</TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.label}>
                <TD className="text-muted-foreground">{r.label}</TD>
                {PLAN_ORDER.map((id) => (
                  <TD key={id} className="tabular-nums">
                    {r.value(id)}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Subscription terms: plans renew monthly until canceled. If a payment fails, paid features stay available while Stripe retries the payment;
        after a subscription ends the account returns to the Free plan and your saved products and campaigns remain available within Free plan limits.
        The final price, including any applicable taxes, is shown on the Stripe checkout page before you pay.
      </p>
    </div>
  );
}
