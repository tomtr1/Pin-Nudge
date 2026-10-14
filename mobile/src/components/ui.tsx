import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { blocks, colors, fonts, radius, type BlockColor } from "../lib/theme";

export type IconName = React.ComponentProps<typeof Feather>["name"];

export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

/* ------------------------------------------------------------------ text */

type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number; selectable?: boolean };

export function Title({ children, style, numberOfLines }: TextProps) {
  return (
    <Text accessibilityRole="header" style={[t.title, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Heading({ children, style, numberOfLines }: TextProps) {
  return (
    <Text accessibilityRole="header" style={[t.heading, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Body({ children, style, numberOfLines, selectable }: TextProps) {
  return (
    <Text style={[t.body, style]} numberOfLines={numberOfLines} selectable={selectable}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, numberOfLines }: TextProps) {
  return (
    <Text style={[t.muted, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, style }: TextProps) {
  return <Text style={[t.eyebrow, style]}>{children}</Text>;
}

export function Hand({ children, style }: TextProps) {
  return <Text style={[t.hand, style]}>{children}</Text>;
}

const t = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ink, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.ink, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: colors.muted },
  hand: { fontFamily: fonts.hand, fontSize: 22, color: colors.accent },
});

/* --------------------------------------------------------------- layout */

export function Screen({
  children,
  onRefresh,
  refreshing = false,
  padded = true,
  footer,
  topInset = false,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  padded?: boolean;
  footer?: ReactNode;
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[padded && { padding: 20, gap: 16 }, { paddingTop: (padded ? 20 : 0) + (topInset ? insets.top : 0), paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer ? <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
    </View>
  );
}

export function Row({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function Card({ children, style, shadow = false, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; shadow?: boolean; onPress?: () => void; accessibilityLabel?: string }) {
  const body = <View style={[s.card, style]}>{children}</View>;
  const wrapped = shadow ? (
    <View style={s.shadowWrap}>
      <View style={s.shadow} />
      {body}
    </View>
  ) : (
    body
  );
  if (!onPress) return wrapped;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ translateY: 1 }] }]}>
      {wrapped}
    </Pressable>
  );
}

/** A flat colour block with a faint grid-paper pattern, like the website's feature cards. */
export function Block({ color = "mint", children, style, minHeight = 0 }: { color?: BlockColor; children?: ReactNode; style?: StyleProp<ViewStyle>; minHeight?: number }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const step = 22;
  const { fill, line } = blocks[color];
  // Layout props apply to the content layer, which sits above the grid lines on every platform.
  const { gap, alignItems, justifyContent, ...outer } = StyleSheet.flatten(style) ?? {};
  return (
    <View
      style={[{ backgroundColor: fill, borderRadius: radius, overflow: "hidden", minHeight, padding: 18 }, outer]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: Math.ceil(size.w / step) }, (_, i) => (
          <View key={`v${i}`} style={{ position: "absolute", left: i * step, top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: line }} />
        ))}
        {Array.from({ length: Math.ceil(size.h / step) }, (_, i) => (
          <View key={`h${i}`} style={{ position: "absolute", top: i * step, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: line }} />
        ))}
      </View>
      <View style={{ position: "relative", zIndex: 1, flexGrow: 1, gap, alignItems, justifyContent }}>{children}</View>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 }} />;
}

/* -------------------------------------------------------------- buttons */

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  size = "md",
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const v = variants[variant];
  const off = disabled || loading;
  const height = size === "sm" ? 36 : size === "lg" ? 54 : 46;
  const showShadow = (variant === "primary" || variant === "accent") && !off;
  return (
    <View style={[{ position: "relative" }, style]}>
      {showShadow ? <View style={[s.btnShadow, { height }]} /> : null}
      <Pressable
        onPress={onPress}
        disabled={off}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: off, busy: loading }}
        style={({ pressed }) => [
          s.btn,
          { height, backgroundColor: v.bg, borderColor: v.border, paddingHorizontal: size === "sm" ? 12 : 18 },
          off && { opacity: 0.5 },
          pressed && showShadow && { transform: [{ translateX: 2 }, { translateY: 2 }] },
          pressed && !showShadow && { opacity: 0.7 },
        ]}
      >
        {loading ? <ActivityIndicator color={v.fg} size="small" /> : icon ? <Icon name={icon} size={size === "sm" ? 16 : 18} color={v.fg} /> : null}
        <Text style={{ fontFamily: fonts.semibold, fontSize: size === "sm" ? 14 : 16, color: v.fg }} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const variants: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.ink, fg: "#ffffff", border: colors.ink },
  accent: { bg: colors.accent, fg: "#ffffff", border: colors.ink },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.ink },
  ghost: { bg: "transparent", fg: colors.ink, border: "transparent" },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.danger },
};

export function IconButton({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [s.iconBtn, (pressed || disabled) && { opacity: 0.5 }]}>
      <Icon name={icon} size={20} />
    </Pressable>
  );
}

/* ---------------------------------------------------------------- forms */

export function Field({
  label,
  error,
  hint,
  counter,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string; counter?: { value: string; max: number } }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={s.label}>{label}</Text>
        {counter ? (
          <Text style={[s.counter, counter.value.length > counter.max && { color: colors.danger }]}>
            {counter.value.length}/{counter.max}
          </Text>
        ) : null}
      </Row>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8a90a0"
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[s.input, input.multiline && { minHeight: 96, textAlignVertical: "top", paddingTop: 12 }, focused && { borderColor: colors.ink }, error ? { borderColor: colors.danger } : null, input.style]}
      />
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Single-choice pills, used instead of dropdowns. */
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabledValues = [],
}: {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabledValues?: readonly T[];
}) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const active = o.value === value;
          const off = disabledValues.includes(o.value);
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              disabled={off}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled: off }}
              style={[s.pill, active && s.pillActive, off && { opacity: 0.4 }]}
            >
              <Text style={[s.pillText, active && { color: "#ffffff" }]}>{o.label}</Text>
              {off ? <Icon name="lock" size={12} color={colors.muted} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <Row style={{ justifyContent: "space-between" }}>
      <Text style={s.label}>{label}</Text>
      <Row gap={4}>
        <IconButton icon="minus" label={`Fewer ${label.toLowerCase()}`} onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min} />
        <Text style={[s.pillText, { minWidth: 32, textAlign: "center", fontSize: 18 }]} accessibilityLabel={`${label}: ${value}`}>
          {value}
        </Text>
        <IconButton icon="plus" label={`More ${label.toLowerCase()}`} onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} />
      </Row>
    </Row>
  );
}

/* -------------------------------------------------------------- feedback */

type Tone = "info" | "success" | "warning" | "danger";
const tones: Record<Tone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: colors.infoSoft, fg: colors.info, icon: "info" },
  success: { bg: colors.accentSoft, fg: colors.accentSoftInk, icon: "check-circle" },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: "alert-triangle" },
  danger: { bg: colors.dangerSoft, fg: colors.danger, icon: "alert-circle" },
};

export function Notice({ tone = "info", title, children, action }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode }) {
  const c = tones[tone];
  return (
    <View style={[s.notice, { backgroundColor: c.bg }]} accessibilityRole={tone === "danger" ? "alert" : undefined}>
      <Icon name={c.icon} size={18} color={c.fg} />
      <View style={{ flex: 1, gap: 4 }}>
        {title ? <Text style={{ fontFamily: fonts.semibold, color: c.fg, fontSize: 15 }}>{title}</Text> : null}
        {typeof children === "string" ? <Text style={{ fontFamily: fonts.body, color: c.fg, fontSize: 14, lineHeight: 20 }}>{children}</Text> : children}
        {action}
      </View>
    </View>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 48, alignItems: "center", gap: 12 }} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.ink} />
      <Muted>{label}</Muted>
    </View>
  );
}

export function Empty({ icon, title, body, action, color = "butter" }: { icon: IconName; title: string; body: string; action?: ReactNode; color?: BlockColor }) {
  return (
    <Block color={color} style={{ alignItems: "center", gap: 10, paddingVertical: 32 }}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={22} />
      </View>
      <Heading style={{ textAlign: "center" }}>{title}</Heading>
      <Body style={{ textAlign: "center", color: colors.muted }}>{body}</Body>
      {action ? <View style={{ marginTop: 6, alignSelf: "stretch" }}>{action}</View> : null}
    </Block>
  );
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: colors.surfaceMuted, fg: colors.muted, label: "Draft" },
  ready: { bg: colors.sky, fg: colors.info, label: "Ready" },
  approved: { bg: colors.sky, fg: colors.info, label: "Approved" },
  planned: { bg: colors.butter, fg: colors.warning, label: "Planned" },
  published: { bg: colors.accentSoft, fg: colors.accentSoftInk, label: "Published" },
  archived: { bg: colors.surfaceMuted, fg: colors.muted, label: "Archived" },
};

export function StatusBadge({ status }: { status: string }) {
  const st = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  return (
    <View style={{ backgroundColor: st.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius, alignSelf: "flex-start" }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: st.fg }}>{st.label}</Text>
    </View>
  );
}

export function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(1, used / limit) : 1;
  return (
    <View style={{ gap: 6 }} accessibilityLabel={`${label}: ${used} of ${limit} used`}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={s.label}>{label}</Text>
        <Text style={[s.label, { fontFamily: fonts.body }]}>
          {used} / {limit}
        </Text>
      </Row>
      <View style={{ height: 8, backgroundColor: colors.surfaceMuted, borderRadius: radius, overflow: "hidden" }}>
        <View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: pct >= 1 ? colors.tomato : colors.accent }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 8 },
  card: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.ink, borderRadius: radius, padding: 16, gap: 8 },
  shadowWrap: { position: "relative", marginRight: 4, marginBottom: 4 },
  shadow: { position: "absolute", top: 4, left: 4, right: -4, bottom: -4, backgroundColor: colors.ink, borderRadius: radius },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: radius },
  btnShadow: { position: "absolute", top: 3, left: 3, right: -3, backgroundColor: colors.ink, borderRadius: radius },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.ink, borderRadius: radius, backgroundColor: colors.surface },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  counter: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  input: { fontFamily: fonts.body, fontSize: 16, color: colors.ink, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius, paddingHorizontal: 12, minHeight: 46 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.surface },
  pillActive: { backgroundColor: colors.ink },
  pillText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  notice: { flexDirection: "row", gap: 10, padding: 14, borderRadius: radius, alignItems: "flex-start" },
  emptyIcon: { width: 48, height: 48, borderRadius: radius, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
});
