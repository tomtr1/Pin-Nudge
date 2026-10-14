import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/ui/misc";
import { requireUserContext } from "@/lib/auth/session";
import { getAccountUsage } from "@/lib/billing/usage";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const { repo } = await requireUserContext();
  const usage = await getAccountUsage(repo);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add a product" description="Enter the details once — every campaign for this product starts from them." />
      {!usage.products.allowed ? (
        <Notice
          tone="warning"
          title="Product limit reached"
          action={<Button asChild size="sm"><Link href="/settings#billing">Upgrade</Link></Button>}
        >
          Your {usage.entitlement.plan.name} plan includes {usage.products.limit} products. Upgrade or delete a product to add another.
        </Notice>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ProductForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
