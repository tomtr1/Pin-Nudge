import { brand } from "@/lib/brand";
import { categoryLabel, languageLabel } from "@/lib/constants";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/campaigns/status";
import type { CampaignWithDetails } from "@/types/domain";

/** Plain-text (Markdown) campaign summary included in exports. */
export function campaignSummaryMarkdown(c: CampaignWithDetails, filenames: string[]): string {
  const lines: string[] = [];
  lines.push(`# ${c.name}`, "");
  if (c.generationSource === "demo") {
    lines.push("> **Sample content.** This campaign was created in demo mode without a live AI provider. Review and rewrite before publishing.", "");
  }
  lines.push(`- Product: ${c.productSnapshot.name} (${categoryLabel(c.productSnapshot.category)})`);
  lines.push(`- Status: ${CAMPAIGN_STATUS_LABELS[c.status]}`);
  lines.push(`- Language: ${languageLabel(c.language)}`);
  if (c.targetAudience) lines.push(`- Audience: ${c.targetAudience}`);
  if (c.config.primaryKeyword) lines.push(`- Primary keyword: ${c.config.primaryKeyword}`);
  lines.push(`- Pins: ${c.pins.length}`, "");

  lines.push("## Marketing angles", "");
  for (const a of c.angles) {
    lines.push(`### ${a.name}`, "");
    lines.push(`- Audience: ${a.audience}`, `- Need: ${a.problem}`, `- Message: ${a.message}`, `- Visual concept: ${a.visualConcept}`);
    if (a.keywords.length) lines.push(`- Keywords: ${a.keywords.join(", ")}`);
    lines.push("");
  }

  lines.push("## Pins", "");
  c.pins.forEach((p, i) => {
    lines.push(`### ${i + 1}. ${p.title}`, "");
    lines.push(`- File: ${filenames[i]}`);
    lines.push(`- Destination: ${p.destinationUrl ?? "(not set)"}`);
    lines.push(`- Primary keyword: ${p.primaryKeyword}`);
    if (p.keywords.length) lines.push(`- Keywords: ${p.keywords.join(", ")}`);
    if (p.plannedFor) lines.push(`- Planned for: ${p.plannedFor}`);
    lines.push("", p.description, "");
  });

  lines.push("---", "", `Exported from ${brand.name}. ${brand.disclaimer}`, "");
  lines.push(
    "Keyword suggestions are ideas, not measured search volumes. Uploading these files to Pinterest is a manual step; PinNudge has not published anything on your behalf.",
  );
  return lines.join("\n");
}
