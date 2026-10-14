import type { Metadata } from "next";
import { Download, Link2, Lock, ShieldAlert } from "lucide-react";
import { CheckoutButton, PortalButton } from "@/components/billing/plan-actions";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { DefaultsForm, DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/settings/settings-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/ui/misc";
import { requireUserContext } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { PLAN_ORDER } from "@/lib/billing/plans";
import { getAccountUsage } from "@/lib/billing/usage";
import { isStripeConfigured } from "@/lib/env";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

const STATUS_LABELS: Record<string, string> = {
  none: "No subscription",
  active: "Active",
  trialing: "Trial",
  past_due: "Payment overdue",
  canceled: "Canceled",
  incomplete: "Checkout not completed",
  incomplete_expired: "Checkout expired",
  unpaid: "Unpaid",
  paused: "Paused",
};

const sections = [
  ["profile", "Profile & store"],
  ["defaults", "Campaign preferences"],
  ["security", "Account security"],
  ["billing", "Plan & billing"],
  ["integrations", "Integrations"],
  ["privacy", "Privacy & data"],
] as const;

export default async function SettingsPage() {
  const { user, repo } = await requireUserContext();
  const [profile, usage, sub, integrations] = await Promise.all([repo.getProfile(), getAccountUsage(repo), repo.getSubscription(), repo.listIntegrations()]);
  const ent = usage.entitlement;
  const billingLive = isStripeConfigured();
  const currentIndex = PLAN_ORDER.indexOf(ent.planId);

  return (
    <>
      <PageHeader title="Settings" description={user.email ?? undefined} />
      <div className="grid gap-8 lg:grid-cols-[180px_1fr]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex flex-wrap gap-1 text-sm lg:flex-col">
            {sections.map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="block rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground">{label}</a></li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-8">
          <Card id="profile" className="scroll-mt-6">
            <CardHeader>
              <CardTitle>Profile &amp; store</CardTitle>
              <CardDescription>Used to tailor suggestions. Your language choice sets the default for new campaigns.</CardDescription>
            </CardHeader>
            <CardContent><ProfileForm profile={profile} /></CardContent>
          </Card>

          <Card id="defaults" className="scroll-mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Default campaign preferences {!ent.plan.features.savedPreferences ? <Badge>Growth+</Badge> : null}</CardTitle>
              <CardDescription>Pre-fill new campaigns with your usual tone, pin count, template and brand colours.</CardDescription>
            </CardHeader>
            <CardContent>
              <DefaultsForm defaults={profile?.campaignDefaults ?? {}} templates={ent.plan.features.templates} enabled={ent.plan.features.savedPreferences} />
            </CardContent>
          </Card>

          <Card id="security" className="scroll-mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="size-4" /> Account security</CardTitle>
            </CardHeader>
            <CardContent>
              {user.mode === "supabase" ? <PasswordForm /> : <p className="text-sm text-muted-foreground">Passwords aren't used in local demo mode.</p>}
            </CardContent>
          </Card>

          <Card id="billing" className="scroll-mt-6">
            <CardHeader>
              <CardTitle>Plan &amp; billing</CardTitle>
              <CardDescription>
                You're on <strong className="text-foreground">{ent.plan.name}</strong>
                {sub && sub.status !== "none" ? <> · {STATUS_LABELS[sub.status] ?? sub.status}</> : null}
                {ent.isPaid && ent.endsAt ? <> · {ent.cancelAtPeriodEnd ? "ends" : "renews"} {formatDate(ent.endsAt)}</> : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!billingLive ? (
                <Notice tone="warning" title="Live billing isn't connected on this server">
                  Stripe keys and price IDs haven't been configured, so upgrades are disabled. Operators: see README → Stripe.
                </Notice>
              ) : null}
              {ent.status === "past_due" ? (
                <Notice tone="danger" title="Payment overdue">Your last payment failed. Update your card in the billing portal to keep your plan.</Notice>
              ) : null}
              {sub?.stripeCustomerId && billingLive ? (
                <div className="flex flex-wrap items-center gap-3">
                  <PortalButton />
                  <p className="text-sm text-muted-foreground">Change plan, update your card, download invoices or cancel in Stripe's billing portal.</p>
                </div>
              ) : null}
              <PricingCards
                currentPlan={ent.planId}
                action={(id) =>
                  id === ent.planId ? (
                    <Button variant="secondary" className="w-full" disabled>Current plan</Button>
                  ) : id === "free" ? (
                    <p className="text-center text-xs text-muted-foreground">{ent.isPaid ? "Cancel in the billing portal to return to Free." : ""}</p>
                  ) : ent.isPaid ? (
                    <p className="text-center text-xs text-muted-foreground">Switch plans in the billing portal.</p>
                  ) : (
                    <CheckoutButton plan={id} label={PLAN_ORDER.indexOf(id) > currentIndex ? `Upgrade to ${id[0].toUpperCase()}${id.slice(1)}` : "Choose"} disabled={!billingLive} />
                  )
                }
              />
            </CardContent>
          </Card>

          <Card id="integrations" className="scroll-mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Link2 className="size-4" /> Connected integrations</CardTitle>
              <CardDescription>{brand.disclaimer}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["pinterest", "etsy"] as const).map((provider) => {
                const row = integrations.find((i) => i.provider === provider);
                return (
                  <div key={provider} className="flex flex-col gap-1 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium capitalize">{provider}</p>
                      <p className="text-sm text-muted-foreground">
                        {provider === "pinterest"
                          ? "Publishing and analytics import require Pinterest's official API and app approval. Until then, export pins and post them manually."
                          : `Listing import requires Etsy's official API and approval. Until then, enter product details yourself — ${brand.name} never scrapes Etsy.`}
                      </p>
                    </div>
                    <Badge tone={row?.status === "connected" ? "accent" : "neutral"}>{row?.status === "connected" ? "Connected" : "Not connected"}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card id="privacy" className="scroll-mt-6">
            <CardHeader>
              <CardTitle>Privacy &amp; data</CardTitle>
              <CardDescription>Download everything {brand.name} stores about you, or delete your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button asChild variant="secondary">
                <a href="/api/account/export" download><Download /> Export my data (JSON)</a>
              </Button>
              <div className="rounded-md border border-danger/30 bg-danger-soft/40 p-4">
                <p className="flex items-center gap-2 font-medium text-danger"><ShieldAlert className="size-4" /> Delete account</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cancels any active subscription immediately, then permanently deletes your profile, products, images, campaigns, pins and metrics. This can't be undone.
                </p>
                <div className="mt-4"><DeleteAccountForm /></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
