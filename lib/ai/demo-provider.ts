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
    audience: (p) => `People new to using a ${p.noun} who want an easy first step`,
    problem: () => "Feeling overwhelmed and unsure where to begin",
    message: (p) => `The ${p.name} gives beginners a clear, simple starting point.`,
    visual: "Calm, uncluttered layout with one clear headline and lots of white space.",
    keywords: (p) => [`${p.noun} for beginners`, `easy ${p.kw}`, `simple ${p.kw} ideas`],
    hooks: [
      (p) => ({ title: `${p.name}: an easy ${p.noun} for beginners`, headline: "Start simple", sub: `A beginner-friendly ${p.noun}` }),
      (p) => ({ title: `New to ${p.kw}? Start with this simple ${p.noun}`, headline: `New to ${p.kw}?`, sub: "Here's an easy place to begin" }),
      (p) => ({ title: `The simplest way to start with ${p.kw}`, headline: "The simple way to start", sub: `${p.name}, step by step` }),
    ],
    bullets: () => ["Clear, guided layout", "Ready to use instantly", "No design skills needed"],
  },
  {
    name: "Save time every week",
    audience: () => "Busy people juggling work, family and side projects",
    problem: () => "Not enough time to set things up from scratch",
    message: (p) => `Skip the setup — the ${p.name} is ready to use the moment you download it.`,
    visual: "Clean checklist-style design with a time-saving promise in the headline.",
    keywords: (p) => [`time saving ${p.kw}`, `${p.kw} for busy people`, `ready made ${p.noun}`],
    hooks: [
      (p) => ({ title: `Save time with a ready-made ${p.noun}`, headline: "Skip the setup", sub: "Download it and start today" }),
      (p) => ({ title: `A ${p.noun} for busy weeks: ${p.name}`, headline: "Made for busy weeks", sub: lc(p.benefit) || `Get organised faster` }),
      (p) => ({ title: `Get your evenings back with a ready-to-use ${p.noun}`, headline: "Get your evenings back", sub: "Ready the moment you download it" }),
    ],
    bullets: (p) => ["Instant digital download", "Use it again and again", p.benefit ? clampText(p.benefit, 40) : "Set up in minutes"],
  },
  {
    name: "Stay organised and in control",
    audience: (p) => p.audience || "People who like to keep things organised",
    problem: () => "Things feel scattered and hard to keep track of",
    message: (p) => `Bring everything into one place with the ${p.name}.`,
    visual: "Structured, tidy composition that mirrors the product's organisation.",
    keywords: (p) => [`${p.kw} organization`, `get organized ${p.kw}`, `${p.noun} ideas`],
    hooks: [
      (p) => ({ title: `Get organised with the ${p.name}`, headline: "Everything in one place", sub: `A ${p.noun} that keeps you on track` }),
      (p) => ({ title: `How to keep your ${p.kw} organised (without the stress)`, headline: "Organised, without the stress", sub: "" }),
      (p) => ({ title: `One place for everything: the ${p.name}`, headline: "One place for everything", sub: "Clear, tidy and easy to keep up" }),
    ],
    bullets: () => ["Everything in one place", "Easy to keep up", "Clear at a glance"],
  },
  {
    name: "A thoughtful gift idea",
    audience: () => "Gift-givers looking for something useful and personal",
    problem: () => "Finding a meaningful gift that's actually useful",
    message: (p) => `The ${p.name} makes a practical, thoughtful digital gift.`,
    visual: "Warm, celebratory styling with the product presented like a gift.",
    keywords: (p) => [`${p.kw} gift idea`, `digital gift ideas`, `last minute ${p.kw} gift`],
    hooks: [
      (p) => ({ title: `A thoughtful digital gift: ${p.name}`, headline: "A gift they'll use", sub: "Instant download — no shipping wait" }),
      (p) => ({ title: `Last-minute gift idea for anyone who loves ${p.kw}`, headline: "Last-minute gift idea", sub: "" }),
      (p) => ({ title: `A useful gift for someone starting fresh: ${p.name}`, headline: "A gift for a fresh start", sub: "Practical, personal and instant" }),
    ],
    bullets: () => ["Instant download", "Easy to share", "Useful all year"],
  },
  {
    name: "Minimal, beautiful and calm",
    audience: () => "People who love a clean, minimalist aesthetic",
    problem: () => "Most options look cluttered or busy",
    message: (p) => `A clean, minimalist ${p.noun} that looks as good as it works.`,
    visual: "Minimal typography, neutral palette and generous space.",
    keywords: (p) => [`minimalist ${p.kw}`, `aesthetic ${p.noun}`, `simple ${p.kw} design`],
    hooks: [
      (p) => ({ title: `Minimalist ${p.noun} for a calmer routine`, headline: "Less clutter, more calm", sub: `The ${p.name}` }),
      (p) => ({ title: `Aesthetic, minimal and easy to use: ${p.name}`, headline: "Simple and beautiful", sub: "" }),
      (p) => ({ title: `A calm, clutter-free ${p.noun} you'll enjoy using`, headline: "Calm and clutter-free", sub: "Designed to feel easy" }),
    ],
    bullets: () => ["Clean, minimal design", "Easy to read", "Calm neutral colours"],
  },
  {
    name: "Plan ahead for what's next",
    audience: () => "Planners getting ready for a new season, term or year",
    problem: () => "Wanting a fresh start but not knowing how to plan it",
    message: (p) => `Use the ${p.name} to plan ahead and start the next season prepared.`,
    visual: "Fresh, forward-looking design with a seasonal accent colour.",
    keywords: (p) => [`${p.kw} planning`, `plan ahead ${p.kw}`, `fresh start ${p.noun}`],
    hooks: [
      (p) => ({ title: `Plan ahead with the ${p.name}`, headline: "Plan your fresh start", sub: "Get ready for what's next" }),
      (p) => ({ title: `Your fresh-start ${p.noun} for the season ahead`, headline: "Ready for a fresh start?", sub: "" }),
      (p) => ({ title: `Plan the next month in one sitting with the ${p.name}`, headline: "Plan next month in one sitting", sub: "" }),
    ],
    bullets: () => ["Plan step by step", "Set clear goals", "Track your progress"],
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

function buildCopy(ctx: GenerationContext, p: P, a: Archetype, hookIndex: number, pinIndex: number): PinCopyDraft {
  const hook = a.hooks[hookIndex % a.hooks.length](p);
  const cta = ctx.config.cta || "Get the download";
  const template = pickTemplate(pinIndex, ctx.allowedTemplates, pinIndex % 3 === 1);
  const usesBullets = template === "benefits" || template === "checklist";
  const keywords = a.keywords(p);
  const description = clampText(
    `${a.message(p)} Made for ${lc(a.audience(p))}. ${p.benefit ? `${p.benefit.replace(/\.$/, "")}. ` : ""}It's a digital download, so you can start right away. ${cta}.`,
    450,
  );
  return {
    title: clampText(hook.title, 100),
    description,
    primaryKeyword: clampText(keywords[0], 80),
    keywords: keywords.slice(1).map((k) => clampText(k, 60)),
    creativeConcept: a.visual,
    headline: clampText(hook.headline, 60),
    subheadline: clampText(hook.sub, 110),
    bullets: usesBullets ? a.bullets(p).map((b) => clampText(b, 40)) : [],
    cta: clampText(cta, 30),
    altText: clampText(
      `Pinterest pin with the headline "${hook.headline}"${ctx.hasProductImage ? ` and an image of the ${p.name}` : ""} on a ${ctx.config.visualStyle} background.`,
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
        if (hookIndex >= a.hooks.length) copy.title = clampText(`${copy.title} (idea ${hookIndex + 1})`, 100);
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
      if (copy.title === current.title || siblings.includes(copy.title)) copy.title = clampText(`${copy.title} — fresh take`, 100);
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
          creativeConcept: `${a.visual} Alternative layout using the ${template.replace("_", " ")} template.`,
          headline: clampText(hook.headline, 60),
          subheadline: clampText(hook.sub, 110),
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
