import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CampaignWorkspace } from "@/components/campaigns/campaign-workspace";
import { requireUserContext } from "@/lib/auth/session";
import { getAccountUsage } from "@/lib/billing/usage";

export const metadata: Metadata = { title: "Campaign" };
export const maxDuration = 120;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { repo } = await requireUserContext();
  const campaign = await repo.getCampaign(id);
  if (!campaign) notFound();
  const [product, usage] = await Promise.all([campaign.productId ? repo.getProduct(campaign.productId) : null, getAccountUsage(repo)]);
  const f = usage.entitlement.plan.features;
  return (
    <CampaignWorkspace
      campaign={campaign}
      features={{ templates: f.templates, customColors: f.customColors, allFontPresets: f.allFontPresets, zipExport: f.zipExport }}
      imageCount={product?.images.length ?? 0}
      regenerationsRemaining={usage.regenerations.remaining}
      productExists={Boolean(product)}
    />
  );
}
