/* eslint-disable @next/next/no-img-element -- these elements are rendered by satori, not the browser */
import type { ReactElement, ReactNode } from "react";
import { PIN_HEIGHT, PIN_WIDTH, readableTextColor } from "@/lib/pins/design";
import type { PinDesign } from "@/types/domain";
import { fitFontSize } from "./fit";
import { TYPE_PRESETS, type TypePreset } from "./fonts";

export interface RenderImage {
  dataUri: string;
  width: number;
  height: number;
}

export interface PinRenderInput {
  headline: string;
  subheadline: string;
  bullets: string[];
  cta: string;
  storeName: string | null;
  design: PinDesign;
  image: RenderImage | null;
}

const PAD = 80;
const INNER = PIN_WIDTH - PAD * 2;

interface Ctx {
  input: PinRenderInput;
  type: TypePreset;
  text: string;
  accent: string;
  onAccent: string;
  muted: string;
  image: RenderImage | null;
}

function mix(hex: string, other: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

function Headline({ ctx, text, maxWidth = INNER, maxLines = 4, max = 104, min = 52, align = "left" }: {
  ctx: Ctx;
  text: string;
  maxWidth?: number;
  maxLines?: number;
  max?: number;
  min?: number;
  align?: "left" | "center";
}) {
  const content = ctx.type.uppercaseHeading ? text.toUpperCase() : text;
  const size = fitFontSize(content, { maxWidth, maxLines, max, min, widthFactor: ctx.type.widthFactor * (ctx.type.uppercaseHeading ? 1.12 : 1) });
  return (
    <div
      style={{
        display: "block",
        fontFamily: ctx.type.heading,
        fontWeight: ctx.type.headingWeight,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: ctx.type.letterSpacing,
        color: ctx.text,
        textAlign: align,
        maxWidth,
        lineClamp: maxLines,
      }}
    >
      {content}
    </div>
  );
}

function Sub({ ctx, text, maxWidth = INNER, maxLines = 3, align = "left", color }: {
  ctx: Ctx;
  text: string;
  maxWidth?: number;
  maxLines?: number;
  align?: "left" | "center";
  color?: string;
}) {
  if (!text) return null;
  const size = fitFontSize(text, { maxWidth, maxLines, max: 42, min: 28, widthFactor: 0.52 });
  return (
    <div
      style={{
        display: "block",
        fontFamily: "Inter",
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1.35,
        color: color ?? ctx.muted,
        textAlign: align,
        maxWidth,
        lineClamp: maxLines,
      }}
    >
      {text}
    </div>
  );
}

function Cta({ ctx, text }: { ctx: Ctx; text: string }) {
  if (!text) return null;
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        backgroundColor: ctx.accent,
        color: ctx.onAccent,
        fontFamily: "Inter",
        fontWeight: 600,
        fontSize: 34,
        padding: "20px 40px",
        borderRadius: 999,
        maxWidth: INNER,
      }}
    >
      <span style={{ display: "block", lineClamp: 1 }}>{text}</span>
    </div>
  );
}

function TextCta({ ctx, text, size }: { ctx: Ctx; text: string; size: number }) {
  if (!text) return <div style={{ display: "flex" }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, color: ctx.accent, fontFamily: "Inter", fontWeight: 600, fontSize: size }}>
      <span style={{ display: "block", lineClamp: 1, maxWidth: 480 }}>{text}</span>
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke={ctx.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function StoreName({ ctx }: { ctx: Ctx }) {
  if (!ctx.input.design.showStoreName || !ctx.input.storeName) return null;
  return (
    <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 600, fontSize: 26, letterSpacing: 2, color: ctx.muted, textTransform: "uppercase" }}>
      <span style={{ display: "block", lineClamp: 1, maxWidth: 380 }}>{ctx.input.storeName}</span>
    </div>
  );
}

function ProductImage({ ctx, width, height, radius = 28, fit = "contain", frame = true }: {
  ctx: Ctx;
  width: number;
  height: number;
  radius?: number;
  fit?: "contain" | "cover";
  frame?: boolean;
}) {
  if (!ctx.image) return null;
  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: frame ? mix(ctx.input.design.background, "#ffffff", 0.55) : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img src={ctx.image.dataUri} width={width} height={height} style={{ width, height, objectFit: fit }} alt="" />
    </div>
  );
}

function Bullets({ ctx, items, style }: { ctx: Ctx; items: string[]; style: "check" | "box" }) {
  const list = items.filter(Boolean).slice(0, 4);
  if (list.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {list.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div
            style={{
              display: "flex",
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: style === "check" ? 999 : 10,
              backgroundColor: style === "check" ? ctx.accent : "transparent",
              border: style === "box" ? `4px solid ${ctx.accent}` : "none",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={style === "check" ? ctx.onAccent : ctx.accent} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ display: "block", fontFamily: "Inter", fontWeight: 600, fontSize: 38, color: ctx.text, lineClamp: 2, maxWidth: INNER - 80, lineHeight: 1.25 }}>
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

function Frame({ ctx, children, justify = "space-between" }: { ctx: Ctx; children: ReactNode; justify?: "space-between" | "flex-start" | "center" }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
        width: PIN_WIDTH,
        height: PIN_HEIGHT,
        padding: PAD,
        boxSizing: "border-box",
        backgroundColor: ctx.input.design.background,
        fontFamily: "Inter",
      }}
    >
      {children}
    </div>
  );
}

function AccentBar({ ctx, width = 96 }: { ctx: Ctx; width?: number }) {
  return <div style={{ display: "flex", width, height: 10, borderRadius: 10, backgroundColor: ctx.accent }} />;
}

/** Image placement resolution: "auto" picks each template's natural spot. */
function placement(ctx: Ctx, auto: "top" | "middle" | "bottom") {
  if (!ctx.image || ctx.input.design.imagePlacement === "none") return "none" as const;
  return ctx.input.design.imagePlacement === "auto" ? auto : ctx.input.design.imagePlacement;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
function Minimal(ctx: Ctx) {
  const { headline, subheadline, cta } = ctx.input;
  const where = placement(ctx, "bottom");
  const img = <ProductImage ctx={ctx} width={INNER} height={600} />;
  const textBlock = (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <AccentBar ctx={ctx} />
      <Headline ctx={ctx} text={headline} maxLines={where === "none" ? 6 : 4} max={where === "none" ? 128 : 100} />
      <Sub ctx={ctx} text={subheadline} />
    </div>
  );
  return (
    <Frame ctx={ctx}>
      {where === "top" ? img : null}
      {textBlock}
      {where === "middle" ? img : null}
      {where === "bottom" ? img : null}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Cta ctx={ctx} text={cta} />
        <StoreName ctx={ctx} />
      </div>
    </Frame>
  );
}

function Editorial(ctx: Ctx) {
  const { headline, subheadline, cta, design } = ctx.input;
  const hasImage = Boolean(ctx.image) && design.imagePlacement !== "none";
  if (!hasImage) {
    return (
      <Frame ctx={ctx} justify="center">
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          <div style={{ display: "flex", height: 4, width: INNER, backgroundColor: ctx.accent }} />
          <Headline ctx={ctx} text={headline} maxLines={6} max={132} min={64} />
          <Sub ctx={ctx} text={subheadline} maxLines={4} />
          <div style={{ display: "flex", height: 4, width: INNER, backgroundColor: ctx.accent }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <TextCta ctx={ctx} text={cta} size={34} />
            <StoreName ctx={ctx} />
          </div>
        </div>
      </Frame>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", width: PIN_WIDTH, height: PIN_HEIGHT, backgroundColor: design.background }}>
      <div style={{ display: "flex", width: PIN_WIDTH, height: 860, overflow: "hidden" }}>
        <img src={ctx.image!.dataUri} width={PIN_WIDTH} height={860} style={{ width: PIN_WIDTH, height: 860, objectFit: "cover" }} alt="" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: `56px ${PAD}px ${PAD}px`, flexGrow: 1, boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <Headline ctx={ctx} text={headline} maxLines={3} max={92} min={48} />
          <Sub ctx={ctx} text={subheadline} maxLines={2} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <TextCta ctx={ctx} text={cta} size={32} />
          <StoreName ctx={ctx} />
        </div>
      </div>
    </div>
  );
}

function Benefits(ctx: Ctx) {
  const { headline, subheadline, cta, bullets } = ctx.input;
  const where = placement(ctx, "middle");
  const img = <ProductImage ctx={ctx} width={INNER} height={bullets.length > 2 ? 420 : 520} />;
  return (
    <Frame ctx={ctx}>
      {where === "top" ? img : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Headline ctx={ctx} text={headline} maxLines={where === "none" ? 5 : 3} max={where === "none" ? 120 : 92} />
        <Sub ctx={ctx} text={subheadline} maxLines={2} />
      </div>
      {where === "middle" ? img : null}
      <Bullets ctx={ctx} items={bullets.length ? bullets : [subheadline].filter(Boolean)} style="check" />
      {where === "bottom" ? img : null}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Cta ctx={ctx} text={cta} />
        <StoreName ctx={ctx} />
      </div>
    </Frame>
  );
}

function ProblemSolution(ctx: Ctx) {
  const { headline, subheadline, cta } = ctx.input;
  const where = placement(ctx, "bottom");
  const panelText = readableTextColor(ctx.accent, "#ffffff");
  return (
    <div style={{ display: "flex", flexDirection: "column", width: PIN_WIDTH, height: PIN_HEIGHT, backgroundColor: ctx.input.design.background }}>
      {subheadline ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, backgroundColor: ctx.accent, padding: `${PAD}px ${PAD}px 64px`, boxSizing: "border-box" }}>
          <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 26, letterSpacing: 3, color: panelText, opacity: 0.8 }}>THE PROBLEM</span>
          <Sub ctx={ctx} text={subheadline} maxLines={3} color={panelText} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flexGrow: 1, padding: PAD, boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 26, letterSpacing: 3, color: ctx.accent }}>THE FIX</span>
          <Headline ctx={ctx} text={headline} maxLines={where === "none" ? 6 : 3} max={where === "none" ? 116 : 92} />
        </div>
        {where !== "none" ? <ProductImage ctx={ctx} width={INNER} height={subheadline ? 470 : 640} /> : null}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Cta ctx={ctx} text={cta} />
          <StoreName ctx={ctx} />
        </div>
      </div>
    </div>
  );
}

function Checklist(ctx: Ctx) {
  const { headline, subheadline, cta, bullets, design } = ctx.input;
  const where = placement(ctx, "top");
  const sheet = mix(design.background, "#ffffff", 0.75);
  const items = bullets.length ? bullets : [subheadline].filter(Boolean);
  return (
    <Frame ctx={ctx} justify="center">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 44,
          backgroundColor: sheet,
          borderRadius: 36,
          padding: 64,
          boxSizing: "border-box",
          height: PIN_HEIGHT - PAD * 2,
          justifyContent: "space-between",
          boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
        }}
      >
        {where === "top" ? <ProductImage ctx={ctx} width={INNER - 128} height={380} radius={20} /> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Headline ctx={ctx} text={headline} maxWidth={INNER - 128} maxLines={3} max={84} min={46} />
          {bullets.length ? <Sub ctx={ctx} text={subheadline} maxWidth={INNER - 128} maxLines={2} /> : null}
        </div>
        <Bullets ctx={ctx} items={items} style="box" />
        {where === "middle" || where === "bottom" ? <ProductImage ctx={ctx} width={INNER - 128} height={360} radius={20} /> : null}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Cta ctx={ctx} text={cta} />
          <StoreName ctx={ctx} />
        </div>
      </div>
    </Frame>
  );
}

function Mockup(ctx: Ctx) {
  const { headline, subheadline, cta, design } = ctx.input;
  const hasImage = Boolean(ctx.image) && design.imagePlacement !== "none";
  const footer = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Cta ctx={ctx} text={cta} />
      </div>
      <StoreName ctx={ctx} />
    </div>
  );
  if (!hasImage) {
    // Text-only showcase: the headline sits on a raised card instead of a product photo.
    return (
      <Frame ctx={ctx}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <AccentBar ctx={ctx} />
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 760,
              minHeight: 760,
              padding: 72,
              boxSizing: "border-box",
              borderRadius: 32,
              backgroundColor: mix(design.background, "#ffffff", 0.7),
              boxShadow: "0 30px 60px rgba(0,0,0,0.12)",
              justifyContent: "center",
              gap: 36,
              transform: "rotate(-2deg)",
            }}
          >
            <Headline ctx={ctx} text={headline} maxWidth={616} maxLines={6} max={96} min={48} align="center" />
            <Sub ctx={ctx} text={subheadline} maxWidth={616} maxLines={3} align="center" />
          </div>
        </div>
        {footer}
      </Frame>
    );
  }
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
        <Headline ctx={ctx} text={headline} maxLines={3} max={88} align="center" />
        <Sub ctx={ctx} text={subheadline} maxLines={2} align="center" />
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            padding: 28,
            backgroundColor: "#ffffff",
            borderRadius: 32,
            boxShadow: "0 30px 60px rgba(0,0,0,0.18)",
            transform: "rotate(-2deg)",
          }}
        >
          <ProductImage ctx={ctx} width={680} height={640} radius={14} frame={false} />
        </div>
      </div>
      {footer}
    </Frame>
  );
}

const TEMPLATES = {
  minimal: Minimal,
  editorial: Editorial,
  benefits: Benefits,
  problem_solution: ProblemSolution,
  checklist: Checklist,
  mockup: Mockup,
} as const;

export function buildPinElement(input: PinRenderInput): ReactElement {
  const { design } = input;
  const text = readableTextColor(design.background, design.textColor);
  const accent = design.accentColor;
  const ctx: Ctx = {
    input: {
      ...input,
      headline: input.headline || "Your headline here",
    },
    type: TYPE_PRESETS[design.fontPreset],
    text,
    accent,
    onAccent: readableTextColor(accent, "#ffffff"),
    muted: mix(text, design.background, 0.32),
    image: input.image,
  };
  const Template = TEMPLATES[design.template] ?? Minimal;
  return Template(ctx);
}
