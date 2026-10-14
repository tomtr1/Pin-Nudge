import { Badge } from "@/components/ui/badge";
import { CAMPAIGN_STATUS_LABELS, PIN_STATUS_LABELS } from "@/lib/campaigns/status";
import type { CampaignStatus, GenerationSource, PinStatus } from "@/types/domain";

const campaignTone: Record<CampaignStatus, "neutral" | "accent" | "info" | "solid" | "warning"> = {
  draft: "neutral",
  ready: "accent",
  planned: "info",
  published: "solid",
  archived: "neutral",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge tone={campaignTone[status]}>{CAMPAIGN_STATUS_LABELS[status]}</Badge>;
}

export function PinStatusBadge({ status }: { status: PinStatus }) {
  const tone = status === "approved" ? "accent" : status === "published" ? "solid" : "neutral";
  return <Badge tone={tone}>{PIN_STATUS_LABELS[status]}</Badge>;
}

export function SourceBadge({ source }: { source: GenerationSource | null }) {
  if (source === "demo") return <Badge tone="warning">Sample content</Badge>;
  if (source === "ai") return <Badge tone="info">AI draft</Badge>;
  return null;
}
