import { TEMPLATE_META } from "@/lib/pins/design";
import type { TemplateId } from "@/types/domain";
import { clampText, type AngleDraft, type PinCopyDraft, type PinDraft } from "./schemas";
import type { AngleRef, CopyProvider, ExistingPinRef, GenerationContext } from "./types";

/**
 * Demo content generator used when no AI provider is configured.
 *
 * It assembles illustrative copy from the seller's own product details and a
 * library of marketing-angle archetypes. Results are deterministic, pass the
 * same validation as live AI output, and are always stored with
 * generation_source = "demo" so the UI labels them as sample content.
 * Demo copy is written in English regardless of the requested language.
 */

type Archetype = {
  name: string;
  audience: (p: P) => string;
  problem: (p: P) => string;
  message: (p: P) => string;
  visual: string;
  keywords: (p: P) => string[];
  hooks: ((p: P) => { title: string; headline: string; sub: string })[];
  /** The reader's problem as a casual note to self (used by the "Note to self" template). */
  note: (p: P) => string;
  bullets: (p: P) => string[];
};

type P = { name: string; noun: string; benefit: string; audience: string; kw: string };

const NOUNS: Record<string, string> = {
  wall_art: "printable wall art",
  planner: "digital planner",
  notion_template: "Notion template",
  canva_template: "Canva template",
  spreadsheet: "spreadsheet template",
  invitation: "printable invitation",
  educational: "printable worksheet set",
  productivity: "productivity template",
  other: "digital download",
};

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const ARCHETYPES: Archetype[] = [
  {
    name: "Simple start for beginners",
    audience: (p) => `People using a ${p.noun} for the first time`,
    problem: () => "Not knowing where to start, so they never start",
    message: (p) => `The ${p.name} keeps things to one clear page, so there's nothing to figure out first.`,
    visual: "Lots of white space, one big headline and the product shown up close.",
    keywords: (p) => [`${p.noun} for beginners`, `easy ${p.kw}`, `simple ${p.kw} ideas`],
    hooks: [
      (p) => ({ title: `Easy ${p.noun} for beginners`, headline: "Start with one page", sub: "No setup, no learning curve" }),
      (p) => ({ title: `New to ${p.kw}? Start with this simple ${p.noun}`, headline: `First time with ${p.kw}`, sub: "Start small, keep it going" }),
      (p) => ({ title: `The simplest way to start ${p.kw}`, headline: "Keep it simple", sub: `${p.name}, one step at a time` }),
    ],
    note: (p) => `I keep meaning to start ${p.kw}... where do I even begin?`,
    bullets: () => ["One page to start", "Nothing to set up", "Print or use on a tablet"],
  },
  {
    name: "Save time every week",
    audience: () => "Busy people fitting this around work and family",
    problem: () => "No time to build something from scratch",
    message: (p) => `The ${p.name} is ready the moment you download it. Fill it in, don't build it.`,
    visual: "A tidy checklist look with a clear time-saving promise.",
    keywords: (p) => [`time saving ${p.kw}`, `${p.kw} for busy moms`, `ready made ${p.noun}`],
    hooks: [
      (p) => ({ title: `Ready-made ${p.noun} for busy weeks`, headline: "Done in ten minutes", sub: "Download it, print it, use it" }),
      (p) => ({ title: `${p.name} for when you have no time to plan`, headline: "Made for busy weeks", sub: lc(p.benefit) || "Less setting up, more doing" }),
      (p) => ({ title: `Get your Sunday evening back with this ${p.noun}`, headline: "Your Sunday back", sub: "Ready the moment you download it" }),
    ],
    note: () => "no time to set anything up this week (again)",
    bullets: (p) => ["Ready to print", "Reuse every month", p.benefit ? clampText(p.benefit, 30) : "Ten minutes a week"],
  },
  {
    name: "Stay organised and in control",
    audience: (p) => p.audience || "People who want everything in one place",
    problem: () => "Notes and lists scattered everywhere",
    message: (p) => `The ${p.name} puts everything on one page you can actually find again.`,
    visual: "A neat, structured layout that mirrors how the product is organised.",
    keywords: (p) => [`${p.kw} organization`, `get organized ${p.kw}`, `${p.noun} ideas`],
    hooks: [
      (p) => ({ title: `${p.name} to keep everything in one place`, headline: "All on one page", sub: "Easy to find, easy to keep up" }),
      (p) => ({ title: `How to keep your ${p.kw} organised without the stress`, headline: "Organised, not overwhelmed", sub: "" }),
      (p) => ({ title: `A tidy ${p.noun} you'll actually keep using`, headline: "Finally, one place for it", sub: "Clear at a glance" }),
    ],
    note: () => "sticky notes everywhere and I still forgot",
    bullets: () => ["All in one place", "Easy to keep up", "Clear at a glance"],
  },
  {
    name: "A thoughtful gift idea",
    audience: () => "People looking for a useful, personal gift",
    problem: () => "Wanting a gift that gets used, not put in a drawer",
    message: (p) => `The ${p.name} is a gift they'll use every week, and it arrives the minute you buy it.`,
    visual: "Warm, gift-like styling with the product shown like it's being handed over.",
    keywords: (p) => [`${p.kw} gift idea`, `digital gift ideas`, `last minute ${p.kw} gift`],
    hooks: [
      (p) => ({ title: `Thoughtful digital gift idea: ${p.name}`, headline: "A gift they'll use", sub: "Instant download, no shipping wait" }),
      (p) => ({ title: `Last-minute gift for anyone into ${p.kw}`, headline: "Last-minute and still lovely", sub: "" }),
      () => ({ title: `Gift idea for a friend starting fresh`, headline: "For a friend starting fresh", sub: "Practical and personal" }),
    ],
    note: () => "birthday is tomorrow and I have nothing",
    bullets: () => ["Arrives instantly", "Easy to share", "Useful all year"],
  },
  {
    name: "Minimal, beautiful and calm",
    audience: () => "People who like a calm, minimal look",
    problem: () => "Most options look busy and cluttered",
    message: (p) => `A quiet, minimal ${p.noun}. Nothing on the page that doesn't need to be there.`,
    visual: "Minimal type, a neutral palette and plenty of space around the product.",
    keywords: (p) => [`minimalist ${p.kw}`, `aesthetic ${p.noun}`, `simple ${p.kw} design`],
    hooks: [
      (p) => ({ title: `Minimalist ${p.noun} for a calmer routine`, headline: "Less on the page", sub: `The ${p.name}` }),
      (p) => ({ title: `Aesthetic, minimal ${p.kw} layout`, headline: "Quiet and simple", sub: "" }),
      (p) => ({ title: `A clutter-free ${p.noun} that's nice to look at`, headline: "Calm, clean, done", sub: "Made to feel easy" }),
    ],
    note: () => "every template I find is so busy",
    bullets: () => ["Calm, neutral colours", "Easy to read", "Nothing extra"],
  },
  {
    name: "Plan ahead for what's next",
    audience: () => "People getting ready for a new month, term or year",
    problem: () => "Wanting a fresh start without a plan for it",
    message: (p) => `Sit down once with the ${p.name} and the next month is already mapped out.`,
    visual: "Fresh, forward-looking styling with a seasonal accent colour.",
    keywords: (p) => [`${p.kw} planning`, `plan ahead ${p.kw}`, `fresh start ${p.noun}`],
    hooks: [
      (p) => ({ title: `Plan next month in one sitting with the ${p.name}`, headline: "Next month, sorted", sub: "One sitting, one page" }),
      (p) => ({ title: `Fresh start ${p.noun} for the new season`, headline: "Ready for a fresh start", sub: "" }),
      () => ({ title: `How to plan ahead when you never have time to`, headline: "Plan once, relax all month", sub: "" }),
    ],
    note: () => "new month, same chaos. need a plan",
    bullets: () => ["Plan in one sitting", "Set one clear goal", "Tick things off"],
  },
];

const TEMPLATE_CYCLE: TemplateId[] = ["minimal", "benefits", "editorial", "checklist", "problem_solution", "mockup"];

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function toP(ctx: GenerationContext): P {
  const noun = NOUNS[ctx.product.category] ?? NOUNS.other;
  const kw = (ctx.config.primaryKeyword || ctx.product.keywords[0] || noun).toLowerCase();
  return {
    name: clampText(ctx.product.name, 60),
    noun,
    benefit: ctx.product.mainBenefit,
    audience: ctx.campaignAudience || ctx.product.targetAudience,
    kw: clampText(kw, 40),
  };
}

function pickTemplate(i: number, allowed: readonly string[], wantsBullets: boolean): TemplateId {
  const allowedSet = allowed.length ? allowed : ["minimal"];
  const cycle = TEMPLATE_CYCLE.filter((t) => allowedSet.includes(t));
  if (wantsBullets) {
    const bulletT = cycle.find((t) => t === "benefits" || t === "checklist");
    if (bulletT) return bulletT;
  }
  return (cycle[i % cycle.length] ?? "minimal") as TemplateId;
}

function describe(p: P, a: Archetype, cta: string, variant: number): string {
  const benefit = p.benefit ? `${p.benefit.replace(/\.$/, "")}.` : "";
  const forWho = `Made for ${lc(a.audience(p))}.`;
  const patterns = [
    `${a.message(p)} ${benefit} It's a digital download, so you can print it or use it the same day. ${cta}.`,
    `${forWho} ${benefit} ${a.message(p)} ${cta}.`,
    `${a.message(p)} ${forWho} Instant download, nothing posted to you. ${cta}.`,
  ];
  return patterns[variant % patterns.length].replace(/\s+/g, " ").trim();
}

function buildCopy(ctx: GenerationContext, p: P, a: Archetype, hookIndex: number, pinIndex: number): PinCopyDraft {
  const hook = a.hooks[hookIndex % a.hooks.length](p);
  const cta = ctx.config.cta || "Get the download";
  const template = pickTemplate(pinIndex, ctx.allowedTemplates, pinIndex % 3 === 1);
  const usesBullets = template === "benefits" || template === "checklist";
  const keywords = a.keywords(p);
  const sub = template === "problem_solution" ? a.note(p) : hook.sub;
  return {
    title: clampText(hook.title, 100),
    description: clampText(describe(p, a, cta, pinIndex + hookIndex), 450),
    primaryKeyword: clampText(keywords[0], 80),
    keywords: keywords.slice(1).map((k) => clampText(k, 60)),
    creativeConcept: a.visual,
    headline: clampText(hook.headline, 60),
    subheadline: clampText(sub, 110),
    bullets: usesBullets ? a.bullets(p).map((b) => clampText(b, 40)) : [],
    cta: clampText(cta, 30),
    altText: clampText(
      `Pinterest pin with the headline "${hook.headline}"${ctx.hasProductImage ? ` and a photo of the ${p.name}` : ""}.`,
      300,
    ),
    template,
  };
}

function archetypeFor(angle: AngleRef | null, fallbackIndex: number): Archetype {
  const match = angle ? ARCHETYPES.find((a) => a.name === angle.name) : undefined;
  return match ?? ARCHETYPES[fallbackIndex % ARCHETYPES.length];
}

export function createDemoProvider(): CopyProvider {
  return {
    id: "demo",

    async generateAngles(ctx, count) {
      const p = toP(ctx);
      const start = seedFrom(ctx.product.name) % ARCHETYPES.length;
      const angles: AngleDraft[] = [];
      for (let i = 0; i < count; i++) {
        const a = ARCHETYPES[(start + i) % ARCHETYPES.length];
        angles.push({
          name: a.name,
          audience: clampText(a.audience(p), 300),
          problem: a.problem(p),
          message: clampText(a.message(p), 500),
          visualConcept: a.visual,
          keywords: a.keywords(p).map((k) => clampText(k, 60)),
        });
      }
      return { data: angles, source: "demo", model: null, usage: null };
    },

    async generatePins(ctx, angles, count) {
      const p = toP(ctx);
      const pins: PinDraft[] = [];
      const perAngleCount = new Array(angles.length).fill(0);
      for (let i = 0; i < count; i++) {
        const angleIndex = i % angles.length;
        const a = archetypeFor(angles[angleIndex], angleIndex);
        const hookIndex = perAngleCount[angleIndex]++;
        const copy = buildCopy(ctx, p, a, hookIndex, i);
        // Keep titles unique when there are more pins than hooks.
        if (hookIndex >= a.hooks.length) copy.title = clampText(`${copy.title}, idea ${hookIndex + 1}`, 100);
        pins.push({ ...copy, angleIndex });
      }
      return { data: pins, source: "demo", model: null, usage: null };
    },

    async regeneratePinCopy(ctx, angle, current, siblings) {
      const p = toP(ctx);
      const a = archetypeFor(angle, 0);
      let hookIndex = 0;
      for (let i = 0; i < a.hooks.length * 2; i++) {
        const t = a.hooks[i % a.hooks.length](p).title;
        if (t !== current.title && !siblings.includes(t)) {
          hookIndex = i;
          break;
        }
        hookIndex = i + 1;
      }
      const copy = buildCopy(ctx, p, a, hookIndex, seedFrom(current.title) % 6);
      if (copy.title === current.title || siblings.includes(copy.title)) copy.title = clampText(`${copy.title}, another take`, 100);
      return { data: copy, source: "demo", model: null, usage: null };
    },

    async regenerateCreative(ctx, angle, current: ExistingPinRef) {
      const p = toP(ctx);
      const a = archetypeFor(angle, 0);
      const currentIdx = TEMPLATE_CYCLE.indexOf(current.template as TemplateId);
      const template = pickTemplate(currentIdx + 1, ctx.allowedTemplates, false);
      const hook = a.hooks[(a.hooks.findIndex((h) => h(p).headline === current.headline) + 1) % a.hooks.length](p);
      const usesBullets = template === "benefits" || template === "checklist";
      return {
        data: {
          creativeConcept: `${a.visual} Tried as a ${TEMPLATE_META[template].name.toLowerCase()} layout.`,
          headline: clampText(hook.headline, 60),
          subheadline: clampText(template === "problem_solution" ? a.note(p) : hook.sub, 110),
          bullets: usesBullets ? a.bullets(p).map((b) => clampText(b, 40)) : [],
          template,
        },
        source: "demo",
        model: null,
        usage: null,
      };
    },
  };
}
