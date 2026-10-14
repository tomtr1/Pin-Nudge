import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Plus, Search } from "lucide-react";
import { CampaignStatusBadge, SourceBadge } from "@/components/campaigns/status-badge";
import { PinPlaceholder, PinThumb } from "@/components/pins/pin-thumb";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatCount, sumMetrics } from "@/lib/analytics/metrics";
import { requireUserContext } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/billing/usage";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/campaigns/status";
import { formatDate, pluralize } from "@/lib/utils";
import type { CampaignStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Campaigns" };

const STATUSES = Object.keys(CAMPAIGN_STATUS_LABELS) as CampaignStatus[];

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; product?: string; status?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const { repo } = await requireUserContext();
  const status = STATUSES.includes(sp.status as CampaignStatus) ? (sp.status as CampaignStatus) : undefined;
  const search = sp.q?.trim().slice(0, 100) || undefined;
  const [products, campaignsRaw, entitlement] = await Promise.all([repo.listProducts(), repo.listCampaigns({ search, status }), getEntitlement(repo)]);
  const productId = products.some((p) => p.id === sp.product) ? sp.product : undefined;
  let campaigns = productId ? campaignsRaw.filter((c) => c.productId === productId) : campaignsRaw;
  if (sp.sort === "oldest") campaigns = [...campaigns].reverse();

  // Performance summaries only where real, recorded metrics exist.
  const perf = new Map<string, { outbound: number | null; impressions: number | null; sources: string[] }>();
  if (entitlement.plan.features.analytics && campaigns.length) {
    const [pins, metrics] = await Promise.all([repo.listPins(), repo.listMetrics()]);
    const pinCampaign = new Map(pins.map((p) => [p.id, p.campaignId]));
    for (const c of campaigns) {
      const ms = metrics.filter((m) => pinCampaign.get(m.pinId) === c.id);
      if (ms.length) {
        const t = sumMetrics(ms);
        perf.set(c.id, { outbound: t.outboundClicks, impressions: t.impressions, sources: t.sources });
      }
    }
  }

  const filtered = Boolean(search || status || productId);

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Every campaign you've created, with its pins and status."
        actions={<Button asChild><Link href="/campaigns/new"><Plus /> New campaign</Link></Button>}
      />
      <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_200px_180px_150px_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={search} placeholder="Search campaigns" aria-label="Search campaigns" className="pl-9" />
        </div>
        <Select name="product" defaultValue={productId ?? ""} aria-label="Filter by product">
          <option value="">All products</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select name="status" defaultValue={status ?? ""} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s]}</option>)}
        </Select>
        <Select name="sort" defaultValue={sp.sort === "oldest" ? "oldest" : "newest"} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary">Apply</Button>
          {filtered ? <Button asChild variant="ghost"><Link href="/campaigns">Clear</Link></Button> : null}
        </div>
      </form>

      {campaigns.length === 0 ? (
        filtered ? (
          <EmptyState icon={<Search />} title="No campaigns match these filters" />
        ) : (
          <EmptyState
            icon={<Megaphone />}
            title="No campaigns yet"
            description="A campaign turns one product into several distinct marketing angles and ready-to-edit pins."
            action={<Button asChild><Link href="/campaigns/new"><Plus /> Create your first campaign</Link></Button>}
          />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const p = perf.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/campaigns/${c.id}`} className="flex gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md">
                  <div className="w-20 shrink-0">
                    {c.coverPinId ? <PinThumb pinId={c.coverPinId} version={c.updatedAt} alt="" /> : <PinPlaceholder />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{c.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.productSnapshot.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <CampaignStatusBadge status={c.status} />
                      <SourceBadge source={c.generationSource} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {pluralize(c.pinCount, "pin")} · {c.approvedCount} approved · {formatDate(c.createdAt)}
                    </p>
                    {p ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCount(p.outbound)} outbound clicks / {formatCount(p.impressions)} impressions
                        <span className="ml-1">({p.sources.includes("pinterest_api") ? "imported" : "manually reported"})</span>
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
