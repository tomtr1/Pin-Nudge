/**
 * Line illustrations for the marketing site: ink outlines, flat accent shapes,
 * drawn on top of grid-paper colour blocks. Purely decorative (aria-hidden).
 */
const INK = "#13203a";
const GREEN = "#167a4a";
const TOMATO = "#e4573d";
const COBALT = "#2a55d6";
const SUN = "#f0bf2e";

const stroke = { stroke: INK, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

function Sparkle({ x, y, s = 1, color = INK }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z"
      fill="none"
      stroke={color}
      strokeWidth={2.5 / s}
      strokeLinejoin="round"
    />
  );
}

function Cursor({ x, y, r = 0, color = GREEN, s = 1 }: { x: number; y: number; r?: number; color?: string; s?: number }) {
  return <path transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} d="M0 0 L34 14 L18 18 L12 34 Z" fill={color} />;
}

/** Marketing angles: one product branching into several different pins. */
export function AnglesIllustration() {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full" aria-hidden>
      {/* product card */}
      <rect x="40" y="70" width="92" height="112" {...stroke} fill="#fff" />
      <rect x="54" y="84" width="64" height="44" fill={GREEN} opacity="0.85" />
      <path d="M54 142h60M54 156h44M54 168h52" {...stroke} strokeWidth={2.5} />
      {/* branches */}
      <path d="M132 110 C 170 110, 175 52, 214 52" {...stroke} strokeDasharray="2 7" />
      <path d="M132 126 C 175 126, 180 122, 214 122" {...stroke} strokeDasharray="2 7" />
      <path d="M132 142 C 170 142, 175 192, 214 192" {...stroke} strokeDasharray="2 7" />
      {/* three pins */}
      <g transform="rotate(-4 250 52)">
        <rect x="214" y="22" width="78" height="62" {...stroke} fill="#fff" />
        <path d="M226 38h40M226 50h52M226 62h30" {...stroke} strokeWidth={2.5} />
      </g>
      <rect x="214" y="96" width="78" height="54" {...stroke} fill={SUN} />
      <path d="M226 112h48M226 124h36" {...stroke} strokeWidth={2.5} />
      <g transform="rotate(3 250 192)">
        <rect x="214" y="164" width="78" height="56" {...stroke} fill="#fff" />
        <circle cx="236" cy="190" r="10" fill={TOMATO} />
        <path d="M254 184h26M254 198h18" {...stroke} strokeWidth={2.5} />
      </g>
      <Cursor x={318} y={150} r={-12} />
      <Sparkle x={330} y={50} />
      <Sparkle x={160} y={206} s={0.7} />
      <rect x="340" y="196" width="18" height="18" fill={COBALT} transform="rotate(12 349 205)" />
    </svg>
  );
}

/** Pin copy and design: an editable pin with text being written. */
export function PinsIllustration() {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full" aria-hidden>
      <rect x="120" y="24" width="120" height="180" {...stroke} fill="#fff" />
      <rect x="134" y="38" width="92" height="70" fill={TOMATO} opacity="0.9" />
      <path d="M134 124h86M134 140h70M134 156h80" {...stroke} strokeWidth={2.5} />
      <rect x="134" y="174" width="52" height="16" fill={INK} />
      {/* editing caret + text block */}
      <rect x="262" y="58" width="104" height="40" {...stroke} fill="#fff" />
      <text x="276" y="86" fontFamily="Georgia, serif" fontSize="22" fill={INK}>
        Aa
      </text>
      <path d="M314 68v20" {...stroke} />
      <path d="M262 78 L240 110" {...stroke} strokeDasharray="2 7" />
      {/* pencil */}
      <g transform="rotate(38 300 168)">
        <rect x="270" y="158" width="66" height="18" {...stroke} fill={SUN} />
        <path d="M336 158 L352 167 L336 176 Z" {...stroke} fill="#fff" />
        <path d="M282 158v18" {...stroke} />
      </g>
      {/* hand-drawn tick */}
      <path d="M44 132 l18 18 l34 -44" {...stroke} stroke={GREEN} strokeWidth={6} />
      <path d="M60 60 L84 96 L36 96 Z" fill={COBALT} />
      <Sparkle x={70} y={200} />
      <Cursor x={250} y={196} r={-20} color={INK} s={0.8} />
    </svg>
  );
}

/** Planning and learning: a calendar with planned pins and a small bar chart. */
export function LearnIllustration() {
  const days = Array.from({ length: 12 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full" aria-hidden>
      <rect x="44" y="40" width="190" height="160" {...stroke} fill="#fff" />
      <path d="M44 72h190" {...stroke} />
      <path d="M80 30v22M198 30v22" {...stroke} />
      {days.map((d) => {
        const x = 58 + (d % 4) * 44;
        const y = 86 + Math.floor(d / 4) * 36;
        const filled = [1, 6, 11].includes(d);
        return <rect key={d} x={x} y={y} width="30" height="24" fill={filled ? (d === 6 ? SUN : GREEN) : "none"} stroke={INK} strokeWidth={2} />;
      })}
      <path d="M150 128 l7 7 l12 -14" {...stroke} stroke="#fff" />
      {/* bar chart */}
      <path d="M262 200h104" {...stroke} />
      <rect x="272" y="150" width="20" height="50" {...stroke} fill="#fff" />
      <rect x="302" y="118" width="20" height="82" {...stroke} fill={COBALT} />
      <rect x="332" y="84" width="20" height="116" {...stroke} fill="#fff" />
      <path d="M270 112 C 300 100, 318 70, 352 50" {...stroke} strokeDasharray="2 7" />
      <path d="M340 44 L356 48 L350 64" {...stroke} />
      <circle cx="292" cy="58" r="12" fill={TOMATO} />
      <Sparkle x={240} y={30} s={0.8} />
    </svg>
  );
}
