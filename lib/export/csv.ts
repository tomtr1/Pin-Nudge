import type { CampaignAngle, Pin } from "@/types/domain";

/**
 * CSV helpers. Cells are quoted per RFC 4180, and values starting with
 * characters spreadsheets treat as formulas (= + - @ tab CR) are prefixed with
 * an apostrophe to prevent CSV formula injection.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : Array.isArray(value) ? value.join(", ") : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 (accents, umlauts) correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const PIN_CSV_HEADERS = [
  "filename",
  "title",
  "description",
  "destination_url",
  "primary_keyword",
  "keywords",
  "alt_text",
  "angle",
  "headline",
  "call_to_action",
  "status",
  "planned_date",
  "content_source",
] as const;

export function pinsToCsv(pins: Pin[], angles: CampaignAngle[], filenames: string[], source: "ai" | "demo" | null): string {
  const angleName = new Map(angles.map((a) => [a.id, a.name]));
  const rows: unknown[][] = [Array.from(PIN_CSV_HEADERS)];
  pins.forEach((p, i) => {
    rows.push([
      filenames[i],
      p.title,
      p.description,
      p.destinationUrl ?? "",
      p.primaryKeyword,
      p.keywords,
      p.altText,
      (p.angleId && angleName.get(p.angleId)) || "",
      p.headline,
      p.cta,
      p.status,
      p.plannedFor ?? "",
      source === "demo" ? "sample (demo mode, not AI-generated)" : source === "ai" ? "ai-generated, reviewed by seller" : "",
    ]);
  });
  return toCsv(rows);
}
