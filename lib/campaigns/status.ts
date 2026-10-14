import type { CampaignStatus, Pin, PinStatus } from "@/types/domain";

/**
 * Status model. "Published" in PinNudge only ever means the seller marked a
 * pin as published themselves — the app does not post to Pinterest in this
 * release. "Planned" means dates are assigned in the content calendar.
 */
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  planned: "Planned",
  published: "Published (marked manually)",
  archived: "Archived",
};

export const PIN_STATUS_LABELS: Record<PinStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  published: "Published (manual)",
  archived: "Archived",
};

const PIN_TRANSITIONS: Record<PinStatus, PinStatus[]> = {
  draft: ["approved", "archived"],
  approved: ["draft", "published", "archived"],
  published: ["approved"],
  archived: ["draft"],
};

export function canTransitionPin(from: PinStatus, to: PinStatus): boolean {
  return from === to || PIN_TRANSITIONS[from].includes(to);
}

export function deriveCampaignStatus(pins: Pick<Pin, "status" | "plannedFor">[], current: CampaignStatus): CampaignStatus {
  if (current === "archived") return "archived";
  const active = pins.filter((p) => p.status !== "archived");
  if (active.length === 0) return "draft";
  if (active.every((p) => p.status === "published")) return "published";
  const allApproved = active.every((p) => p.status === "approved" || p.status === "published");
  if (!allApproved) return "draft";
  const unpublished = active.filter((p) => p.status !== "published");
  if (unpublished.length > 0 && unpublished.every((p) => p.plannedFor)) return "planned";
  return "ready";
}

export function canArchiveCampaign(current: CampaignStatus): boolean {
  return current !== "archived";
}
