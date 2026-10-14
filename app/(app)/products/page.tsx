import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
import { ProductThumb } from "@/components/products/product-thumb";
import { AddSampleProductButton } from "@/components/products/sample-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireUserContext } from "@/lib/auth/session";
import { getAccountUsage } from "@/lib/billing/usage";
import { categoryLabel, PRODUCT_CATEGORIES } from "@/lib/constants";
import { displayUrl } from "@/lib/validations/url";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q, category } = await searchParams;
  const { repo } = await requireUserContext();
  const search = q?.trim().slice(0, 100) || undefined;
  const cat = PRODUCT_CATEGORIES.some((c) => c.value === category) ? category : undefined;
  const [products, campaigns, usage] = await Promise.all([repo.listProducts({ search, category: cat }), repo.listCampaigns(), getAccountUsage(repo)]);
  const filtered = Boolean(search || cat);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${usage.products.used} of ${usage.products.limit} products on your ${usage.entitlement.plan.name} plan.`}
        actions={
          usage.products.allowed ? (
            <Button asChild>
              <Link href="/products/new"><Plus /> Add product</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href="/settings#billing">Product limit reached — upgrade</Link>
            </Button>
          )
        }
      />

      <form className="mb-6 flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={search} placeholder="Search products" aria-label="Search products" className="pl-9" />
        </div>
        <Select name="category" defaultValue={cat ?? ""} aria-label="Filter by category" className="sm:w-64">
          <option value="">All categories</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">Apply</Button>
        {filtered ? (
          <Button asChild variant="ghost"><Link href="/products">Clear</Link></Button>
        ) : null}
      </form>

      {products.length === 0 ? (
        filtered ? (
          <EmptyState icon={<Search />} title="No products match" description="Try a different search or category." />
        ) : (
          <EmptyState
            icon={<Package />}
            title="Your product library is empty"
            description="Add the digital products you want to promote. You'll enter the details once and reuse them for every campaign."
            action={
              <>
                <Button asChild><Link href="/products/new"><Plus /> Add product</Link></Button>
                <AddSampleProductButton />
              </>
            }
          />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const count = campaigns.filter((c) => c.productId === p.id).length;
            return (
              <li key={p.id}>
                <Link href={`/products/${p.id}`} className="flex gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md">
                  <div className="w-20 shrink-0"><ProductThumb product={p} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{categoryLabel(p.category)}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.isSample ? <Badge tone="warning">Sample</Badge> : null}
                      <Badge>{pluralize(count, "campaign")}</Badge>
                      {!p.destinationUrl ? <Badge tone="danger">No link</Badge> : null}
                    </div>
                    {p.destinationUrl ? <p className="mt-2 truncate text-xs text-muted-foreground">{displayUrl(p.destinationUrl)}</p> : null}
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
