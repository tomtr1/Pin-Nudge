/** Option lists shared by forms, validation and AI prompts. */

export const PRODUCT_CATEGORIES = [
  { value: "wall_art", label: "Printable wall art & posters" },
  { value: "planner", label: "Digital planners & journals" },
  { value: "notion_template", label: "Notion templates" },
  { value: "canva_template", label: "Canva templates" },
  { value: "spreadsheet", label: "Budget & spreadsheet templates" },
  { value: "invitation", label: "Wedding & event invitations" },
  { value: "educational", label: "Educational printables" },
  { value: "productivity", label: "Productivity tools" },
  { value: "other", label: "Other digital product" },
] as const;

export const CATEGORY_VALUES = PRODUCT_CATEGORIES.map((c) => c.value) as [string, ...string[]];

export function categoryLabel(value: string): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? "Other digital product";
}

export const VISUAL_STYLES = [
  { value: "minimal", label: "Minimal & clean" },
  { value: "warm", label: "Warm & cosy" },
  { value: "bold", label: "Bold & colourful" },
  { value: "elegant", label: "Elegant & classic" },
  { value: "playful", label: "Playful" },
  { value: "earthy", label: "Earthy & natural" },
] as const;
export const VISUAL_STYLE_VALUES = VISUAL_STYLES.map((s) => s.value) as [string, ...string[]];

export const TONES = [
  { value: "friendly", label: "Friendly & helpful" },
  { value: "inspiring", label: "Inspiring" },
  { value: "practical", label: "Practical & direct" },
  { value: "calm", label: "Calm & reassuring" },
  { value: "playful", label: "Playful" },
  { value: "premium", label: "Premium & polished" },
] as const;
export const TONE_VALUES = TONES.map((t) => t.value) as [string, ...string[]];

export const OBJECTIVES = [
  { value: "traffic", label: "Drive visits to the listing" },
  { value: "awareness", label: "Introduce the product to new audiences" },
  { value: "seasonal", label: "Promote for a season or event" },
  { value: "launch", label: "Launch a new product" },
  { value: "evergreen", label: "Build evergreen discovery" },
] as const;
export const OBJECTIVE_VALUES = OBJECTIVES.map((o) => o.value) as [string, ...string[]];

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "pt", label: "Portuguese" },
] as const;
export const LANGUAGE_VALUES = LANGUAGES.map((l) => l.value) as [string, ...string[]];

export function languageLabel(value: string): string {
  return LANGUAGES.find((l) => l.value === value)?.label ?? value;
}

export const MARKETING_GOALS = [
  { value: "more_traffic", label: "Get more visitors to my listings" },
  { value: "save_time", label: "Spend less time on marketing" },
  { value: "consistency", label: "Publish consistently" },
  { value: "new_audiences", label: "Reach new audiences" },
  { value: "learn_what_works", label: "Learn what content works" },
] as const;
export const MARKETING_GOAL_VALUES = MARKETING_GOALS.map((g) => g.value) as [string, ...string[]];

export const CTA_SUGGESTIONS = ["Shop the printable", "Get the template", "Download now", "See the details", "Start planning today"];
