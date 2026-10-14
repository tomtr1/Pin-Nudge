/**
 * Export filename helpers. Output is lowercase ASCII, hyphen-separated and
 * safe on every common filesystem, e.g. `budget-planner_saving-goals_01.png`.
 */
const MAX_SEGMENT = 40;

export function slugify(input: string, max = MAX_SEGMENT): string {
  const ascii = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/æ/gi, "ae")
    .replace(/ø/gi, "o")
    .replace(/&/g, " and ")
    .toLowerCase();
  const slug = ascii
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug;
}

export function sanitizeFilename(input: string, fallback = "file"): string {
  const trimmed = input.trim().replace(/\.(png|jpe?g|webp|csv|zip|txt|md)$/i, "");
  const parts = trimmed.split(/_+/).map((p) => slugify(p)).filter(Boolean);
  const name = parts.join("_").slice(0, 100).replace(/[-_]+$/g, "");
  return name || slugify(fallback) || "file";
}

export function pinExportFilename(productName: string, angleName: string, index: number, ext = "png"): string {
  const product = slugify(productName) || "product";
  const angle = slugify(angleName) || "pin";
  const n = String(index).padStart(2, "0");
  return `${product}_${angle}_${n}.${ext}`;
}

/** Ensure filenames inside one archive are unique by appending -2, -3, … */
export function dedupeFilenames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    const key = name.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return name;
    let candidate = `${base}-${count + 1}${ext}`;
    while (seen.has(candidate.toLowerCase())) candidate = `${base}-${Math.floor(Math.random() * 1e6)}${ext}`;
    seen.set(candidate.toLowerCase(), 1);
    return candidate;
  });
}
