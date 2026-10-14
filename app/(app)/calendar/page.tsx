import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarView, type CalendarPin } from "@/components/calendar/calendar-view";
import { FeatureLocked } from "@/components/billing/feature-locked";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { requireUserContext } from "@/lib/auth/session";
import { minimumPlanFor } from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/usage";

export const metadata: Metadata = { title: "Calendar" };

function lastDayOf(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; product?: string; status?: string }> }) {
  const sp = await searchParams;
  const { repo } = await requireUserContext();
  const entitlement = await getEntitlement(repo);

  if (!entitlement.plan.features.calendar) {
    return (
      <>
        <PageHeader title="Content calendar" description="Plan when each pin should go live." />
        <FeatureLocked
          plan={minimumPlanFor("calendar")}
          title="The content calendar is part of Growth and Pro"
          description="Assign publishing dates to approved pins, see your month at a glance and keep track of what you've posted manually."
        />
      </>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const status = ["approved", "published"].includes(sp.status ?? "") ? (sp.status as "approved" | "published") : undefined;
  const [products, campaigns, monthPins, approvedPins] = await Promise.all([
    repo.listProducts(),
    repo.listCampaigns(),
    repo.listPins({ hasPlannedDate: true, plannedFrom: `${month}-01`, plannedTo: lastDayOf(month) }),
    repo.listPins({ status: "approved" }),
  ]);
  const productId = products.some((p) => p.id === sp.product) ? sp.product : undefined;
  const names = new Map(campaigns.map((c) => [c.id, c.name]));
  const withName = (p: (typeof monthPins)[number]): CalendarPin => ({ ...p, campaignName: names.get(p.campaignId) ?? "Campaign" });
  const filter = (p: (typeof monthPins)[number]) => (!productId || p.productId === productId) && (!status || p.status === status);

  const planned = monthPins.filter(filter).map(withName);
  const unplanned = approvedPins.filter((p) => !p.plannedFor && (!productId || p.productId === productId)).map(withName);
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const qs = (m: string) => `/calendar?month=${m}${productId ? `&product=${productId}` : ""}${status ? `&status=${status}` : ""}`;

  return (
    <>
      <PageHeader title="Content calendar" description="Plan publishing dates for approved pins. Posting to Pinterest is done by you, manually." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="icon"><Link href={qs(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft /></Link></Button>
          <h2 className="min-w-40 text-center font-semibold">{label}</h2>
          <Button asChild variant="secondary" size="icon"><Link href={qs(shiftMonth(month, 1))} aria-label="Next month"><ChevronRight /></Link></Button>
          {month !== today.slice(0, 7) ? <Button asChild variant="ghost" size="sm"><Link href={qs(today.slice(0, 7))}>Today</Link></Button> : null}
        </div>
        <form className="flex flex-wrap gap-2">
          <input type="hidden" name="month" value={month} />
          <Select name="product" defaultValue={productId ?? ""} aria-label="Filter by product" className="w-48">
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select name="status" defaultValue={status ?? ""} aria-label="Filter by status" className="w-40">
            <option value="">All statuses</option>
            <option value="approved">Planned</option>
            <option value="published">Published</option>
          </Select>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
      </div>
      <CalendarView month={month} planned={planned} unplanned={unplanned} today={today} />
    </>
  );
}
