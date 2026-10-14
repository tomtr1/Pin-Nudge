import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";
import { CampaignStatusBadge, SourceBadge } from "@/components/campaigns/status-badge";
import { ImageManager } from "@/components/products/image-manager";
import { ProductActions } from "@/components/products/product-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/ui/misc";
import { requireUserContext } from "@/lib/auth/session";
import { categoryLabel, VISUAL_STYLES } from "@/lib/constants";
import { displayUrl } from "@/lib/validations/url";
import { formatDate, pluralize } from "@/lib/utils";
import { z } from "zod";

export const metadata: Metadata = { title: "Product" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { repo } = await requireUserContext();
  const [product, campaigns] = await Promise.all([repo.getProduct(id), repo.listCampaigns({ productId: id })]);
  if (!product) notFound();

  const details: [string, React.ReactNode][] = [
    ["Category", categoryLabel(product.category)],
    ["Target audience", product.targetAudience || "—"],
    ["Main benefit", product.mainBenefit || "—"],
    ["Visual style", VISUAL_STYLES.find((s) => s.value === product.visualStyle)?.label ?? "—"],
    ["Price", product.price !== null ? `${product.price.toFixed(2)} ${product.currency ?? ""}` : "—"],
    ["Keywords", product.keywords.length ? product.keywords.join(", ") : "—"],
    ["Tags", product.tags.length ? product.tags.join(", ") : "—"],
  ];

  return (
    <>
      <nav className="mb-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/products" className="hover:text-foreground">Products</Link> / <span className="text-foreground">{product.name}</span>
      </nav>
      <PageHeader
        title={product.name}
        description={product.isSample ? "Sample product for exploring PinNudge." : `Added ${formatDate(product.createdAt)}`}
        actions={
          <>
            <ProductActions product={product} campaignCount={campaigns.length} />
            <Button asChild>
              <Link href={`/campaigns/new?product=${product.id}`}><Plus /> Create campaign</Link>
            </Button>
          </>
        }
      />
      {!product.destinationUrl ? (
        <Notice tone="warning" className="mb-6" title="No destination link">
          Add your Etsy listing URL so pins know where to send people. You can still generate pins and set links later.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {product.isSample ? <Badge tone="warning">Sample product</Badge> : null}
              <p className="whitespace-pre-line text-sm leading-relaxed">{product.description || <span className="text-muted-foreground">No description yet.</span>}</p>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5">{v}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Destination</dt>
                  <dd className="mt-0.5">
                    {product.destinationUrl ? (
                      <a href={product.destinationUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-accent hover:underline">
                        {displayUrl(product.destinationUrl, 60)} <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Campaigns</CardTitle>
              <span className="text-sm text-muted-foreground">{pluralize(campaigns.length, "campaign")}</span>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No campaigns for this product yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {campaigns.map((c) => (
                    <li key={c.id}>
                      <Link href={`/campaigns/${c.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-surface-muted/40">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.name}</span>
                          <span className="text-xs text-muted-foreground">{pluralize(c.pinCount, "pin")} · {formatDate(c.createdAt)}</span>
                        </span>
                        <span className="flex gap-1">
                          <SourceBadge source={c.generationSource} />
                          <CampaignStatusBadge status={c.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="self-start">
          <CardHeader><CardTitle>Images</CardTitle></CardHeader>
          <CardContent>
            <ImageManager product={product} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
