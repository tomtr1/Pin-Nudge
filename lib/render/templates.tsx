/* eslint-disable @next/next/no-img-element -- these elements are rendered by satori, not the browser */
/**
 * Pin templates.
 *
 * The look is deliberately print- and craft-inspired rather than "generated":
 * paper grain, taped photos, sticky notes, ruled notebook paper, hand-drawn
 * underlines, ticks and arrows, flat offset blocks instead of blurred shadows.
 * Small rotations and stroke wobbles are seeded from the pin's text, so every
 * pin in a campaign differs slightly while preview and export stay identical.
 */
import type { ReactElement, ReactNode } from "react";
import { PIN_HEIGHT, PIN_WIDTH, readableTextColor } from "@/lib/pins/design";
import type { PinDesign } from "@/types/domain";
import { fitFontSize } from "./fit";
import { BODY_FONT, HAND_FONT, TYPE_PRESETS, type TypePreset } from "./fonts";

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
  /** Short category label, e.g. "Digital planner". */
  kicker?: string | null;
  /** Paper grain texture data URI (optional; omitted in some tests). */
  grain?: string | null;
}

const PAD = 80;
const INNER = PIN_WIDTH - PAD * 2;
const HAND_INK = "#1f2a44";
const STICKY = ["#fbe9a0", "#ffd5c8", "#cfe6ff", "#d4efc8"];
const TAPE = "rgba(240, 214, 140, 0.72)";

// ---------------------------------------------------------------------------
// Seeded randomness (deterministic per pin)
// ---------------------------------------------------------------------------
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Rng = () => number;
function makeRng(seed: string): Rng {
  let a = hash(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (rng: Rng, min: number, max: number) => min + (max - min) * rng();
const tilt = (rng: Rng, max: number) => Number((between(rng, -max, max) || 0.4).toFixed(2));

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface Ctx {
  input: PinRenderInput;
  type: TypePreset;
  text: string;
  muted: string;
  accent: string;
  bg: string;
  image: RenderImage | null;
  rng: Rng;
}

function mix(hex: string, other: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

function paper(ctx: Ctx, color = ctx.bg) {
  return ctx.input.grain
    ? { backgroundColor: color, backgroundImage: `url(${ctx.input.grain})`, backgroundRepeat: "repeat" as const, backgroundSize: "160px 160px" }
    : { backgroundColor: color };
}

// ---------------------------------------------------------------------------
// Hand-drawn marks
// ---------------------------------------------------------------------------
function wobblyPath(rng: Rng, width: number, y: number, amp: number, steps = 9) {
  let d = `M 4 ${y + between(rng, -amp, amp)}`;
  for (let i = 1; i <= steps; i++) {
    const x = (width - 8) * (i / steps) + 4;
    const cx = x - (width - 8) / steps / 2;
    d += ` Q ${cx.toFixed(1)} ${(y + between(rng, -amp, amp)).toFixed(1)} ${x.toFixed(1)} ${(y + between(rng, -amp, amp)).toFixed(1)}`;
  }
  return d;
}

function Underline({ ctx, width, color }: { ctx: Ctx; width: number; color?: string }) {
  const c = color ?? ctx.accent;
  return (
    <svg width={width} height={34} viewBox={`0 0 ${width} 34`}>
      <path d={wobblyPath(ctx.rng, width, 14, 4)} fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" />
      <path d={wobblyPath(ctx.rng, width * 0.82, 24, 3)} fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

function HandArrow({ ctx, size = 70, color, direction = "right" }: { ctx: Ctx; size?: number; color?: string; direction?: "right" | "down" }) {
  const c = color ?? ctx.text;
  const j = () => between(ctx.rng, -3, 3);
  const d =
    direction === "right"
      ? `M 4 ${size * 0.55 + j()} Q ${size * 0.45} ${size * 0.2 + j()} ${size - 8} ${size * 0.45}`
      : `M ${size * 0.3 + j()} 4 Q ${size * 0.05 + j()} ${size * 0.55} ${size * 0.55} ${size - 8}`;
  const head =
    direction === "right"
      ? `M ${size - 26} ${size * 0.28 + j()} L ${size - 8} ${size * 0.45} L ${size - 28} ${size * 0.62 + j()}`
      : `M ${size * 0.3 + j()} ${size - 22} L ${size * 0.55} ${size - 8} L ${size * 0.7 + j()} ${size - 30}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={d} fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" />
      <path d={head} fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HandTick({ ctx, size = 46, color }: { ctx: Ctx; size?: number; color?: string }) {
  const j = () => between(ctx.rng, -2.5, 2.5);
  return (
    <svg width={size} height={size} viewBox="0 0 46 46">
      <path d={`M ${6 + j()} ${24 + j()} L ${18 + j()} ${36 + j()} L ${42 + j()} ${6 + j()}`} fill="none" stroke={color ?? ctx.accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HandBox({ ctx, size = 52 }: { ctx: Ctx; size?: number }) {
  const j = () => between(ctx.rng, -2, 2);
  const p = (x: number, y: number) => `${x + j()} ${y + j()}`;
  return (
    <svg width={size} height={size} viewBox="0 0 52 52">
      <path d={`M ${p(4, 6)} L ${p(47, 4)} L ${p(48, 47)} L ${p(5, 48)} Z`} fill="none" stroke={HAND_INK} strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

function Tape({ ctx, style }: { ctx: Ctx; style: Record<string, string | number> }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        width: 150,
        height: 46,
        backgroundColor: TAPE,
        transform: `rotate(${tilt(ctx.rng, 12)}deg)`,
        ...style,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------
function Kicker({ ctx, color }: { ctx: Ctx; color?: string }) {
  if (!ctx.input.kicker) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ display: "flex", width: 44, height: 4, backgroundColor: ctx.accent }} />
      <span style={{ display: "block", fontFamily: BODY_FONT, fontWeight: 600, fontSize: 26, letterSpacing: 5, textTransform: "uppercase", color: color ?? ctx.muted, lineClamp: 1, maxWidth: INNER - 70 }}>
        {ctx.input.kicker}
      </span>
    </div>
  );
}

function Headline({ ctx, text, maxWidth = INNER, maxLines = 4, max = 112, min = 54, align = "left", color }: {
  ctx: Ctx;
  text: string;
  maxWidth?: number;
  maxLines?: number;
  max?: number;
  min?: number;
  align?: "left" | "center";
  color?: string;
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
        lineHeight: ctx.type.lineHeight,
        letterSpacing: ctx.type.letterSpacing * (size / 100),
        color: color ?? ctx.text,
        textAlign: align,
        maxWidth,
        lineClamp: maxLines,
      }}
    >
      {content}
    </div>
  );
}

function Body({ ctx, text, maxWidth = INNER, maxLines = 3, align = "left", color, size: fixed, italic }: {
  ctx: Ctx;
  text: string;
  maxWidth?: number;
  maxLines?: number;
  align?: "left" | "center";
  color?: string;
  size?: number;
  italic?: boolean;
}) {
  if (!text) return null;
  const size = fixed ?? fitFontSize(text, { maxWidth, maxLines, max: 40, min: 28, widthFactor: italic ? 0.44 : 0.5 });
  return (
    <div
      style={{
        display: "block",
        fontFamily: italic ? "Newsreader" : BODY_FONT,
        fontStyle: italic ? "italic" : "normal",
        fontWeight: italic ? 400 : 500,
        fontSize: size,
        lineHeight: 1.32,
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

function Hand({ text, size, maxWidth, maxLines = 3, color = HAND_INK, align = "left" }: { text: string; size: number; maxWidth: number; maxLines?: number; color?: string; align?: "left" | "center" }) {
  const fitted = fitFontSize(text, { maxWidth, maxLines, max: size, min: Math.round(size * 0.6), widthFactor: 0.4 });
  return (
    <div style={{ display: "block", fontFamily: HAND_FONT, fontWeight: 600, fontSize: fitted, lineHeight: 1.08, color, maxWidth, lineClamp: maxLines, textAlign: align }}>
      {text}
    </div>
  );
}

function Cta({ ctx, variant = "arrow", color }: { ctx: Ctx; variant?: "arrow" | "stamp" | "underline"; color?: string }) {
  const text = ctx.input.cta;
  if (!text) return <div style={{ display: "flex" }} />;
  const c = color ?? ctx.text;
  if (variant === "stamp") {
    return (
      <div style={{ display: "flex", border: `4px solid ${c}`, padding: "14px 26px", transform: `rotate(${tilt(ctx.rng, 2.5)}deg)` }}>
        <span style={{ display: "block", fontFamily: BODY_FONT, fontWeight: 700, fontSize: 30, letterSpacing: 3, textTransform: "uppercase", color: c, lineClamp: 1, maxWidth: 520 }}>{text}</span>
      </div>
    );
  }
  if (variant === "underline") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ display: "block", fontFamily: BODY_FONT, fontWeight: 700, fontSize: 36, color: c, lineClamp: 1, maxWidth: 560 }}>{text}</span>
        <Underline ctx={ctx} width={Math.min(520, 40 + text.length * 19)} />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ display: "block", fontFamily: BODY_FONT, fontWeight: 700, fontSize: 36, color: c, lineClamp: 1, maxWidth: 520 }}>{text}</span>
      <HandArrow ctx={ctx} size={64} color={ctx.accent} />
    </div>
  );
}

function StoreName({ ctx, color }: { ctx: Ctx; color?: string }) {
  if (!ctx.input.design.showStoreName || !ctx.input.storeName) return null;
  return (
    <span style={{ display: "block", fontFamily: BODY_FONT, fontWeight: 600, fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: color ?? ctx.muted, lineClamp: 1, maxWidth: 360 }}>
      {ctx.input.storeName}
    </span>
  );
}

function Footer({ ctx, variant, center, color }: { ctx: Ctx; variant?: "arrow" | "stamp" | "underline"; center?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: center ? "column" : "row", justifyContent: "space-between", alignItems: center ? "center" : "flex-end", gap: center ? 22 : 0 }}>
      <Cta ctx={ctx} variant={variant} color={color} />
      <StoreName ctx={ctx} color={color} />
    </div>
  );
}

function ImageBox({ ctx, width, height, fit = "contain", background = "#ffffff" }: { ctx: Ctx; width: number; height: number; fit?: "contain" | "cover"; background?: string }) {
  if (!ctx.image) return null;
  return (
    <div style={{ display: "flex", width, height, backgroundColor: background, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <img src={ctx.image.dataUri} width={width} height={height} style={{ width, height, objectFit: fit }} alt="" />
    </div>
  );
}

/** A photo print with a white border, slightly rotated, held on with tape. */
function TapedPhoto({ ctx, width, height, maxTilt = 3 }: { ctx: Ctx; width: number; height: number; maxTilt?: number }) {
  if (!ctx.image) return null;
  const frame = 20;
  return (
    <div style={{ display: "flex", justifyContent: "center", width: INNER }}>
      <div
        style={{
          display: "flex",
          position: "relative",
          padding: frame,
          backgroundColor: "#ffffff",
          transform: `rotate(${tilt(ctx.rng, maxTilt)}deg)`,
          boxShadow: "0 2px 0 rgba(0,0,0,0.08)",
        }}
      >
        <ImageBox ctx={ctx} width={width - frame * 2} height={height - frame * 2} background="#f4f2ee" />
        <Tape ctx={ctx} style={{ top: -22, left: 34 }} />
        <Tape ctx={ctx} style={{ top: -20, right: 30 }} />
      </div>
    </div>
  );
}

function Frame({ ctx, children, justify = "space-between", padding = PAD }: { ctx: Ctx; children: ReactNode; justify?: "space-between" | "flex-start" | "center"; padding?: number }) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        flexDirection: "column",
        justifyContent: justify,
        width: PIN_WIDTH,
        height: PIN_HEIGHT,
        padding,
        boxSizing: "border-box",
        ...paper(ctx),
      }}
    >
      {children}
    </div>
  );
}

function placement(ctx: Ctx, auto: "top" | "middle" | "bottom") {
  if (!ctx.image || ctx.input.design.imagePlacement === "none") return "none" as const;
  return ctx.input.design.imagePlacement === "auto" ? auto : ctx.input.design.imagePlacement;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** "Paper note": serif headline, hand-drawn underline, taped photo. */
function PaperNote(ctx: Ctx) {
  const { headline, subheadline } = ctx.input;
  const where = placement(ctx, "bottom");
  const photo = <TapedPhoto ctx={ctx} width={720} height={where === "middle" ? 520 : 580} />;
  return (
    <Frame ctx={ctx}>
      {where === "top" ? photo : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <Kicker ctx={ctx} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Headline ctx={ctx} text={headline} maxLines={where === "none" ? 6 : 4} max={where === "none" ? 136 : 108} />
          <Underline ctx={ctx} width={380 + Math.round(between(ctx.rng, 0, 120))} />
        </div>
        <Body ctx={ctx} text={subheadline} maxLines={where === "none" ? 4 : 2} />
      </div>
      {where === "middle" || where === "bottom" ? photo : null}
      <Footer ctx={ctx} variant="arrow" />
    </Frame>
  );
}

/** "Magazine cover": full-bleed image with an editorial headline panel. */
function MagazineCover(ctx: Ctx) {
  const { headline, subheadline, design } = ctx.input;
  const hasImage = Boolean(ctx.image) && design.imagePlacement !== "none";
  if (!hasImage) {
    return (
      <Frame ctx={ctx}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Kicker ctx={ctx} />
          <div style={{ display: "flex", height: 3, width: INNER, backgroundColor: ctx.text }} />
          <div style={{ display: "flex", height: 1, width: INNER, backgroundColor: ctx.text }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          <Headline ctx={ctx} text={headline} maxLines={6} max={146} min={70} />
          <Body ctx={ctx} text={subheadline} maxLines={3} italic size={46} color={ctx.text} />
        </div>
        <Footer ctx={ctx} variant="underline" />
      </Frame>
    );
  }
  const imageH = 820;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: PIN_WIDTH, height: PIN_HEIGHT, ...paper(ctx) }}>
      <div style={{ display: "flex", position: "relative", width: PIN_WIDTH, height: imageH }}>
        <ImageBox ctx={ctx} width={PIN_WIDTH} height={imageH} fit="cover" background={mix(ctx.bg, "#ffffff", 0.5)} />
        {ctx.input.kicker ? (
          <div style={{ display: "flex", position: "absolute", left: PAD, top: PAD, backgroundColor: ctx.bg, padding: "12px 20px" }}>
            <span style={{ display: "block", fontFamily: BODY_FONT, fontWeight: 600, fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: ctx.text, lineClamp: 1, maxWidth: 600 }}>
              {ctx.input.kicker}
            </span>
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flexGrow: 1, padding: `52px ${PAD}px ${PAD - 10}px`, boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Headline ctx={ctx} text={headline} maxLines={3} max={98} min={52} />
          <div style={{ display: "flex", width: 120, height: 3, backgroundColor: ctx.accent }} />
          <Body ctx={ctx} text={subheadline} maxLines={2} italic color={ctx.text} />
        </div>
        <Footer ctx={ctx} variant="arrow" />
      </div>
    </div>
  );
}

/** "Sticky notes": benefits written on rotated sticky notes. */
function StickyNotes(ctx: Ctx) {
  const { headline, subheadline, bullets } = ctx.input;
  const notes = (bullets.length ? bullets : [subheadline]).filter(Boolean).slice(0, 3);
  const where = placement(ctx, "middle");
  const n = Math.max(1, notes.length);
  const gap = 26;
  const noteW = Math.min(300, Math.floor((INNER - gap * (n - 1)) / n));
  const noteH = where === "none" ? 300 : 250;
  const stickies = notes.length ? (
    <div style={{ display: "flex", gap, justifyContent: "center", width: INNER }}>
      {notes.map((t, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            position: "relative",
            width: noteW,
            height: noteH,
            backgroundColor: STICKY[(i + Math.floor(ctx.rng() * 4)) % STICKY.length],
            transform: `rotate(${tilt(ctx.rng, 4)}deg)`,
            padding: "40px 22px 22px",
            boxSizing: "border-box",
            boxShadow: "0 3px 0 rgba(0,0,0,0.10)",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", position: "absolute", top: 12, left: noteW / 2 - 11, width: 22, height: 22, borderRadius: 999, backgroundColor: ctx.accent, border: "3px solid rgba(0,0,0,0.25)" }} />
          <Hand text={t} size={n === 1 ? 68 : 60} maxWidth={noteW - 44} maxLines={4} align="center" />
        </div>
      ))}
    </div>
  ) : null;
  return (
    <Frame ctx={ctx}>
      {where === "top" ? <TapedPhoto ctx={ctx} width={600} height={420} /> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Headline ctx={ctx} text={headline} maxLines={3} max={where === "none" ? 120 : 96} />
        {bullets.length ? <Body ctx={ctx} text={subheadline} maxLines={2} /> : null}
      </div>
      {where === "middle" ? <TapedPhoto ctx={ctx} width={600} height={400} /> : null}
      {stickies}
      {where === "bottom" ? <TapedPhoto ctx={ctx} width={600} height={400} /> : null}
      <Footer ctx={ctx} variant="stamp" />
    </Frame>
  );
}

/** Ruled notebook paper with a red margin line. */
function NotebookSheet({ ctx, width, height, lineGap, top, children, rotate }: { ctx: Ctx; width: number; height: number; lineGap: number; top: number; children: ReactNode; rotate: number }) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        flexDirection: "column",
        width,
        height,
        backgroundColor: "#fffdf8",
        backgroundImage: `linear-gradient(to bottom, transparent ${lineGap - 3}px, #b7cdea ${lineGap - 3}px, #b7cdea ${lineGap - 1}px, transparent ${lineGap - 1}px)`,
        backgroundSize: `100% ${lineGap}px`,
        backgroundPosition: `0 ${top}px`,
        backgroundRepeat: "repeat",
        transform: `rotate(${rotate}deg)`,
        boxShadow: `10px 10px 0 ${mix(ctx.bg, "#000000", 0.18)}`,
      }}
    >
      <div style={{ display: "flex", position: "absolute", left: 92, top: 0, width: 3, height, backgroundColor: "#e8806c" }} />
      {children}
    </div>
  );
}

/** "Note to self": the problem handwritten on notebook paper, then the answer. */
function NoteToSelf(ctx: Ctx) {
  const { headline, subheadline } = ctx.input;
  const where = placement(ctx, "bottom");
  return (
    <Frame ctx={ctx}>
      {subheadline ? (
        <NotebookSheet ctx={ctx} width={INNER} height={where === "none" ? 420 : 330} lineGap={64} top={30} rotate={tilt(ctx.rng, 2)}>
          <div style={{ display: "flex", padding: "26px 40px 20px 124px" }}>
            <Hand text={subheadline} size={64} maxWidth={INNER - 170} maxLines={where === "none" ? 5 : 4} />
          </div>
        </NotebookSheet>
      ) : (
        <Kicker ctx={ctx} />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
        {subheadline ? <HandArrow ctx={ctx} size={96} direction="down" color={ctx.accent} /> : null}
        <div style={{ display: "flex", flexDirection: "column", paddingTop: subheadline ? 34 : 0 }}>
          <Headline ctx={ctx} text={headline} maxWidth={subheadline ? INNER - 114 : INNER} maxLines={where === "none" ? 5 : 3} max={where === "none" ? 120 : 96} />
        </div>
      </div>
      {where !== "none" ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", position: "relative", boxShadow: `14px 14px 0 ${ctx.accent}` }}>
            <ImageBox ctx={ctx} width={680} height={subheadline ? 420 : 560} />
          </div>
        </div>
      ) : null}
      <Footer ctx={ctx} variant="arrow" />
    </Frame>
  );
}

/** "To-do list": a notebook page with hand-ticked items. */
function TodoList(ctx: Ctx) {
  const { headline, subheadline, bullets } = ctx.input;
  const items = (bullets.length ? bullets : [subheadline]).filter(Boolean).slice(0, 4);
  const showPhoto = placement(ctx, "top") !== "none";
  const sheetW = 870;
  const sheetH = PIN_HEIGHT - 150;
  const textW = showPhoto ? 470 : sheetW - 190;
  return (
    <div style={{ display: "flex", width: PIN_WIDTH, height: PIN_HEIGHT, alignItems: "center", justifyContent: "center", ...paper(ctx) }}>
      <NotebookSheet ctx={ctx} width={sheetW} height={sheetH} lineGap={78} top={318} rotate={tilt(ctx.rng, 1.5)}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: sheetH, padding: "72px 56px 64px 128px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 230 }}>
            <Headline ctx={ctx} text={headline} maxWidth={textW} maxLines={3} max={86} min={46} color={HAND_INK} />
            {bullets.length ? <Body ctx={ctx} text={subheadline} maxWidth={textW} maxLines={2} color="#4a5468" /> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
            {items.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 26 }}>
                <div style={{ display: "flex", position: "relative", width: 56, height: 56 }}>
                  <HandBox ctx={ctx} size={52} />
                  <div style={{ display: "flex", position: "absolute", left: 8, top: -10 }}>
                    <HandTick ctx={ctx} size={54} />
                  </div>
                </div>
                <Hand text={t} size={58} maxWidth={sheetW - 280} maxLines={2} />
              </div>
            ))}
          </div>
          <Footer ctx={ctx} variant="underline" color={HAND_INK} />
        </div>
        {showPhoto ? (
          <div style={{ display: "flex", position: "absolute", right: -26, top: 46, transform: `rotate(${between(ctx.rng, 3, 7).toFixed(1)}deg)`, padding: 16, backgroundColor: "#ffffff", boxShadow: "0 2px 0 rgba(0,0,0,0.12)" }}>
            <ImageBox ctx={ctx} width={300} height={300} background="#f4f2ee" />
            <Tape ctx={ctx} style={{ top: -20, left: 90 }} />
          </div>
        ) : null}
      </NotebookSheet>
    </div>
  );
}

/** "Product showcase": framed product on an offset colour block, with a sticker. */
function Showcase(ctx: Ctx) {
  const { headline, subheadline, design } = ctx.input;
  const hasImage = Boolean(ctx.image) && design.imagePlacement !== "none";
  const sticker = (
    <div
      style={{
        display: "flex",
        position: "absolute",
        right: -48,
        top: -56,
        width: 200,
        height: 200,
        borderRadius: 999,
        backgroundColor: "#f0bf2e",
        alignItems: "center",
        justifyContent: "center",
        transform: `rotate(${between(ctx.rng, 8, 16).toFixed(1)}deg)`,
        border: "4px solid #13203a",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontFamily: HAND_FONT, fontWeight: 700, fontSize: 46, color: "#13203a", lineHeight: 1 }}>digital</span>
        <span style={{ fontFamily: HAND_FONT, fontWeight: 700, fontSize: 46, color: "#13203a", lineHeight: 1 }}>download</span>
      </div>
    </div>
  );
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        {hasImage ? <Headline ctx={ctx} text={headline} maxLines={3} max={96} align="center" /> : <Kicker ctx={ctx} />}
        {hasImage ? <Body ctx={ctx} text={subheadline} maxLines={2} align="center" /> : null}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", position: "relative", transform: `rotate(${tilt(ctx.rng, 1.5)}deg)` }}>
          <div style={{ display: "flex", position: "absolute", left: 30, top: 30, width: 680, height: hasImage ? 700 : 780, backgroundColor: ctx.accent }} />
          <div style={{ display: "flex", position: "relative", padding: 24, backgroundColor: "#ffffff", border: `4px solid ${ctx.text === "#ffffff" ? "#13203a" : ctx.text}` }}>
            {hasImage ? (
              <ImageBox ctx={ctx} width={624} height={644} background="#f4f2ee" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 30, width: 624, height: 724, padding: 40, boxSizing: "border-box" }}>
                <Headline ctx={{ ...ctx, text: "#13203a" }} text={headline} maxWidth={540} maxLines={5} max={96} min={50} />
                <Body ctx={ctx} text={subheadline} maxWidth={540} maxLines={3} italic color="#4a5468" />
              </div>
            )}
          </div>
          {sticker}
        </div>
      </div>
      <Footer ctx={ctx} variant="stamp" center />
    </Frame>
  );
}

const TEMPLATES = {
  minimal: PaperNote,
  editorial: MagazineCover,
  benefits: StickyNotes,
  problem_solution: NoteToSelf,
  checklist: TodoList,
  mockup: Showcase,
} as const;

export function buildPinElement(input: PinRenderInput): ReactElement {
  const { design } = input;
  const text = readableTextColor(design.background, design.textColor);
  const ctx: Ctx = {
    input: { ...input, headline: input.headline || "Your headline here" },
    type: TYPE_PRESETS[design.fontPreset] ?? TYPE_PRESETS.editorial,
    text,
    muted: mix(text, design.background, 0.3),
    accent: design.accentColor,
    bg: design.background,
    image: input.image,
    rng: makeRng(`${input.headline}|${design.template}|${input.cta}`),
  };
  const Template = TEMPLATES[design.template] ?? PaperNote;
  return Template(ctx);
}
