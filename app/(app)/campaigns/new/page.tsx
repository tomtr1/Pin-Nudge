import type { Metadata } from "next";
import { CampaignBuilder } from "@/components/campaigns/campaign-builder";
import { PageHeader } from "@/components/ui/misc";
import { aiStatus } from "@/lib/ai";
import { requireUserContext } from "@/lib/auth/session";
import { getAccountUsage } from "@/lib/billing/usage";

export const metadata: Metadata = { title: "New campaign" };
export const maxDuration = 120;

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const { repo } = await requireUserContext();
  const [products, profile, usage] = await Promise.all([repo.listProducts(), repo.getProfile(), getAccountUsage(repo)]);
  const plan = usage.entitlement.plan;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New campaign" description="Turn one product into a set of distinct Pinterest pins." />
      <CampaignBuilder
        products={products}
        initialProductId={product}
        limits={{ pinsPerCampaign: plan.limits.pinsPerCampaign, anglesPerCampaign: plan.limits.anglesPerCampaign }}
        templates={plan.features.templates}
        defaults={plan.features.savedPreferences ? (profile?.campaignDefaults ?? {}) : {}}
        preferredLanguage={profile?.preferredLanguage ?? "en"}
        campaignsRemaining={usage.campaigns.remaining}
        aiMode={aiStatus().mode}
      />
    </div>
  );
}
