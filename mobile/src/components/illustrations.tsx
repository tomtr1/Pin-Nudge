import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { colors } from "../lib/theme";

const stroke = { stroke: colors.ink, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** One product branching into three different pins (same motif as the website). */
export function AnglesArt({ height = 180 }: { height?: number }) {
  return (
    <Svg viewBox="0 0 400 240" width="100%" height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x={40} y={70} width={92} height={112} fill="#fff" {...stroke} />
      <Rect x={54} y={84} width={64} height={44} fill={colors.accent} opacity={0.85} />
      <Path d="M54 142h60M54 156h44M54 168h52" fill="none" {...stroke} strokeWidth={2.5} />
      <Path d="M132 110 C 170 110, 175 52, 214 52" fill="none" {...stroke} strokeDasharray="2 7" />
      <Path d="M132 126 C 175 126, 180 122, 214 122" fill="none" {...stroke} strokeDasharray="2 7" />
      <Path d="M132 142 C 170 142, 175 192, 214 192" fill="none" {...stroke} strokeDasharray="2 7" />
      <G rotation={-4} origin="250, 52">
        <Rect x={214} y={22} width={78} height={62} fill="#fff" {...stroke} />
        <Path d="M226 38h40M226 50h52M226 62h30" fill="none" {...stroke} strokeWidth={2.5} />
      </G>
      <Rect x={214} y={96} width={78} height={54} fill={colors.sun} {...stroke} />
      <Path d="M226 112h48M226 124h36" fill="none" {...stroke} strokeWidth={2.5} />
      <G rotation={3} origin="250, 192">
        <Rect x={214} y={164} width={78} height={56} fill="#fff" {...stroke} />
        <Circle cx={236} cy={190} r={10} fill={colors.tomato} />
        <Path d="M254 184h26M254 198h18" fill="none" {...stroke} strokeWidth={2.5} />
      </G>
      <Path d="M318 150 L352 164 L336 168 L330 184 Z" fill={colors.accent} />
      <Path d="M330 36 L333 47 L344 50 L333 53 L330 64 L327 53 L316 50 L327 47 Z" fill="none" {...stroke} strokeWidth={2.5} />
      <Rect x={340} y={196} width={18} height={18} fill={colors.cobalt} rotation={12} origin="349, 205" />
    </Svg>
  );
}

/** Hand-drawn underline used under display headlines. */
export function Squiggle({ width = 140, color = colors.accent }: { width?: number; color?: string }) {
  return (
    <Svg width={width} height={12} viewBox="0 0 140 12" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M3 8 C 30 3, 52 10, 78 6 S 120 3, 137 7" fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
    </Svg>
  );
}
