import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Megaphone, Package, Plus, Sparkles } from "lucide-react";
import { UsageCard } from "@/components/billing/usage-card";
import { CampaignStatusBadge, SourceBadge } from "@/components/campaigns/status-badge";
import { PinPlaceholder, PinThumb } from "@/components/pins/pin-thumb";
import { ProductThumb } from "@/components/products/product-thumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Notice, PageHeader, Stat } from "@/components/ui/misc";
import { AddSampleProductButton } from "@/components/products/sample-button";
import { requireUserContext } from "@/lib/auth/session";
import { getAccountUsage } from "@/lib/billing/usage";
import { formatDate, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { repo } = await requireUserContext();
  const profile = await repo.getProfile();
  if (!profile?.onboardingCompleted) redirect("/onboarding");
  const { welcome } = await searchParams;

  const today = new Date().toISOString().slice(0, 10);
  const [products, campaigns, usage] = await Promise.all([repo.listProducts(), repo.listCampaigns(), getAccountUsage(repo)]);
  const calendarEnabled = usage.entitlement.plan.features.calendar;
  const upcoming = calendarEnabled ? (await repo.listPins({ hasPlannedDate: true, plannedFrom: today })).filter((p) => p.status !== "published").slice(0, 5) : [];
  const pinCount = campaigns.reduce((n, c) => n + c.pinCount, 0);
  const name = profile.displayName?.split(" ")[0];

  const next = (() => {
    if (products.length === 0) return { title: "Add your first product", body: "Everything starts with a product: its details, image and listing link.", href: "/products/new", cta: "Add a product" };
    const draft = campaigns.find((c) => c.status === "draft" && c.pinCount > 0);
    if (draft) return { title: `Review “${draft.name}”`, body: `${pluralize(draft.pinCount - draft.approvedCount, "pin")} still need your review before export.`, href: `/campaigns/${draft.id}`, cta: "Review pins" };
    const unstarted = campaigns.find((c) => c.pinCount === 0 && c.status !== "archived");
    if (unstarted) return { title: `Finish “${unstarted.name}”`, body: "This campaign has settings saved but no pins yet.", href: `/campaigns/${unstarted.id}`, cta: "Continue" };
    if (campaigns.length === 0) return { title: "Create your first campaign", body: `Turn ${products[0].name} into a set of distinct Pinterest pins.`, href: `/campaigns/new?product=${products[0].id}`, cta: "Create campaign" };
    const productWithout = products.find((p) => !campaigns.some((c) => c.productId === p.id));
    if (productWithout) return { title: `Promote ${productWithout.name}`, body: "This product doesn't have a campaign yet.", href: `/campaigns/new?product=${productWithout.id}`, cta: "Create campaign" };
    const ready = campaigns.find((c) => c.status === "ready");
    if (ready && calendarEnabled) return { title: "Plan your publishing dates", body: `“${ready.name}” is approved. Give its pins dates in the calendar.`, href: "/calendar", cta: "Open calendar" };
    return { title: "Try a new angle", body: "Create another campaign to test a different audience or message.", href: "/campaigns/new", cta: "New campaign" };
  })();

  return (
    <>
      <PageHeader
        title={name ? `Welcome back, ${name}` : "Welcome back"}
        description="Here's where your Pinterest marketing stands."
        actions={
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus /> Create campaign
            </Link>
          </Button>
        }
      />

      {welcome ? (
        <Notice tone="accent" className="mb-6" title="You're all set up">
          Add a product, then create your first campaign. You can change your preferences any time in Settings.
        </Notice>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="Start with a product"
          description="Add one of your digital products — or a clearly labelled sample product — to see how a campaign comes together."
          action={
            <>
              <Button asChild>
                <Link href="/products/new"><Plus /> Add your product</Link>
              </Button>
              <AddSampleProductButton />
            </>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Products" value={products.length} />
            <Stat label="Campaigns" value={campaigns.length} />
            <Stat label="Pins created" value={pinCount} />
            <Stat
              label="Upcoming planned pins"
              value={calendarEnabled ? upcoming.length : "—"}
              hint={calendarEnabled ? "From today onwards" : "Calendar is on Growth and Pro"}
            />
          </div>

          <Card className="mt-6 border-accent/30 bg-accent-soft/40">
            <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 text-accent" aria-hidden />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-accent-soft-foreground">Suggested next step</p>
                  <p className="font-semibold">{next.title}</p>
                  <p className="text-sm text-muted-foreground">{next.body}</p>
                </div>
              </div>
              <Button asChild>
                <Link href={next.href}>
                  {next.cta} <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent campaigns</CardTitle>
              <Link href="/campaigns" className="text-sm text-accent hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No campaigns yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {campaigns.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link href={`/campaigns/${c.id}`} className="flex items-center gap-3 py-3 hover:bg-surface-muted/40">
                        <div className="w-10 shrink-0">
                          {c.coverPinId ? <PinThumb pinId={c.coverPinId} version={c.updatedAt} alt="" /> : <PinPlaceholder label="" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pluralize(c.pinCount, "pin")} · {formatDate(c.createdAt)}
                          </p>
                        </div>
                        <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                          <SourceBadge source={c.generationSource} />
                          <CampaignStatusBadge status={c.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {upcoming.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><CalendarDays className="size-4" /> Upcoming</CardTitle>
                <Link href="/calendar" className="text-sm text-accent hover:underline">Calendar</Link>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border text-sm">
                  {upcoming.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link href={`/campaigns/${p.campaignId}?pin=${p.id}`} className="truncate hover:underline">{p.title}</Link>
                      <span className="shrink-0 text-muted-foreground">{formatDate(p.plannedFor)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Planned dates are reminders. PinNudge doesn't post to Pinterest automatically.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <UsageCard usage={usage} />
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent products</CardTitle>
              <Link href="/products" className="text-sm text-accent hover:underline">All</Link>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products yet.</p>
              ) : (
                <ul className="space-y-3">
                  {products.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3 rounded-md hover:bg-surface-muted/50">
                        <div className="w-10 shrink-0"><ProductThumb product={p} /></div>
                        <span className="truncate text-sm font-medium">{p.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
                <Link href="/campaigns"><Megaphone /> Browse campaigns</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
