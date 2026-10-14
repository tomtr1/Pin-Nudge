/**
 * Centralized brand configuration.
 *
 * PinNudge is a working name. If a pre-launch trademark or domain check requires
 * a rename, change the values here; UI copy, metadata, emails and exports read
 * from this module rather than hardcoding the name.
 */
export const brand = {
  name: "PinNudge",
  tagline: "Create smarter. Pin with purpose.",
  positioning:
    "PinNudge helps Etsy digital-product sellers turn products into differentiated Pinterest campaigns, manage their publishing workflow, and learn from real performance data.",
  shortDescription:
    "Turn one digital product into a complete Pinterest campaign, then use real performance data to improve the next one.",
  /** Shown wherever platform names appear. Never imply affiliation. */
  disclaimer:
    "PinNudge is an independent product and is not affiliated with, endorsed by, or sponsored by Pinterest or Etsy.",
  /** Contact address is configured per deployment; see .env.example. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  /** Slug used for export filenames and storage prefixes. */
  slug: "pinnudge",
} as const;

/** Public base URL. Configured per deployment so the domain can be chosen later. */
export function getAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}

/** Theme tokens shared by the UI and the default pin palette. */
export const brandColors = {
  ink: "#1f2421",
  paper: "#f7f7f4",
  accent: "#4f7a5f",
  accentSoft: "#e3ece5",
  muted: "#6b716c",
} as const;
